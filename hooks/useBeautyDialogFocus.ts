"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[contenteditable='true']",
  "[tabindex]",
].join(",");

const activeDialogIds: symbol[] = [];

function focusableElements(dialog: HTMLElement): readonly HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => {
      const style = window.getComputedStyle(element);
      return (
        element.tabIndex >= 0 &&
        element.getAttribute("aria-disabled") !== "true" &&
        element.closest("[hidden], [inert], [aria-hidden='true']") === null &&
        style.display !== "none" &&
        style.visibility !== "hidden"
      );
    },
  );
}

function isTopDialog(dialogId: symbol): boolean {
  return activeDialogIds.at(-1) === dialogId;
}

export function useBeautyDialogFocus(onClose: () => void) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialogId = Symbol("beauty-dialog");
    const previousFocus = document.activeElement;
    activeDialogIds.push(dialogId);
    closeButtonRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isTopDialog(dialogId)) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (dialog === null) return;

      const elements = focusableElements(dialog);
      const first = elements[0];
      const last = elements.at(-1);
      if (first === undefined || last === undefined) {
        event.preventDefault();
        closeButtonRef.current?.focus({ preventScroll: true });
        return;
      }

      const activeElement = document.activeElement;
      const focusIsOutside = activeElement === null || !dialog.contains(activeElement);
      const reachedStart = event.shiftKey && (activeElement === first || focusIsOutside);
      const reachedEnd = !event.shiftKey && (activeElement === last || focusIsOutside);
      if (!reachedStart && !reachedEnd) return;

      event.preventDefault();
      event.stopPropagation();
      (reachedStart ? last : first).focus({ preventScroll: true });
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      const shouldReturnFocus = isTopDialog(dialogId);
      const dialogIndex = activeDialogIds.lastIndexOf(dialogId);
      if (dialogIndex >= 0) activeDialogIds.splice(dialogIndex, 1);
      if (
        shouldReturnFocus &&
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [onClose]);

  return { dialogRef, closeButtonRef };
}
