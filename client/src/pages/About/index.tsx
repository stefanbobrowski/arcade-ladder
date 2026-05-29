import { Link } from 'react-router-dom';
import {
  CrosshairIcon,
  CylinderIcon,
  RocketLaunchIcon,
  GhostIcon,
  EnvelopeSimpleIcon,
} from '@phosphor-icons/react';
import styles from './About.module.scss';

export default function About() {
  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <h1 className={styles.title}>About Arcade Ladder</h1>
        <p className={styles.subtitle}>
          A passion project built by one developer
        </p>
      </header>

      {/* Section 1 — What is it □ */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeSquare}`}>
          <CrosshairIcon size={290} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>What is Arcade Ladder?</h2>
        <p>
          Arcade Ladder is a collection of fast, browser-based mini-games with a
          shared leaderboard. Compete across a growing roster — from{' '}
          <Link to='/games/typing-speed' className={styles.link}>
            Typing Speed
          </Link>{' '}
          to{' '}
          <Link to='/games/reaction-grid' className={styles.link}>
            Reaction Grid
          </Link>
          ,{' '}
          <Link to='/games/pizza-time' className={styles.link}>
            Pizza Time
          </Link>
          , and more. Every round earns XP toward your rank, and the global
          leaderboard updates in real time.
        </p>
        <p>
          No downloads, no installs, no subscriptions. Just open, play, and
          climb the ladder.
        </p>
      </section>

      {/* Section 2 — Built solo ○ */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeCircle}`}>
          <CylinderIcon size={310} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>Engineered solo, from scratch</h2>
        <p>
          Every pixel of this platform — the REST API, database schema,
          authentication, every game mechanic, and the full UI — was designed
          and built by one developer. No team, no framework shortcuts. Just a
          genuine interest in building things that are polished and fun.
        </p>
        <p>
          The games are written in pure React using the Canvas API and Pointer
          Events — no game engine, no library. The backend is a Fastify server
          on Node.js with PostgreSQL, deployed on Google Cloud Run.
        </p>
        <div className={styles.techStack}>
          {[
            'React 19',
            'TypeScript',
            'Vite',
            'Fastify',
            'PostgreSQL',
            'Google Cloud Run',
            'Canvas API',
            'SCSS Modules',
          ].map((t) => (
            <span key={t} className={styles.techBadge}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Section 3 — What's next △ */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeTriangle}`}>
          <RocketLaunchIcon size={280} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>What's coming</h2>
        <p>The roadmap is always growing:</p>
        <ul className={styles.list}>
          <li>More games across skill categories</li>
          <li>Seasonal tournaments and score resets</li>
          <li>User profiles with full game history &amp; stats</li>
          <li>Mobile-first game controls</li>
          <li>Custom avatar builder</li>
        </ul>
      </section>

      {/* Section 4 — Work with me × */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeX}`}>
          <GhostIcon size={300} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>Work with me</h2>
        <p>
          I'm a full-stack developer open to freelance projects, contract work,
          and interesting collaborations. If you need something built well — a
          product, a tool, or a great side project — let's talk.
        </p>
        <p>
          Whether it's a consumer app, internal dashboard, or something totally
          new, I build things end-to-end and ship them.
        </p>
        <a href='mailto:contact@arcadeladder.app' className={styles.emailLink}>
          <EnvelopeSimpleIcon size={20} weight='bold' />
          contact@arcadeladder.app
        </a>
      </section>

      <div className={styles.cta}>
        <Link to='/games' className={styles.ctaBtn}>
          Start Playing
        </Link>
      </div>
    </div>
  );
}
