import { useEffect, useState } from 'react';

/**
 * Custom hook to detect when a specific key is pressed.
 * @param {string} targetKey - The key to listen for (e.g., "Enter", "Escape", "a").
 * @returns {boolean} - True if the key is currently pressed.
 */
export function useKeyPress(targetKey: string): boolean {
  const [keyPressed, setKeyPressed] = useState(false);

  // Key down handler
  function downHandler({ key }: KeyboardEvent) {
    if (key === targetKey) {
      setKeyPressed(true);
    }
  }

  // Key up handler
  function upHandler({ key }: KeyboardEvent) {
    if (key === targetKey) {
      setKeyPressed(false);
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', downHandler);
    window.addEventListener('keyup', upHandler);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', downHandler);
      window.removeEventListener('keyup', upHandler);
    };
  }, [targetKey]);

  return keyPressed;
}
