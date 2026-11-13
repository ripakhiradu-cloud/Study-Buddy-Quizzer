import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  RotateCcw,
  AlertTriangle,
  Circle,
  ArrowRight,
  Target,
} from "lucide-react";
import type { CardConfidence, Flashcard, StudySet } from "../types/study";

interface FlashcardsStageProps {
  studySet: StudySet;
  initialTopicFilter?: string | null;
  onRateCard: (cardId: string, confidence: CardConfidence) => void;
  onGoToQuiz: (topicFilter?: string | null) => void;
  onAdaptFromMissedCards: () => void;
  isAdapting: boolean;
}

export function FlashcardsStage({
  studySet,
  initialTopicFilter = null,
  onRateCard,
  onGoToQuiz,
  onAdaptFromMissedCards,
  isAdapting,
}: FlashcardsStageProps) {
  const [topicFilter, setTopicFilter] = useState<string>(initialTopicFilter || "ALL");
  const [prioritizeMissed, setPrioritizeMissed] = useState<boolean>(true);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);

  useEffect(() => {
    if (initialTopicFilter) {
      setTopicFilter(initialTopicFilter);
      setCurrentIndex(0);
      setIsFlipped(false);
      setShowHint(false);
    }
  }, [initialTopicFilter]);

  const orderedCards = useMemo(() => {
    const filtered =
      topicFilter === "ALL"
        ? studySet.flashcards
        : studySet.flashcards.filter((c) => c.topic === topicFilter);

    if (!prioritizeMissed) return filtered;

    const weight: Record<CardConfidence, number> = {
      missed: 0,
      almost: 1,
      unseen: 2,
      mastered: 3,
    };

    return [...filtered].sort((a, b) => {
      const diff = weight[a.confidence] - weight[b.confidence];
      if (diff !== 0) return diff;
      return b.misses - a.misses;
    });
  }, [studySet.flashcards, topicFilter, prioritizeMissed]);

  const safeIndex = orderedCards.length > 0 ? Math.min(currentIndex, orderedCards.length - 1) : 0;
  const currentCard: Flashcard | undefined = orderedCards[safeIndex];

  const missedCount = studySet.flashcards.filter(
    (c) => c.confidence === "missed" || c.misses > 0
  ).length;
  const masteredCount = studySet.flashcards.filter((c) => c.confidence === "mastered").length;

  const selectCardAt = (idx: number) => {
    setCurrentIndex(idx);
    setIsFlipped(false);
    setShowHint(false);
  };

  const handleStep = (delta: number) => {
    if (orderedCards.length === 0) return;
    const next = (safeIndex + delta + orderedCards.length) % orderedCards.length;
    selectCardAt(next);
  };

  const handleRate = (confidence: CardConfidence) => {
    if (!currentCard) return;
    onRateCard(currentCard.id, confidence);
    setIsFlipped(false);
    setShowHint(false);
    if (orderedCards.length > 1) {
      const next = (safeIndex + 1) % orderedCards.length;
      setCurrentIndex(next);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.tagName === "SELECT")) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleStep(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleStep(-1);
      } else if (isFlipped && e.key === "1") {
        e.preventDefault();
        handleRate("missed");
      } else if (isFlipped && e.key === "2") {
        e.preventDefault();
        handleRate("almost");
      } else if (isFlipped && e.key === "3") {
        e.preventDefault();
        handleRate("mastered");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const renderConfidenceLabel = (c: CardConfidence) => {
    switch (c) {
      case "mastered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Mastered
          </span>
        );
      case "missed":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Needs Review
          </span>
        );
      case "almost":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Almost
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            Unseen
          </span>
        );
    }
  };

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {studySet.title}
            <span aria-hidden="true"> · </span>
            <span className="font-mono tabular-nums">
              {masteredCount}/{studySet.flashcards.length} mastered
            </span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Active Recall Flashcards
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {missedCount > 0 && (
            <button
              type="button"
              disabled={isAdapting}
              onClick={onAdaptFromMissedCards}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-sky-700 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              {isAdapting ? "Building Adaptive Quiz..." : `Quiz ${missedCount} Missed Concepts`}
            </button>
          )}
          <button
            type="button"
            onClick={() => onGoToQuiz(topicFilter === "ALL" ? null : topicFilter)}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 whitespace-nowrap shrink-0"
          >
            Take Quiz
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
        {/* Left Zone: Interactive Flashcard Stage */}
        <div className="lg:col-span-8">
          {currentCard ? (
            <div>
              {/* Card Stage */}
              <div className="card-stage">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={isFlipped ? "Flashcard answer side. Press Space or click to flip back." : "Flashcard prompt side. Press Space or click to reveal answer."}
                  onClick={() => setIsFlipped((prev) => !prev)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      setIsFlipped((prev) => !prev);
                    }
                  }}
                  className={`card-flipper min-h-[340px] w-full cursor-pointer rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700 ${
                    isFlipped ? "is-flipped" : ""
                  }`}
                >
                  {/* Front Face */}
                  <div className="card-face absolute inset-0 flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">{currentCard.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                          Card {safeIndex + 1} of {orderedCards.length}
                        </span>
                        {currentCard.isRemedial && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="font-medium text-sky-700">Targeted Review</span>
                          </>
                        )}
                      </div>
                      {renderConfidenceLabel(currentCard.confidence)}
                    </div>

                    <div className="my-auto py-6">
                      <p className="text-xs font-medium text-slate-400">Prompt</p>
                      <h2 className="mt-2 font-display text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                        {currentCard.front}
                      </h2>

                      {showHint && currentCard.hint && (
                        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <span className="font-semibold text-slate-900">Hint: </span>
                          {currentCard.hint}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                      {currentCard.hint ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHint((prev) => !prev);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-sky-700"
                        >
                          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          {showHint ? "Hide hint" : "Show hint"}
                        </button>
                      ) : (
                        <span />
                      )}
                      <span className="font-mono text-xs text-slate-400">
                        Click card or press Space to flip
                      </span>
                    </div>
                  </div>

                  {/* Back Face */}
                  <div className="card-face card-face-back absolute inset-0 flex flex-col justify-between rounded-xl border border-sky-200 bg-white p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-sky-800">{currentCard.topic}</span>
                        <span aria-hidden="true">·</span>
                        <span>Answer</span>
                      </div>
                      {renderConfidenceLabel(currentCard.confidence)}
                    </div>

                    <div className="my-auto py-5">
                      <p className="text-base font-medium leading-relaxed text-slate-900 sm:text-lg">
                        {currentCard.back}
                      </p>

                      {currentCard.sourceExcerpt && (
                        <div className="mt-5 border-t border-slate-100 pt-4">
                          <p className="text-xs font-semibold text-slate-500">From your notes</p>
                          <p className="mt-1 text-sm italic text-slate-600">
                            "{currentCard.sourceExcerpt}"
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                      <span className="text-xs text-slate-500">
                        Rate recall below to adapt your study queue
                      </span>
                      <span className="font-mono text-xs text-slate-400">
                        Keys: 1 · 2 · 3
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls Bar */}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous card"
                    onClick={() => handleStep(-1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next card"
                    onClick={() => handleStep(1)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFlipped((prev) => !prev)}
                    className="ml-1 inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    {isFlipped ? "Show Prompt" : "Reveal Answer"}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRate("missed")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-semibold text-red-800 transition-colors hover:bg-red-100 whitespace-nowrap shrink-0"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                    Missed it (1)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate("almost")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 transition-colors hover:bg-amber-100 whitespace-nowrap shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Almost (2)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRate("mastered")}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-800 transition-colors hover:bg-emerald-100 whitespace-nowrap shrink-0"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Got it (3)
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
              <p className="text-sm text-slate-600">No flashcards match this topic filter.</p>
            </div>
          )}
        </div>

        {/* Right Zone: Topic Filter & Card Queue */}
        <aside className="lg:col-span-4 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Deck Controls
              </h2>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={prioritizeMissed}
                  onChange={(e) => {
                    setPrioritizeMissed(e.target.checked);
                    setCurrentIndex(0);
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-sky-700 focus:ring-sky-700"
                />
                Prioritize missed cards
              </label>
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-slate-500">Filter by topic</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setTopicFilter("ALL");
                    selectCardAt(0);
                  }}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    topicFilter === "ALL"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  All Topics
                </button>
                {studySet.topics.map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => {
                      setTopicFilter(topic);
                      selectCardAt(0);
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      topicFilter === topic
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Card Queue
              </h3>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {orderedCards.length} cards
              </span>
            </div>

            <ul className="mt-3 max-h-[380px] divide-y divide-slate-100 overflow-y-auto pr-1">
              {orderedCards.map((card, idx) => {
                const isSelected = idx === safeIndex;
                return (
                  <li key={card.id} className="py-2 first:pt-0 last:pb-0">
                    <button
                      type="button"
                      onClick={() => selectCardAt(idx)}
                      className={`w-full rounded-lg px-2.5 py-2 text-left transition-colors ${
                        isSelected
                          ? "bg-sky-50 text-slate-900"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-slate-400 tabular-nums">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {renderConfidenceLabel(card.confidence)}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs font-medium leading-snug text-slate-800">
                        {card.front}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}
