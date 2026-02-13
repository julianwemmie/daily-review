import { useEffect } from "react";

interface HotkeyOptions {
  key: string;
  meta?: boolean;
  onPress: () => void;
  enabled?: boolean;
}

export function useHotkey({ key, meta = false, onPress, enabled = true }: HotkeyOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      if (meta && !(e.metaKey || e.ctrlKey)) return;
      if (!meta && (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey)) return;

      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // For meta combos, allow even when in input fields
      // For plain keys (like 1, 2), skip if user is typing in an input
      if (!meta && inInput) return;

      if (e.key === key) {
        e.preventDefault();
        onPress();
      }
    }

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [key, meta, onPress, enabled]);
}
