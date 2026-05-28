import { Link } from 'react-router-dom';
import styles from './NotFound.module.scss';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Page not found</h1>
      <p className={styles.message}>This page doesn't exist or was moved.</p>
      <div className={styles.actions}>
        <Link to='/' className={styles.homeBtn}>
          ← Back to Home
        </Link>
        <Link to='/games' className={styles.gamesBtn}>
          🎮 Browse Games
        </Link>
      </div>
    </div>
  );
}
