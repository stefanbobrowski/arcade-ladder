import { useState, useCallback } from 'react';
import {
  SpeakerSimpleHighIcon,
  SpeakerSimpleLowIcon,
  SpeakerSimpleSlashIcon,
} from '@phosphor-icons/react';
import { getVolume, setVolume } from '../../lib/audio';
import styles from './VolumeControl.module.scss';

interface VolumeControlProps {
  className?: string;
}

export default function VolumeControl({ className }: VolumeControlProps) {
  const [vol, setVol] = useState(() => getVolume());

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setVol(v);
  }, []);

  const handleToggleMute = useCallback(() => {
    const next = vol > 0 ? 0 : 0.7;
    setVolume(next);
    setVol(next);
  }, [vol]);

  const Icon =
    vol === 0
      ? SpeakerSimpleSlashIcon
      : vol < 0.45
        ? SpeakerSimpleLowIcon
        : SpeakerSimpleHighIcon;

  return (
    <div className={[styles.wrap, className].filter(Boolean).join(' ')}>
      <button
        className={styles.iconBtn}
        onClick={handleToggleMute}
        title={vol === 0 ? 'Unmute' : 'Mute'}
        aria-label={vol === 0 ? 'Unmute' : 'Mute'}
      >
        <Icon size={18} weight='fill' />
      </button>
      <input
        type='range'
        min={0}
        max={1}
        step={0.01}
        value={vol}
        onChange={handleChange}
        className={styles.slider}
        aria-label='Volume'
      />
    </div>
  );
}
