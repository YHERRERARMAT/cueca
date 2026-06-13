import { ComposedCueca, CuecaNote, CuecaChord } from "../types";
import { pitchToMidi } from "./midiWriter";

// Convert MIDI number to Frequency
export function midiToFreq(note: number): number {
  return 440 * Math.pow(2, (note - 69) / 12);
}

// Chord frequency mapper for Cueca guitar backing
export function getChordNotes(chordStr: string): number[] {
  const rootMap: Record<string, number> = {
    c: 48, "c#": 49, db: 49, d: 50, "d#": 51, eb: 51, e: 40, f: 41, "f#": 42, gb: 42,
    g: 43, "g#": 44, ab: 44, a: 45, "a#": 46, bb: 46, b: 47
  };
  
  const symbol = chordStr.trim().toLowerCase();
  let rootName = symbol.substring(0, 1);
  let index = 1;
  if (symbol[1] === "#" || symbol[1] === "b") {
    rootName += symbol[1];
    index = 2;
  }
  
  let root = rootMap[rootName] || 48;
  const suffix = symbol.substring(index);
  
  // Basic intervals from root MIDI note
  let intervals = [0, 4, 7, 12]; // Major chord
  if (suffix.includes("m")) {
    intervals = [0, 3, 7, 12]; // Minor chord
  }
  if (suffix.includes("7")) {
    intervals.push(10); // Dominant 7th
  }
  
  return intervals.map(semitones => midiToFreq(root + semitones));
}

