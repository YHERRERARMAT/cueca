import { CuecaNote, CuecaChord } from "../types";

// Parses "C#4" or "Gb5" into step, alter, octave
interface ParsedPitch {
  step: string;
  alter: number;
  octave: number;
}

function parseMusicXmlPitch(pitchStr: string): ParsedPitch {
  const matches = pitchStr.trim().toUpperCase().match(/^([A-G])(#|F#|C#|D#|G#|A#|B#|G|A|B|C|D|E|F|X)?(S|B|D)?(\d+)$/);
  
  const step = pitchStr.substring(0, 1).toUpperCase();
  let alter = 0;
  let octave = 4;
  
  if (pitchStr.includes("#")) {
    alter = 1;
  } else if (pitchStr.includes("b") || pitchStr.toLowerCase().includes("b")) {
    alter = -1;
  }
  
  const octMatches = pitchStr.match(/\d+/);
  if (octMatches) {
    octave = parseInt(octMatches[0], 10);
  }
  
  return { step, alter, octave };
}

// Map beat duration back to standard MusicXML note-types
function getNoteType(duration: number): { type: string; dot: boolean } {
  if (duration >= 6) return { type: "half", dot: true };
  if (duration >= 4) return { type: "half", dot: false };
  if (duration >= 3) return { type: "quarter", dot: true };
  if (duration >= 2) return { type: "quarter", dot: false };
  return { type: "eighth", dot: false };
}

// Main MusicXML generation function
export function generateCuecaMusicXml(cueca: {
  title: string;
  key: string;
  tempoBpm: number;
  melodyJson: CuecaNote[];
}): string {
  const { title, key, tempoBpm, melodyJson } = cueca;
  
  // Separation of instruments
  const voiceNotes = melodyJson.filter(n => n.instrument === "voz");
  const accordionNotes = melodyJson.filter(n => n.instrument === "acordeon");
  
  // Determine maximum beats to calculate measures
  const maxBeats = Math.max(...melodyJson.map(n => n.timeBeats + n.durationBeats), 24);
  const numMeasures = Math.ceil(maxBeats / 6); // 6 beats (eighth notes) per measure in 6/8
  
  // Map Key Signature in fifths
  const keyMap: Record<string, number> = {
    "C": 0, "G": 1, "D": 2, "A": 3, "E": 4, "B": 5, "F": -1,
    "AM": 0, "EM": 1, "BM": 2, "F#M": 3, "DM": -1, "GM": -2
  };
  
  const cleanKey = key.toUpperCase().replace("MAYOR", "").replace("MENOR", "M").replace(" ", "");
  const fifths = keyMap[cleanKey] !== undefined ? keyMap[cleanKey] : 1; // Default 1 (G Major)
  
  let xml = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<!DOCTYPE score-partwise PUBLIC
    "-//Recordare//DTD MusicXML 4.0 Partwise//EN"
    "http://www.musicxml.org/dtds/partwise.dtd">
<score-partwise version="4.0">
  <work>
    <work-title>${title}</work-title>
  </work>
  <part-list>
    <score-part id="P1">
      <part-name>Voz</part-name>
    </score-part>
    <score-part id="P2">
      <part-name>Acordeón</part-name>
    </score-part>
  </part-list>
`;

  // Build Part 1: Voice
  xml += `  <part id="P1">\n`;
  xml += generatePartMeasures(voiceNotes, numMeasures, fifths, tempoBpm, true);
  xml += `  </part>\n`;

  // Build Part 2: Accordion
  xml += `  <part id="P2">\n`;
  xml += generatePartMeasures(accordionNotes, numMeasures, fifths, tempoBpm, false);
  xml += `  </part>\n`;

  xml += `</score-partwise>\n`;
  return xml;
}

function generatePartMeasures(
  notes: CuecaNote[],
  numMeasures: number,
  fifths: number,
  tempoBpm: number,
  isVoice: boolean
): string {
  let partXml = "";
  
  for (let m = 0; m < numMeasures; m++) {
    const measureStartBeat = m * 6;
    const measureEndBeat = (m + 1) * 6;
    
    // Find notes falling into this measure
    const measureNotes = notes.filter(
      n => n.timeBeats >= measureStartBeat && n.timeBeats < measureEndBeat
    );
    
    // Sort notes inside measure chronologically
    measureNotes.sort((a, b) => a.timeBeats - b.timeBeats);
    
    partXml += `    <measure number="${m + 1}">\n`;
    
    // Measure attributes (Required on first measure)
    if (m === 0) {
      partXml += `      <attributes>\n`;
      partXml += `        <divisions>2</divisions>\n`; // 2 divisions per Quarter note (1 division = eighth note)
      partXml += `        <key>\n`;
      partXml += `          <fifths>${fifths}</fifths>\n`;
      partXml += `        </key>\n`;
      partXml += `        <time>\n`;
      partXml += `          <beats>6</beats>\n`;
      partXml += `          <beat-type>8</beat-type>\n`;
      partXml += `        </time>\n`;
      partXml += `        <clef>\n`;
      partXml += `          <sign>G</sign>\n`;
      partXml += `          <line>2</line>\n`;
      partXml += `        </clef>\n`;
      partXml += `      </attributes>\n`;
      
      // Tempos (Required on first measure)
      partXml += `      <direction placement="above">\n`;
      partXml += `        <direction-type>\n`;
      partXml += `          <metronome>\n`;
      partXml += `            <beat-unit>quarter</beat-unit>\n`;
      partXml += `            <beat-unit-dot/>\n`;
      partXml += `            <per-minute>${Math.round(tempoBpm / 3)}</per-minute>\n`;
      partXml += `          </metronome>\n`;
      partXml += `        </direction-type>\n`;
      partXml += `        <sound tempo="${tempoBpm}"/>\n`;
      partXml += `      </direction>\n`;
    }
    
    // Place notes & fill gaps with rests to total exactly 6 beats per measure
    let currentBeat = measureStartBeat;
    
    measureNotes.forEach((note) => {
      // 1. Check if there's a gap before this note
      if (note.timeBeats > currentBeat) {
        const gapDuration = note.timeBeats - currentBeat;
        partXml += writeRest(gapDuration);
        currentBeat = note.timeBeats;
      }
      
      // 2. Play note
      const { step, alter, octave } = parseMusicXmlPitch(note.pitch);
      const xmlDuration = Math.round(note.durationBeats); // Since 1 beat = eighth note = 1 XML duration division
      const { type, dot } = getNoteType(note.durationBeats);
      
      partXml += `      <note>\n`;
      partXml += `        <pitch>\n`;
      partXml += `          <step>${step}</step>\n`;
      if (alter !== 0) {
        partXml += `          <alter>${alter}</alter>\n`;
      }
      partXml += `          <octave>${octave}</octave>\n`;
      partXml += `        </pitch>\n`;
      partXml += `        <duration>${xmlDuration}</duration>\n`;
      partXml += `        <voice>1</voice>\n`;
      partXml += `        <type>${type}</type>\n`;
      if (dot) {
        partXml += `        <dot/>\n`;
      }
      
      // Add lyric for singing voice
      if (isVoice && note.lyrics) {
        partXml += `        <lyric>\n`;
        partXml += `          <syllabic>single</syllabic>\n`;
        partXml += `          <text>${note.lyrics}</text>\n`;
        partXml += `        </lyric>\n`;
      }
      
      partXml += `      </note>\n`;
      
      currentBeat += note.durationBeats;
    });
    
    // 3. Fill the remaining gap of the measure (upto measureEndBeat)
    if (currentBeat < measureEndBeat) {
      const remainingGap = measureEndBeat - currentBeat;
      partXml += writeRest(remainingGap);
    }
    
    partXml += `    </measure>\n`;
  }
  
  return partXml;
}

function writeRest(beats: number): string {
  const roundedBeats = Math.round(beats);
  if (roundedBeats <= 0) return "";
  const { type, dot } = getNoteType(roundedBeats);
  
  let restXml = "";
  restXml += `      <note>\n`;
  restXml += `        <rest/>\n`;
  restXml += `        <duration>${roundedBeats}</duration>\n`;
  restXml += `        <voice>1</voice>\n`;
  restXml += `        <type>${type}</type>\n`;
  if (dot) {
    restXml += `        <dot/>\n`;
  }
  restXml += `      </note>\n`;
  
  return restXml;
}
