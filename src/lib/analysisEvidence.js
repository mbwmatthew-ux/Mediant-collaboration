const XML_EXT_RE = /\.(xml|musicxml)$/i
const MXL_EXT_RE = /\.mxl$/i
const ZIP_XML_TYPE_RE = /(compressed|zip)|application\/vnd\.recordare\.musicxml$/i

const textDecoder = new TextDecoder()

function fileLooksLikeXml(file) {
  if (XML_EXT_RE.test(file?.name ?? '')) return true
  if (MXL_EXT_RE.test(file?.name ?? '')) return false
  return /xml\+|\/xml|text/i.test(file?.type ?? '')
}

function fileLooksLikeMxl(file) {
  return MXL_EXT_RE.test(file?.name ?? '') || ZIP_XML_TYPE_RE.test(file?.type ?? '')
}

function textOf(node, selector) {
  return node.querySelector(selector)?.textContent?.trim() ?? ''
}

function parsePitch(note) {
  if (note.querySelector('rest')) return 'rest'
  const step = textOf(note, 'pitch > step')
  if (!step) return null
  const alter = Number(textOf(note, 'pitch > alter') || 0)
  const octave = textOf(note, 'pitch > octave')
  const accidental = alter === 1 ? '#' : alter === -1 ? 'b' : alter === 2 ? 'x' : alter === -2 ? 'bb' : ''
  return `${step}${accidental}${octave || ''}`
}

function measureDynamics(measure) {
  return [...measure.querySelectorAll('direction-type dynamics > *')]
    .map(el => el.tagName)
    .filter(Boolean)
}

function measureArticulations(measure) {
  return [...measure.querySelectorAll('notations articulations > *')]
    .map(el => el.tagName)
    .filter(Boolean)
}

function parsePartMeasures(part, fallbackMeasures = []) {
  const measures = [...(part?.querySelectorAll(':scope > measure') ?? fallbackMeasures)]
  let divisions = 1
  let beats = 4
  let beatType = 4
  let fifths = ''

  const measureFacts = measures.slice(0, 180).map((measure, index) => {
    const attrs = measure.querySelector('attributes')
    if (attrs) {
      const nextDivisions = Number(textOf(attrs, 'divisions'))
      if (Number.isFinite(nextDivisions) && nextDivisions > 0) divisions = nextDivisions
      const nextBeats = Number(textOf(attrs, 'time > beats'))
      const nextBeatType = Number(textOf(attrs, 'time > beat-type'))
      if (Number.isFinite(nextBeats) && nextBeats > 0) beats = nextBeats
      if (Number.isFinite(nextBeatType) && nextBeatType > 0) beatType = nextBeatType
      const nextFifths = textOf(attrs, 'key > fifths')
      if (nextFifths) fifths = nextFifths
    }

    let durationDivisions = 0
    let noteCount = 0
    let restCount = 0
    let chordToneCount = 0
    const pitches = []

    for (const note of measure.querySelectorAll('note')) {
      const isChordTone = Boolean(note.querySelector('chord'))
      const isRest = Boolean(note.querySelector('rest'))
      const duration = Number(textOf(note, 'duration') || 0)
      if (!isChordTone && Number.isFinite(duration)) durationDivisions += duration
      if (isChordTone) chordToneCount += 1
      if (isRest) restCount += 1
      else noteCount += 1
      const pitch = parsePitch(note)
      if (pitch && pitches.length < 18) pitches.push(pitch)
    }

    const writtenQuarterBeats = divisions > 0 ? durationDivisions / divisions : 0
    const expectedQuarterBeats = beats * (4 / beatType)
    const visibleNumber = measure.getAttribute('number') || String(index + 1)

    return {
      measure: visibleNumber,
      expectedQuarterBeats: Number(expectedQuarterBeats.toFixed(3)),
      writtenQuarterBeats: Number(writtenQuarterBeats.toFixed(3)),
      notes: noteCount,
      rests: restCount,
      chordTones: chordToneCount,
      pitches,
      dynamics: [...new Set(measureDynamics(measure))].slice(0, 6),
      articulations: [...new Set(measureArticulations(measure))].slice(0, 6),
    }
  })

  return {
    measures,
    measureFacts,
    timeSignature: `${beats}/${beatType}`,
    keyFifths: fifths,
  }
}

function scorePartMetadata(doc) {
  const byId = new Map()
  for (const scorePart of doc.querySelectorAll('part-list score-part')) {
    const id = scorePart.getAttribute('id') || ''
    byId.set(id, {
      id,
      name: textOf(scorePart, 'part-name'),
      abbreviation: textOf(scorePart, 'part-abbreviation'),
      instrumentName: textOf(scorePart, 'score-instrument instrument-name'),
    })
  }
  return byId
}

