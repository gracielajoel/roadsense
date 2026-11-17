// Peringatan suara + getar saat ada kerusakan berbahaya (lubang / SEV-1).
// Bunyi dibuat dengan Web Audio API (tanpa file audio). AudioContext harus dibuat
// dari gestur user (klik tombol Start), kalau tidak browser HP membisukannya.

const COOLDOWN_MS = 2500 // jangan bunyi beruntun untuk lubang yang sama
const VOICE_TEXT = 'Awas, lubang di depan'

export function createAlerter() {
  let ctx = null
  let enabled = true
  let lastAt = 0

  const unlock = () => {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()
      if (ctx.state === 'suspended') ctx.resume()
    } catch {
      ctx = null // browser tanpa Web Audio: peringatan tetap tampil visual
    }
  }

  // Tiga bip tinggi cepat, gaya alarm mobil
  const beep = () => {
    if (!ctx) return
    const t0 = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'square'
      osc.frequency.value = 1040
      const t = t0 + i * 0.16
      gain.gain.setValueAtTime(0.0001, t)
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
      osc.connect(gain).connect(ctx.destination)
      osc.start(t)
      osc.stop(t + 0.12)
    }
  }

  const speak = () => {
    const synth = window.speechSynthesis
    if (!synth) return
    const u = new SpeechSynthesisUtterance(VOICE_TEXT)
    u.lang = 'id-ID'
    u.rate = 1.1
    const id = synth.getVoices().find((v) => v.lang?.toLowerCase().startsWith('id'))
    if (id) u.voice = id
    synth.cancel()
    synth.speak(u)
  }

  // Return true kalau peringatan benar-benar dibunyikan (tidak sedang cooldown)
  const pothole = () => {
    const now = Date.now()
    if (now - lastAt < COOLDOWN_MS) return false
    lastAt = now
    navigator.vibrate?.([180, 80, 180])
    if (enabled) {
      beep()
      setTimeout(speak, 450)
    }
    // Untuk rekaman demo / pengujian: halaman lain bisa mendengarkan event ini
    window.dispatchEvent(new CustomEvent('roadsense:alert', { detail: { type: 'pothole', sound: enabled, at: now } }))
    return true
  }

  return {
    unlock,
    pothole,
    setEnabled: (v) => {
      enabled = v
      if (!v) window.speechSynthesis?.cancel()
    },
    close: () => {
      window.speechSynthesis?.cancel()
      ctx?.close().catch(() => {})
      ctx = null
    },
  }
}
