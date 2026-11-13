export type StudyTab = "notes" | "flashcards" | "quiz" | "weak-spots";

export type CardConfidence = "unseen" | "missed" | "almost" | "mastered";

export interface Flashcard {
  id: string;
  topic: string;
  front: string;
  back: string;
  hint: string;
  sourceExcerpt: string;
  confidence: CardConfidence;
  reviews: number;
  misses: number;
  isRemedial?: boolean;
}

export type QuestionType = "multiple_choice" | "short_answer";
export type QuestionDifficulty = "foundational" | "applied" | "synthesis";

export interface QuizQuestion {
  id: string;
  topic: string;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  prompt: string;
  options: string[];
  correctIndex: number;
  optionRationales: string[];
  modelAnswer: string;
  keyPoints: string[];
  explanation: string;
  sourceExcerpt: string;
  remedialTarget?: string;
  isAdaptive?: boolean;
}

export interface QuizAttempt {
  id: string;
  questionId: string;
  topic: string;
  prompt: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  score: number;
  feedback: string;
  missingConcept?: string;
  timestamp: number;
}

export interface TopicStat {
  topic: string;
  attempts: number;
  misses: number;
  cardMisses: number;
  masteredCards: number;
  totalCards: number;
  accuracy: number | null;
  status: "untested" | "needs_focus" | "developing" | "mastered";
  gaps: string[];
}

export interface StudySet {
  id: string;
  title: string;
  summary: string;
  notes: string;
  topics: string[];
  flashcards: Flashcard[];
  questions: QuizQuestion[];
  attempts: QuizAttempt[];
  lastAdaptationSummary?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SampleNote {
  id: string;
  subject: string;
  title: string;
  excerpt: string;
  notes: string;
}
