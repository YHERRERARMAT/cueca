/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Music, 
  Sparkles, 
  Download, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Volume2, 
  Feather, 
  BookOpen, 
  AlertCircle, 
  FileCheck,
  RotateCw,
  HelpCircle,
  Award,
  Key,
  ExternalLink,
  Check
} from "lucide-react";
import { ComposedCueca } from "./types";
import { generateCuecaMidi } from "./utils/midiWriter";
import { generateCuecaMusicXml } from "./utils/musicXmlWriter";
import { 
  playCuecaInteractive, 
  stopCuecaPlayback, 
  renderCuecaWav 
} from "./utils/audioSynthesizer";

// @ts-ignore
import abcjs from "abcjs";

// Traditional Chilean cueca comments during synthesis
const LOADING_MESSAGES = [
  "Inspirándose con la brisa del campo colchagüino...",
  "Escribiendo la Copla tradicional en octosílabos...",
  "Afinando las seis cuerdas de la guitarra rítmica...",
  "Preparando el fuelle de nuestro acordeón...",
  "Estructurando la Seguidilla chilena (7 y 5 sílabas)...",
  "Añadiendo el Remate o Coletilla campestre...",
  "Midiendo la métrica poética y la rima consonante...",
  "Armando la partitura interactiva en compás de 6/8...",
  "Cargando los osciladores para el sonido del folclore..."
];

export type Theme = "clasico" | "campo-soleado" | "noche-bohemia";

export const THEME_CONFIGS: Record<Theme, {
  name: string;
  icon: string;
  desc: string;
  bodyBg: string;
  logoBg: string;
  logoText: string;
  headerBg: string;
  headerBorder: string;
  headerTitleText: string;
  headerSubText: string;
  ribbon: React.ReactNode;
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardText: string;
  accentBadgeBg: string;
  accentBadgeBorder: string;
  accentBadgeText: string;
  primaryBtn: string;
  secondaryBtn: string;
  tabBarBg: string;
  tabActive: string;
  tabInactive: string;
  verseCardBg: string;
  verseCardBorder: string;
  verseCardTitle: string;
  footerBg: string;
  footerBorder: string;
  footerText: string;
}> = {
  clasico: {
    name: "Clásico 🇨🇱",
    icon: "🎻",
    desc: "Inspiración campesina clásica tricolor",
    bodyBg: "bg-[#fcf9f4] text-slate-800",
    logoBg: "bg-red-50 text-red-700 border-red-100",
    logoText: "text-red-700",
    headerBg: "bg-white border-b border-amber-100",
    headerBorder: "border-amber-100",
    headerTitleText: "text-slate-900",
    headerSubText: "text-slate-500",
    ribbon: (
      <div className="h-2 w-full flex">
        <div className="h-full w-1/3 bg-blue-700"></div>
        <div className="h-full w-1/3 bg-white"></div>
        <div className="h-full w-1/3 bg-red-600"></div>
      </div>
    ),
    cardBg: "bg-white",
    cardBorder: "border-amber-100",
    cardTitle: "text-slate-900",
    cardText: "text-slate-600",
    accentBadgeBg: "bg-amber-50",
    accentBadgeBorder: "border-amber-150",
    accentBadgeText: "text-amber-900",
    primaryBtn: "bg-red-700 hover:bg-red-800 text-white shadow-md active:scale-98 cursor-pointer",
    secondaryBtn: "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer",
    tabBarBg: "bg-slate-50/50",
    tabActive: "border-red-700 text-red-700 bg-white",
    tabInactive: "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/50",
    verseCardBg: "bg-[#fcfbf7]",
    verseCardBorder: "border-amber-100/60",
    verseCardTitle: "text-amber-700",
    footerBg: "bg-white border-t border-amber-100/60",
    footerBorder: "border-amber-100/60",
    footerText: "text-slate-400",
  },
  "campo-soleado": {
    name: "Campo Soleado ☀️",
    icon: "🌾",
    desc: "Trigales dorados, vid de parral, sol campestre",
    bodyBg: "bg-[#faf8f0] text-emerald-950",
    logoBg: "bg-amber-100 text-amber-700 border-amber-200",
    logoText: "text-emerald-800",
    headerBg: "bg-[#f6f2dd] border-b border-yellow-250",
    headerBorder: "border-yellow-250",
    headerTitleText: "text-emerald-950",
    headerSubText: "text-amber-850",
    ribbon: (
      <div className="h-2 w-full flex">
        <div className="h-full w-1/3 bg-emerald-700"></div>
        <div className="h-full w-1/3 bg-yellow-450 bg-yellow-400"></div>
        <div className="h-full w-1/3 bg-amber-500"></div>
      </div>
    ),
    cardBg: "bg-white/95",
    cardBorder: "border-yellow-250",
    cardTitle: "text-emerald-950",
    cardText: "text-emerald-850",
    accentBadgeBg: "bg-yellow-100/70",
    accentBadgeBorder: "border-yellow-200",
    accentBadgeText: "text-emerald-950",
    primaryBtn: "bg-emerald-700 hover:bg-emerald-800 text-white shadow-md active:scale-98 cursor-pointer",
    secondaryBtn: "bg-white border-yellow-200 text-amber-900 hover:bg-yellow-50/60 cursor-pointer",
    tabBarBg: "bg-yellow-100/20",
    tabActive: "border-emerald-750 border-emerald-700 text-emerald-850 bg-white",
    tabInactive: "border-transparent text-emerald-700 hover:text-emerald-950 hover:bg-yellow-50/35",
    verseCardBg: "bg-[#fcfbee]",
    verseCardBorder: "border-yellow-200/60",
    verseCardTitle: "text-amber-855 text-amber-800",
    footerBg: "bg-[#f4f0d3] border-t border-yellow-200",
    footerBorder: "border-yellow-200",
    footerText: "text-emerald-850",
  },
  "noche-bohemia": {
    name: "Noche Bohemia 🌙",
    icon: "🎸",
    desc: "Guitarras de taberna, fuego a media luz, noche folclórica",
    bodyBg: "bg-[#090b11] text-slate-100 selection:bg-amber-500/20 selection:text-amber-200",
    logoBg: "bg-amber-950/45 text-amber-500 border-amber-900/60",
    logoText: "text-amber-400",
    headerBg: "bg-[#11131c] border-b border-slate-800",
    headerBorder: "border-slate-800",
    headerTitleText: "text-amber-200",
    headerSubText: "text-slate-400",
    ribbon: (
      <div className="h-2 w-full flex">
        <div className="h-full w-1/3 bg-indigo-900"></div>
        <div className="h-full w-1/3 bg-[#4d105e]"></div>
        <div className="h-full w-1/3 bg-amber-600"></div>
      </div>
    ),
    cardBg: "bg-[#131622]",
    cardBorder: "border-[#1e2336]",
    cardTitle: "text-amber-200",
    cardText: "text-slate-350",
    accentBadgeBg: "bg-[#1f1a2e]",
    accentBadgeBorder: "border-purple-900/60",
    accentBadgeText: "text-purple-200",
    primaryBtn: "bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md active:scale-98 cursor-pointer",
    secondaryBtn: "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850 cursor-pointer",
    tabBarBg: "bg-[#0a0b12]",
    tabActive: "border-amber-500 text-amber-450 text-amber-400 bg-[#161a29]",
    tabInactive: "border-transparent text-slate-400 hover:text-slate-100 hover:bg-slate-800/50",
    verseCardBg: "bg-[#1a1e2f]",
    verseCardBorder: "border-slate-850",
    verseCardTitle: "text-amber-400",
    footerBg: "bg-[#06070a] border-t border-slate-900",
    footerBorder: "border-slate-950",
    footerText: "text-slate-500",
  }
};

