import { useEffect, useCallback } from 'react';

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !shortcut.ctrl || event.ctrlKey === shortcut.ctrl;
      const shiftMatch = !shortcut.shift || event.shiftKey === shortcut.shift;
      const altMatch = !shortcut.alt || event.altKey === shortcut.alt;
      const metaMatch = !shortcut.meta || event.metaKey === shortcut.meta;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return shortcuts;
}

// Common shortcuts for the app
export const commonShortcuts = {
  addWord: { key: 'a', ctrl: true, description: 'Add new word' },
  bulkAdd: { key: 'b', ctrl: true, description: 'Bulk add words' },
  search: { key: '/', description: 'Focus search' },
  playPause: { key: ' ', description: 'Play/Pause audio' },
  nextWord: { key: 'ArrowRight', description: 'Next word' },
  prevWord: { key: 'ArrowLeft', description: 'Previous word' },
  generateAll: { key: 'g', ctrl: true, description: 'Generate all audio' },
  exportData: { key: 'e', ctrl: true, description: 'Export words' },
  importData: { key: 'i', ctrl: true, description: 'Import words' },
  toggleHelp: { key: '?', shift: true, description: 'Show keyboard shortcuts' },
};