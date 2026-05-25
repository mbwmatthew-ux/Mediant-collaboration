let _ctx = null

function ac() {
  if (!_ctx) _ctx = new (window.AudioContext || window.webkitAudioContext)()
  if (_ctx.state === 'suspended') _ctx.resume()
  return _ctx
}

function play(fn) {
  try { fn(ac()) } catch {}
}

// Soft pop — primary button clicks
export function playPop() {
  play(c => {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    const t = c.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(500, t)
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.09)
    gain.gain.setValueAtTime(0.12, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
    osc.start(t)
    osc.stop(t + 0.12)
  })
}

// Light tick — list row taps
export function playTick() {
  play(c => {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    const t = c.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(900, t)
    osc.frequency.exponentialRampToValueAtTime(500, t + 0.045)
    gain.gain.setValueAtTime(0.07, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.06)
    osc.start(t)
    osc.stop(t + 0.07)
  })
}

// Subtle two-tone swish — sidebar navigation
export function playNav() {
  play(c => {
    [0, 0.055].forEach((delay, i) => {
      const osc  = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      const t = c.currentTime + delay
      osc.type = 'sine'
      osc.frequency.value = i === 0 ? 380 : 520
      gain.gain.setValueAtTime(0.07, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09)
      osc.start(t)
      osc.stop(t + 0.1)
    })
  })
}

// Musical chime — success / analysis complete (C-E-G)
export function playChime() {
  play(c => {
    [523, 659, 784].forEach((freq, i) => {
      const osc  = c.createOscillator()
      const gain = c.createGain()
      osc.connect(gain)
      gain.connect(c.destination)
      const t = c.currentTime + i * 0.09
      osc.type = 'sine'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0.09, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.45)
      osc.start(t)
      osc.stop(t + 0.5)
    })
  })
}

// Soft thud — dismiss / cancel
export function playThud() {
  play(c => {
    const osc  = c.createOscillator()
    const gain = c.createGain()
    osc.connect(gain)
    gain.connect(c.destination)
    const t = c.currentTime
    osc.type = 'sine'
    osc.frequency.setValueAtTime(180, t)
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.08)
    gain.gain.setValueAtTime(0.1, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.1)
    osc.start(t)
    osc.stop(t + 0.11)
  })
}
