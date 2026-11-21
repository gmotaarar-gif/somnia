export type SoundMode = "off" | "rain" | "pink" | "drone"

class ProceduralAudioEngine {
  private ctx: AudioContext | null = null
  private masterGain: GainNode | null = null
  private activeNodes: AudioNode[] = []
  private currentMode: SoundMode = "off"
  private volume = 0.35

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return null
      this.ctx = new AudioCtx()
      this.masterGain = this.ctx.createGain()
      this.masterGain.gain.value = 0.0001
      this.masterGain.connect(this.ctx.destination)
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  private clearActiveNodes() {
    for (const node of this.activeNodes) {
      try {
        if ("stop" in node && typeof (node as AudioScheduledSourceNode).stop === "function") {
          ;(node as AudioScheduledSourceNode).stop()
        }
        node.disconnect()
      } catch {
        // ignore already stopped nodes
      }
    }
    this.activeNodes = []
  }

  startSound(mode: SoundMode) {
    if (mode === "off") {
      this.stopSound()
      return
    }
    if (this.currentMode === mode && this.activeNodes.length > 0) {
      this.ensureContext()
      return
    }

    const ctx = this.ensureContext()
    if (!ctx || !this.masterGain) return

    this.clearActiveNodes()
    this.currentMode = mode

    const now = ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now)
    this.masterGain.gain.exponentialRampToValueAtTime(Math.max(0.01, this.volume), now + 0.8)

    if (mode === "pink" || mode === "rain") {
      const bufferSize = ctx.sampleRate * 3
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)

      let b0 = 0,
        b1 = 0,
        b2 = 0,
        b3 = 0,
        b4 = 0,
        b5 = 0,
        b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08
        b6 = white * 0.115926
      }

      const noise = ctx.createBufferSource()
      noise.buffer = noiseBuffer
      noise.loop = true

      const filter = ctx.createBiquadFilter()
      if (mode === "rain") {
        filter.type = "bandpass"
        filter.frequency.value = 880
        filter.Q.value = 0.55

        const lfo = ctx.createOscillator()
        const lfoGain = ctx.createGain()
        lfo.frequency.value = 0.14
        lfoGain.gain.value = 260
        lfo.connect(lfoGain)
        lfoGain.connect(filter.frequency)
        lfo.start()
        this.activeNodes.push(lfo, lfoGain)
      } else {
        filter.type = "lowpass"
        filter.frequency.value = 520
      }

      noise.connect(filter)
      filter.connect(this.masterGain)
      noise.start()
      this.activeNodes.push(noise, filter)
    } else if (mode === "drone") {
      // Warm 432Hz + 216Hz + 324Hz harmonic calm pad
      const freqs = [216, 324, 432]
      freqs.forEach((f, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = idx === 0 ? "sine" : "triangle"
        osc.frequency.value = f + (idx === 2 ? 0.5 : 0)
        gain.gain.value = idx === 0 ? 0.45 : idx === 1 ? 0.2 : 0.15

        const lowpass = ctx.createBiquadFilter()
        lowpass.type = "lowpass"
        lowpass.frequency.value = 620

        osc.connect(lowpass)
        lowpass.connect(gain)
        gain.connect(this.masterGain!)
        osc.start()
        this.activeNodes.push(osc, lowpass, gain)
      })
    }
  }

  stopSound() {
    this.currentMode = "off"
    if (!this.ctx || !this.masterGain) {
      this.clearActiveNodes()
      return
    }
    const now = this.ctx.currentTime
    this.masterGain.gain.cancelScheduledValues(now)
    this.masterGain.gain.setValueAtTime(Math.max(0.0001, this.masterGain.gain.value), now)
    this.masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35)
    setTimeout(() => {
      if (this.currentMode === "off") {
        this.clearActiveNodes()
      }
    }, 380)
  }

  setSoundVolume(vol: number) {
    this.volume = Math.max(0.001, Math.min(1, vol))
    if (this.ctx && this.masterGain && this.currentMode !== "off") {
      const now = this.ctx.currentTime
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.12)
    }
  }
}

export const audioEngine = new ProceduralAudioEngine()

export function startSound(mode: SoundMode) {
  audioEngine.startSound(mode)
}

export function stopSound() {
  audioEngine.stopSound()
}

export function setSoundVolume(v: number) {
  audioEngine.setSoundVolume(v)
}