// Simple WAV File Encoder (Stereo, 16-bit, 44.1kHz PCM WAV)
export function encodeWAV(audioBuffer: AudioBuffer): Blob {
  const numOfChan = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // 1 = raw PCM (unsigned shorts)
  const bitDepth = 16;
  
  let result;
  if (numOfChan === 2) {
    const lChannel = audioBuffer.getChannelData(0);
    const rChannel = audioBuffer.getChannelData(1);
    const length = lChannel.length + rChannel.length;
    result = new Int16Array(length);
    let index = 0;
    let inputIndex = 0;
    while (index < length) {
      // Input float data is between -1.0 and 1.0, convert to 16-bit short
      let lVal = Math.max(-1, Math.min(1, lChannel[inputIndex]));
      let rVal = Math.max(-1, Math.min(1, rChannel[inputIndex]));
      result[index++] = lVal < 0 ? lVal * 0x8000 : lVal * 0x7FFF;
      result[index++] = rVal < 0 ? rVal * 0x8000 : rVal * 0x7FFF;
      inputIndex++;
    }
  } else {
    const channel = audioBuffer.getChannelData(0);
    const length = channel.length;
    result = new Int16Array(length);
    for (let i = 0; i < length; i++) {
      let val = Math.max(-1, Math.min(1, channel[i]));
      result[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
    }
  }
  
  const buffer = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(buffer);
  
  /* RIFF identifier */
  writeString(view, 0, "RIFF");
  /* file length */
  view.setUint32(4, 36 + result.length * 2, true);
  /* RIFF type */
  writeString(view, 8, "WAVE");
  /* format chunk identifier */
  writeString(view, 12, "fmt ");
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, format, true);
  /* channel count */
  view.setUint16(22, numOfChan, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate (sample rate * block align) */
  view.setUint32(28, sampleRate * numOfChan * (bitDepth / 8), true);
  /* block align (channel count * bytes per sample) */
  view.setUint16(32, numOfChan * (bitDepth / 8), true);
  /* bits per sample */
  view.setUint16(34, bitDepth, true);
  /* data chunk identifier */
  writeString(view, 36, "data");
  /* data chunk length */
  view.setUint32(40, result.length * 2, true);
  
  // Write floatPCM data converted into 16-bit signed INT bytes
  const lng = result.length;
  let index = 44;
  for (let i = 0; i < lng; i++) {
    view.setInt16(index, result[i], true);
    index += 2;
  }
  
  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

// -------------------------------------------------------------
// Interactive Playback Engine & Offline Synthesis Renderer
// -------------------------------------------------------------
let activeAudioCtx: AudioContext | null = null;
let activeNodes: any[] = [];
let playbackTimeoutId: any = null;

export function stopCuecaPlayback() {
  if (playbackTimeoutId) {
    clearTimeout(playbackTimeoutId);
    playbackTimeoutId = null;
  }
  if (activeNodes.length > 0) {
    activeNodes.forEach(node => {
      try { node.stop(); } catch(e){}
    });
    activeNodes = [];
  }
  if (activeAudioCtx) {
    activeAudioCtx.close();
    activeAudioCtx = null;
  }
}

// Schedules a single note on any audio context (live or offline)
function scheduleNoteSynthesis(
  ctx: BaseAudioContext,
  masterGain: AudioNode,
  note: CuecaNote,
  startTime: number,
  duration: number,
  accompanimentTimbre: string = "acordeon",
  transposeSemits: number = 0
) {
  const midi = pitchToMidi(note.pitch) + transposeSemits;
  const freq = midiToFreq(midi);
  
  if (note.instrument === "voz") {
    // --- Vocal Whistle / Hum Synth ---
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const gainNode = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.value = freq;
    
    // Vibrato
    vibrato.frequency.value = 6.0; // 6 Hz vibrato
    vibratoGain.gain.value = 4.5;   // Pitch modulation range
    
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    
    // Envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.04);
    gainNode.gain.setValueAtTime(0.18, startTime + duration - 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
    
    // Connect vibrato
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    
    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(startTime);
    vibrato.start(startTime);
    osc.stop(startTime + duration);
    vibrato.stop(startTime + duration);
    
    activeNodes.push(osc, vibrato);
    
  } else if (note.instrument === "acordeon") {
    if (accompanimentTimbre === "arpa") {
      // --- Harp Synth (Sine + Triangle with fast decay) ---
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc1.type = "sine";
      osc1.frequency.value = freq;
      
      osc2.type = "triangle";
      osc2.frequency.value = freq * 2; // subtle high octave
      
      filter.type = "lowpass";
      filter.frequency.value = 1500;
      
      // Plucked envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.18, startTime + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 1.2));
      gainNode.gain.setValueAtTime(0, startTime + duration);
      
      // Connect
      const subGain = ctx.createGain();
      subGain.gain.value = 0.3;
      
      osc1.connect(filter);
      osc2.connect(subGain);
      subGain.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
      
      activeNodes.push(osc1, osc2);
    } else if (accompanimentTimbre === "guitarra") {
      // --- Acoustic Guitar Synth (Triangle and lowpass sweep) ---
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc.type = "triangle";
      osc.frequency.value = freq;
      
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, startTime);
      filter.frequency.exponentialRampToValueAtTime(400, startTime + Math.min(duration, 0.4));
      
      // Pluck Envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.16, startTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + Math.min(duration, 0.9));
      gainNode.gain.setValueAtTime(0, startTime + duration);
      
      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
      
      activeNodes.push(osc);
    } else if (accompanimentTimbre === "piano") {
      // --- Piano Synth (Triangle + detuned Triangle for chorus effect) ---
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc1.type = "triangle";
      osc1.frequency.value = freq;
      
      osc2.type = "triangle";
      osc2.frequency.value = freq * 1.002; // Chorus effect
      
      filter.type = "lowpass";
      filter.frequency.value = 1800;
      
      // Piano decaying envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + Math.min(duration, 1.5));
      gainNode.gain.setValueAtTime(0, startTime + duration);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
      
      activeNodes.push(osc1, osc2);
    } else {
      // Default: --- Accordion Synth (double detuned pulse/sawwave) ---
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      
      osc1.type = "sawtooth";
      osc1.frequency.value = freq - 0.7; // slight detuning
      
      osc2.type = "sawtooth";
      osc2.frequency.value = freq + 0.7; // slight detuning
      
      filter.type = "bandpass";
      filter.frequency.value = 1500;
      filter.Q.value = 1.0;
      
      // Envelope
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.12, startTime + 0.05);
      gainNode.gain.setValueAtTime(0.12, startTime + duration - 0.08);
      gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
      
      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(masterGain);
      
      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(startTime + duration);
      osc2.stop(startTime + duration);
      
      activeNodes.push(osc1, osc2);
    }
  }
}

// Schedules a guitar chord strumming pattern and traditional claps / tormento percussion clicks
function scheduleCuecaChordsAndPalmas(
  ctx: BaseAudioContext,
  masterGain: AudioNode,
  chords: CuecaChord[],
  bpm: number,
  totalDurationSeconds: number,
  transposeSemits: number = 0
) {
  const beatDurationSeconds = 60 / bpm; // In 6/8, each beat is an eighth note
  
  // 1. Palmas (Claps/Percussion clicks in traditional cueca 6/8 syncopation)
  // Let's create a red/white noise burst for standard hand claps on beats
  const clapBuffersize = ctx.sampleRate * 0.1; // 100ms
  const noiseBuffer = ctx.createBuffer(1, clapBuffersize, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < clapBuffersize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  // Traditional claps in 6/8 click: syncopated beats 1, 3, 4, 6
  const numEighthNotes = Math.floor(totalDurationSeconds / beatDurationSeconds);
  for (let b = 0; b < numEighthNotes; b++) {
    const isClapBeat = (b % 6 === 0 || b % 6 === 2 || b % 6 === 3 || b % 6 === 5);
    if (isClapBeat) {
      const clapTime = b * beatDurationSeconds;
      
      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = noiseBuffer;
      
      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = "highpass";
      noiseFilter.frequency.value = 1400;
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08, clapTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, clapTime + 0.06);
      
      noiseNode.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(masterGain);
      
      noiseNode.start(clapTime);
      noiseNode.stop(clapTime + 0.08);
    }
  }

  // 2. Guitar Chords Strumming
  chords.forEach((chord) => {
    const chordFrequencies = getChordNotes(chord.chordSymbol);
    const chordStartSec = chord.timeBeats * beatDurationSeconds;
    const chordDurationSec = chord.durationBeats * beatDurationSeconds;
    
    // We strum on eighth-note boundaries in 6/8:
    // e.g., if chord starts at 0 and lasts 6 beats, we strum every major rhythm unit with arpeggiation
    const strumIntervalSec = beatDurationSeconds * 2; // strum every quarter note equivalent
    let currentStrumTime = chordStartSec;
    const chordEndSec = chordStartSec + chordDurationSec;
    
    while (currentStrumTime < chordEndSec - 0.01) {
      // Generate individual strings pluck notes, slightly delayed to make a "strum"
      chordFrequencies.forEach((freq, idx) => {
        const strumDelay = idx * 0.012; // 12ms delay per string
        const pluckTime = currentStrumTime + strumDelay;
        
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = "triangle";
        // Apply transposition to chord frequencies
        osc.frequency.value = freq * Math.pow(2, transposeSemits / 12);
        
        // Classic acoustic string pluck sound envelope: snappy attack, decaying body
        gainNode.gain.setValueAtTime(0, pluckTime);
        gainNode.gain.linearRampToValueAtTime(0.08, pluckTime + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.001, pluckTime + 0.45);
        
        const filt = ctx.createBiquadFilter();
        filt.type = "lowpass";
        filt.frequency.setValueAtTime(1400, pluckTime);
        filt.frequency.exponentialRampToValueAtTime(300, pluckTime + 0.4);
        
        osc.connect(filt);
        filt.connect(gainNode);
        gainNode.connect(masterGain);
        
        osc.start(pluckTime);
        osc.stop(pluckTime + 0.5);
      });
      
      currentStrumTime += strumIntervalSec;
    }
  });
}

// Real-time Playback with visual beat ticker
export function playCuecaInteractive(
  cueca: ComposedCueca,
  onBeatUpdate: (beat: number) => void,
  accompanimentTimbre: string = "acordeon",
  transposeSemits: number = 0
) {
  stopCuecaPlayback();
  
  const ctx = new AudioContext();
  activeAudioCtx = ctx;
  
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0.85, ctx.currentTime);
  masterGain.connect(ctx.destination);
  
  const bpm = cueca.tempoBpm;
  const beatDurationSeconds = 60 / bpm; // Duration of one eighth note
  
  // Find maximum song beats
  const maxBeats = Math.max(...cueca.melodyJson.map(n => n.timeBeats + n.durationBeats), 24);
  const totalDurationSec = maxBeats * beatDurationSeconds;
  
  // Schedule all melody notes
  cueca.melodyJson.forEach((note) => {
    const startTime = ctx.currentTime + (note.timeBeats * beatDurationSeconds);
    const duration = note.durationBeats * beatDurationSeconds;
    scheduleNoteSynthesis(ctx, masterGain, note, startTime, duration, accompanimentTimbre, transposeSemits);
  });
  
  // Schedule full guitar chords strumming & percussion palmas
  scheduleCuecaChordsAndPalmas(ctx, masterGain, cueca.chordProgression, bpm, totalDurationSec, transposeSemits);
  
  // Trigger onBeatUpdate events sequentially in sync with time using standard setInterval/setTimeout loop
  let currentTickBeat = 0;
  const playTicker = () => {
    if (!activeAudioCtx || activeAudioCtx !== ctx) return;
    if (currentTickBeat < maxBeats) {
      onBeatUpdate(currentTickBeat);
      currentTickBeat++;
      playbackTimeoutId = setTimeout(playTicker, beatDurationSeconds * 1000);
    } else {
      onBeatUpdate(-1); // Finished
    }
  };
  
  playTicker();
}

