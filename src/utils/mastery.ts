import type { Flashcard, QuizAttempt, QuizQuestion, StudySet, TopicStat } from "../types/study";

const STORAGE_KEY = "study_buddy_quizzer_sets_v1";
const ACTIVE_ID_KEY = "study_buddy_quizzer_active_id_v1";

export function createId(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function loadStudySets(): StudySet[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StudySet[]) : [];
  } catch {
    return [];
  }
}

export function saveStudySets(sets: StudySet[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sets));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function loadActiveSetId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveSetId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_ID_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

export function computeTopicStats(studySet: StudySet): TopicStat[] {
  const topicSet = new Set<string>(studySet.topics);
  for (const c of studySet.flashcards) topicSet.add(c.topic);
  for (const q of studySet.questions) topicSet.add(q.topic);
  for (const a of studySet.attempts) topicSet.add(a.topic);

  return Array.from(topicSet).map((topic) => {
    const attempts = studySet.attempts.filter((a) => a.topic === topic);
    const misses = attempts.filter((a) => !a.isCorrect).length;
    const cards = studySet.flashcards.filter((c) => c.topic === topic);
    const cardMisses = cards.reduce((acc, c) => acc + c.misses, 0);
    const masteredCards = cards.filter((c) => c.confidence === "mastered").length;

    const totalSignals = attempts.length + cards.filter((c) => c.reviews > 0).length;
    const accuracy =
      attempts.length > 0
        ? Math.round(((attempts.length - misses) / attempts.length) * 100)
        : null;

    const gaps = Array.from(
      new Set(
        attempts
          .filter((a) => !a.isCorrect)
          .map((a) => a.missingConcept?.trim() || a.prompt)
          .filter(Boolean)
      )
    );

    let status: TopicStat["status"] = "untested";
    if (totalSignals === 0) {
      status = "untested";
    } else if (
      (accuracy !== null && accuracy < 70) ||
      (misses > 0 && accuracy !== null && accuracy < 80) ||
      (accuracy === null && cardMisses > 0)
    ) {
      status = "needs_focus";
    } else if ((accuracy !== null && accuracy < 90) || masteredCards < cards.length) {
      status = "developing";
    } else {
      status = "mastered";
    }

    return {
      topic,
      attempts: attempts.length,
      misses,
      cardMisses,
      masteredCards,
      totalCards: cards.length,
      accuracy,
      status,
      gaps,
    };
  });
}

export function getMissedAttemptsForAdaptation(studySet: StudySet): QuizAttempt[] {
  return studySet.attempts.filter((a) => !a.isCorrect);
}

export function buildWrongItemsPayload(studySet: StudySet, topicFilter?: string) {
  const missedAttempts = studySet.attempts
    .filter((a) => !a.isCorrect && (!topicFilter || a.topic === topicFilter))
    .slice(-8)
    .map((a) => ({
      topic: a.topic,
      prompt: a.prompt,
      userAnswer: a.userAnswer,
      correctAnswer: a.correctAnswer,
      missingConcept: a.missingConcept,
    }));

  const missedCards = studySet.flashcards
    .filter((c) => (c.confidence === "missed" || c.misses > 0) && (!topicFilter || c.topic === topicFilter))
    .slice(0, 4)
    .map((c) => ({
      topic: c.topic,
      prompt: c.front,
      userAnswer: "Marked 'Missed it' during flashcard review",
      correctAnswer: c.back,
      missingConcept: c.topic,
    }));

  return [...missedAttempts, ...missedCards];
}

export function normalizeGeneratedFlashcards(
  raw: Array<{
    topic: string;
    front: string;
    back: string;
    hint: string;
    sourceExcerpt: string;
  }>,
  isRemedial = false
): Flashcard[] {
  return raw.map((item) => ({
    id: createId("fc"),
    topic: item.topic || "General",
    front: item.front,
    back: item.back,
    hint: item.hint || "",
    sourceExcerpt: item.sourceExcerpt || "",
    confidence: "unseen",
    reviews: 0,
    misses: 0,
    isRemedial,
  }));
}

export function normalizeGeneratedQuestions(
  raw: Array<{
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
    remedialTarget?: string;
  }>,
  isAdaptive = false
): QuizQuestion[] {
  return raw.map((q) => {
    const isMcq = q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length >= 2;
    const difficulty =
      q.difficulty === "applied" || q.difficulty === "synthesis" ? q.difficulty : "foundational";
    return {
      id: createId("q"),
      topic: q.topic || "General",
      type: isMcq ? "multiple_choice" : "short_answer",
      difficulty,
      prompt: q.prompt,
      options: isMcq ? q.options.slice(0, 4) : [],
      correctIndex: isMcq ? Math.min(Math.max(q.correctIndex || 0, 0), q.options.length - 1) : 0,
      optionRationales: isMcq ? q.optionRationales || [] : [],
      modelAnswer: q.modelAnswer || (isMcq ? q.options[q.correctIndex || 0] : ""),
      keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints : [],
      explanation: q.explanation || "",
      sourceExcerpt: q.sourceExcerpt || "",
      remedialTarget: q.remedialTarget,
      isAdaptive,
    };
  });
}
