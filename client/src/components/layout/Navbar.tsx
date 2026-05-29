import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HouseIcon,
  JoystickIcon,
  LadderSimpleIcon,
  InfoIcon,
  StarIcon,
  type Icon,
} from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext';
import Avatar from '../ui/Avatar';
import SignInModal from '../ui/SignInModal';
import styles from './Navbar.module.scss';

const NAV_LINKS: { to: string; label: string; Icon: Icon }[] = [
  { to: '/', label: 'Hub', Icon: HouseIcon },
  { to: '/arcade', label: 'Arcade', Icon: JoystickIcon },
  { to: '/ladder', label: 'Ladder', Icon: LadderSimpleIcon },
  { to: '/about', label: 'About', Icon: InfoIcon },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <nav className={styles.navbar}>
      <Link to='/' className={styles.logo}>
        <img src='/logo.svg' alt='Arcade Ladder' className={styles.logoImg} />
      </Link>

      <ul className={styles.links}>
        {NAV_LINKS.map(({ to, label, Icon: NavIcon }) => (
          <li key={to}>
            <Link
              to={to}
              className={`${styles.link} ${location.pathname === to || (to !== '/' && location.pathname.startsWith(to)) ? styles.active : ''}`}
            >
              <NavIcon size={16} weight='duotone' />
              {label}
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.right}>
        {user ? (
          <>
            <span className={styles.xp}>
              <StarIcon size={14} weight='duotone' color='#f59e0b' />{' '}
              {user.xp.toLocaleString()} XP
            </span>
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