const PITCH_ORDER_LIST = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const getNoteValue = (pitchStr: string): number => {
  const match = pitchStr.match(/^([A-G]#?|b?)(-?\d+)$/);
  if (!match) return 0;
  const noteName = match[1];
  const octave = parseInt(match[2], 10);
  let step = PITCH_ORDER_LIST.indexOf(noteName);
  if (step === -1) {
    if (noteName === "Db") step = 1;
    else if (noteName === "Eb") step = 3;
    else if (noteName === "Gb") step = 6;
    else if (noteName === "Ab") step = 8;
    else if (noteName === "Bb") step = 10;
    else step = 0;
  }
  return octave * 12 + step;
};

const pitchToSpanish = (pitch: string) => {
  const match = pitch.match(/^([A-G]#?|b?)(-?\d+)$/);
  if (!match) return pitch;
  const name = match[1];
  const oct = match[2];
  const translation: Record<string, string> = {
    "C": "Do", "C#": "Do#", "Db": "Reb",
    "D": "Re", "D#": "Re#", "Eb": "Mib",
    "E": "Mi",
    "F": "Fa", "F#": "Fa#", "Gb": "Solb",
    "G": "Sol", "G#": "Sol#", "Ab": "Lab",
    "A": "La", "A#": "La#", "Bb": "Sib",
    "B": "Si"
  };
  return `${translation[name] || name}${oct}`;
};

export default function App() {
  // Navigation & inputs
  const [activeTab, setActiveTab] = useState<"lyrics" | "score" | "synth" | "export">("lyrics");
  const [textPrompt, setTextPrompt] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [filePayload, setFilePayload] = useState<{ base64: string; mimeType: string } | null>(null);
  
  // App state
  const [isComposing, setIsComposing] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [composedCueca, setComposedCueca] = useState<ComposedCueca | null>(null);

  // Theme settings
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("cueca_theme") as Theme) || "clasico";
  });

  useEffect(() => {
    localStorage.setItem("cueca_theme", theme);
  }, [theme]);

  // Gemini API Custom settings
  const [customApiKey, setCustomApiKey] = useState(() => {
    return localStorage.getItem("cueca_custom_api_key") || "";
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem("cueca_selected_model") || "gemini-3.5-flash";
  });
  const [showApiSettings, setShowApiSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("cueca_custom_api_key", customApiKey);
  }, [customApiKey]);

  useEffect(() => {
    localStorage.setItem("cueca_selected_model", selectedModel);
  }, [selectedModel]);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(-1);
  const [isExportingWav, setIsExportingWav] = useState(false);
  const [accompanimentTimbre, setAccompanimentTimbre] = useState<"acordeon" | "arpa" | "guitarra" | "piano">("acordeon");
  const [transposeSemits, setTransposeSemits] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);

  // Score drawing tracking
  const paperRef = useRef<HTMLDivElement>(null);
  const renderTimeoutRef = useRef<any>(null);

  // Cycle loading messages when composing
  useEffect(() => {
    let interval: any;
    if (isComposing) {
      interval = setInterval(() => {
        setLoadingMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
      }, 3500);
    } else {
      setLoadingMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [isComposing]);

  // Handle rendering of ABC notation whenever activeTab or composedCueca changes
  useEffect(() => {
    if (composedCueca && activeTab === "score" && paperRef.current) {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
      renderTimeoutRef.current = setTimeout(() => {
        try {
          abcjs.renderAbc("abc-paper-output", composedCueca.abcNotation, {
            responsive: "resize",
            add_classes: true,
            paddingtop: 15,
            paddingbottom: 15,
            paddingleft: 10,
            paddingright: 10,
          });
        } catch (err) {
          console.error("Error drawing sheet music with abcjs:", err);
        }
      }, 100);
    }
    return () => {
      if (renderTimeoutRef.current) clearTimeout(renderTimeoutRef.current);
    };
  }, [composedCueca, activeTab]);

  // Clean playback on unmount
  useEffect(() => {
    return () => {
      stopCuecaPlayback();
    };
  }, []);

  // File drag & drop helpers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      readFile(file);
    }
  };

  // Convert uploaded image, PDF or text file to Base64 payload
  const readFile = (file: File) => {
    setSelectedFile(file);
    setErrorMsg("");
    const reader = new FileReader();
    const mimeType = file.type || "text/plain";

    if (file.type.startsWith("image/") || file.type === "application/pdf") {
      reader.onload = () => {
        const resultStr = reader.result as string;
        const b64 = resultStr.split(",")[1];
        setFilePayload({ base64: b64, mimeType });
        if (file.type.startsWith("image/")) {
          setPreviewUrl(resultStr);
        } else {
          setPreviewUrl(""); // pdf
        }
      };
      reader.readAsDataURL(file);
    } else {
      // Treat other files as text content
      reader.onload = () => {
        const text = reader.result as string;
        const base64Data = btoa(unescape(encodeURIComponent(text)));
        setFilePayload({ base64: base64Data, mimeType: "text/plain" });
        setPreviewUrl("");
      };
      reader.readAsText(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setFilePayload(null);
  };

  // Compose Cueca trigger (post to backend proxy)
  const handleComposeCueca = async () => {
    setErrorMsg("");
    setIsComposing(true);
    setComposedCueca(null);
    stopCuecaPlayback();
    setIsPlaying(false);
    setCurrentBeat(-1);

    try {
      const response = await fetch("/api/compose", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          textPrompt: textPrompt,
          fileBase64: filePayload?.base64,
          fileMimeType: filePayload?.mimeType,
          customApiKey: customApiKey,
          selectedModel: selectedModel,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || errData.details || "Disculpas, la generación en red falló.");
      }

      const cuecaResult: ComposedCueca = await response.json();
      setComposedCueca(cuecaResult);
      setActiveTab("score"); // Open musical score by default
    } catch (error: any) {
      console.error(error);
      setErrorMsg(error.message || "Error al conectar con el servidor folclórico AI.");
    } finally {
      setIsComposing(false);
    }
  };

  // Playback Control Toggle
  const handlePlayToggle = () => {
    if (!composedCueca) return;
    
    if (isPlaying) {
      stopCuecaPlayback();
      setIsPlaying(false);
      setCurrentBeat(-1);
    } else {
      setIsPlaying(true);
      playCuecaInteractive(composedCueca, (beat) => {
        if (beat < 0) {
          setIsPlaying(false);
          setCurrentBeat(-1);
        } else {
          setCurrentBeat(beat);
        }
      }, accompanimentTimbre, transposeSemits);
    }
  };

  // Real-time pitch transposition handler (+/- semitones)
  const handleTranspose = (amount: number) => {
    const nextTranspose = Math.max(-12, Math.min(12, transposeSemits + amount));
    setTransposeSemits(nextTranspose);
    
    if (isPlaying && composedCueca) {
      // Restart playback in real-time with the new transpose setting
      stopCuecaPlayback();
      playCuecaInteractive(composedCueca, (beat) => {
        if (beat < 0) {
          setIsPlaying(false);
          setCurrentBeat(-1);
        } else {
          setCurrentBeat(beat);
        }
      }, accompanimentTimbre, nextTranspose);
    }
  };

  const handleStopPlayback = () => {
    stopCuecaPlayback();
    setIsPlaying(false);
    setCurrentBeat(-1);
  };

  // Exporters download triggers
  const downloadMidiFile = () => {
    if (!composedCueca) return;
    try {
      const bytes = generateCuecaMidi(composedCueca.melodyJson, composedCueca.tempoBpm);
      const blob = new Blob([bytes], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${composedCueca.title.replace(/\s+/g, "_")}.mid`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("MIDI download failed", err);
    }
  };

  const downloadMusicXmlFile = () => {
    if (!composedCueca) return;
    try {
      const xmlString = generateCuecaMusicXml(composedCueca);
      const blob = new Blob([xmlString], { type: "application/vnd.recordare.musicxml+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${composedCueca.title.replace(/\s+/g, "_")}.musicxml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("MusicXML download failed", err);
    }
  };

  const downloadWavAudioFile = async () => {
    if (!composedCueca) return;
    setIsExportingWav(true);
    try {
      // Small timeout to allow loader UI rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      const blob = await renderCuecaWav(composedCueca, accompanimentTimbre, transposeSemits);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${composedCueca.title.replace(/\s+/g, "_")}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("WAV render synthesis failed", err);
      alert("La síntesis offline falló en este navegador.");
    } finally {
      setIsExportingWav(false);
    }
  };

  // Utility to count beats and display measures
  const maxBeats = composedCueca ? Math.max(...composedCueca.melodyJson.map(n => n.timeBeats + n.durationBeats), 24) : 24;
  const currentMeasure = currentBeat >= 0 ? Math.floor(currentBeat / 6) + 1 : 1;
  const currentPulseIn68 = currentBeat >= 0 ? (currentBeat % 6) + 1 : 1;

  return (
    <div className={`min-h-screen ${THEME_CONFIGS[theme].bodyBg} transition-all duration-300 font-sans flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900`}>
      
      {/* Decorative Theme Ribbon Top Header */}
      {THEME_CONFIGS[theme].ribbon}

      {/* Main App Bar Header */}
      <header className={`border-b ${THEME_CONFIGS[theme].headerBorder} ${THEME_CONFIGS[theme].headerBg} transition-all duration-300 px-6 py-4`}>
        <div className="max-w-7xl mx-auto flex flex-col xl:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-full border ${THEME_CONFIGS[theme].logoBg} ${THEME_CONFIGS[theme].logoText} shadow-xs transition-all duration-300`}>
              <Feather className="w-6 h-6 rotate-45" />
            </div>
            <div>
              <h1 className={`text-2xl font-serif font-bold ${THEME_CONFIGS[theme].headerTitleText} tracking-tight flex items-center gap-2 transition-all duration-300`}>
                El Cantor del Campo <span className={`text-xs ${theme === "noche-bohemia" ? "bg-amber-500 text-slate-950 font-black" : "bg-red-600 text-white"} font-sans font-medium uppercase tracking-widest px-2 py-0.5 rounded-sm`}>Cueca AI</span>
              </h1>
              <p className={`text-xs ${THEME_CONFIGS[theme].headerSubText} font-semibold font-sans transition-all duration-300`}>
                Creador Inteligente de Cueca Campesina Chilena, Partituras y Sonidos
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Theme Selector Switcher */}
            <div className={`flex items-center gap-1 p-1 rounded-xl border ${theme === 'noche-bohemia' ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'} transition-all`} id="theme-selector-group">
              {(["clasico", "campo-soleado", "noche-bohemia"] as const).map((t) => (
                <button
                  key={t}
                  id={`theme-btn-${t}`}
                  type="button"
                  onClick={() => setTheme(t)}
                  title={THEME_CONFIGS[t].desc}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    theme === t
                      ? t === "clasico"
                        ? "bg-red-600 text-white shadow-xs"
                        : t === "campo-soleado"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-amber-500 text-slate-950 shadow-xs"
                      : theme === 'noche-bohemia'
                        ? "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
                  }`}
                >
                  <span>{THEME_CONFIGS[t].icon}</span>
                  <span className="hidden sm:inline font-sans">{THEME_CONFIGS[t].name.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            <div className={`flex gap-2 text-xs font-semibold px-3.5 py-1.5 rounded-xl border shadow-2xs transition-all duration-300 ${THEME_CONFIGS[theme].accentBadgeBg} ${THEME_CONFIGS[theme].accentBadgeBorder} ${THEME_CONFIGS[theme].accentBadgeText}`}>
              <Award className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Métricas de Cueca Tradicional</span>
            </div>
            <button
              id="api-settings-btn"
              onClick={() => setShowApiSettings((prev) => !prev)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl border cursor-pointer transition-all ${
                showApiSettings || customApiKey
                  ? theme === 'noche-bohemia'
                    ? "bg-amber-500 border-amber-600 text-slate-950 hover:bg-amber-600"
                    : "bg-amber-600 border-amber-700 text-white hover:bg-amber-700"
                  : theme === 'noche-bohemia'
                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850"
                  : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Ajustar API {customApiKey ? "(Personalizada)" : ""}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workshop Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Column - Inputs (Colspan 5) */}
        <section id="workshop-inputs" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Custom API Configuration Panel */}
          {(showApiSettings || errorMsg.includes("403") || errorMsg.includes("API Key") || errorMsg.includes("Key")) && (
            <div className="bg-amber-50 rounded-2xl border border-amber-200 p-5 shadow-xs flex flex-col gap-4 animate-fade-in-up">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-amber-950 flex items-center gap-1.5 font-sans">
                  <Key className="w-4 h-4 text-amber-700 animate-pulse" />
                  Guía Paso a Paso: Tu API Key de Gemini
                </span>
                <button
                  type="button"
                  onClick={() => setShowApiSettings(false)}
                  className="text-xs text-amber-800 hover:text-amber-950 font-bold bg-amber-100 hover:bg-amber-150 px-2.5 py-1 rounded-lg cursor-pointer transition-all"
                >
                  Ocultar
                </button>
              </div>

              <p className="text-[11px] text-amber-900 leading-relaxed font-sans">
                El servidor del proyecto en la nube experimenta una limitación temporal de acceso (Error 403). ¡No te preocupes! Obtener tu propia clave es <strong>100% gratis</strong> y te tomará menos de 2 minutos siguiendo estos pasos sencillos:
              </p>

              {/* Step cards grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-amber-700 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full mb-1">Paso 1</span>
                    <p className="font-bold text-amber-950 text-xs mb-1">Visitar AI Studio</p>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Haz clic abajo para abrir la plataforma oficial de Google para desarrolladores en una pestaña nueva.
                    </p>
                  </div>
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 justify-center w-full px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-lg transition-all text-xs font-sans mt-3 shadow-2xs"
                  >
                    <span>Ir a Google AI Studio</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-amber-700 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full mb-1">Paso 2</span>
                    <p className="font-bold text-amber-950 text-xs mb-1">Crear Clave Gratuita</p>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Dentro de AI Studio, haz clic en el botón azul <strong className="text-amber-950">"Get API key"</strong> en la izquierda, y luego presiona <strong className="text-amber-950">"Create API key"</strong> en un proyecto.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-amber-700 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full mb-1">Paso 3</span>
                    <p className="font-bold text-amber-950 text-xs mb-1">Copiar la Clave</p>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Copia el código largo que se te mostrará. Por seguridad, siempre debe empezar con los caracteres <strong className="text-slate-800 font-mono">"AIzaSy..."</strong>.
                    </p>
                  </div>
                </div>

                <div className="bg-white p-3.5 rounded-xl border border-amber-200/60 shadow-2xs flex flex-col justify-between">
                  <div>
                    <span className="inline-block bg-amber-700 text-white font-extrabold text-[10px] px-1.5 py-0.5 rounded-full mb-1">Paso 4</span>
                    <p className="font-bold text-amber-950 text-xs mb-1 font-sans">Pegarla Aquí Abajo</p>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed">
                      Introduce el código que copiaste en el casillero de abajo. Se guardará de manera segura solo en tu navegador actual.
                    </p>
                  </div>
                </div>
              </div>

              {/* Input for key and selector */}
              <div className="bg-amber-100/50 rounded-xl p-3.5 border border-amber-150 flex flex-col gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <label htmlFor="api-key-input" className="text-xs font-bold text-amber-950 flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-amber-800" />
                      API Key de Gemini:
                    </label>
                    {customApiKey && (
                      <button
                        type="button"
                        onClick={() => setCustomApiKey("")}
                        className="text-[10px] text-red-700 hover:text-red-950 font-bold hover:underline cursor-pointer"
                      >
                        Borrrar clave guardada
                      </button>
                    )}
                  </div>
                  <input
                    id="api-key-input"
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="Coloca tu API Key (ej. AIzaSyB...)"
                    className="w-full text-xs bg-white border border-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 p-2.5 rounded-lg placeholder:text-slate-400 focus:outline-hidden font-mono shadow-inner"
                  />
                  {customApiKey && !customApiKey.startsWith("AIzaSy") && (
                    <p className="text-[10px] text-red-700 font-bold">
                      ⚠️ Atención: Las claves correctas de Gemini suelen iniciar con "AIzaSy". Asegúrate de no copiar espacios en blanco.
                    </p>
                  )}
                  {customApiKey && customApiKey.startsWith("AIzaSy") && (
                    <p className="text-[10px] text-emerald-800 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> ¡API Key válida detectada! Listo para componer cuecas.
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="model-selector" className="text-xs font-semibold text-amber-950">
                    Modelo de Inteligencia Artificial:
                  </label>
                  <select
                    id="model-selector"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full text-xs bg-white border border-amber-200 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 p-2.5 rounded-lg text-slate-800 font-semibold focus:outline-hidden"
                  >
                    <option value="gemini-3.5-flash">gemini-3.5-flash (Estándar, rápido y gratuito)</option>
                    <option value="gemini-flash-latest">gemini-flash-latest (Excelente compatibilidad)</option>
                    <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Para poesía muy compleja)</option>
                    <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ultra rápido)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className={`rounded-2xl border shadow-sm p-5 md:p-6 flex flex-col gap-5 transition-all duration-300 ${THEME_CONFIGS[theme].cardBg} ${THEME_CONFIGS[theme].cardBorder}`}>
            
            {/* Context Prompt Field */}
            <div className="flex flex-col gap-2">
              <label htmlFor="prompt" className={`text-sm font-semibold tracking-wide flex items-center justify-between ${theme === 'noche-bohemia' ? 'text-slate-250' : 'text-slate-700'}`}>
                <span>1. Describe la Inspiración o Tema</span>
                <span className={`text-[11px] font-normal ${theme === 'noche-bohemia' ? 'text-slate-400' : 'text-slate-400'}`}>Ej: La vendimia, amor huaso, el río Tinguiririca</span>
              </label>
              <textarea
                id="prompt"
                rows={4}
                className={`w-full text-sm border focus:outline-hidden p-3.5 rounded-xl placeholder:text-slate-450 font-medium transition-all ${
                  theme === 'noche-bohemia' 
                    ? 'bg-[#181c2b] border-[#292f45] text-slate-100 focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20' 
                    : theme === 'campo-soleado'
                    ? 'bg-white border-yellow-200 text-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200'
                    : 'bg-[#faf9f6]/95 border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-200'
                }`}
                placeholder="Escribe una pequeña historia, ideas de personajes, un pueblo chileno, leyendas rurales o recuerdos campestres para dar vida a los versos de la cueca..."
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
              />
            </div>

            {/* File Drop and Select Area */}
            <div className="flex flex-col gap-2">
              <label className={`text-sm font-semibold tracking-wide ${theme === 'noche-bohemia' ? 'text-slate-250' : 'text-slate-700'}`}>
                2. Sube un Archivo de Apoyo (Opcional)
              </label>
              
              <div
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  isDragging 
                    ? theme === 'noche-bohemia' ? 'border-amber-500 bg-amber-500/5' : 'border-amber-450 bg-amber-50/50' 
                    : selectedFile 
                      ? "border-green-400 bg-green-50/20" 
                      : theme === 'noche-bohemia'
                        ? "border-slate-800 hover:border-amber-500/70 hover:bg-[#1a1e2f]"
                        : theme === 'campo-soleado'
                        ? "border-yellow-200 hover:border-emerald-450 hover:bg-yellow-50/20"
                        : "border-slate-200 hover:border-amber-300 hover:bg-[#faf9f6]"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf,text/plain"
                  onChange={handleFileChange}
                />
                
                {!selectedFile ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <div className={`p-2.5 rounded-full transition-all duration-300 ${theme === 'noche-bohemia' ? 'bg-[#1e1915] text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                      <Upload className="w-5 h-5" />
                    </div>
                    <p className={`text-xs font-semibold ${theme === 'noche-bohemia' ? 'text-slate-300' : 'text-slate-600'}`}>
                      Arrastra y suelta tu archivo aquí, o <span className={theme === 'noche-bohemia' ? 'text-amber-400 font-bold' : 'text-amber-700 font-bold'}>explora tus carpetas</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Soporta Fotos (.jpg, .png), PDF con historias, o Notas de Texto (.txt)
                    </p>
                  </div>
                ) : (
                  <div className={`flex items-center gap-3 justify-between text-left p-1 rounded-xl shadow-2xs border ${theme === 'noche-bohemia' ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-100'}`}>
                    <div className="flex items-center gap-3 shrink overflow-hidden">
                      {selectedFile.type.startsWith("image/") ? (
                        <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                          <img src={previewUrl} alt="Vista previa" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                      )}
                      
                      <div className="overflow-hidden">
                        <p className={`text-xs font-bold truncate ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-700'}`}>{selectedFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(selectedFile.size / 1024).toFixed(1)} KB • {selectedFile.type || "Archivo de Texto"}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-lg px-2.5 py-1.5 font-bold transition-all shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeSelectedFile();
                      }}
                    >
                      Remover
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Compose trigger Button */}
            <button
              type="button"
              id="compose-trigger"
              disabled={isComposing}
              onClick={handleComposeCueca}
              className={`w-full py-3.5 px-4 rounded-xl font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2.5 ${
                isComposing 
                  ? "bg-slate-400 cursor-not-allowed text-slate-100" 
                  : theme === 'noche-bohemia'
                  ? "bg-amber-500 hover:bg-amber-600 text-slate-950 hover:shadow-lg hover:shadow-amber-500/15 active:scale-98"
                  : theme === 'campo-soleado'
                  ? "bg-emerald-700 hover:bg-emerald-805 hover:bg-emerald-800 text-white hover:shadow-lg active:scale-98"
                  : "bg-red-700 hover:bg-red-800 text-white active:scale-98 animate-pulse"
              }`}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span>{isComposing ? "Componiendo..." : "Componer Cueca Campesina"}</span>
            </button>

            {/* Error Message if failed */}
            {errorMsg && (
              <div className="bg-red-50 text-red-900 border border-red-100 rounded-xl p-3.5 flex gap-2.5 items-start text-xs font-medium animate-fade-in-up">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-red-900">Uups, algo salió mal</p>
                  <p className="text-red-700">{errorMsg}</p>
                </div>
              </div>
            )}

          </div>

          {/* Educational Side Panel - About Cueca Campesina */}
          <div className={`rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-300 ${
            theme === 'noche-bohemia'
              ? 'bg-[#141725] border-slate-800 text-slate-300'
              : theme === 'campo-soleado'
              ? 'bg-yellow-100/30 border-yellow-200/80 text-emerald-950'
              : 'bg-[#f0ece1]/45 border-amber-100/50 text-slate-800'
          }`}>
            <div className={`flex items-center gap-2.5 ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-900'}`}>
              <BookOpen className="w-5 h-5" />
              <h3 className="font-serif font-bold text-base">La Cueca Campesina</h3>
            </div>
            <p className={`text-xs leading-relaxed font-semibold ${theme === 'noche-bohemia' ? 'text-slate-300' : 'text-slate-600'}`}>
              A diferencia de la cueca urbana ("brava" o "porteña"), la <strong>Cueca Campesina</strong> chilena florece en el agro, en comunas del valle central. Tradicionalmente es acompañada por guitarras de rasgueo franco, arpas o acordeones, y posee temáticas sinceras de la tierra, faenas agrícolas, amores o vivencias locales en melodías simples que combinan intervalos mayores y menores.
            </p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div className={`rounded-lg p-2 text-center border ${theme === 'noche-bohemia' ? 'bg-[#1b1f33] border-slate-800' : 'bg-white/80 border-amber-100/35'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compás</p>
                <p className={`text-xs font-extrabold ${theme === 'noche-bohemia' ? 'text-amber-350' : 'text-amber-900'}`}>6/8 rítmico</p>
              </div>
              <div className={`rounded-lg p-2 text-center border ${theme === 'noche-bohemia' ? 'bg-[#1b1f33] border-slate-800' : 'bg-white/80 border-amber-100/35'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estructura</p>
                <p className={`text-xs font-extrabold ${theme === 'noche-bohemia' ? 'text-amber-350' : 'text-amber-900'}`}>Estricta</p>
              </div>
              <div className={`rounded-lg p-2 text-center border ${theme === 'noche-bohemia' ? 'bg-[#1b1f33] border-slate-800' : 'bg-white/80 border-amber-100/35'}`}>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sabor</p>
                <p className={`text-xs font-extrabold ${theme === 'noche-bohemia' ? 'text-amber-350' : 'text-amber-900'}`}>Campestre</p>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column - Music, Poetry, Sheets (Colspan 7) */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          
          {!composedCueca && !isComposing ? (
            /* Welcome / Idle State */
            <div className={`rounded-2xl border shadow-xs p-10 text-center flex flex-col items-center justify-center gap-4 min-h-[460px] transition-all duration-300 ${THEME_CONFIGS[theme].cardBg} ${THEME_CONFIGS[theme].cardBorder}`}>
              <div className={`p-6 rounded-full border animate-pulse ${THEME_CONFIGS[theme].logoBg} ${THEME_CONFIGS[theme].logoText}`}>
                <Music className="w-14 h-14" />
              </div>
              
              <div className="max-w-md">
                <h2 className={`text-xl font-serif font-bold ${theme === 'noche-bohemia' ? 'text-amber-100' : 'text-slate-900'}`}>Crea tu Cueca Personalizada</h2>
                <p className={`text-sm mt-2 font-semibold ${theme === 'noche-bohemia' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Escribe un tema de inspiración o sube una fotografía del campo y la inteligencia artificial compondrá los versos poéticos campestres, arreglará la partitura para voz y acordeón y te permitirá escuchar el ensayo y descargar los formatos MIDI, MusicXML o audio WAV.
                </p>
              </div>

              <div className={`flex gap-2.5 items-center justify-center mt-3 text-xs border px-4 py-2 rounded-xl font-semibold transition-all ${
                theme === 'noche-bohemia' 
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400' 
                  : 'bg-slate-50 border-slate-100 text-slate-500'
              }`}>
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>
                <span>Procesado por Gemini en el servidor de forma segura</span>
              </div>
            </div>
          ) : isComposing ? (
            /* Cueca Composing Loading State */
            <div className={`rounded-2xl border shadow-xs p-10 text-center flex flex-col items-center justify-center gap-6 min-h-[460px] animate-fade-in-up transition-all duration-300 ${THEME_CONFIGS[theme].cardBg} ${THEME_CONFIGS[theme].cardBorder}`}>
              
              <div className="relative flex items-center justify-center">
                <div className={`w-24 h-24 rounded-full border-4 ${theme === 'noche-bohemia' ? 'border-slate-800 border-t-amber-500' : 'border-amber-100 border-t-red-700'} animate-spin`}></div>
                <Music className={`w-8 h-8 absolute animate-bounce ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-red-750 text-red-700'}`} />
              </div>

              <div className="max-w-md">
                <h3 className={`text-lg font-serif font-bold ${theme === 'noche-bohemia' ? 'text-slate-100' : 'text-slate-900'}`}>
                  Componiendo Versos y Compases...
                </h3>
                
                {/* Cycling, engaging Spanish processing message */}
                <div className={`mt-3 border rounded-xl px-4 py-3 min-h-[60px] flex items-center justify-center text-sm font-bold shadow-2xs transition-all duration-300 ${
                  theme === 'noche-bohemia' 
                    ? 'bg-[#1b1e2f] border-slate-850 text-amber-400' 
                    : theme === 'campo-soleado'
                    ? 'bg-yellow-50/45 border-yellow-200 text-[#0c4e36]'
                    : 'bg-[#faf9f6]/90 border-amber-100/55 text-amber-800'
                }`}>
                  <span className="animate-pulse">{LOADING_MESSAGES[loadingMsgIndex]}</span>
                </div>
                
                <p className="text-xs text-slate-400 mt-4 leading-relaxed font-semibold">
                  El Cantor AI está analizando los detalles de tu entrada para amalgamar la rima métrica tradicional del campo chileno. Esto tomará sólo unos segundos.
                </p>
              </div>

            </div>
          ) : (
            /* Cueca Generated Results Workspace */
            <div className={`rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[460px] animate-fade-in-up transition-all duration-300 ${THEME_CONFIGS[theme].cardBg} ${THEME_CONFIGS[theme].cardBorder}`}>
              
              {/* Context Summary Header */}
              <div className={`border-b p-5 md:p-6 flex flex-col gap-2.5 transition-all duration-300 ${
                theme === 'noche-bohemia' 
                  ? 'bg-slate-900/40 border-slate-850' 
                  : theme === 'campo-soleado'
                  ? 'bg-yellow-100/10 border-yellow-205'
                  : 'bg-[#fcfbf9] border-amber-100/60'
              }`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <span className={`text-[10px] font-sans font-bold uppercase tracking-widest ${theme === 'noche-bohemia' ? 'text-amber-500' : 'text-red-650 text-red-600'}`}>Cueca Campesina</span>
                    <h2 className={`text-2xl font-serif font-bold tracking-tight ${theme === 'noche-bohemia' ? 'text-amber-150 text-amber-100' : 'text-slate-900'}`}>
                      {composedCueca.title}
                    </h2>
                  </div>
                  
                  {/* Tempo & Key Tags */}
                  <div className={`flex flex-wrap gap-2 items-center font-mono text-[11px] shrink-0 ${theme === 'noche-bohemia' ? 'text-amber-250 text-slate-300' : 'text-amber-900'}`}>
                    {composedCueca.modelUsed && (
                      <span className={`px-2.5 py-1 rounded-md border font-bold flex items-center gap-1 ${
                        theme === 'noche-bohemia' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-slate-50 border-slate-200/65 text-slate-600'
                      }`}>
                        <span>🤖</span> {composedCueca.modelUsed}
                      </span>
                    )}
                    <span className={`px-2.5 py-1 rounded-md border font-bold ${
                      theme === 'noche-bohemia' ? 'bg-[#1b1c28] border-slate-800' : 'bg-amber-50 border-amber-100/50'
                    }`}>
                      Tonalidad: {composedCueca.key}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md border font-bold ${
                      theme === 'noche-bohemia' ? 'bg-[#1b1c28] border-slate-800' : 'bg-amber-50 border-amber-100/50'
                    }`}>
                      {composedCueca.tempoBpm} BPM (6/8)
                    </span>
                  </div>
                </div>

                <p className={`text-xs font-semibold italic border-l-2 pl-3 py-0.5 ${
                  theme === 'noche-bohemia' ? 'border-amber-500 text-slate-350' : 'border-amber-200 text-slate-500'
                }`}>
                  {composedCueca.inspiration}
                </p>
              </div>

              {/* Navigation Tabs Bar */}
              <div className={`flex border-b text-xs font-bold overflow-x-auto shrink-0 transition-all duration-305 ${
                theme === 'noche-bohemia' 
                  ? 'border-slate-800 bg-[#0e1017]' 
                  : theme === 'campo-soleado'
                  ? 'border-yellow-200/60 bg-[#faf8ef]'
                  : 'border-slate-100 bg-slate-50/50'
              }`}>
                <button
                  type="button"
                  onClick={() => setActiveTab("lyrics")}
                  className={`flex-1 min-w-[100px] border-b-2 py-3 text-center transition-all px-3 whitespace-nowrap cursor-pointer z-10 select-none ${
                    activeTab === "lyrics" 
                      ? THEME_CONFIGS[theme].tabActive
                      : THEME_CONFIGS[theme].tabInactive
                  }`}
                >
                  📝 Letra y Métricas
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("score")}
                  className={`flex-1 min-w-[100px] border-b-2 py-3 text-center transition-all px-3 whitespace-nowrap cursor-pointer z-10 select-none ${
                    activeTab === "score" 
                      ? THEME_CONFIGS[theme].tabActive
                      : THEME_CONFIGS[theme].tabInactive
                  }`}
                >
                  🎼 Partituras
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("synth")}
                  className={`flex-1 min-w-[100px] border-b-2 py-3 text-center transition-all px-3 whitespace-nowrap cursor-pointer z-10 select-none ${
                    activeTab === "synth" 
                      ? THEME_CONFIGS[theme].tabActive
                      : THEME_CONFIGS[theme].tabInactive
                  }`}
                >
                  🔊 Sintetizador
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("export")}
                  className={`flex-1 min-w-[100px] border-b-2 py-3 text-center transition-all px-3 whitespace-nowrap cursor-pointer z-10 select-none ${
                    activeTab === "export" 
                      ? THEME_CONFIGS[theme].tabActive
                      : THEME_CONFIGS[theme].tabInactive
                  }`}
                >
                  📥 Exportar Archivos
                </button>
              </div>

              {/* Active Tab Screen Area */}
              <div className="p-5 md:p-6 flex-1 flex flex-col overflow-y-auto">
                
                {/* TAB 1: LYRICS & POETICS */}
                {activeTab === "lyrics" && (
                  <div className="flex flex-col gap-6 animate-fade-in-up">
                    
                    {/* Poetic Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      
                      {/* Corazon / Copla / Cuarteta */}
                      <div className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${THEME_CONFIGS[theme].verseCardBg} ${THEME_CONFIGS[theme].verseCardBorder}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center justify-between ${THEME_CONFIGS[theme].verseCardTitle}`}>
                          <span>I. Copla (Cuarteta)</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-semibold ${
                            theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-350' : 'bg-amber-100 text-amber-800'
                          }`}>8 Sílabas</span>
                        </span>
                        
                        <div className="flex flex-col gap-1.5 min-h-[110px] justify-center">
                          {composedCueca.lyrics.cuarteta.map((v, idx) => (
                            <div key={`c-${idx}`} className="flex items-center justify-between gap-2.5 text-sm">
                              <span className={`font-bold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>{v.text}</span>
                              <span className={`font-mono text-[10px] rounded-sm shrink-0 px-1 ${
                                theme === 'noche-bohemia' ? 'bg-slate-900 text-slate-400' : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {v.syllables}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Seguidilla */}
                      <div className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${THEME_CONFIGS[theme].verseCardBg} ${THEME_CONFIGS[theme].verseCardBorder}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center justify-between ${
                          theme === 'noche-bohemia' ? 'text-amber-400' : theme === 'campo-soleado' ? 'text-emerald-850' : 'text-amber-700'
                        }`}>
                          <span>II. Seguidilla</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-semibold ${
                            theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-350' : 'bg-amber-100 text-amber-800'
                          }`}>7 y 5 Sílabas</span>
                        </span>
                        
                        <div className="flex flex-col gap-1.5 min-h-[110px] justify-center">
                          {composedCueca.lyrics.seguidilla.map((v, idx) => (
                            <div key={`s-${idx}`} className="flex items-center justify-between gap-2.5 text-sm">
                              <span className={`font-bold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>{v.text}</span>
                              <span className={`font-mono text-[10px] rounded-sm shrink-0 px-1 ${
                                theme === 'noche-bohemia' ? 'bg-slate-900 text-slate-400' : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {v.syllables}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Remate */}
                      <div className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${THEME_CONFIGS[theme].verseCardBg} ${THEME_CONFIGS[theme].verseCardBorder}`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center justify-between ${
                          theme === 'noche-bohemia' ? 'text-purple-400' : theme === 'campo-soleado' ? 'text-emerald-850' : 'text-red-700'
                        }`}>
                          <span>III. Remate</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-sm font-semibold ${
                            theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-350' : 'bg-amber-100 text-amber-800'
                          }`}>7 y 5 Sílabas</span>
                        </span>
                        
                        <div className="flex flex-col gap-1.5 min-h-[110px] justify-center">
                          {composedCueca.lyrics.remate.map((v, idx) => (
                            <div key={`r-${idx}`} className="flex items-center justify-between gap-2.5 text-sm">
                              <span className={`font-bold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>{v.text}</span>
                              <span className={`font-mono text-[10px] rounded-sm shrink-0 px-1 ${
                                theme === 'noche-bohemia' ? 'bg-slate-900 text-slate-400' : 'bg-zinc-100 text-zinc-400'
                              }`}>
                                {v.syllables}s
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    {/* Poetic Métrica Explanation card */}
                    <div className={`rounded-xl border p-4 flex gap-3.5 items-start transition-colors duration-300 ${
                      theme === 'noche-bohemia' 
                        ? 'bg-[#1b1c2b] border-[#292f45]' 
                        : theme === 'campo-soleado'
                        ? 'bg-emerald-50/10 border-yellow-250'
                        : 'bg-amber-50/40 border-amber-100'
                    }`}>
                      <Feather className={`w-5 h-5 shrink-0 mt-0.5 ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-700'}`} />
                      <div className={`flex flex-col gap-1 text-xs ${theme === 'noche-bohemia' ? 'text-slate-300' : 'text-slate-700'}`}>
                        <h4 className={`font-bold font-serif ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-900'}`}>Análisis Mátrico y Poético del Cantor AI</h4>
                        <p className="leading-relaxed font-semibold">
                          {composedCueca.poeticExplanation}
                        </p>
                      </div>
                    </div>

                    {/* Analizador de Rango Vocal y Distribución de Notas de la Cueca */}
                    {(() => {
                      const vocalNotes = composedCueca.melodyJson.filter(n => n.instrument === 'voz');
                      const pitchFreqs: Record<string, number> = {};
                      let totalVocalNotes = 0;
                      vocalNotes.forEach(n => {
                        pitchFreqs[n.pitch] = (pitchFreqs[n.pitch] || 0) + 1;
                        totalVocalNotes++;
                      });

                      const uniquePitchesSorted = Object.keys(pitchFreqs).sort((a, b) => getNoteValue(a) - getNoteValue(b));
                      const lowestVocalNote = uniquePitchesSorted.length > 0 ? uniquePitchesSorted[0] : "";
                      const highestVocalNote = uniquePitchesSorted.length > 0 ? uniquePitchesSorted[uniquePitchesSorted.length - 1] : "";

                      let mostFrequentPitch = "";
                      let maxFreq = 0;
                      Object.entries(pitchFreqs).forEach(([p, count]) => {
                        if (count > maxFreq) {
                          maxFreq = count;
                          mostFrequentPitch = p;
                        }
                      });

                      return (
                        <div className={`rounded-xl border p-5 md:p-6 transition-all duration-300 flex flex-col gap-4 ${
                          theme === 'noche-bohemia' 
                            ? 'bg-[#141725] border-slate-800/80 text-slate-300' 
                            : theme === 'campo-soleado'
                            ? 'bg-yellow-50/20 border-yellow-250/80 text-emerald-950'
                            : 'bg-white border-amber-100 text-slate-800 shadow-2xs'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 border-dashed border-zinc-200">
                            <div className="flex items-center gap-2.5">
                              <Music className={`w-5 h-5 shrink-0 ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-700'}`} />
                              <div>
                                <h4 className={`font-bold font-serif text-sm ${theme === 'noche-bohemia' ? 'text-amber-300' : 'text-amber-900'}`}>
                                  Rango Vocal y Distribución de Notas (Voz)
                                </h4>
                                <p className="text-[11px] text-slate-400 font-medium">
                                  Análisis en tiempo real de {totalVocalNotes} notas vocales para asegurar el cantar tradicional
                                </p>
                              </div>
                            </div>
                            
                            {lowestVocalNote && highestVocalNote ? (
                              <div className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border text-center shrink-0 self-start sm:self-center ${
                                theme === 'noche-bohemia' ? 'bg-[#1b1e2f] border-slate-800 text-amber-350' : 'bg-red-50 border-red-100 text-red-700'
                              }`}>
                                Rango: {pitchToSpanish(lowestVocalNote)} a {pitchToSpanish(highestVocalNote)}
                              </div>
                            ) : null}
                          </div>

                          {uniquePitchesSorted.length > 0 ? (
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                              
                              {/* Horizontal Bar Chart */}
                              <div className="lg:col-span-8 flex flex-col gap-2.5">
                                {uniquePitchesSorted.map((pitch) => {
                                  const count = pitchFreqs[pitch];
                                  const percentage = totalVocalNotes > 0 ? Math.round((count / totalVocalNotes) * 100) : 0;
                                  const isMostFrequent = pitch === mostFrequentPitch;

                                  return (
                                    <div key={`pitch-dist-${pitch}`} className="flex items-center gap-3 text-xs">
                                      {/* Note Label */}
                                      <div className="w-16 text-right font-semibold whitespace-nowrap shrink-0">
                                        <span className={isMostFrequent ? "text-red-650 font-extrabold text-red-600 dark:text-amber-400" : ""}>
                                          {pitchToSpanish(pitch)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-mono font-medium ml-1">
                                          ({pitch})
                                        </span>
                                      </div>

                                      {/* Progress Bar */}
                                      <div className={`flex-1 h-5 rounded-md relative flex items-center overflow-hidden ${
                                        theme === 'noche-bohemia' ? 'bg-[#0f111a]' : 'bg-slate-100/80'
                                      }`}>
                                        <div 
                                          className={`h-full rounded-md transition-all duration-500 ease-out ${
                                            isMostFrequent 
                                              ? theme === 'noche-bohemia'
                                                ? 'bg-amber-500'
                                                : theme === 'campo-soleado'
                                                ? 'bg-emerald-600'
                                                : 'bg-red-600'
                                              : theme === 'noche-bohemia'
                                                ? 'bg-[#3b2a54]'
                                                : theme === 'campo-soleado'
                                                ? 'bg-yellow-400'
                                                : 'bg-amber-600/35'
                                          }`}
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                        
                                        {/* Count marker overlay */}
                                        <span className={`absolute left-2.5 text-[10px] font-bold ${
                                          isMostFrequent
                                            ? theme === 'noche-bohemia' ? 'text-slate-950 font-black' : 'text-white'
                                            : theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-750'
                                        }`}>
                                          {count} {count === 1 ? 'nota' : 'notas'} ({percentage}%)
                                        </span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Sidebar Vocal Diagnosis */}
                              <div className={`lg:col-span-4 rounded-xl p-4 flex flex-col justify-between gap-3 text-xs font-semibold ${
                                theme === 'noche-bohemia' 
                                  ? 'bg-[#1b1c2b] border border-[#292f45]' 
                                  : theme === 'campo-soleado'
                                  ? 'bg-[#fcfcee] border border-yellow-205'
                                  : 'bg-zinc-50 border border-zinc-150'
                              }`}>
                                <div className="space-y-3">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diagnóstico de Registro</p>
                                  
                                  <div className="flex flex-col gap-2">
                                    <div className="flex justify-between border-b pb-1.5 border-dashed border-zinc-200">
                                      <span className="text-slate-400">Nota Frecuente:</span>
                                      <span className={`font-bold ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-900'}`}>
                                        {pitchToSpanish(mostFrequentPitch)} ({mostFrequentPitch})
                                      </span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1.5 border-dashed border-zinc-200">
                                      <span className="text-slate-400">Extensión Fónica:</span>
                                      <span className="text-slate-500 font-mono">
                                        {lowestVocalNote && highestVocalNote ? `${getNoteValue(highestVocalNote) - getNoteValue(lowestVocalNote) + 1} tonos/semitonos` : '—'}
                                      </span>
                                    </div>
                                  </div>

                                  <p className={`leading-relaxed font-semibold font-sans text-[11px] ${
                                    theme === 'noche-bohemia' ? 'text-slate-350' : 'text-slate-650'
                                  }`}>
                                    {lowestVocalNote && highestVocalNote ? (
                                      getNoteValue(highestVocalNote) >= 72 // C5 or higher
                                        ? "Esta cueca posee un rango vocal amplio de Soprano/Tenor, ideal para voces agudas que proyectan fuerza en el remate campesino tradicional."
                                        : getNoteValue(highestVocalNote) <= 65 // F4 or lower
                                        ? "Tiene un rango cómodo de Contralto/Barítono, óptimo para el registro bajo clásico del canto agrario de ruedas comunitarias."
                                        : "Rango estándar de Mezzosoprano/Tenor medio. Es el registro óptimo y más natural para entonar cuecas campesinas en fiestas criollas."
                                    ) : ""}
                                  </p>
                                </div>
                                
                                <div className="text-[10px] text-slate-400 mt-1">
                                  💡 <span className="italic">Usa el transportador de tonos del sintetizador si deseas adecuar la tonalidad a tu registro.</span>
                                </div>
                              </div>

                            </div>
                          ) : (
                            <div className="text-center py-6 text-xs text-slate-400 font-semibold italic">
                              No hay suficientes notas vocales en la melodía generada para graficar el rango.
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* Call to action to show score */}
                    <div className={`mt-2 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border transition-colors ${
                      theme === 'noche-bohemia'
                        ? 'bg-[#1b1c2b] border-[#292f45]'
                        : theme === 'campo-soleado'
                        ? 'bg-yellow-55/40 border-yellow-250'
                        : 'bg-amber-50/50 border-amber-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🎼</span>
                        <div className="text-left">
                          <h4 className={`font-bold text-xs ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-amber-900'}`}>Partitura del Pentagrama Lista</h4>
                          <p className={`text-[11px] ${theme === 'noche-bohemia' ? 'text-slate-400' : 'text-slate-600'}`}>
                            La inteligencia artificial ha arreglado la partitura de flauta vocal y acompañamiento tradicional.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("score")}
                        className={`text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-95 shrink-0 ${
                          theme === 'noche-bohemia'
                            ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                            : theme === 'campo-soleado'
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-amber-600/90 hover:bg-amber-700 text-white"
                        }`}
                      >
                        Mostrar Partitura Completa →
                      </button>
                    </div>

                  </div>
                )}

                {/* TAB 2: SHEET MUSIC / PARTITURA */}
                {activeTab === "score" && (
                  <div className="flex flex-col gap-5 animate-fade-in-up items-center">
                    <div className="w-full text-center py-1 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4">
                      <div className="text-left">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Acompañamiento del pentagrama</p>
                        <p className="text-sm font-extrabold text-slate-700">
                          Pista 1: Vocal (Flauta Melódica) • Pista 2: Arreglo de {accompanimentTimbre === "acordeon" ? "Acordeón" : accompanimentTimbre === "arpa" ? "Arpa" : accompanimentTimbre === "guitarra" ? "Guitarra" : "Piano"}
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={downloadMusicXmlFile}
                          className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200/50 cursor-pointer"
                          title="Descargar archivo MusicXML para editar en MuseScore o Sibelius"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar MusicXML</span>
                        </button>

                        <button
                          type="button"
                          onClick={downloadMidiFile}
                          className="flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-200/50 cursor-pointer"
                          title="Descargar formato MIDI para sintetizadores externos"
                        >
                          <Music className="w-3.5 h-3.5" />
                          <span>Descargar MIDI</span>
                        </button>
                        
                        <button
                          type="button"
                          onClick={() => {
                            const w: any = window.open();
                            if (w) {
                              w.document.open();
                              w.document.write(`<pre style="padding: 20px; font-family: monospace;">${composedCueca.abcNotation}</pre>`);
                              w.document.close();
                            }
                          }}
                          className="text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                          title="Ver código crudo de notación musical ABC"
                        >
                          <span>Ver Código ABC</span>
                        </button>
                      </div>
                    </div>

                    {/* Target output element rendered on the fly with abcjs */}
                    <div className="w-full text-center">
                      <div 
                        id="abc-paper-output" 
                        ref={paperRef} 
                        className="abc-paper shadow-2xs border border-slate-150 inline-block w-full bg-white transition-opacity duration-300"
                      ></div>
                    </div>

                    <div className="w-full text-xs text-slate-400 font-medium italic text-center mt-1">
                      💡 La partitura se adapta automáticamente al ancho de la pantalla. Si utilizas un programa como MuseScore, puedes arrastrar el archivo MusicXML para editar cada compás lírico de tu cueca.
                    </div>
                  </div>
                )}

                {/* TAB 3: WEBAUDIO CUECA SYNTHESIZER */}
                {activeTab === "synth" && (
                  <div className="flex flex-col gap-6 animate-fade-in-up">
                    
                    {/* Control Panel Header */}
                    <div className="bg-[#faf9f6] border border-amber-100/50 rounded-2xl p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                      
                      {/* Left: Stop, Play, Acc, Transpose controls */}
                      <div className="md:col-span-8 flex flex-wrap items-center justify-center md:justify-start gap-5">
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={handlePlayToggle}
                            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-all text-white ${
                              isPlaying 
                                ? theme === 'noche-bohemia'
                                  ? "bg-purple-750 hover:bg-purple-800"
                                  : "bg-amber-600 hover:bg-amber-700" 
                                : THEME_CONFIGS[theme].primaryBtn.split(" ")[0]
                            }`}
                          >
                            {isPlaying ? (
                              <Pause className="w-6 h-6 fill-white" />
                            ) : (
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            )}
                          </button>
                          
                          <button
                            type="button"
                            onClick={handleStopPlayback}
                            disabled={currentBeat < 0}
                            className={`w-11 h-11 rounded-full border flex items-center justify-center transition-all ${
                              currentBeat >= 0 
                                ? theme === 'noche-bohemia'
                                  ? "bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white"
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900" 
                                : "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed"
                            }`}
                            title="Detener canción"
                          >
                            <Square className="w-4 h-4 fill-current" />
                          </button>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Estado</p>
                          <p className={`text-sm font-extrabold ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-slate-850'}`}>
                            {isPlaying ? "Ensayo en vivo..." : currentBeat >= 0 ? "En pausa" : "Listo para tocar"}
                          </p>
                        </div>

                        {/* Dropdown Menu to change backing sound */}
                        <div className="flex flex-col gap-1 min-w-[145px]">
                          <label htmlFor="accompaniment-select" className="text-[10px] font-bold text-slate-450 uppercase tracking-widest text-left">
                            Acompañamiento
                          </label>
                          <select
                            id="accompaniment-select"
                            value={accompanimentTimbre}
                            onChange={(e) => setAccompanimentTimbre(e.target.value as any)}
                            className={`text-xs p-2 rounded-xl border font-bold focus:outline-hidden transition-colors cursor-pointer ${
                              theme === 'noche-bohemia'
                                ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-2xs"
                            }`}
                          >
                            <option value="acordeon">🪗 Acordeón</option>
                            <option value="arpa">🦩 Arpa</option>
                            <option value="guitarra">🎸 Guitarra</option>
                            <option value="piano">🎹 Piano</option>
                          </select>
                        </div>

                        {/* Pitch Transpose (+/- semitones) */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-450 uppercase tracking-widest text-left">
                            Transporte de Tono
                          </span>
                          <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${
                            theme === 'noche-bohemia'
                              ? "bg-slate-900 border-slate-800"
                              : "bg-white border-slate-200 shadow-2xs"
                          }`}>
                            <button
                              id="btn-transpose-down"
                              type="button"
                              onClick={() => handleTranspose(-1)}
                              disabled={transposeSemits <= -12}
                              className={`w-7 h-7 flex items-center justify-center font-black rounded-lg transition-colors cursor-pointer select-none text-sm ${
                                theme === 'noche-bohemia'
                                  ? "bg-slate-850 hover:bg-slate-750 text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              }`}
                              title="Bajar un semitono (-1)"
                            >
                              -
                            </button>
                            <span className={`text-xs font-black min-w-[50px] text-center select-none ${
                              theme === 'noche-bohemia' ? 'text-amber-400' : 'text-slate-800'
                            }`}>
                              {transposeSemits > 0 ? `+${transposeSemits}` : transposeSemits} sem
                            </span>
                            <button
                              id="btn-transpose-up"
                              type="button"
                              onClick={() => handleTranspose(1)}
                              disabled={transposeSemits >= 12}
                              className={`w-7 h-7 flex items-center justify-center font-black rounded-lg transition-colors cursor-pointer select-none text-sm ${
                                theme === 'noche-bohemia'
                                  ? "bg-slate-850 hover:bg-slate-750 text-amber-400 disabled:opacity-20 disabled:cursor-not-allowed"
                                  : "bg-amber-50 hover:bg-amber-100 text-amber-800 disabled:opacity-30 disabled:cursor-not-allowed"
                              }`}
                              title="Subir un semitono (+1)"
                            >
                              +
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* Right: Metrics & Chronology ticker */}
                      <div className={`md:col-span-4 grid grid-cols-3 gap-3 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-5 font-mono ${
                        theme === 'noche-bohemia' ? 'border-slate-850' : 'border-amber-100/40'
                      }`}>
                          <div className={`text-center md:text-left p-2 rounded-lg border md:bg-transparent md:border-0 md:p-0 ${
                            theme === 'noche-bohemia' ? 'bg-slate-950 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <p className="text-[10px] font-sans font-semibold text-slate-400 capitalize">Compás</p>
                            <p className={`text-lg font-black ${theme === 'noche-bohemia' ? 'text-slate-100' : 'text-slate-800'}`}>
                              {currentBeat >= 0 ? `${currentMeasure}` : "—"}
                            </p>
                          </div>
                          <div className={`text-center md:text-left p-2 rounded-lg border md:bg-transparent md:border-0 md:p-0 ${
                            theme === 'noche-bohemia' ? 'bg-slate-950 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <p className="text-[10px] font-sans font-semibold text-slate-400 capitalize">Pulso corchea</p>
                            <p className={`text-lg font-black ${theme === 'noche-bohemia' ? 'text-slate-100' : 'text-slate-800'}`}>
                              {currentBeat >= 0 ? `${currentPulseIn68} / 6` : "—"}
                            </p>
                          </div>
                          <div className={`text-center md:text-left p-2 rounded-lg border md:bg-transparent md:border-0 md:p-0 ${
                            theme === 'noche-bohemia' ? 'bg-slate-950 border-slate-850' : 'bg-white border-slate-100'
                          }`}>
                            <p className="text-[10px] font-sans font-semibold text-slate-400 capitalize">Tiempo absoluto</p>
                            <p className={`text-lg font-black ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-slate-850'}`}>
                              {currentBeat >= 0 ? `${currentBeat}` : "00"}
                            </p>
                          </div>
                        </div>

                      </div>

                      {/* Timeline Grid (Representing the cueca layout) */}
                      <div className="flex flex-col gap-3">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Visualización de Compases (6/8)</h4>
                        
                        <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                          {Array.from({ length: Math.ceil(maxBeats / 6) }).map((_, mIdx) => {
                            const mStartBeat = mIdx * 6;
                            const mEndBeat = (mIdx + 1) * 6;
                            const isActiveMeasure = currentBeat >= mStartBeat && currentBeat < mEndBeat;
                            const isBeforeMeasure = currentBeat >= mEndBeat;
                            
                            // Look up chord at this measure for guitar display
                            const mChord = composedCueca.chordProgression.find(
                              c => c.timeBeats >= mStartBeat && c.timeBeats < mEndBeat
                            )?.chordSymbol || "G";

                            return (
                              <div
                                key={`visual-measure-${mIdx}`}
                                className={`p-2 rounded-lg border text-center transition-all ${
                                  isActiveMeasure 
                                    ? theme === 'noche-bohemia' 
                                      ? "bg-purple-700 border-purple-800 text-white shadow-xs font-bold scale-102" 
                                      : "bg-red-700 border-red-800 text-white shadow-xs font-bold scale-102" 
                                    : isBeforeMeasure
                                      ? theme === 'noche-bohemia'
                                        ? "bg-slate-900 border-slate-850 text-slate-500"
                                        : "bg-amber-100/30 border-amber-200/50 text-slate-500"
                                      : theme === 'noche-bohemia'
                                        ? "bg-slate-950 border-slate-900 text-slate-400"
                                        : "bg-white border-slate-100 text-slate-400 hover:bg-slate-50/50"
                                }`}
                              >
                                <p className="text-[9px] font-mono block">C.{mIdx + 1}</p>
                                <p className="text-sm font-extrabold capitalize block">{mChord}</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Tracks list explanation */}
                      <div className={`rounded-xl border p-4 text-xs font-semibold flex flex-col gap-2 transition-colors ${
                        theme === 'noche-bohemia' 
                          ? 'bg-slate-900/40 border-slate-850 text-slate-400' 
                          : 'bg-slate-50 border-slate-100 text-slate-600'
                      }`}>
                        <div className={`flex items-center gap-1.5 ${theme === 'noche-bohemia' ? 'text-slate-350' : 'text-slate-700'}`}>
                          <Volume2 className="w-4 h-4" />
                          <span>Canales Mezclados del Ensayo Folclórico</span>
                        </div>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-[11px] list-disc list-inside mt-1 font-semibold">
                          <li><strong>Voz solista:</strong> Guía melódica de la lírica cantada (Onda triángulo + vibrato).</li>
                          <li>
                            <strong>Acompañamiento:</strong>{" "}
                            {accompanimentTimbre === "arpa" && "Arpa Colchagüina armónica con notas de ataque directo y resonancia dulce."}
                            {accompanimentTimbre === "guitarra" && "Guitarra criolla rítmica sincopada de timbre cálido con decaimiento natural."}
                            {accompanimentTimbre === "piano" && "Piano folclórico de salón con timbre amplio y armónicos temperados."}
                            {accompanimentTimbre === "acordeon" && "Acordeón chileno tradicional (Fuelle de doble oscilador Sawtooth)."}
                          </li>
                          <li><strong>Guitarra chilena:</strong> Sincopación sobre acorde arpegiado rítmicamente en cada compás.</li>
                          <li><strong>Percusión (Palmas):</strong> Claps y chasquidos sobre corcheas syncopadas tradicionales (1, 3, 4, 6).</li>
                        </ul>
                      </div>

                    </div>
                  )}

                  {/* TAB 4: FILE EXPORT & DOWNLOAD CODES */}
                  {activeTab === "export" && (
                    <div className="flex flex-col gap-5 animate-fade-in-up">
                      <p className={`text-xs font-semibold mb-1 ${theme === 'noche-bohemia' ? 'text-slate-400' : 'text-slate-500'}`}>
                        Descarga libremente en formatos estándar los archivos listados para abrirlos en tus reproductores, editores de partituras de escritorio o utilizarlos en tus clases folclóricas.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        
                        {/* Card A: Audio WAV */}
                        <div className={`border shadow-xs rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-colors ${
                          theme === 'noche-bohemia' ? 'bg-[#1b1c2b] border-[#292f45]' : 'bg-white border-amber-100'
                        }`}>
                          <div className={`p-3 rounded-full ${theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-700'}`}>
                            <Music className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Sonido HD</p>
                            <h4 className={`text-sm font-extrabold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>Exportar Audio WAV</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                              Archivo de onda de audio estéreo pura de 16-bits para reproducir de forma inmediata.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={downloadWavAudioFile}
                            disabled={isExportingWav}
                            className={`w-full mt-2 py-2 px-3 disabled:bg-slate-350 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer text-white ${
                              theme === 'noche-bohemia' ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' : 'bg-red-750 bg-red-700 hover:bg-red-800'
                            }`}
                          >
                            {isExportingWav ? (
                              <RotateCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            <span>{isExportingWav ? "Sintetizando..." : "Descargar Audio WAV"}</span>
                          </button>
                        </div>

                        {/* Card B: MIDI File */}
                        <div className={`border shadow-xs rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-colors ${
                          theme === 'noche-bohemia' ? 'bg-[#1b1c2b] border-[#292f45]' : 'bg-white border-amber-100'
                        }`}>
                          <div className={`p-3 rounded-full ${theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-400' : 'bg-blue-50 text-blue-700'}`}>
                            <Music className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-455 text-slate-400 uppercase tracking-widest">Protocolo General</p>
                            <h4 className={`text-sm font-extrabold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>Exportar Archivo MIDI</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                              Permite importar las notas del sintetizador a DAWs (Cakewalk, FL Studio, Ableton, Cubase).
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={downloadMidiFile}
                            className={`w-full mt-2 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer text-white ${
                              theme === 'noche-bohemia' ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' : 'bg-red-750 bg-red-700 hover:bg-red-800'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar MIDI (.mid)</span>
                          </button>
                        </div>

                        {/* Card C: MusicXML */}
                        <div className={`border shadow-xs rounded-2xl p-5 text-center flex flex-col items-center gap-3 transition-colors ${
                          theme === 'noche-bohemia' ? 'bg-[#1b1c2b] border-[#292f45]' : 'bg-white border-amber-100'
                        }`}>
                          <div className={`p-3 rounded-full ${theme === 'noche-bohemia' ? 'bg-amber-500/10 text-amber-400' : 'bg-green-50 text-green-700'}`}>
                            <Download className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-slate-450 uppercase tracking-widest">Notación Digital</p>
                            <h4 className={`text-sm font-extrabold ${theme === 'noche-bohemia' ? 'text-slate-200' : 'text-slate-800'}`}>Exportar MusicXML</h4>
                            <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">
                              El estándar universal para abrir esta partitura exacta en MuseScore, Sibelius, o Finale.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={downloadMusicXmlFile}
                            className={`w-full mt-2 py-2 px-3 text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all active:scale-97 cursor-pointer text-white ${
                              theme === 'noche-bohemia' ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black' : 'bg-red-750 bg-red-700 hover:bg-red-800'
                            }`}
                          >
                            <Download className="w-4 h-4" />
                            <span>Descargar MusicXML (.musicxml)</span>
                          </button>
                        </div>

                      </div>

                      {/* Helpful tips panel */}
                      <div className={`rounded-xl border p-4 mt-2 transition-colors ${
                        theme === 'noche-bohemia' ? 'bg-slate-900/40 border-slate-850' : 'bg-slate-50 border-slate-100'
                      }`}>
                        <h5 className={`text-xs font-bold flex items-center gap-1.5 ${theme === 'noche-bohemia' ? 'text-amber-400' : 'text-slate-700'}`}>
                          <HelpCircle className="w-4 h-4 text-amber-700" />
                          <span>¿Cómo utilizar el archivo MusicXML?</span>
                        </h5>
                        <p className={`text-[10.5px] font-medium mt-1 lines-relaxed ${theme === 'noche-bohemia' ? 'text-slate-400' : 'text-slate-500'}`}>
                          MusicXML es el formato más poderoso de partitura abierta. Si tienes instalada una aplicación gratuita como MuseScore, puedes arrastrar y soltar el archivo descargado para editar todas las notas, imprimir separadamente las páginas para cada músico tradicional, variar instrumentaciones o acomodar rangos de canto en el teclado con entera libertad.
                        </p>
                      </div>

                    </div>
                  )}

                </div>

              </div>
            )}

          </section>

        </main>

        {/* Footer copyright */}
        <footer className={`border-t py-6 text-center text-xs font-semibold mt-12 shrink-0 transition-colors ${THEME_CONFIGS[theme].footerBg} ${THEME_CONFIGS[theme].footerBorder} ${THEME_CONFIGS[theme].footerText}`}>
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-3">
            <p>
              © {new Date().getFullYear()} El Cantor del Campo AI. Hecho en Chile con la sabiduría de folcloristas tradicionales.
            </p>
            <div className="flex gap-4">
              <span className="hover:text-slate-600 transition-colors">Técnica de Copla, Seguidilla y Remate</span>
              <span>•</span>
              <span className="hover:text-slate-600 transition-colors">Voz, Acordeón y Guitarra</span>
            </div>
          </div>
        </footer>
    </div>
  );
}
