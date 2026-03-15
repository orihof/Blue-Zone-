/// hooks/useFocusTrap.ts
// Traps keyboard focus within a ref'd container.
// Restores focus to previously active element on cleanup.
import { useEffect, type RefObject } from "react";

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Store the element that had focus before the trap was mounted
    const previouslyFocused = document.activeElement as HTMLElement | null;

    // Focus the first focusable element inside the container on mount
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
    if (focusable.length > 0) focusable[0].focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      // Re-query on every keydown so newly mounted elements are included
      const elements = Array.from(el!.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
      if (elements.length === 0) return;

      const first = elements[0];
      const last  = elements[elements.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: wrap backward from first → last
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        // Tab: wrap forward from last → first
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);

    return () => {
      el.removeEventListener("keydown", handleKeyDown);
      // Restore focus to the element that was active before the trap
      previouslyFocused?.focus();
    };
  // ref.current is stable after mount; re-running on ref object change is intentional
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);
}
