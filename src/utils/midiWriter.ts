import { CuecaNote, CuecaChord } from "../types";

// Helper to convert scientific pitch notation (e.g. "G4", "C#5") to MIDI note number
export function pitchToMidi(pitchStr: string): number {
  const noteMap: Record<string, number> = {
    c: 0, "c#": 1, d: 2, "d#": 3, e: 4, f: 5, "f#": 6, g: 7, "g#": 8, a: 9, "a#": 10, b: 11,
    db: 1, eb: 3, gb: 6, ab: 8, bb: 10
  };
  
  const matches = pitchStr.trim().toLowerCase().match(/^([a-g]#?|db?|eb?|gb?|ab?|bb?)(\d+)$/);
  if (!matches) return 60; // Default C4 if unparseable
  
  const name = matches[1];
  const octave = parseInt(matches[2], 10);
  const semitones = noteMap[name] !== undefined ? noteMap[name] : 0;
  
  return (octave + 1) * 12 + semitones;
}

// Convert number to Variable-Length Quantity (VLQ) bytes used in MIDI files
function encodeVLQ(value: number): number[] {
  const bytes: number[] = [];
  let buffer = value & 0x7f;
  value = value >>> 7;
  bytes.push(buffer);
  
  while (value > 0) {
    buffer = (value & 0x7f) | 0x80;
    bytes.unshift(buffer);
    value = value >>> 7;
  }
  return bytes;
}

// Simple standard string to MIDI byte array helper
function stringToBytes(str: string): number[] {
  return Array.from(str).map(char => char.charCodeAt(0));
}

// Converts a composed Cueca structured data into a standard binary MIDI file buffer
export function generateCuecaMidi(notes: CuecaNote[], tempoBpm: number): Uint8Array {
  // Let's define the ticks-per-quarter-note (PQN).
  // In 6/8, an eighth note represents one division in our melodyJson.
  // Let's set 480 ticks per quarter note. An eighth note beat (duration = 1.0 in melodyJson) will be 240 ticks.
  const eighthNoteTicks = 240;
  const bpm = tempoBpm || 130;
  
  // We will build a multi-channel single track MIDI file (Format 0) for maximum compatibility and simplicity.
  // Track events list
  interface MidiEvent {
    tick: number;
    status: number;
    data: number[];
  }
  
  const events: MidiEvent[] = [];
  
  // 1. Set Tempo Meta Event (51 BPM)
  // Microseconds per quarter note: 60,000,000 / BPM
  const usPerQuarter = Math.round(60000000 / bpm);
  events.push({
    tick: 0,
    status: 0xFF, // Meta event
    data: [
      0x51, // Tempo type
      0x03, // length
      (usPerQuarter >> 16) & 0xFF,
      (usPerQuarter >> 8) & 0xFF,
      usPerQuarter & 0xFF
    ]
  });
  
  // 2. Set Time Signature Meta Event: 6/8 = [0x06, 0x03 (2^3=8), 0x18 (24 clocks/tick), 0x08]
  events.push({
    tick: 0,
    status: 0xFF,
    data: [0x58, 0x04, 0x06, 0x03, 0x18, 0x08]
  });
  
  // 3. Process note events for "voz" (Channel 0) and "acordeon" (Channel 1)
  notes.forEach((note) => {
    const channel = note.instrument === "acordeon" ? 1 : 0;
    const noteNum = pitchToMidi(note.pitch);
    const startTick = Math.round(note.timeBeats * eighthNoteTicks);
    const endTick = Math.round((note.timeBeats + note.durationBeats) * eighthNoteTicks);
    
    // Note On
    events.push({
      tick: startTick,
      status: 0x90 | channel, // Note On
      data: [noteNum, 0x60]  // Note, Velocity (96)
    });
    
    // Note Off
    events.push({
      tick: endTick,
      status: 0x80 | channel, // Note Off
      data: [noteNum, 0x00]   // Note, Velocity (0)
    });
  });

  // Sort events chronologically by absolute tick
  events.sort((a, b) => a.tick - b.tick);
  
  // Build the Track Data
  const trackData: number[] = [];
  let currentTick = 0;
  
  events.forEach((ev) => {
    const delta = ev.tick - currentTick;
    currentTick = ev.tick;
    
    // Write delta time
    trackData.push(...encodeVLQ(delta));
    
    // Write status and data
    trackData.push(ev.status);
    trackData.push(...ev.data);
  });
  
  // End of track event
  trackData.push(...encodeVLQ(0));
  trackData.push(0xFF, 0x2F, 0x00);
  
  // Core MID File Chunks
  const midiFile: number[] = [];
  
  // --- Header Chunk (MThd) ---
  midiFile.push(...stringToBytes("MThd"));
  midiFile.push(0, 0, 0, 6); // Chunk size (6)
  midiFile.push(0, 0);       // Format 0 (single track)
  midiFile.push(0, 1);       // Number of tracks (1)
  
  // Division: 480 ticks per quarter note
  const division = 480;
  midiFile.push((division >> 8) & 0xFF, division & 0xFF);
  
  // --- Track Chunk (MTrk) ---
  midiFile.push(...stringToBytes("MTrk"));
  const len = trackData.length;
  midiFile.push((len >> 24) & 0xFF, (len >> 16) & 0xFF, (len >> 8) & 0xFF, len & 0xFF);
  midiFile.push(...trackData);
  
  return new Uint8Array(midiFile);
}
