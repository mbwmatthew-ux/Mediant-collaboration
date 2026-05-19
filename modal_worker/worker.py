"""
Mediant Python Worker — Modal.com deployment.

Handles two tasks:
  1. Audio transcription via Basic Pitch (neural pitch detection)
  2. Beat tracking via librosa
  3. MusicXML parsing via music21 (when a structured score is provided)

Exposes a single HTTPS endpoint:
  POST /analyze
  Body: {
    video_url: str,          # signed URL to download video/audio from
    score_url?: str,         # signed URL for MusicXML/MIDI score (optional)
    score_mime?: str,        # "application/vnd.recordare.musicxml+xml", "audio/midi", etc.
    instrument: str,
    start_measure: int,
    time_sig?: str,          # e.g. "4/4", "12/8" — hint only; music21 reads from score
  }
  Response: {
    audio: AudioResult,
    score?: ScoreResult,     # only if score_url was provided and parsed successfully
    beats: BeatResult,
    error?: str
  }
"""

import modal

app = modal.App("mediant-worker")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .apt_install(
        "ffmpeg",
        "libsndfile1",
    )
    .pip_install(
        # Audio processing — pure librosa (no C extensions to compile)
        "librosa==0.10.2",
        "soundfile==0.12.1",
        "numpy>=1.24,<2.0",
        "scipy>=1.10",
        # Score parsing
        "music21==9.1.0",
        # Utilities
        "fastapi[standard]",
        "requests==2.31.0",
        "httpx==0.27.0",
    )
)

# ── Data types (dicts — no dataclasses so JSON-serializable naturally) ────────

def _pitch_to_midi(hz: float) -> int:
    import math
    return round(12 * math.log2(hz / 440.0) + 69)

MIDI_TO_NAME = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"
]

def midi_to_scientific(midi: int) -> str:
    octave = (midi // 12) - 1
    name = MIDI_TO_NAME[midi % 12]
    return f"{name}{octave}"

# ── Core functions ─────────────────────────────────────────────────────────

def extract_audio_from_video(video_bytes: bytes, target_sr: int = 22050) -> tuple[bytes, float]:
    """Use FFmpeg to extract mono 22050 Hz WAV from any video/audio container."""
    import subprocess, tempfile, os

    with tempfile.NamedTemporaryFile(suffix=".input", delete=False) as inf:
        inf.write(video_bytes)
        in_path = inf.name

    out_path = in_path + ".wav"
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y", "-i", in_path,
                "-vn",                 # no video
                "-acodec", "pcm_s16le",
                "-ar", str(target_sr),
                "-ac", "1",            # mono
                out_path,
            ],
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg failed: {result.stderr.decode()[:500]}")

        with open(out_path, "rb") as f:
            wav_bytes = f.read()

        # Get duration from stderr output
        stderr = result.stderr.decode()
        duration = 0.0
        for line in stderr.split("\n"):
            if "Duration:" in line:
                parts = line.split("Duration:")[1].split(",")[0].strip()
                h, m, s = parts.split(":")
                duration = float(h) * 3600 + float(m) * 60 + float(s)
                break

        return wav_bytes, duration
    finally:
        os.unlink(in_path)
        if os.path.exists(out_path):
            os.unlink(out_path)


