import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Loader2,
  RotateCcw,
  Target,
  TrendingUp,
} from "lucide-react";
import type { StudySet, TopicStat } from "../types/study";
import { computeTopicStats } from "../utils/mastery";

interface WeakSpotsViewProps {
  studySet: StudySet;
  isAdapting: boolean;
  onDrillWeakTopic: (topic: string) => void;
  onAdaptAllWeakSpots: () => void;
  onReviewTopicCards: (topic: string) => void;
  onResetProgress: () => void;
}

export function WeakSpotsView({
  studySet,
  isAdapting,
  onDrillWeakTopic,
  onAdaptAllWeakSpots,
  onReviewTopicCards,
  onResetProgress,
}: WeakSpotsViewProps) {
  const stats = computeTopicStats(studySet);
  const weakTopics = stats.filter((s) => s.status === "needs_focus" || s.misses > 0 || s.cardMisses > 0);
  const totalAttempts = studySet.attempts.length;
  const totalMisses = studySet.attempts.filter((a) => !a.isCorrect).length;
  const overallAccuracy =
    totalAttempts > 0 ? Math.round(((totalAttempts - totalMisses) / totalAttempts) * 100) : null;

  const renderStatus = (status: TopicStat["status"]) => {
    switch (status) {
      case "needs_focus":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            Needs Focus
          </span>
        );
      case "developing":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Developing
          </span>
        );
      case "mastered":
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            Mastered
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
            <Circle className="h-3.5 w-3.5" aria-hidden="true" />
            Untested
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
              {totalAttempts} quiz answers logged
            </span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Weak Spots & Mastery Breakdown
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {weakTopics.length > 0 && (
            <button
              type="button"
              disabled={isAdapting}
              onClick={onAdaptAllWeakSpots}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {isAdapting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Adapting quiz...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4" aria-hidden="true" />
                  Generate Adaptive Weak-Spot Drill
                </>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onResetProgress}
            className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset Progress
          </button>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Overall Quiz Accuracy</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {overallAccuracy !== null ? `${overallAccuracy}%` : "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Topics Flagged</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-red-700 tabular-nums">
            {weakTopics.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total Missed Questions</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {totalMisses}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Mastered Flashcards</p>
          <p className="mt-1.5 font-mono text-2xl font-semibold text-emerald-700 tabular-nums">
            {studySet.flashcards.filter((c) => c.confidence === "mastered").length}/
            {studySet.flashcards.length}
          </p>
        </div>
      </div>

      {/* Topic Matrix */}
      <div className="space-y-4">
        {stats.map((stat) => {
          const barPct =
            stat.accuracy !== null
              ? stat.accuracy
              : stat.totalCards > 0
                ? Math.round((stat.masteredCards / stat.totalCards) * 100)
                : 0;
          const barColor =
            stat.status === "needs_focus"
              ? "bg-red-600"
              : stat.status === "mastered"
                ? "bg-emerald-600"
                : stat.status === "developing"
                  ? "bg-amber-500"
                  : "bg-slate-300";

          return (
            <div
              key={stat.topic}
              className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-display text-lg font-semibold text-slate-900">
                      {stat.topic}
                    </h2>
                    {renderStatus(stat.status)}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-xs text-slate-500 tabular-nums">
                    <span>
                      Quiz accuracy:{" "}
                      {stat.accuracy !== null ? `${stat.accuracy}% (${stat.attempts - stat.misses}/${stat.attempts})` : "No attempts yet"}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      Flashcards mastered: {stat.masteredCards}/{stat.totalCards}
                    </span>
                    {stat.cardMisses > 0 && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-red-700">{stat.cardMisses} card misses</span>
                      </>
                    )}
                  </div>

                  {/* Progress Meter */}
                  <div className="mt-3 h-2 w-full max-w-md overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full transition-all ${barColor}`}
                      style={{ width: `${Math.max(barPct, stat.attempts > 0 || stat.masteredCards > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onReviewTopicCards(stat.topic)}
                    className="inline-flex min-h-[38px] items-center rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
                  >
                    Review Cards
                  </button>
                  <button
                    type="button"
                    disabled={isAdapting}
                    onClick={() => onDrillWeakTopic(stat.topic)}
                    className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg bg-sky-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                  >
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    Drill This Topic
                  </button>
                </div>
              </div>

              {stat.gaps.length > 0 && (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-600">
                    Specific concepts missed in this topic
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                    {stat.gaps.map((gap, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <AlertTriangle
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600"
                          aria-hidden="true"
                        />
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
