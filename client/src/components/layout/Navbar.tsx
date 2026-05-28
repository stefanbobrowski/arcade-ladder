import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import SignInModal from '../ui/SignInModal';
import styles from './Navbar.module.scss';

const NAV_LINKS = [
  { to: '/', label: 'Hub' },
  { to: '/games', label: 'Games' },
  { to: '/leaderboard', label: 'Leaderboard' },
  { to: '/about', label: 'About' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const isGame = location.pathname.startsWith('/games/');
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <nav className={styles.navbar}>
      <Link to='/' className={styles.logo}>
        Arcade Ladder
      </Link>

      <ul className={styles.links}>
        {NAV_LINKS.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className={`${styles.link} ${location.pathname === to || (to !== '/' && location.pathname.startsWith(to)) ? styles.active : ''}`}
            >
              {label}
            </Link>
          </li>
        ))}
        {isGame && (
          <li>
            <span className={`${styles.link} ${styles.active}`}>Play</span>
          </li>
        )}
      </ul>

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.xp}>⭐ {user.xp.toLocaleString()} XP</span>
            <Link
              to={`/profile/${user.username}`}
              className={styles.avatarLink}
            >
              <Avatar user={user} size={36} />
            </Link>
            <button className={styles.logoutBtn} onClick={logout}>
              Sign out
            </button>
          </>
        ) : (
          <button
            className={styles.signInBtn}
            onClick={() => setShowSignIn(true)}
          >
            Sign In
          </button>
        )}
      </div>

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}
    </nav>
  );
}