function u16(view, offset) {
  return view.getUint16(offset, true)
}

function u32(view, offset) {
  return view.getUint32(offset, true)
}

function findZipEnd(view) {
  const min = Math.max(0, view.byteLength - 65557)
  for (let i = view.byteLength - 22; i >= min; i--) {
    if (u32(view, i) === 0x06054b50) return i
  }
  return -1
}

function parseZipEntries(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const eocd = findZipEnd(view)
  if (eocd < 0) return []

  const entryCount = u16(view, eocd + 10)
  let offset = u32(view, eocd + 16)
  const entries = []

  for (let i = 0; i < entryCount && offset + 46 <= bytes.length; i++) {
    if (u32(view, offset) !== 0x02014b50) break

    const method = u16(view, offset + 10)
    const compressedSize = u32(view, offset + 20)
    const fileNameLength = u16(view, offset + 28)
    const extraLength = u16(view, offset + 30)
    const commentLength = u16(view, offset + 32)
    const localHeaderOffset = u32(view, offset + 42)
    const nameStart = offset + 46
    const name = textDecoder.decode(bytes.slice(nameStart, nameStart + fileNameLength))

    if (localHeaderOffset + 30 <= bytes.length && u32(view, localHeaderOffset) === 0x04034b50) {
      const localNameLength = u16(view, localHeaderOffset + 26)
      const localExtraLength = u16(view, localHeaderOffset + 28)
      const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength
      const dataEnd = dataStart + compressedSize
      if (dataEnd <= bytes.length) {
        entries.push({ name, method, data: bytes.slice(dataStart, dataEnd) })
      }
    }

    offset = nameStart + fileNameLength + extraLength + commentLength
  }

  return entries
}

