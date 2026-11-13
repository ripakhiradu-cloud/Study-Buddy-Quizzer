import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: "2mb" }));

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseJsonSafe<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start !== -1 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error("Unable to parse structured response from model.");
  }
}

function formatApiError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("403") || msg.includes("PERMISSION_DENIED") || msg.includes("API_KEY_INVALID")) {
    return {
      status: 403,
      message: "Gemini API key was rejected. Check GEMINI_API_KEY in Settings > Secrets.",
    };
  }
  if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED")) {
    return {
      status: 429,
      message: "Rate limit reached. Please wait a moment and try again.",
    };
  }
  return {
    status: 500,
    message: msg || "An unexpected error occurred while generating study material.",
  };
}

interface GenerateStudySetBody {
  notes?: string;
  depth?: "core" | "exam";
  questionCount?: number;
  flashcardCount?: number;
}

app.post("/api/generate-study-set", async (req, res) => {
  try {
    const body = req.body as GenerateStudySetBody;
    const notes = (body.notes ?? "").trim();
    if (notes.length < 30) {
      res.status(400).json({
        error: "Please paste at least a short paragraph of class notes (30+ characters).",
      });
      return;
    }

    const depth = body.depth === "exam" ? "exam" : "core";
    const questionCount = Math.min(Math.max(Number(body.questionCount) || 6, 4), 12);
    const flashcardCount = Math.min(Math.max(Number(body.flashcardCount) || 8, 4), 14);

    const ai = getAiClient();

    const depthGuidance =
      depth === "exam"
        ? "Focus on exam-level application, cause-and-effect chains, edge cases, and plausible distractors that test subtle misconceptions."
        : "Focus on core mechanisms, clear definitions, and foundational understanding directly grounded in the notes.";

    const prompt = `Analyze the following class notes and generate a structured study deck with flashcards and quiz questions.

${depthGuidance}

Requirements:
- Extract 3 to 5 concise topic names from the notes.
- Create exactly ${flashcardCount} flashcards. Each flashcard must belong to one of the extracted topics, have a crisp active-recall prompt on the front, a clear concise answer on the back, a brief memory hint, and a short 1-sentence sourceExcerpt grounded in the notes.
- Create exactly ${questionCount} quiz questions mixing "multiple_choice" (about 70%) and "short_answer" (about 30%).
- For "multiple_choice": provide 4 distinct options, the 0-based correctIndex, and optionRationales (an array of 4 short explanations, one per option, explaining why that option is correct or why it is a specific misconception). Also provide modelAnswer (same as correct option text) and empty keyPoints [].
- For "short_answer": set options to [], optionRationales to [], correctIndex to 0, provide a concise modelAnswer, and 2-3 keyPoints expected in a strong student answer.
- Every question must tag one of the extracted topics, a difficulty ("foundational", "applied", or "synthesis"), an explanation, and a brief sourceExcerpt.

CLASS NOTES:
${notes.slice(0, 18000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are an expert cognitive-science tutor. Ground every flashcard and quiz question strictly in the user's class notes, writing clear, unambiguous prose without fluff.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Concise 3-7 word subject title for the notes." },
            summary: { type: Type.STRING, description: "1-2 sentence overview of what the notes cover." },
            topics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 to 5 concise topic labels.",
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  sourceExcerpt: { type: Type.STRING },
                },
                required: ["topic", "front", "back", "hint", "sourceExcerpt"],
              },
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  type: { type: Type.STRING, description: "'multiple_choice' or 'short_answer'" },
                  difficulty: { type: Type.STRING, description: "'foundational', 'applied', or 'synthesis'" },
                  prompt: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  optionRationales: { type: Type.ARRAY, items: { type: Type.STRING } },
                  modelAnswer: { type: Type.STRING },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING },
                  sourceExcerpt: { type: Type.STRING },
                },
                required: [
                  "topic",
                  "type",
                  "difficulty",
                  "prompt",
                  "options",
                  "correctIndex",
                  "optionRationales",
                  "modelAnswer",
                  "keyPoints",
                  "explanation",
                  "sourceExcerpt",
                ],
              },
            },
          },
          required: ["title", "summary", "topics", "flashcards", "questions"],
        },
      },
    });

    const parsed = parseJsonSafe<{
      title: string;
      summary: string;
      topics: string[];
      flashcards: Array<{
        topic: string;
        front: string;
        back: string;
        hint: string;
        sourceExcerpt: string;
      }>;
      questions: Array<{
        topic: string;
        type: string;
        difficulty: string;
        prompt: string;
        options: string[];
        correctIndex: number;
        optionRationales: string[];
        modelAnswer: string;
        keyPoints: string[];
        explanation: string;
        sourceExcerpt: string;
      }>;
    }>(response.text, {
      title: "Study Set",
      summary: "",
      topics: [],
      flashcards: [],
      questions: [],
    });

    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

interface GradeAnswerBody {
  notes?: string;
  question?: string;
  modelAnswer?: string;
  keyPoints?: string[];
  userAnswer?: string;
}

app.post("/api/grade-answer", async (req, res) => {
  try {
    const body = req.body as GradeAnswerBody;
    const userAnswer = (body.userAnswer ?? "").trim();
    if (!userAnswer) {
      res.status(400).json({ error: "Please enter an answer before submitting." });
      return;
    }

    const ai = getAiClient();
    const prompt = `Evaluate the student's short-answer response against the class notes and expected key points.

Question: ${body.question ?? ""}
Reference Answer: ${body.modelAnswer ?? ""}
Key Points: ${(body.keyPoints ?? []).join("; ")}
Student Answer: ${userAnswer}

Class Notes Context:
${(body.notes ?? "").slice(0, 8000)}

Be fair but accurate: mark isCorrect true if the student captures the core mechanism/answer (score >= 70), even with different wording. If incorrect or incomplete, identify the exact missingConcept in 4-10 words so our adaptive engine can target it next.`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are a concise, constructive academic grader. Evaluate conceptual accuracy strictly against the provided reference answer and notes.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isCorrect: { type: Type.BOOLEAN },
            score: { type: Type.INTEGER, description: "0 to 100" },
            feedback: { type: Type.STRING, description: "2-3 sentences explaining what was right and what was missed." },
            missingConcept: {
              type: Type.STRING,
              description: "Short phrase naming the missed concept if score < 100, or empty string if fully correct.",
            },
          },
          required: ["isCorrect", "score", "feedback", "missingConcept"],
        },
      },
    });

    const parsed = parseJsonSafe(response.text, {
      isCorrect: false,
      score: 0,
      feedback: "Unable to evaluate answer.",
      missingConcept: "",
    });
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

interface WrongItemPayload {
  topic: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  missingConcept?: string;
}

interface AdaptQuizBody {
  notes?: string;
  existingPrompts?: string[];
  wrongItems?: WrongItemPayload[];
  weakTopics?: string[];
  targetCount?: number;
}

app.post("/api/adapt-quiz", async (req, res) => {
  try {
    const body = req.body as AdaptQuizBody;
    const notes = (body.notes ?? "").trim();
    const wrongItems = body.wrongItems ?? [];
    const weakTopics = body.weakTopics ?? [];
    const targetCount = Math.min(Math.max(Number(body.targetCount) || 4, 2), 8);

    if (!notes || (wrongItems.length === 0 && weakTopics.length === 0)) {
      res.status(400).json({ error: "Missing notes or missed concepts to adapt from." });
      return;
    }

    const ai = getAiClient();

    const wrongSummary = wrongItems
      .slice(-8)
      .map(
        (w, i) =>
          `${i + 1}. Topic: ${w.topic}\n   Question: ${w.prompt}\n   Student answered: ${w.userAnswer}\n   Correct answer: ${w.correctAnswer}${
            w.missingConcept ? `\n   Misconception / Gap: ${w.missingConcept}` : ""
          }`
      )
      .join("\n");

    const prompt = `The student missed specific questions or flagged weak topics. Generate an adaptive follow-up drill that repairs these exact misunderstandings WITHOUT repeating old question phrasings verbatim.

Weak Topics: ${weakTopics.join(", ")}

Recent Missed Questions & Misconceptions:
${wrongSummary || "None recorded yet — focus on the weak topics listed above."}

Already Asked Question Prompts (DO NOT repeat these):
${(body.existingPrompts ?? []).slice(-16).map((p) => `- ${p}`).join("\n")}

Instructions:
1. Generate ${targetCount} targeted follow-up quiz questions (mix of multiple_choice and short_answer) that scaffold from the exact concept the student missed:
   - First test the core mechanism from a fresh angle or concrete contrast to clear up the student's specific misconception.
   - Then test an applied scenario so the student proves transfer.
2. Also generate 2 to 3 targeted remedial flashcards addressing the exact gaps shown above.
3. For each question, include "remedialTarget": a short phrase naming the exact misconception or gap this question is repairing (e.g., "Distinguishing substrate-level vs oxidative phosphorylation").

CLASS NOTES:
${notes.slice(0, 16000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction:
          "You are an adaptive mastery tutor. Diagnose why a student got something wrong and write fresh, scaffolded questions and flashcards that repair the misconception.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            adaptationSummary: {
              type: Type.STRING,
              description: "1-2 sentences explaining how this adaptive drill targets the student's mistakes.",
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  type: { type: Type.STRING },
                  difficulty: { type: Type.STRING },
                  remedialTarget: { type: Type.STRING },
                  prompt: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctIndex: { type: Type.INTEGER },
                  optionRationales: { type: Type.ARRAY, items: { type: Type.STRING } },
                  modelAnswer: { type: Type.STRING },
                  keyPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                  explanation: { type: Type.STRING },
                  sourceExcerpt: { type: Type.STRING },
                },
                required: [
                  "topic",
                  "type",
                  "difficulty",
                  "remedialTarget",
                  "prompt",
                  "options",
                  "correctIndex",
                  "optionRationales",
                  "modelAnswer",
                  "keyPoints",
                  "explanation",
                  "sourceExcerpt",
                ],
              },
            },
            remedialFlashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  topic: { type: Type.STRING },
                  front: { type: Type.STRING },
                  back: { type: Type.STRING },
                  hint: { type: Type.STRING },
                  sourceExcerpt: { type: Type.STRING },
                },
                required: ["topic", "front", "back", "hint", "sourceExcerpt"],
              },
            },
          },
          required: ["adaptationSummary", "questions", "remedialFlashcards"],
        },
      },
    });

    const parsed = parseJsonSafe(response.text, {
      adaptationSummary: "Targeted follow-up generated from your missed concepts.",
      questions: [],
      remedialFlashcards: [],
    });
    res.json(parsed);
  } catch (err) {
    const formatted = formatApiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("/{*splat}", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Study Buddy Quizzer running on http://localhost:${PORT}`);
  });
}

startServer();
