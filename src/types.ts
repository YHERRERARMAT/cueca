export interface Verse {
  text: string;
  syllables: number; // Syllable count (traditional cueca has strict syllable counts)
}

export interface PoeticStructure {
  cuarteta: Verse[];    // 4 lines, usually octosyllables (8)
  seguidilla: Verse[];  // 4 lines (or 5 with first repeated), heptasyllables (7) and pentasyllables (5) alternating
  remate: Verse[];      // 2 lines, usually heptasyllable (7) and pentasyllable (5)
}

export interface CuecaNote {
  timeBeats: number;       // Onset time in beats (e.g., where quarter note = 1 beat, or in 6/8 pitch is relative to eighth note beat)
  durationBeats: number;   // Duration in beats
  pitch: string;           // Scientific pitch notation (e.g., "C4", "G4", "A4", "B4", "A#4", "G3")
  instrument: 'voz' | 'acordeon' | 'percusion';
  lyrics?: string;         // Optional syllable associated with this note (for vocal line)
}

export interface CuecaChord {
  timeBeats: number;
  chordSymbol: string;     // e.g. "G", "D7", "C", "Am"
  durationBeats: number;
}

export interface ComposedCueca {
  title: string;
  key: string;             // e.g., "G mayor" or "A menor"
  tempoBpm: number;        // e.g., 130
  inspiration: string;     // The explanation of how the picture/text inspired this traditional cueca
  poeticExplanation: string; // Explaining why the lyrics conform perfectly to Cueca Campesina traditions
  lyrics: PoeticStructure;
  chordProgression: CuecaChord[];
  melodyJson: CuecaNote[];  // Simplified vocal and accordion note JSON
  abcNotation: string;      // The complete ABC notation for abcjs rendering (with staves for Voz, Accordion, Chords)
  modelUsed?: string;       // The model that successfully completed this composition
}