async function inflateZipData(entry) {
  if (entry.method === 0) return entry.data
  if (entry.method !== 8 || !window.DecompressionStream) return null

  const stream = new Blob([entry.data])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

async function readZipText(entry) {
  const inflated = await inflateZipData(entry)
  return inflated ? textDecoder.decode(inflated) : null
}

async function readMxlXml(file) {
  if (!file || file.size > 25 * 1024 * 1024) return null

  try {
    const entries = parseZipEntries(new Uint8Array(await file.arrayBuffer()))
    if (!entries.length) return null

    const containerEntry = entries.find(entry => entry.name.toLowerCase() === 'meta-inf/container.xml')
    let rootPath = ''
    if (containerEntry) {
      const containerXml = await readZipText(containerEntry)
      if (containerXml) {
        const containerDoc = new DOMParser().parseFromString(containerXml, 'application/xml')
        rootPath = containerDoc.querySelector('rootfile')?.getAttribute('full-path') ?? ''
      }
    }

    const scoreEntry = entries.find(entry => entry.name === rootPath)
      || entries.find(entry => /\.(musicxml|xml)$/i.test(entry.name) && !/container\.xml$/i.test(entry.name))
    return scoreEntry ? readZipText(scoreEntry) : null
  } catch {
    return null
  }
}

export async function extractScoreFacts(scoreFile) {
  if (!scoreFile || (!fileLooksLikeXml(scoreFile) && !fileLooksLikeMxl(scoreFile))) return null

  try {
    const xml = fileLooksLikeMxl(scoreFile) && !fileLooksLikeXml(scoreFile)
      ? await readMxlXml(scoreFile)
      : await scoreFile.text()
    if (!xml) return null
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return null

    const scorePartwise = doc.querySelector('score-partwise, score-timewise')
    if (!scorePartwise) return null

    const title = textOf(doc, 'work-title') || textOf(doc, 'movement-title')
    const composer = [...doc.querySelectorAll('identification creator')]
      .find(el => /composer/i.test(el.getAttribute('type') ?? ''))?.textContent?.trim()
      || textOf(doc, 'identification creator')

    const partMetadata = scorePartMetadata(doc)
    const parsedParts = [...doc.querySelectorAll('part')].slice(0, 24).map((part, index) => {
      const id = part.getAttribute('id') || ''
      const metadata = partMetadata.get(id) || { id, name: `Part ${index + 1}`, abbreviation: '', instrumentName: '' }
      const parsed = parsePartMeasures(part)
      return {
        ...metadata,
        measureCount: parsed.measures.length,
        timeSignature: parsed.timeSignature,
        keyFifths: parsed.keyFifths,
        measures: parsed.measureFacts,
      }
    })

    const fallbackParsed = parsePartMeasures(null, [...doc.querySelectorAll('measure')])
    const primaryPart = parsedParts[0]
    const measureFacts = primaryPart?.measures ?? fallbackParsed.measureFacts

    return {
      source: 'musicxml',
      title,
      composer,
      measureCount: primaryPart?.measureCount ?? fallbackParsed.measures.length,
      timeSignature: primaryPart?.timeSignature ?? fallbackParsed.timeSignature,
      keyFifths: primaryPart?.keyFifths ?? fallbackParsed.keyFifths,
      measures: measureFacts,
      parts: parsedParts,
    }
  } catch {
    return null
  }
}

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

export async function extractAudioFeatures(videoFile) {
  if (!videoFile || videoFile.size > 90 * 1024 * 1024) return null
  const AudioCtx = window.AudioContext || window.webkitAudioContext
  if (!AudioCtx) return null

  let audioCtx = null
  try {
    audioCtx = new AudioCtx()
    const buffer = await audioCtx.decodeAudioData(await videoFile.arrayBuffer())
    const sampleRate = buffer.sampleRate
    const channelCount = buffer.numberOfChannels
    const duration = buffer.duration
    const hopSeconds = 0.1
    const windowSeconds = 0.06
    const hop = Math.max(1, Math.round(sampleRate * hopSeconds))
    const win = Math.max(1, Math.round(sampleRate * windowSeconds))
    const rms = []

    for (let start = 0; start + win < buffer.length; start += hop) {
      let sum = 0
      for (let i = 0; i < win; i++) {
        let sample = 0
        for (let ch = 0; ch < channelCount; ch++) sample += buffer.getChannelData(ch)[start + i] || 0
        sample /= channelCount
        sum += sample * sample
      }
      rms.push(Math.sqrt(sum / win))
    }

    const floor = median(rms) * 0.55
    const activeThreshold = Math.max(floor * 1.8, 0.008)
    const meanRms = rms.reduce((sum, v) => sum + v, 0) / Math.max(1, rms.length)
    const maxRms = Math.max(...rms, 0)
    const activeFrames = rms.filter(v => v >= activeThreshold).length
    const firstActiveFrame = rms.findIndex(v => v >= activeThreshold)
    const lastActiveFrame = rms.length - 1 - [...rms].reverse().findIndex(v => v >= activeThreshold)
    const activeStart = firstActiveFrame >= 0 ? firstActiveFrame * hopSeconds : 0
    const activeEnd = lastActiveFrame >= 0 ? Math.min(duration, (lastActiveFrame + 1) * hopSeconds) : duration
    const onsets = []
    const silences = []

    let silenceStart = null
    for (let i = 1; i < rms.length; i++) {
      const time = Number((i * hopSeconds).toFixed(2))
      const prev = rms[i - 1]
      const cur = rms[i]
      const delta = cur - prev
      const isActive = cur >= activeThreshold
      const isOnset = isActive && delta > Math.max(activeThreshold * 0.75, meanRms * 0.45)
      if (isOnset && (onsets.length === 0 || time - onsets[onsets.length - 1].time > 0.18)) {
        onsets.push({ time, strength: Number(delta.toFixed(5)) })
      }
      if (!isActive && silenceStart == null) silenceStart = time
      if (isActive && silenceStart != null) {
        if (time - silenceStart >= 0.45) {
          silences.push({ start: Number(silenceStart.toFixed(2)), end: time })
        }
        silenceStart = null
      }
    }
    if (silenceStart != null && duration - silenceStart >= 0.45) {
      silences.push({ start: Number(silenceStart.toFixed(2)), end: Number(duration.toFixed(2)) })
    }

    return {
      source: 'web-audio',
      duration: Number(duration.toFixed(2)),
      sampleRate,
      channelCount,
      meanRms: Number(meanRms.toFixed(5)),
      maxRms: Number(maxRms.toFixed(5)),
      activeRatio: Number((activeFrames / Math.max(1, rms.length)).toFixed(3)),
      activeStart: Number(activeStart.toFixed(2)),
      activeEnd: Number(activeEnd.toFixed(2)),
      activeDuration: Number(Math.max(0, activeEnd - activeStart).toFixed(2)),
      leadingSilence: Number(activeStart.toFixed(2)),
      trailingSilence: Number(Math.max(0, duration - activeEnd).toFixed(2)),
      onsetCount: onsets.length,
      onsetCandidates: onsets.slice(0, 140),
      silenceSegments: silences.slice(0, 40),
    }
  } catch {
    return null
  } finally {
    if (audioCtx?.close) audioCtx.close().catch(() => {})
  }
}
