import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { NotesWorkspace } from "./components/NotesWorkspace";
import { FlashcardsStage } from "./components/FlashcardsStage";
import { AdaptiveQuizStage } from "./components/AdaptiveQuizStage";
import { WeakSpotsView } from "./components/WeakSpotsView";
import type { CardConfidence, QuizAttempt, StudySet, StudyTab } from "./types/study";
import {
  buildWrongItemsPayload,
  computeTopicStats,
  createId,
  loadActiveSetId,
  loadStudySets,
  normalizeGeneratedFlashcards,
  normalizeGeneratedQuestions,
  saveActiveSetId,
  saveStudySets,
} from "./utils/mastery";

export default function App() {
  const [savedSets, setSavedSets] = useState<StudySet[]>(() => loadStudySets());
  const [activeSetId, setActiveSetId] = useState<string | null>(() => {
    const sets = loadStudySets();
    const storedId = loadActiveSetId();
    if (storedId && sets.some((s) => s.id === storedId)) return storedId;
    return sets[0]?.id ?? null;
  });

  const [activeTab, setActiveTab] = useState<StudyTab>(() =>
    loadStudySets().length > 0 ? "flashcards" : "notes"
  );

  // Notes composer state
  const [notesText, setNotesText] = useState<string>("");
  const [depth, setDepth] = useState<"core" | "exam">("core");
  const [questionCount, setQuestionCount] = useState<number>(6);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Adaptive quiz & filter state
  const [flashcardTopicFilter, setFlashcardTopicFilter] = useState<string | null>(null);
  const [quizTopicFilter, setQuizTopicFilter] = useState<string | null>(null);
  const [activeQuizQuestionIds, setActiveQuizQuestionIds] = useState<string[] | null>(null);
  const [quizRoundLabel, setQuizRoundLabel] = useState<string>("Full Study Round");
  const [isAdapting, setIsAdapting] = useState<boolean>(false);
  const [adaptError, setAdaptError] = useState<string | null>(null);

  useEffect(() => {
    saveStudySets(savedSets);
  }, [savedSets]);

  useEffect(() => {
    saveActiveSetId(activeSetId);
  }, [activeSetId]);

  const activeSet = savedSets.find((s) => s.id === activeSetId) ?? null;

  const updateActiveSet = (updater: (prev: StudySet) => StudySet) => {
    if (!activeSetId) return;
    setSavedSets((prev) =>
      prev.map((set) => (set.id === activeSetId ? updater(set) : set))
    );
  };

  const handleGenerateStudySet = async () => {
    if (notesText.trim().length < 30 || isGenerating) return;
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/generate-study-set", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notesText.trim(),
          depth,
          questionCount,
          flashcardCount: Math.max(questionCount + 2, 8),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Could not generate study set.");
      }

      const now = Date.now();
      const newSet: StudySet = {
        id: createId("set"),
        title: data.title || "Untitled Study Set",
        summary: data.summary || "",
        notes: notesText.trim(),
        topics: Array.isArray(data.topics) ? data.topics : [],
        flashcards: normalizeGeneratedFlashcards(data.flashcards || []),
        questions: normalizeGeneratedQuestions(data.questions || []),
        attempts: [],
        createdAt: now,
        updatedAt: now,
      };

      setSavedSets((prev) => [newSet, ...prev]);
      setActiveSetId(newSet.id);
      setFlashcardTopicFilter(null);
      setQuizTopicFilter(null);
      setActiveQuizQuestionIds(newSet.questions.map((q) => q.id));
      setQuizRoundLabel("Initial Diagnostic Round");
      setActiveTab("flashcards");
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Failed to generate study set.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectSet = (id: string) => {
    const target = savedSets.find((s) => s.id === id);
    if (!target) return;
    setActiveSetId(id);
    setFlashcardTopicFilter(null);
    setQuizTopicFilter(null);
    setActiveQuizQuestionIds(target.questions.map((q) => q.id));
    setQuizRoundLabel("Full Study Round");
    setAdaptError(null);
    setActiveTab("flashcards");
  };

  const handleDeleteSet = (id: string) => {
    setSavedSets((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (activeSetId === id) {
        setActiveSetId(remaining[0]?.id ?? null);
        if (remaining.length === 0) {
          setActiveTab("notes");
        }
      }
      return remaining;
    });
  };

  const handleRateCard = (cardId: string, confidence: CardConfidence) => {
    updateActiveSet((set) => ({
      ...set,
      updatedAt: Date.now(),
      flashcards: set.flashcards.map((card) => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          confidence,
          reviews: card.reviews + 1,
          misses: confidence === "missed" ? card.misses + 1 : card.misses,
        };
      }),
    }));
  };

  const handleRecordAttempt = (attempt: QuizAttempt) => {
    updateActiveSet((set) => ({
      ...set,
      updatedAt: Date.now(),
      attempts: [...set.attempts, attempt],
    }));
  };

  const runAdaptiveGeneration = async (topicFocus?: string | null) => {
    if (!activeSet || isAdapting) return;
    setIsAdapting(true);
    setAdaptError(null);

    try {
      const wrongItems = buildWrongItemsPayload(activeSet, topicFocus ?? undefined);
      const stats = computeTopicStats(activeSet);
      const weakTopics = topicFocus
        ? [topicFocus]
        : stats
            .filter((s) => s.status === "needs_focus" || s.misses > 0 || s.cardMisses > 0)
            .map((s) => s.topic);

      const fallbackTopics =
        weakTopics.length > 0 ? weakTopics : activeSet.topics.slice(0, 2);

      const res = await fetch("/api/adapt-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: activeSet.notes,
          existingPrompts: activeSet.questions.map((q) => q.prompt),
          wrongItems,
          weakTopics: fallbackTopics,
          targetCount: 4,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate adaptive follow-up.");
      }

      const newQuestions = normalizeGeneratedQuestions(data.questions || [], true);
      const newCards = normalizeGeneratedFlashcards(data.remedialFlashcards || [], true);

      updateActiveSet((set) => ({
        ...set,
        updatedAt: Date.now(),
        lastAdaptationSummary: data.adaptationSummary || "",
        questions: [...set.questions, ...newQuestions],
        flashcards: [...newCards, ...set.flashcards],
      }));

      setQuizTopicFilter(topicFocus ?? null);
      setActiveQuizQuestionIds(newQuestions.map((q) => q.id));
      setQuizRoundLabel(
        topicFocus ? `Adaptive Drill · ${topicFocus}` : "Adaptive Follow-Up Round"
      );
      setActiveTab("quiz");
    } catch (err) {
      setAdaptError(err instanceof Error ? err.message : "Could not generate adaptive questions.");
      setActiveTab("quiz");
    } finally {
      setIsAdapting(false);
    }
  };

  const handleStartFreshRound = (topicFilter?: string | null) => {
    if (!activeSet) return;
    setAdaptError(null);
    setQuizTopicFilter(topicFilter ?? null);
    const matching = topicFilter
      ? activeSet.questions.filter((q) => q.topic === topicFilter)
      : activeSet.questions;
    setActiveQuizQuestionIds(matching.map((q) => q.id));
    setQuizRoundLabel(topicFilter ? `Topic Quiz · ${topicFilter}` : "Full Study Round");
    setActiveTab("quiz");
  };

  const handleResetProgress = () => {
    updateActiveSet((set) => ({
      ...set,
      updatedAt: Date.now(),
      attempts: [],
      lastAdaptationSummary: undefined,
      flashcards: set.flashcards.map((c) => ({
        ...c,
        confidence: "unseen",
        reviews: 0,
        misses: 0,
      })),
    }));
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <TopBar
        activeTab={activeTab}
        hasActiveSet={Boolean(activeSet)}
        onSelectTab={(tab) => {
          if (tab !== "notes" && !activeSet) return;
          setActiveTab(tab);
        }}
        onNewStudySet={() => {
          setNotesText("");
          setGenerateError(null);
          setActiveTab("notes");
        }}
      />

      <main className="pb-16">
        {activeTab === "notes" && (
          <NotesWorkspace
            notesText={notesText}
            onNotesTextChange={setNotesText}
            depth={depth}
            onDepthChange={setDepth}
            questionCount={questionCount}
            onQuestionCountChange={setQuestionCount}
            isGenerating={isGenerating}
            error={generateError}
            onGenerate={handleGenerateStudySet}
            savedSets={savedSets}
            activeSetId={activeSetId}
            onSelectSet={handleSelectSet}
            onDeleteSet={handleDeleteSet}
          />
        )}

        {activeTab === "flashcards" && activeSet && (
          <FlashcardsStage
            studySet={activeSet}
            initialTopicFilter={flashcardTopicFilter}
            onRateCard={handleRateCard}
            onGoToQuiz={(topic) => handleStartFreshRound(topic)}
            onAdaptFromMissedCards={() => runAdaptiveGeneration(null)}
            isAdapting={isAdapting}
          />
        )}

        {activeTab === "quiz" && activeSet && (
          <AdaptiveQuizStage
            studySet={activeSet}
            activeQuestionIds={activeQuizQuestionIds}
            roundLabel={quizRoundLabel}
            topicFilter={quizTopicFilter}
            isAdapting={isAdapting}
            adaptError={adaptError}
            onRecordAttempt={handleRecordAttempt}
            onTriggerAdaptation={(topic) => runAdaptiveGeneration(topic)}
            onStartFreshRound={(topic) => handleStartFreshRound(topic)}
            onGoToWeakSpots={() => setActiveTab("weak-spots")}
          />
        )}

        {activeTab === "weak-spots" && activeSet && (
          <WeakSpotsView
            studySet={activeSet}
            isAdapting={isAdapting}
            onDrillWeakTopic={(topic) => runAdaptiveGeneration(topic)}
            onAdaptAllWeakSpots={() => runAdaptiveGeneration(null)}
            onReviewTopicCards={(topic) => {
              setFlashcardTopicFilter(topic);
              setActiveTab("flashcards");
            }}
            onResetProgress={handleResetProgress}
          />
        )}
      </main>
    </div>
  );
}
