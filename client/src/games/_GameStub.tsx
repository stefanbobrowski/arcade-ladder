import { useEffect } from 'react';
import type { GameProps } from '../types';

interface GameStubProps extends GameProps {
  title: string;
  emoji: string;
}

// Placeholder used for games not yet implemented.
// Immediately ends with a random score so the full game flow can be tested.
export default function GameStub({
  title,
  emoji,
  isPlaying,
  onScoreUpdate,
  onGameOver,
}: GameStubProps) {
  useEffect(() => {
    if (!isPlaying) return;
    let score = 0;
    const tick = setInterval(() => {
      score += Math.floor(Math.random() * 50) + 10;
      onScoreUpdate(score);
    }, 300);
    const end = setTimeout(() => {
      clearInterval(tick);
      onGameOver(score);
    }, 5000);
    return () => {
      clearInterval(tick);
      clearTimeout(end);
    };
  }, [isPlaying]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        textAlign: 'center',
        padding: '2rem',
        color: 'rgba(255,255,255,0.5)',
      }}
    >
      <div style={{ fontSize: '3rem' }}>{emoji}</div>
      <p style={{ fontWeight: 600, color: '#fff' }}>{title}</p>
      <p style={{ fontSize: '0.85rem' }}>Coming soon — demo mode active</p>
    </div>
  );
}