// Offline Audio Context synthesis to compile Wav file
export async function renderCuecaWav(
  cueca: ComposedCueca, 
  accompanimentTimbre: string = "acordeon",
  transposeSemits: number = 0
): Promise<Blob> {
  const bpm = cueca.tempoBpm;
  const beatDurationSeconds = 60 / bpm;
  
  const maxBeats = Math.max(...cueca.melodyJson.map(n => n.timeBeats + n.durationBeats), 24);
  const totalDurationSec = maxBeats * beatDurationSeconds + 1.2; // adding 1.2s padding for reverb ring
  
  const sampleRate = 44100;
  const offlineCtx = new OfflineAudioContext(2, Math.ceil(sampleRate * totalDurationSec), sampleRate);
  
  const masterGain = offlineCtx.createGain();
  masterGain.gain.setValueAtTime(0.85, 0);
  masterGain.connect(offlineCtx.destination);
  
  // 1. Schedule Melody Notes
  cueca.melodyJson.forEach((note) => {
    const startTime = note.timeBeats * beatDurationSeconds;
    const duration = note.durationBeats * beatDurationSeconds;
    scheduleNoteSynthesis(offlineCtx, masterGain, note, startTime, duration, accompanimentTimbre, transposeSemits);
  });
  
  // 2. Schedule Chords and Palmas
  scheduleCuecaChordsAndPalmas(offlineCtx, masterGain, cueca.chordProgression, bpm, totalDurationSec, transposeSemits);
  
  // Render synthesis to AudioBuffer
  const renderedBuffer = await offlineCtx.startRendering();
  
  // Encode buffer into Stereo PCM 16-bit WAV blob
  return encodeWAV(renderedBuffer);
}
