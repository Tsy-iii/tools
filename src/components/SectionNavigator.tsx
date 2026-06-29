import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, Compass } from "lucide-react";

import { cn } from "@/lib/utils";

type NavSection = {
  id: string;
  label: string;
};

const SECTION_SELECTOR = "[data-page-section][id]";
const OBSERVER_THRESHOLDS = [0.15, 0.35, 0.55, 0.75];
const OPEN_DELAY_MS = 40;
const CLOSE_DELAY_MS = 140;

function collectSections(): NavSection[] {
  return Array.from(document.querySelectorAll<HTMLElement>(SECTION_SELECTOR))
    .map((element) => ({
      id: element.id,
      label: element.dataset.pageSection?.trim() ?? "",
    }))
    .filter((section) => section.id && section.label);
}

export default function SectionNavigator() {
  const [sections, setSections] = useState<NavSection[]>([]);
  const [activeSectionId, setActiveSectionId] = useState("");
  const [expanded, setExpanded] = useState(false);
  const openTimerRef = useRef<number | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearOpenTimer = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
  };

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const openNavigator = (immediate = false) => {
    clearCloseTimer();

    if (expanded) {
      return;
    }

    if (immediate) {
      clearOpenTimer();
      setExpanded(true);
      return;
    }

    if (openTimerRef.current !== null) {
      return;
    }

    openTimerRef.current = window.setTimeout(() => {
      setExpanded(true);
      openTimerRef.current = null;
    }, OPEN_DELAY_MS);
  };

  const closeNavigator = (immediate = false) => {
    clearOpenTimer();

    if (!expanded && closeTimerRef.current === null) {
      return;
    }

    if (immediate) {
      clearCloseTimer();
      setExpanded(false);
      return;
    }

    if (closeTimerRef.current !== null) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      setExpanded(false);
      closeTimerRef.current = null;
    }, CLOSE_DELAY_MS);
  };

  useEffect(() => {
    const nextSections = collectSections();
    setSections(nextSections);
    setActiveSectionId((previous) => previous || nextSections[0]?.id || "");
  }, []);

  useEffect(() => {
    if (sections.length === 0 || typeof IntersectionObserver === "undefined") {
      return;
    }

    const visibilityMap = new Map<string, number>();

    const updateActiveSection = () => {
      const mostVisibleSection = sections.reduce<{ id: string; ratio: number } | undefined>((best, section) => {
        const ratio = visibilityMap.get(section.id) ?? 0;

        if (!best || ratio > best.ratio) {
          return { id: section.id, ratio };
        }

        return best;
      }, undefined);

      if (mostVisibleSection && mostVisibleSection.ratio > 0) {
        setActiveSectionId(mostVisibleSection.id);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibilityMap.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        updateActiveSection();
      },
      {
        root: null,
        rootMargin: "-20% 0px -55% 0px",
        threshold: OBSERVER_THRESHOLDS,
      },
    );

    sections.forEach((section) => {
      const target = document.getElementById(section.id);

      if (target) {
        observer.observe(target);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [sections]);

  useEffect(() => () => {
    clearOpenTimer();
    clearCloseTimer();
  }, []);

  const visibleSections = useMemo(() => sections.filter((section) => section.label), [sections]);

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="页面模块导航"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-40 md:inset-x-auto md:right-4 md:top-1/2 md:bottom-auto md:-translate-y-1/2"
      data-testid="section-navigator"
    >
      <div
        className="pointer-events-auto md:relative"
        onPointerEnter={() => openNavigator()}
        onPointerLeave={() => closeNavigator()}
        onFocusCapture={() => openNavigator(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            closeNavigator();
          }
        }}
      >
        <div className="relative hidden h-12 w-56 md:block" data-testid="section-navigator-desktop">
          <div
            className={cn(
              "absolute right-0 top-1/2 -translate-y-1/2 transition-all duration-200 ease-out",
              expanded ? "pointer-events-none scale-95 opacity-0" : "pointer-events-auto scale-100 opacity-100",
            )}
          >
            <button
              aria-expanded={expanded}
              aria-label="展开页面导航"
              className="inline-flex h-12 items-center gap-2 rounded-full border border-white/10 bg-slate-950/88 px-4 text-sm font-medium text-slate-200 shadow-[0_18px_48px_rgba(15,23,42,0.45)] backdrop-blur-xl transition hover:border-cyan-300/20 hover:bg-slate-900/95"
              data-testid="section-navigator-trigger"
              type="button"
            >
              <Compass className="h-4 w-4 text-cyan-200" />
              <span>导航</span>
              <ChevronLeft className="h-4 w-4 text-slate-400" />
            </button>
          </div>

          <div
            aria-hidden={!expanded}
            className={cn(
              "absolute right-0 top-1/2 origin-right -translate-y-1/2 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90 shadow-[0_24px_80px_rgba(15,23,42,0.5)] backdrop-blur-xl transition-all duration-250 ease-out",
              expanded
                ? "pointer-events-auto w-56 translate-x-0 scale-100 opacity-100"
                : "pointer-events-none w-0 translate-x-3 scale-95 opacity-0",
            )}
            data-testid="section-navigator-panel"
          >
            <div className="p-3">
              <div className="mb-2 inline-flex items-center gap-2 px-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
                <Compass className="h-3.5 w-3.5" />
                页面导航
              </div>
              <div className="flex flex-col gap-2">
                {visibleSections.map((section) => {
                  const isActive = section.id === activeSectionId;

                  return (
                    <button
                      key={section.id}
                      className={cn(
                        "inline-flex min-h-10 w-full items-center justify-start rounded-2xl border px-3 py-2 text-left text-sm transition",
                        isActive
                          ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                          : "border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.08]",
                      )}
                      type="button"
                      onClick={() => {
                        const target = document.getElementById(section.id);

                        target?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      }}
                    >
                      <span className="truncate">{section.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-slate-950/88 p-2 shadow-[0_18px_48px_rgba(15,23,42,0.45)] backdrop-blur-xl md:hidden">
          <div className="mb-2 inline-flex items-center gap-2 px-2 text-[11px] uppercase tracking-[0.22em] text-slate-500">
            <Compass className="h-3.5 w-3.5" />
            页面导航
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {visibleSections.map((section) => {
              const isActive = section.id === activeSectionId;

              return (
                <button
                  key={section.id}
                  className={cn(
                    "inline-flex min-h-10 items-center justify-center rounded-2xl border px-3 py-2 text-left text-sm transition",
                    isActive
                      ? "border-cyan-300/35 bg-cyan-300/10 text-cyan-100"
                      : "border-transparent bg-white/[0.03] text-slate-300 hover:border-white/10 hover:bg-white/[0.08]",
                  )}
                  type="button"
                  onClick={() => {
                    const target = document.getElementById(section.id);

                    target?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    });
                  }}
                >
                  <span className="whitespace-nowrap">{section.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
