import { useEffect } from 'react';
import styles from './SignInModal.module.scss';

interface Props {
  onClose: () => void;
}

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1';

export default function SignInModal({ onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className={styles.backdrop}
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label='Sign in'
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label='Close'
        >
          ✕
        </button>

        <div className={styles.header}>
          <span className={styles.icon}>🎮</span>
          <h2 className={styles.title}>Sign in to Arcade Ladder</h2>
          <p className={styles.subtitle}>
            Choose your sign-in method to start climbing the ranks.
          </p>
        </div>

        <div className={styles.providers}>
          <a href={`${API_BASE}/auth/google`} className={styles.providerBtn}>
            <GoogleLogo />
            <span>Continue with Google</span>
          </a>
          <a href={`${API_BASE}/auth/github`} className={styles.providerBtn}>
            <GitHubLogo />
            <span>Continue with GitHub</span>
          </a>
        </div>

        <p className={styles.terms}>
          By signing in you agree to play fairly and keep it fun.
        </p>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width='20' height='20' viewBox='0 0 48 48' aria-hidden='true'>
      <path
        fill='#4285F4'
        d='M45.5 24.5c0-1.5-.1-3-.4-4.5H24v8.5h12.1c-.5 2.7-2.1 5-4.5 6.5v5.4h7.3c4.3-3.9 6.6-9.7 6.6-15.9z'
      />
      <path
        fill='#34A853'
        d='M24 46c6.1 0 11.2-2 14.9-5.5l-7.3-5.4c-2 1.3-4.6 2.1-7.6 2.1-5.9 0-10.8-3.9-12.6-9.2H3.9v5.6C7.6 41.3 15.2 46 24 46z'
      />
      <path
        fill='#FBBC05'
        d='M11.4 28c-.5-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.6H3.9C2.4 17.3 1.5 20.5 1.5 24s.9 6.7 2.4 9.6l7.5-5.6z'
      />
      <path
        fill='#EA4335'
        d='M24 10.8c3.3 0 6.3 1.1 8.6 3.3l6.5-6.5C35.1 4 29.1 1.5 24 1.5 15.2 1.5 7.6 6.7 3.9 14.4l7.5 5.6C13.2 14.7 18.1 10.8 24 10.8z'
      />
    </svg>
  );
}

function GitHubLogo() {
  return (
    <svg
      width='20'
      height='20'
      viewBox='0 0 24 24'
      aria-hidden='true'
      fill='currentColor'
    >
      <path d='M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.3 9.4 7.9 10.9.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.2 1.77 1.2 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.3-.51-1.46.11-3.04 0 0 .96-.31 3.14 1.18a10.9 10.9 0 0 1 2.86-.38c.97 0 1.95.13 2.86.38 2.18-1.49 3.14-1.18 3.14-1.18.63 1.58.23 2.74.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.38-5.26 5.67.41.36.78 1.07.78 2.15v3.19c0 .31.21.67.8.56C20.2 21.4 23.5 17.1 23.5 12 23.5 5.65 18.35.5 12 .5z' />
    </svg>
  );
}
