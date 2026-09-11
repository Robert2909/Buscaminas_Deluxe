/**
 * Minesweeper Deluxe - Audio Engine
 * Pure Web Audio API Sound Synthesizer (No external assets required)
 */

class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        this.volume = 0.6;
        this.cascadeStep = 0;
        this.lastCascadeTime = 0;

        // Cargar preferencias con validación robusta
        const savedMute = localStorage.getItem('minesweeper_deluxe_mute');
        if (savedMute !== null) {
            this.enabled = savedMute !== 'true';
        }
        const savedVol = localStorage.getItem('minesweeper_deluxe_volume');
        if (savedVol !== null) {
            const v = parseFloat(savedVol);
            this.volume = (!isNaN(v) && v >= 0 && v <= 1) ? v : 0.6;
        }
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setMuted(muted) {
        this.enabled = !muted;
        localStorage.setItem('minesweeper_deluxe_mute', muted ? 'true' : 'false');
    }

    setVolume(val) {
        this.volume = Math.max(0, Math.min(1, val));
        localStorage.setItem('minesweeper_deluxe_volume', this.volume.toString());
    }

    getMasterGain(duration = 0.5) {
        if (!this.ctx || !this.enabled) return null;
        const gainNode = this.ctx.createGain();
        gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        gainNode.connect(this.ctx.destination);
        return gainNode;
    }

    /**
     * Sonido orgánico de desentierro / clic (Pop de tierra / césped)
     */
    playDig(pitchVariation = 1.0) {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const master = this.getMasterGain();
        if (!master) return;

        // Oscilador para cuerpo del pop
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        const startFreq = 340 * pitchVariation;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        gain.gain.setValueAtTime(0.4 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.09);

        // Toque de ruido suave para textura táctil
        this.playNoiseClick(now, master, 0.04, 0.15);
    }

    /**
     * Ruido percusivo para textura de clic
     */
    playNoiseClick(time, destination, duration = 0.03, level = 0.1) {
        if (!this.ctx) return;
        const bufferSize = Math.floor(this.ctx.sampleRate * duration);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.3));
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400, time);
        filter.Q.setValueAtTime(2.0, time);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(level * this.volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(destination);

        noise.start(time);
        noise.stop(time + duration);
    }

    /**
     * Cascada melódica arpegiada cuando se despeja un área vacía (estilo Google)
     */
    playCascadeNote() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        if (now - this.lastCascadeTime > 0.45) {
            this.cascadeStep = 0;
        }
        this.lastCascadeTime = now;

        // Escala pentatónica mayor suave y alegre (Do, Re, Mi, Sol, La)
        const scale = [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99, 880.00];
        const freq = scale[this.cascadeStep % scale.length];
        this.cascadeStep = Math.min(this.cascadeStep + 1, scale.length - 1);

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);

        const noteVol = 0.22 * this.volume;
        gain.gain.setValueAtTime(noteVol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        const master = this.ctx.destination;
        osc.connect(gain);
        gain.connect(master);

        osc.start(now);
        osc.stop(now + 0.17);
    }

    /**
     * Colocar bandera (Campanilla cristalina o clavado nítido)
     */
    playFlag() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';

        // Acorde alegre de campanilla aguda
        osc1.frequency.setValueAtTime(880, now);
        osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.05); // La5 -> Re6

        osc2.frequency.setValueAtTime(1760, now);

        gain.gain.setValueAtTime(0.28 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.21);
        osc2.stop(now + 0.21);
    }

    /**
     * Quitar bandera
     */
    playUnflag() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(350, now + 0.09);

        gain.gain.setValueAtTime(0.2 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.1);
    }

    /**
     * Sonido de acorde (Chording / doble clic que abre múltiples)
     */
    playChord() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(660, now + 0.06);

        gain.gain.setValueAtTime(0.3 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.09);
    }

    /**
     * Explosión de mina (Bajo profundo + ruido blanco filtrado con decaimiento)
     */
    playExplosion() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const now = this.ctx.currentTime;

        // 1. Golpe de bajo grave
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        subOsc.type = 'sawtooth';
        subOsc.frequency.setValueAtTime(130, now);
        subOsc.frequency.exponentialRampToValueAtTime(30, now + 0.45);

        subGain.gain.setValueAtTime(0.6 * this.volume, now);
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        subOsc.connect(subGain);
        subGain.connect(this.ctx.destination);
        subOsc.start(now);
        subOsc.stop(now + 0.52);

        // 2. Ruido explosivo estallido
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.6);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(900, now);
        filter.frequency.linearRampToValueAtTime(150, now + 0.5);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.55 * this.volume, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        noise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.62);
    }

    /**
     * Fanfarria de victoria triunfal (Arpegio orquestal brillante)
     */
    playVictory() {
        this.init();
        if (!this.ctx || !this.enabled) return;

        const notes = [
            { f: 523.25, d: 0.12, t: 0 },       // C5
            { f: 659.25, d: 0.12, t: 0.11 },    // E5
            { f: 783.99, d: 0.12, t: 0.22 },    // G5
            { f: 1046.50, d: 0.45, t: 0.33 }    // C6
        ];

        const now = this.ctx.currentTime;

        notes.forEach(note => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note.f, now + note.t);

            const startT = now + note.t;
            gain.gain.setValueAtTime(0.001, startT);
            gain.gain.linearRampToValueAtTime(0.35 * this.volume, startT + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, startT + note.d);

            osc.connect(gain);
            gain.connect(this.ctx.destination);

            osc.start(startT);
            osc.stop(startT + note.d + 0.05);
        });

        // Tono armónico shimmer
        setTimeout(() => {
            if (!this.ctx || !this.enabled) return;
            const t2 = this.ctx.currentTime;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1318.51, t2); // E6
            gain.gain.setValueAtTime(0.2 * this.volume, t2);
            gain.gain.exponentialRampToValueAtTime(0.001, t2 + 0.6);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t2);
            osc.stop(t2 + 0.65);
        }, 340);
    }
}

window.soundEngine = new SoundEngine();
