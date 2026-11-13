import type { StudyTab } from "../types/study";

interface TopBarProps {
  activeTab: StudyTab;
  hasActiveSet: boolean;
  onSelectTab: (tab: StudyTab) => void;
  onNewStudySet: () => void;
}

const NAV_ITEMS: Array<{ id: StudyTab; label: string; requiresSet?: boolean }> = [
  { id: "notes", label: "Notes" },
  { id: "flashcards", label: "Flashcards", requiresSet: true },
  { id: "quiz", label: "Adaptive Quiz", requiresSet: true },
  { id: "weak-spots", label: "Weak Spots", requiresSet: true },
];

export function TopBar({
  activeTab,
  hasActiveSet,
  onSelectTab,
  onNewStudySet,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-6 py-3.5">
        <button
          type="button"
          onClick={() => onSelectTab("notes")}
          className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700"
        >
          Study Buddy Quizzer
        </button>

        <nav
          aria-label="Primary workspace navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const disabled = Boolean(item.requiresSet && !hasActiveSet);
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1.5 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-700 ${
                  disabled
                    ? "cursor-not-allowed text-slate-300"
                    : isActive
                      ? "text-slate-900"
                      : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-[15px] h-0.5 bg-sky-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onNewStudySet}
            className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700 whitespace-nowrap shrink-0"
          >
            New Study Set
          </button>
        </div>
      </div>

      {/* Mobile compact secondary strip (only shown under md) */}
      <nav
        aria-label="Mobile workspace navigation"
        className="flex md:hidden items-center justify-between gap-2 border-t border-slate-100 px-4 py-1.5 overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const disabled = Boolean(item.requiresSet && !hasActiveSet);
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[36px] px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 rounded-md transition-colors ${
                disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : isActive
                    ? "bg-sky-50 text-sky-800 font-semibold"
                    : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
