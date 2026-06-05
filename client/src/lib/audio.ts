// Shared audio volume — persisted to localStorage, read at play-time so every
// sound function just calls getVolume() and scales its gain accordingly.

const STORAGE_KEY = 'arcade_volume';

let _volume: number = (() => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const v = stored != null ? parseFloat(stored) : 0.7;
  return Math.min(1, Math.max(0, isNaN(v) ? 0.7 : v));
})();

export function getVolume(): number {
  return _volume;
}

export function setVolume(v: number): void {
  _volume = Math.min(1, Math.max(0, v));
  localStorage.setItem(STORAGE_KEY, String(_volume));
}
