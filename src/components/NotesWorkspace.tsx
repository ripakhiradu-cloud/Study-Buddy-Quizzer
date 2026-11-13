import { useState, type ChangeEvent } from "react";
import { BookOpen, FileUp, Loader2, Trash2, ArrowRight, AlertCircle } from "lucide-react";
import { SAMPLE_NOTES } from "../data/sampleNotes";
import type { StudySet } from "../types/study";

interface NotesWorkspaceProps {
  notesText: string;
  onNotesTextChange: (text: string) => void;
  depth: "core" | "exam";
  onDepthChange: (depth: "core" | "exam") => void;
  questionCount: number;
  onQuestionCountChange: (count: number) => void;
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
  savedSets: StudySet[];
  activeSetId: string | null;
  onSelectSet: (id: string) => void;
  onDeleteSet: (id: string) => void;
}

export function NotesWorkspace({
  notesText,
  onNotesTextChange,
  depth,
  onDepthChange,
  questionCount,
  onQuestionCountChange,
  isGenerating,
  error,
  onGenerate,
  savedSets,
  activeSetId,
  onSelectSet,
  onDeleteSet,
}: NotesWorkspaceProps) {
  const [imageFailed, setImageFailed] = useState(false);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    onNotesTextChange(text.slice(0, 18000));
    e.target.value = "";
  };

  const wordCount = notesText.trim() ? notesText.trim().split(/\s+/).length : 0;

  return (
    <section className="mx-auto max-w-[1280px] px-6 py-8 lg:py-10">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-stretch">
        {/* Left / Main Zone: Notes Composer */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="mb-6">
            <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Turn raw class notes into adaptive practice
            </h1>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-slate-600">
              Paste your lecture notes or upload a text outline. Every flashcard you miss and every
              wrong quiz answer reshapes the next round of questions to close your knowledge gaps.
            </p>
          </div>

          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <label
                htmlFor="class-notes-input"
                className="text-sm font-semibold text-slate-900"
              >
                Class notes or lecture outline
              </label>

              <div className="flex items-center gap-4">
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {wordCount} words
                </span>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-sky-700 hover:text-sky-800 whitespace-nowrap shrink-0">
                  <FileUp className="h-3.5 w-3.5" aria-hidden="true" />
                  Upload .txt / .md
                  <input
                    type="file"
                    accept=".txt,.md,.markdown"
                    onChange={handleFileUpload}
                    className="sr-only"
                  />
                </label>
              </div>
            </div>

            <textarea
              id="class-notes-input"
              value={notesText}
              onChange={(e) => onNotesTextChange(e.target.value)}
              placeholder="Paste lecture notes, textbook summaries, definitions, or mechanisms here..."
              rows={12}
              className="w-full flex-1 resize-y rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-[15px] leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-sky-600 focus:bg-white focus:outline-none"
            />

            {/* Sample notes bar */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-4">
              <span className="text-xs font-medium text-slate-500">Try sample lecture notes:</span>
              {SAMPLE_NOTES.map((sample) => (
                <button
                  key={sample.id}
                  type="button"
                  onClick={() => onNotesTextChange(sample.notes)}
                  className="text-xs font-semibold text-sky-700 underline decoration-sky-700/30 underline-offset-4 hover:text-sky-900 hover:decoration-sky-900 whitespace-nowrap shrink-0"
                >
                  {sample.subject}
                </button>
              ))}
              {notesText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => onNotesTextChange("")}
                  className="ml-auto text-xs font-medium text-slate-500 hover:text-slate-800 whitespace-nowrap shrink-0"
                >
                  Clear notes
                </button>
              )}
            </div>

            {/* Generation Controls */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Focus:</span>
                  <div className="inline-flex rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => onDepthChange("core")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        depth === "core"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Core Concepts
                    </button>
                    <button
                      type="button"
                      onClick={() => onDepthChange("exam")}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        depth === "exam"
                          ? "bg-white text-slate-900 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Exam Prep
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="quiz-count" className="text-xs font-medium text-slate-600">
                    Questions:
                  </label>
                  <select
                    id="quiz-count"
                    value={questionCount}
                    onChange={(e) => onQuestionCountChange(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-medium text-slate-800 focus:border-sky-600 focus:outline-none tabular-nums"
                  >
                    <option value={6}>6 questions</option>
                    <option value={8}>8 questions</option>
                    <option value={10}>10 questions</option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                disabled={isGenerating || notesText.trim().length < 30}
                onClick={onGenerate}
                className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-sky-700 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 whitespace-nowrap shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Extracting cards & quiz...
                  </>
                ) : (
                  <>
                    Build Flashcards & Quiz
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </>
                )}
              </button>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden="true" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Zone: Study Workbench Guide + Saved Sets */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
              {!imageFailed ? (
                <img
                  src="/src/assets/images/study_workbench_illustration_1794554100483.jpg"
                  alt="Study flashcards, lined notebook with geometric diagrams, and cobalt pencil on a clean desk"
                  referrerPolicy="no-referrer"
                  onError={() => setImageFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-sky-50 p-6 text-center">
                  <BookOpen className="h-10 w-10 text-sky-700" aria-hidden="true" />
                  <p className="mt-3 font-display text-base font-semibold text-slate-800">
                    Active Recall Workbench
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 sm:p-6">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                How the adaptive loop works
              </h2>
              <ol className="mt-3 space-y-2.5 text-sm leading-relaxed text-slate-600">
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium text-sky-700 pt-0.5 tabular-nums">
                    01.
                  </span>
                  <span>
                    <strong className="font-semibold text-slate-900">Active-recall cards:</strong>{" "}
                    Rate each card as Missed, Almost, or Got it. Missed cards rise to the front.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium text-sky-700 pt-0.5 tabular-nums">
                    02.
                  </span>
                  <span>
                    <strong className="font-semibold text-slate-900">Diagnostic quiz:</strong>{" "}
                    Multiple-choice traps and graded short answers pinpoint exact misconceptions.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs font-medium text-sky-700 pt-0.5 tabular-nums">
                    03.
                  </span>
                  <span>
                    <strong className="font-semibold text-slate-900">Adaptive follow-ups:</strong>{" "}
                    Generate fresh scaffolded questions and remedial cards targeting only what you got wrong.
                  </span>
                </li>
              </ol>
            </div>
          </div>

          {/* Saved Study Sets */}
          <div className="flex-1 rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-base font-semibold text-slate-900">
                Your Study Sets
              </h2>
              <span className="font-mono text-xs text-slate-500 tabular-nums">
                {savedSets.length} saved
              </span>
            </div>

            {savedSets.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No study sets yet. Load a sample lecture or paste your own notes to generate your
                first deck.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-slate-100">
                {savedSets.map((set) => {
                  const isCurrent = set.id === activeSetId;
                  const missedCount = set.attempts.filter((a) => !a.isCorrect).length;
                  return (
                    <li
                      key={set.id}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectSet(set.id)}
                        className="min-w-0 flex-1 text-left group"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`truncate text-sm font-semibold transition-colors ${
                              isCurrent
                                ? "text-sky-700"
                                : "text-slate-900 group-hover:text-sky-700"
                            }`}
                          >
                            {set.title}
                          </span>
                          {isCurrent && (
                            <span className="text-xs font-medium text-sky-700 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-mono tabular-nums">
                          <span>{set.flashcards.length} cards</span>
                          <span aria-hidden="true">·</span>
                          <span>{set.questions.length} questions</span>
                          {missedCount > 0 && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-amber-700">{missedCount} missed</span>
                            </>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        aria-label={`Delete ${set.title}`}
                        onClick={() => onDeleteSet(set.id)}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
