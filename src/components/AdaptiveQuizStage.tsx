import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  RotateCcw,
  Target,
} from "lucide-react";
import type { QuizAttempt, QuizQuestion, StudySet } from "../types/study";
import { createId } from "../utils/mastery";

interface AdaptiveQuizStageProps {
  studySet: StudySet;
  activeQuestionIds: string[] | null;
  roundLabel: string;
  topicFilter: string | null;
  isAdapting: boolean;
  adaptError: string | null;
  onRecordAttempt: (attempt: QuizAttempt) => void;
  onTriggerAdaptation: (topicFocus?: string | null) => void;
  onStartFreshRound: (topicFilter?: string | null) => void;
  onGoToWeakSpots: () => void;
}

export function AdaptiveQuizStage({
  studySet,
  activeQuestionIds,
  roundLabel,
  topicFilter,
  isAdapting,
  adaptError,
  onRecordAttempt,
  onTriggerAdaptation,
  onStartFreshRound,
  onGoToWeakSpots,
}: AdaptiveQuizStageProps) {
  const roundQuestions: QuizQuestion[] = useMemo(() => {
    if (activeQuestionIds && activeQuestionIds.length > 0) {
      const map = new Map(studySet.questions.map((q) => [q.id, q]));
      return activeQuestionIds.map((id) => map.get(id)).filter((q): q is QuizQuestion => Boolean(q));
    }
    if (topicFilter) {
      const filtered = studySet.questions.filter((q) => q.topic === topicFilter);
      if (filtered.length > 0) return filtered;
    }
    return studySet.questions;
  }, [studySet.questions, activeQuestionIds, topicFilter]);

  const [cursor, setCursor] = useState(0);
  const [selectedMcq, setSelectedMcq] = useState<number | null>(null);
  const [shortAnswerText, setShortAnswerText] = useState("");
  const [isGrading, setIsGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [sessionResults, setSessionResults] = useState<Record<string, QuizAttempt>>({});
  const [roundComplete, setRoundComplete] = useState(false);

  // Reset local round UI state when question set changes
  const roundSignature = roundQuestions.map((q) => q.id).join("|");
  useEffect(() => {
    setCursor(0);
    setSelectedMcq(null);
    setShortAnswerText("");
    setGradeError(null);
    setSessionResults({});
    setRoundComplete(false);
  }, [roundSignature]);

  const currentQuestion = roundQuestions[cursor];
  const currentResult = currentQuestion ? sessionResults[currentQuestion.id] : undefined;

  const answeredList = Object.values(sessionResults);
  const correctInRound = answeredList.filter((a) => a.isCorrect).length;
  const missedInRound = answeredList.filter((a) => !a.isCorrect);
  const totalMissedOverall = studySet.attempts.filter((a) => !a.isCorrect).length;

  const handleSubmitMcq = () => {
    if (!currentQuestion || selectedMcq === null || currentResult) return;
    const isCorrect = selectedMcq === currentQuestion.correctIndex;
    const chosenText = currentQuestion.options[selectedMcq] ?? "";
    const correctText = currentQuestion.options[currentQuestion.correctIndex] ?? currentQuestion.modelAnswer;
    const rationale =
      currentQuestion.optionRationales[selectedMcq] || currentQuestion.explanation;

    const attempt: QuizAttempt = {
      id: createId("att"),
      questionId: currentQuestion.id,
      topic: currentQuestion.topic,
      prompt: currentQuestion.prompt,
      userAnswer: chosenText,
      correctAnswer: correctText,
      isCorrect,
      score: isCorrect ? 100 : 0,
      feedback: rationale,
      missingConcept: isCorrect
        ? undefined
        : currentQuestion.remedialTarget || `${currentQuestion.topic}: ${currentQuestion.prompt.slice(0, 70)}`,
      timestamp: Date.now(),
    };

    setSessionResults((prev) => ({ ...prev, [currentQuestion.id]: attempt }));
    onRecordAttempt(attempt);
  };

  const handleSubmitShortAnswer = async () => {
    if (!currentQuestion || !shortAnswerText.trim() || currentResult) return;
    setIsGrading(true);
    setGradeError(null);
    try {
      const res = await fetch("/api/grade-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: studySet.notes,
          question: currentQuestion.prompt,
          modelAnswer: currentQuestion.modelAnswer,
          keyPoints: currentQuestion.keyPoints,
          userAnswer: shortAnswerText.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to grade answer.");
      }

      const attempt: QuizAttempt = {
        id: createId("att"),
        questionId: currentQuestion.id,
        topic: currentQuestion.topic,
        prompt: currentQuestion.prompt,
        userAnswer: shortAnswerText.trim(),
        correctAnswer: currentQuestion.modelAnswer,
        isCorrect: Boolean(data.isCorrect),
        score: Number(data.score) || 0,
        feedback: data.feedback || currentQuestion.explanation,
        missingConcept: data.missingConcept || undefined,
        timestamp: Date.now(),
      };

      setSessionResults((prev) => ({ ...prev, [currentQuestion.id]: attempt }));
      onRecordAttempt(attempt);
    } catch (err) {
      setGradeError(err instanceof Error ? err.message : "Could not grade answer.");
    } finally {
      setIsGrading(false);
    }
  };

  const handleNext = () => {
    if (cursor + 1 < roundQuestions.length) {
      setCursor((c) => c + 1);
      setSelectedMcq(null);
      setShortAnswerText("");
      setGradeError(null);
    } else {
      setRoundComplete(true);
    }
  };

  if (roundQuestions.length === 0) {
    return (
      <section className="mx-auto max-w-[1000px] px-6 py-12">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600">No quiz questions available for this filter.</p>
          <button
            type="button"
            onClick={() => onStartFreshRound(null)}
            className="mt-4 inline-flex items-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
          >
            Load Full Quiz
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-8">
      {/* Header Strip */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-medium text-slate-500">
            {studySet.title}
            <span aria-hidden="true"> · </span>
            <span>{roundLabel}</span>
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Adaptive Quizzer
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {totalMissedOverall > 0 && !roundComplete && (
            <button
              type="button"
              disabled={isAdapting}
              onClick={() => onTriggerAdaptation(topicFilter)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-sky-700 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-100 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Target className="h-4 w-4" aria-hidden="true" />
              {isAdapting
                ? "Adapting to misses..."
                : `Adapt Now (${totalMissedOverall} missed)`}
            </button>
          )}
          <button
            type="button"
            onClick={onGoToWeakSpots}
            className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            Weak Spots Matrix
          </button>
        </div>
      </div>

      {studySet.lastAdaptationSummary && roundLabel.includes("Adaptive") && (
        <div className="mb-6 rounded-xl border border-sky-200 bg-sky-50/70 px-5 py-4 text-sm text-sky-950">
          <p className="font-semibold text-sky-900">Why these questions were chosen for you</p>
          <p className="mt-1 leading-relaxed text-sky-900/90">{studySet.lastAdaptationSummary}</p>
        </div>
      )}

      {adaptError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
          <span>{adaptError}</span>
        </div>
      )}

      {roundComplete ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-100 pb-6">
            <div>
              <p className="text-xs font-medium text-slate-500">Round Complete</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-slate-900">
                You scored{" "}
                <span className="font-mono tabular-nums text-sky-700">
                  {correctInRound}/{roundQuestions.length}
                </span>{" "}
                ({Math.round((correctInRound / roundQuestions.length) * 100)}%)
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600">
                {missedInRound.length > 0
                  ? `You missed ${missedInRound.length} question${missedInRound.length === 1 ? "" : "s"}. Generate an adaptive follow-up drill to practice those exact concepts from a fresh angle.`
                  : "Clean sweep on this round. Start another round or check your full Weak Spots matrix."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {(missedInRound.length > 0 || totalMissedOverall > 0) && (
                <button
                  type="button"
                  disabled={isAdapting}
                  onClick={() => onTriggerAdaptation(topicFilter)}
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:opacity-50 whitespace-nowrap shrink-0"
                >
                  {isAdapting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      Generating adaptive follow-up...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" aria-hidden="true" />
                      Adapt & Drill Missed Concepts
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => onStartFreshRound(null)}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                Retake Full Quiz
              </button>
            </div>
          </div>

          {/* Per-question review list */}
          <ul className="mt-6 divide-y divide-slate-100">
            {roundQuestions.map((q, idx) => {
              const res = sessionResults[q.id];
              return (
                <li key={q.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      <span className="font-mono tabular-nums">Q{idx + 1}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{q.topic}</span>
                    </span>
                    {res?.isCorrect ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                        Needs Review
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-sm font-semibold text-slate-900">{q.prompt}</p>
                  {res && !res.isCorrect && (
                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                      <p>
                        <span className="font-semibold text-red-700">Your answer: </span>
                        {res.userAnswer}
                      </p>
                      <p>
                        <span className="font-semibold text-emerald-800">Correct concept: </span>
                        {res.correctAnswer}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Left: Question Stage */}
          <div className="lg:col-span-8">
            <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-800">{currentQuestion.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span className="capitalize">{currentQuestion.difficulty}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {currentQuestion.type === "multiple_choice"
                      ? "Multiple Choice"
                      : "Short Answer"}
                  </span>
                  {currentQuestion.isAdaptive && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-sky-700">Adaptive Follow-Up</span>
                    </>
                  )}
                </div>
                <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                  Question {cursor + 1} of {roundQuestions.length}
                </span>
              </div>

              {currentQuestion.remedialTarget && (
                <p className="mt-4 text-xs font-medium text-sky-800">
                  Targeting gap: {currentQuestion.remedialTarget}
                </p>
              )}

              <h2 className="mt-3 font-display text-xl font-semibold leading-snug text-slate-900 sm:text-2xl">
                {currentQuestion.prompt}
              </h2>

              {/* Question Body */}
              {currentQuestion.type === "multiple_choice" ? (
                <div className="mt-6 space-y-3">
                  {currentQuestion.options.map((opt, idx) => {
                    const isPicked = selectedMcq === idx;
                    const isCorrectOpt = idx === currentQuestion.correctIndex;
                    const showOutcome = Boolean(currentResult);

                    let borderClass = "border-slate-200 bg-white hover:border-slate-300";
                    if (!showOutcome && isPicked) {
                      borderClass = "border-sky-700 bg-sky-50/60";
                    } else if (showOutcome && isCorrectOpt) {
                      borderClass = "border-emerald-500 bg-emerald-50/70";
                    } else if (showOutcome && isPicked && !isCorrectOpt) {
                      borderClass = "border-red-400 bg-red-50/70";
                    }

                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={showOutcome}
                        onClick={() => setSelectedMcq(idx)}
                        className={`flex w-full items-start gap-3 rounded-lg border p-4 text-left transition-colors ${borderClass}`}
                      >
                        <span className="mt-0.5 font-mono text-xs font-semibold text-slate-500 tabular-nums">
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <span className="flex-1 text-sm font-medium leading-relaxed text-slate-900">
                          {opt}
                        </span>
                        {showOutcome && isCorrectOpt && (
                          <CheckCircle2
                            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700"
                            aria-hidden="true"
                          />
                        )}
                        {showOutcome && isPicked && !isCorrectOpt && (
                          <AlertTriangle
                            className="mt-0.5 h-4 w-4 shrink-0 text-red-700"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })}

                  {!currentResult && (
                    <div className="pt-3">
                      <button
                        type="button"
                        disabled={selectedMcq === null}
                        onClick={handleSubmitMcq}
                        className="inline-flex min-h-[42px] items-center justify-center rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        Check Answer
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-6">
                  <label
                    htmlFor="short-answer-box"
                    className="block text-xs font-medium text-slate-600"
                  >
                    Explain your answer in your own words
                  </label>
                  <textarea
                    id="short-answer-box"
                    rows={4}
                    disabled={Boolean(currentResult) || isGrading}
                    value={shortAnswerText}
                    onChange={(e) => setShortAnswerText(e.target.value)}
                    placeholder="Type your explanation here..."
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none disabled:bg-slate-100"
                  />

                  {gradeError && (
                    <p role="alert" className="mt-2 text-xs font-medium text-red-700">
                      {gradeError}
                    </p>
                  )}

                  {!currentResult && (
                    <div className="mt-4">
                      <button
                        type="button"
                        disabled={!shortAnswerText.trim() || isGrading}
                        onClick={handleSubmitShortAnswer}
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
                      >
                        {isGrading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                            Grading response...
                          </>
                        ) : (
                          "Submit Answer"
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Diagnostic Feedback Panel */}
              {currentResult && (
                <div
                  className={`mt-6 rounded-xl border p-5 ${
                    currentResult.isCorrect
                      ? "border-emerald-200 bg-emerald-50/60"
                      : "border-red-200 bg-red-50/60"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {currentResult.isCorrect ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 text-emerald-700" aria-hidden="true" />
                          <span className="text-sm font-bold text-emerald-900">
                            Correct
                            {currentQuestion.type === "short_answer" &&
                              ` · ${currentResult.score}/100`}
                          </span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />
                          <span className="text-sm font-bold text-red-900">
                            Incorrect — added to your adaptive review queue
                            {currentQuestion.type === "short_answer" &&
                              ` · ${currentResult.score}/100`}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <p className="mt-2.5 text-sm leading-relaxed text-slate-800">
                    {currentResult.feedback}
                  </p>

                  {currentQuestion.explanation &&
                    currentQuestion.explanation !== currentResult.feedback && (
                      <p className="mt-2 text-sm leading-relaxed text-slate-700">
                        {currentQuestion.explanation}
                      </p>
                    )}

                  {!currentResult.isCorrect && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                      <p className="text-xs font-semibold text-slate-500">Reference Answer</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {currentResult.correctAnswer}
                      </p>
                    </div>
                  )}

                  {currentQuestion.sourceExcerpt && (
                    <p className="mt-3 text-xs italic text-slate-600">
                      From notes: "{currentQuestion.sourceExcerpt}"
                    </p>
                  )}

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/70 pt-4">
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                    >
                      {cursor + 1 < roundQuestions.length ? "Next Question" : "Finish Round"}
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Session Progress & Question Map */}
          <aside className="lg:col-span-4 space-y-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Round Progress
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-3 border-t border-slate-100 pt-3">
                <div>
                  <p className="text-xs text-slate-500">Answered</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-slate-900 tabular-nums">
                    {answeredList.length}/{roundQuestions.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Correct</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-emerald-700 tabular-nums">
                    {correctInRound}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Missed</p>
                  <p className="mt-0.5 font-mono text-lg font-semibold text-red-700 tabular-nums">
                    {missedInRound.length}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="font-display text-base font-semibold text-slate-900">
                Questions in Round
              </h3>
              <ul className="mt-3 divide-y divide-slate-100">
                {roundQuestions.map((q, idx) => {
                  const res = sessionResults[q.id];
                  const isCurrent = idx === cursor;
                  return (
                    <li key={q.id} className="py-2 first:pt-0 last:pb-0">
                      <button
                        type="button"
                        onClick={() => {
                          setCursor(idx);
                          setSelectedMcq(null);
                          setShortAnswerText("");
                          setGradeError(null);
                        }}
                        className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                          isCurrent ? "bg-sky-50 font-semibold text-slate-900" : "hover:bg-slate-50 text-slate-700"
                        }`}
                      >
                        <span className="truncate">
                          <span className="font-mono text-slate-400 tabular-nums mr-2">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          {q.topic}
                        </span>
                        {res ? (
                          res.isCorrect ? (
                            <span className="inline-flex items-center gap-1 text-emerald-700 shrink-0">
                              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                              OK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-red-700 shrink-0">
                              <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                              Miss
                            </span>
                          )
                        ) : (
                          <span className="font-mono text-slate-400 shrink-0">
                            {q.isAdaptive ? "Adaptive" : "Pending"}
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>
        </div>
      )}
    </section>
  );
}