def run_pitch_tracking(wav_bytes: bytes) -> list[dict]:
    """
    Detect note events using librosa pyin (pitch) + librosa onset detection.
    Returns list of AudioEvent dicts sorted by time.

    Strategy:
      1. librosa.onset.onset_detect → note start times
      2. librosa.pyin → per-frame pitch (Hz) + voicing probability
      3. At each onset, sample the pyin pitch in a short look-ahead window
      4. Emit one event per onset that has a confident voiced pitch
    """
    import tempfile, os
    import numpy as np
    import librosa

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        wav_path = f.name

    try:
        SR = 22050
        HOP = 512

        y, sr = librosa.load(wav_path, sr=SR, mono=True)
        duration = librosa.get_duration(y=y, sr=SR)

        # ── pyin pitch tracking ────────────────────────────────────────────
        f0, voiced_flag, voiced_prob = librosa.pyin(
            y, sr=SR,
            fmin=librosa.note_to_hz("C2"),   # 65 Hz — covers cello C string
            fmax=librosa.note_to_hz("C7"),   # 2093 Hz — covers violin E string
            hop_length=HOP,
        )
        frame_times = librosa.frames_to_time(np.arange(len(f0)), sr=SR, hop_length=HOP)

        # ── Onset detection ────────────────────────────────────────────────
        onset_frames = librosa.onset.onset_detect(
            y=y, sr=SR, hop_length=HOP,
            backtrack=True,        # snap onset to local energy minimum
            units="frames",
        )
        onset_times = librosa.frames_to_time(onset_frames, sr=SR, hop_length=HOP).tolist()

        if not onset_times:
            onset_times = np.arange(0, duration, 0.5).tolist()

        # ── Assign pitch to each onset ─────────────────────────────────────
        events: list[dict] = []
        for i, onset_t in enumerate(onset_times):
            next_t = onset_times[i + 1] if i + 1 < len(onset_times) else onset_t + 1.0
            # Sample pitch in the first 200ms of the note (or until next onset)
            window_end = min(onset_t + 0.20, next_t - 0.02)

            mask = (frame_times >= onset_t) & (frame_times < window_end) & voiced_flag
            if not mask.any():
                # Try wider window
                mask = (frame_times >= onset_t) & (frame_times < onset_t + 0.15)
                mask &= voiced_flag
            if not mask.any():
                continue

            freqs = f0[mask]
            probs = voiced_prob[mask]  # already filtered — do NOT re-apply mask
            valid = freqs > 0
            if not valid.any():
                continue
            dominant_hz = float(np.average(freqs[valid], weights=probs[valid] + 1e-6))
            midi = int(np.round(librosa.hz_to_midi(dominant_hz)))
            midi = max(36, min(96, midi))  # C2–C7

            # RMS in a short window around onset → loudness
            s = int(onset_t * SR)
            e = min(len(y), s + SR // 10)
            rms = float(np.sqrt(np.mean(y[s:e] ** 2))) if e > s else 0.0
            loudness = "loud" if rms > 0.15 else "medium" if rms > 0.04 else "soft"

            confidence = int(min(100, float(np.mean(probs)) * 100))

            events.append({
                "time_sec": float(onset_t),
                "end_sec": float(next_t),
                "pitches": [midi_to_scientific(midi)],
                "midi": midi,
                "confidence": confidence,
                "loudness": loudness,
                "source": "pyin+librosa",
            })

        events.sort(key=lambda e: e["time_sec"])
        print(f"[pitch_tracking] {len(onset_times)} onsets → {len(events)} voiced events, duration={duration:.1f}s")
        return events

    finally:
        os.unlink(wav_path)


def run_beat_tracking(wav_bytes: bytes, estimated_bpm: float | None = None) -> dict:
    """
    Track beats using librosa.
    Returns beat times and tempo estimate.
    """
    import tempfile, os
    import librosa
    import numpy as np

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(wav_bytes)
        wav_path = f.name

    try:
        y, sr = librosa.load(wav_path, sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # If BPM hint provided, constrain tempo search window
        start_bpm = estimated_bpm if estimated_bpm and 30 <= estimated_bpm <= 300 else 120.0

        tempo, beat_frames = librosa.beat.beat_track(
            y=y, sr=sr,
            start_bpm=start_bpm,
            tightness=100,
        )
        beat_times = librosa.frames_to_time(beat_frames, sr=sr).tolist()

        # Also run onset detection for fine-grained timing
        onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True)
        onset_times = librosa.frames_to_time(onset_frames, sr=sr).tolist()

        print(f"[beat_tracking] tempo={float(tempo):.1f} bpm, {len(beat_times)} beats, {len(onset_times)} onsets, duration={duration:.1f}s")

        return {
            "tempo_bpm": float(tempo),
            "beat_times": beat_times,
            "onset_times": onset_times,
            "duration_sec": float(duration),
        }
    finally:
        os.unlink(wav_path)


def parse_musicxml(score_bytes: bytes, start_measure: int) -> dict:
    """
    Parse MusicXML with music21 into structured score data.
    Returns ScoreResult dict.
    """
    import tempfile, os
    import music21 as m21

    with tempfile.NamedTemporaryFile(suffix=".xml", delete=False) as f:
        f.write(score_bytes)
        xml_path = f.name

    try:
        score = m21.converter.parse(xml_path)

        # Flatten to get a single part stream (take first part)
        parts = score.parts
        if not parts:
            return {"error": "no parts found in score"}

        part = parts[0].flatten()

        # Extract key/time/tempo
        key_sig = None
        time_sig_str = None
        tempo_marking = None

        for el in part.recurse():
            if isinstance(el, m21.key.Key) and key_sig is None:
                key_sig = str(el)
            elif isinstance(el, m21.key.KeySignature) and key_sig is None:
                key_sig = el.asKey().name
            elif isinstance(el, m21.meter.TimeSignature) and time_sig_str is None:
                time_sig_str = el.ratioString
            elif isinstance(el, m21.tempo.MetronomeMark) and tempo_marking is None:
                tempo_marking = str(el)

        # Parse measures
        measures_out = []
        measure_elements = score.parts[0].getElementsByClass(m21.stream.Measure)

        for i, m in enumerate(measure_elements):
            measure_num = m.number if m.number is not None else (start_measure + i)
            notes_out = []

            for el in m.flatten().notesAndRests:
                if isinstance(el, m21.note.Rest):
                    notes_out.append({
                        "pitch": None,
                        "beat": float(el.beat),
                        "duration_beats": float(el.duration.quarterLength),
                        "articulation": None,
                        "dynamic": None,
                    })
                elif isinstance(el, m21.note.Note):
                    artic = None
                    if el.articulations:
                        a = el.articulations[0]
                        if isinstance(a, m21.articulations.Staccato): artic = "staccato"
                        elif isinstance(a, m21.articulations.Tenuto): artic = "tenuto"
                        elif isinstance(a, m21.articulations.Accent): artic = "accent"

                    notes_out.append({
                        "pitch": el.pitch.nameWithOctave,
                        "beat": float(el.beat),
                        "duration_beats": float(el.duration.quarterLength),
                        "articulation": artic,
                        "dynamic": None,
                    })
                elif isinstance(el, m21.chord.Chord):
                    for n in el.notes:
                        notes_out.append({
                            "pitch": n.pitch.nameWithOctave,
                            "beat": float(el.beat),
                            "duration_beats": float(el.duration.quarterLength),
                            "articulation": None,
                            "dynamic": None,
                        })

            measures_out.append({
                "number": measure_num,
                "notes": notes_out,
            })

        print(f"[parse_musicxml] {len(measures_out)} measures, key={key_sig}, time={time_sig_str}")
        return {
            "key_signature": key_sig,
            "time_signature": time_sig_str,
            "tempo_marking": tempo_marking,
            "measures": measures_out,
            "source": "music21",
        }

    except Exception as e:
        print(f"[parse_musicxml] error: {e}")
        return {"error": str(e), "measures": []}
    finally:
        os.unlink(xml_path)


def assign_events_to_measures(
    events: list[dict],
    beat_times: list[float],
    beats_per_measure: int,
    start_measure: int,
) -> list[dict]:
    """
    Assign each audio event to a measure number using beat times.
    Beat 0 in beat_times[] corresponds to measure start_measure, beat 1.
    """
    if not beat_times or not events:
        return events

    result = []
    for ev in events:
        t = ev["time_sec"]
        # Binary search for the beat just before this event
        lo, hi = 0, len(beat_times) - 1
        beat_idx = 0
        while lo <= hi:
            mid = (lo + hi) // 2
            if beat_times[mid] <= t:
                beat_idx = mid
                lo = mid + 1
            else:
                hi = mid - 1

        measure_offset = beat_idx // beats_per_measure
        measure_num = start_measure + measure_offset
        result.append({**ev, "measure": measure_num})

    return result


# ── Modal endpoint ─────────────────────────────────────────────────────────

@app.function(
    image=image,
    timeout=300,
    memory=4096,
)
@modal.fastapi_endpoint(method="POST", docs=True)
def analyze(body: dict) -> dict:
    """
    Main analysis endpoint.
    Accepts video_url (required) and optional score_url.
    Returns combined audio transcription + beat tracking + optional score parsing.
    """
    import httpx, math

    video_url = body.get("video_url")
    score_url = body.get("score_url")
    score_mime = body.get("score_mime", "")
    instrument = body.get("instrument", "instrument")
    start_measure = int(body.get("start_measure", 1))
    time_sig_hint = body.get("time_sig", "4/4")

    if not video_url:
        return {"error": "video_url is required"}

    try:
        # Parse time signature for beats_per_measure
        try:
            num, denom = map(int, time_sig_hint.split("/"))
            is_compound = num % 3 == 0 and num // 3 >= 2 and denom >= 8
            beats_per_measure = num // 3 if is_compound else num
        except Exception:
            beats_per_measure = 4

        # Download video
        print(f"[analyze] downloading video from signed URL ({len(video_url)} chars)")
        with httpx.Client(timeout=120) as client:
            video_resp = client.get(video_url, follow_redirects=True)
            video_resp.raise_for_status()
            video_bytes = video_resp.content
        print(f"[analyze] video downloaded: {len(video_bytes):,} bytes")

        # Extract audio
        wav_bytes, video_duration = extract_audio_from_video(video_bytes)
        print(f"[analyze] audio extracted: {len(wav_bytes):,} bytes, duration={video_duration:.1f}s")

        # Beat tracking first (fast, gives tempo hint)
        beats = run_beat_tracking(wav_bytes)
        estimated_bpm = beats["tempo_bpm"]

        # pyin + aubio pitch/onset transcription (no ML model deps)
        raw_events = run_pitch_tracking(wav_bytes)

        # Assign events to measures using beat times
        beat_times = beats["beat_times"]
        events_with_measures = assign_events_to_measures(
            raw_events, beat_times, beats_per_measure, start_measure
        )

        audio_result = {
            "audio_duration_sec": beats["duration_sec"] or video_duration,
            "events": events_with_measures,
            "tempo_estimate_bpm": estimated_bpm,
            "tempo_steadiness": "steady",  # librosa doesn't give this; will add madmom later
            "beat_times": beat_times,
            "onset_times": beats["onset_times"],
            "source": "basic_pitch+librosa",
        }

        # Parse score if provided
        score_result = None
        if score_url:
            score_mime_lower = score_mime.lower()
            is_xml = (
                "musicxml" in score_mime_lower
                or "xml" in score_mime_lower
                or score_url.lower().endswith(".xml")
                or score_url.lower().endswith(".musicxml")
                or score_url.lower().endswith(".mxl")
            )
            if is_xml:
                print("[analyze] downloading and parsing MusicXML score")
                with httpx.Client(timeout=60) as client:
                    score_resp = client.get(score_url, follow_redirects=True)
                    score_resp.raise_for_status()
                    score_bytes = score_resp.content

                # Handle compressed MXL (ZIP containing XML)
                if score_url.lower().endswith(".mxl") or score_bytes[:4] == b"PK\x03\x04":
                    import zipfile, io
                    with zipfile.ZipFile(io.BytesIO(score_bytes)) as zf:
                        # Find the main XML file (not the META-INF container)
                        xml_files = [n for n in zf.namelist() if n.endswith(".xml") and "META-INF" not in n]
                        if xml_files:
                            score_bytes = zf.read(xml_files[0])
                        else:
                            score_bytes = None

                if score_bytes:
                    score_result = parse_musicxml(score_bytes, start_measure)
            else:
                print(f"[analyze] score MIME '{score_mime}' is not MusicXML — skipping music21 parse")

        return {
            "audio": audio_result,
            "score": score_result,
            "beats": beats,
        }

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        print(f"[analyze] ERROR: {e}\n{tb}")
        return {"error": str(e), "traceback": tb}


@app.local_entrypoint()
def test_local():
    """Quick local test — prints the module structure without invoking GPU."""
    print("Mediant worker app loaded OK.")
    print("App name:", app.name)
