import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase JSON payload size limits to allow file uploads (base64 images/PDFs)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ limit: "25mb", extended: true }));

// Initialize GoogleGenAI client dynamically per request to allow custom API key injection
function getGenAI(customApiKey?: string) {
  const key = (customApiKey && customApiKey.trim()) || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("No se ha configurado la API Key de Gemini. Por favor configúrala en AI Studio (Settings > Secrets) o ingresa tu API Key personal en los Ajustes de la barra superior.");
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Cueca Compositor Endpoint
app.post("/api/compose", async (req, res) => {
  try {
    const { textPrompt, fileBase64, fileMimeType, customApiKey, selectedModel } = req.body;

    const userPrompt = textPrompt || "Escribe una cueca campesina chilena tradicional sobre el campo y la cosecha.";

    const ai = getGenAI(customApiKey);

    // Prepare system instruction for authentic Chilean Cueca Campesina
    const systemInstruction = `
Eres un compositor experto de Cueca Campesina Chilena tradicional. Tu misión es componer una cueca campesina auténtica basada en la descripción poética de un texto, PDF o foto que te proporcione el usuario.

La estructura de la letra de la Cueca Campesina tradicional chilena debe respetarse rigurosamente:
1. Copla / Cuarteta: Cuatro versos octosílabos (8 sílabas cada uno), rima abcb o abab.
2. Seguidilla: Cuatro versos de 7 y 5 sílabas alternadas (7, 5, 7, 5). El primer verso de la seguidilla suele repetirse al cantar, con el agregado de un "sí" u otra coletilla (e.g., convirtiéndose en 5 líneas).
3. Remate o Coletilla: Dos versos de 7 y 5 sílabas (7, 5), riman entre sí.

Debes generar también partituras y datos de notas estructurados en un formato JSON para que el frontend pueda sintetizar el sonido, crear un archivo MIDI descargable, crear un MusicXML descargable y renderizar la partitura con abcjs.

Reglas para la música:
- Tempo: típicamente rápido (120-140 BPM).
- Compás: 6/8.
- Tonalidad: Elige una tonalidad folclórica común (G mayor, C mayor, o A menor).
- Pistas de la partitura:
  - Voz (melodía de la letra cantada).
  - Acordeón (melodía complementaria instrumental).
  - Progresión de acordes rítmicos para guitarra.
- El formato 'abcNotation' que entregues debe ser código ABC musical válido y completo para renderizarse con abcjs. Debe incluir títulos, indicaciones de compás (M:6/8), tonalidad (K:<tonalidad>) y los dos staves principales con nombres: Voz (V:1) y Acordeón (V:2), además de acordes sobre las notas (ej. "G"D2 G G2 B).
- "melodyJson" debe ser una lista detallada de notas secuenciales para la Voz ("instrument": "voz") y el Acordeón ("instrument": "acordeon") que coincida aproximadamente con la música de la cueca (puedes crear 16 a 24 compases de 6/8, o sea, de 96 a 144 pulsos de octavo de nota). Cada pulso de octavo de nota (eighth note) equivale a 1 beat en la escala temporal.
`;

    const contents: any[] = [];

    // Add file if uploaded
    if (fileBase64 && fileMimeType) {
      contents.push({
        inlineData: {
          mimeType: fileMimeType,
          data: fileBase64,
        },
      });
    }

    // Add user text prompt
    contents.push({
      text: `Entrada del usuario: ${userPrompt}\n\nPor favor genera la composición conforme a la estructura y reglas de la cueca campesina.`,
    });

    let modelsToTry = ["gemini-3.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    if (selectedModel && selectedModel.trim()) {
      modelsToTry = [selectedModel, ...modelsToTry.filter(m => m !== selectedModel)];
    }
    
    let response = null;
    let success = false;
    let finalModelUsed = "";
    const errors: string[] = [];

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting composition with model: ${modelName}`);
        response = await ai.models.generateContent({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Título poético y descriptivo de la Cueca campesina chilena.",
                },
                key: {
                  type: Type.STRING,
                  description: "Tonalidad recomendada (ej. 'Sol Mayor', 'Do Mayor', 'La Menor').",
                },
                tempoBpm: {
                  type: Type.INTEGER,
                  description: "Tempo en pulsos de 6/8, típicamente entre 120 y 140 bpm.",
                },
                inspiration: {
                  type: Type.STRING,
                  description: "Resumen explicativo de cómo el archivo o texto del usuario inspiró esta cueca particular.",
                },
                poeticExplanation: {
                  type: Type.STRING,
                  description: "Explicación detallada del número de sílabas métricas y rimas en la Copla, la Seguidilla y el Remate, demostrando el apego al folclore campesino.",
                },
                lyrics: {
                  type: Type.OBJECT,
                  properties: {
                    cuarteta: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING, description: "Línea de verso" },
                          syllables: { type: Type.INTEGER, description: "Cantidad de sílabas métricas (debe ser aprox 8)" },
                        },
                        required: ["text", "syllables"],
                      },
                    },
                    seguidilla: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING, description: "Línea de verso" },
                          syllables: { type: Type.INTEGER, description: "Cantidad de sílabas métricas (alterna entre 7 y 5)" },
                        },
                        required: ["text", "syllables"],
                      },
                    },
                    remate: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          text: { type: Type.STRING, description: "Línea de verso" },
                          syllables: { type: Type.INTEGER, description: "Cantidad de sílabas métricas (7 y 5)" },
                        },
                        required: ["text", "syllables"],
                      },
                    },
                  },
                  required: ["cuarteta", "seguidilla", "remate"],
                },
                chordProgression: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeBeats: { type: Type.NUMBER, description: "Inicio del acorde en pulsos de corchea (0, 6, 12, etc.)" },
                      chordSymbol: { type: Type.STRING, description: "Símbolo de acorde americano (G, C, D7, Am, E7, F, etc.)" },
                      durationBeats: { type: Type.NUMBER, description: "Duración en número de corcheas (generalmente 6, que es un compás de 6/8, o múltiplos)" },
                    },
                    required: ["timeBeats", "chordSymbol", "durationBeats"],
                  },
                },
                melodyJson: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      timeBeats: { type: Type.NUMBER, description: "Tiempo de inicio medido en corcheas (0, 1, 2, 3...)" },
                      durationBeats: { type: Type.NUMBER, description: "Duración medida en corcheas (ej: 1 corchea = 1, negra = 2, negra con punto = 3)" },
                      pitch: { type: Type.STRING, description: "Indicación de nota científica de la melodía principal (ej. C4, D4, E4, F4, G4, A4, B4, C5, D5)" },
                      instrument: { type: Type.STRING, description: "'voz' para lírica cantada, 'acordeon' para el adorno instrumental" },
                      lyrics: { type: Type.STRING, description: "Opcional: sílaba correspondiente a cantar en esta nota para la la Voz" },
                    },
                    required: ["timeBeats", "durationBeats", "pitch", "instrument"],
                  },
                },
                abcNotation: {
                  type: Type.STRING,
                  description: "Código de notación ABC completo y sintácticamente válido para abcjs, estructurado para renderizar partituras de Voz y Acordeón con acordes de guitarra encima.",
                },
              },
              required: [
                "title",
                "key",
                "tempoBpm",
                "inspiration",
                "poeticExplanation",
                "lyrics",
                "chordProgression",
                "melodyJson",
                "abcNotation",
              ],
            },
          },
        });
        success = true;
        finalModelUsed = modelName;
        break;
      } catch (err: any) {
        console.error(`Error attempting model ${modelName}:`, err);
        errors.push(`${modelName}: ${err.message || err.toString()}`);
      }
    }

    if (!success || !response) {
      throw new Error(`Fallo de conexión en todos los modelos probados (${modelsToTry.join(", ")}). Error específico:\n${errors.join("\n")}`);
    }

    const parsedData = JSON.parse(response.text || "{}");
    parsedData.modelUsed = finalModelUsed;
    res.json(parsedData);
  } catch (error: any) {
    console.error("Error in compose endpoint:", error);
    let errorMessage = "Ocurrió un error al procesar la cueca. Por favor asegúrate de tener configurada la API key de Gemini.";
    
    if (error.message && (error.message.includes("403") || error.message.includes("denied") || error.message.includes("permission"))) {
      errorMessage = "Acceso Denegado (403): Tu API Key o proyecto de Google Cloud no tiene acceso habilitado para usar estos modelos de Gemini. Por favor verifica que tu API Key esté correctamente cargada en Settings > Secrets en AI Studio.";
    }

    res.status(500).json({
      error: errorMessage,
      details: error.message,
    });
  }
});

// Vite server connection (runs during dev mode)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
