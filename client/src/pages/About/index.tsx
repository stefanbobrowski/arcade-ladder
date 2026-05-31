import { Link } from 'react-router-dom';
import {
  EnvelopeIcon,
  BugIcon,
  GhostIcon,
  EnvelopeSimpleIcon,
  CrosshairIcon,
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
          shared leaderboard. Compete across an evolving list of games, such as{' '}
          <Link to='/games/typing-speed' className={styles.link}>
            Typing Speed
          </Link>
          {', '}
          <Link to='/games/reaction-grid' className={styles.link}>
            Reaction Grid
          </Link>
          {', and '}
          <Link to='/games/pizza-time' className={styles.link}>
            Pizza Time
          </Link>
          , against an ever-growing pool of players. Every game nets your{' '}
          <Link to='/profile' className={styles.link}>
            profile
          </Link>{' '}
          XP, and high-scores earn your spot on the global{' '}
          <Link to='/leaderboard' className={styles.link}>
            leaderboard
          </Link>
          !
        </p>
        <p>
          No downloads, no installs, no subscriptions. Just open, play, and
          climb the ladder.
        </p>
      </section>

      {/* Section 2 — Built solo ○ */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeCircle}`}>
          <GhostIcon size={310} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>Solo Dev</h2>
        <p>
          The games are written in pure React using the Canvas API and Pointer
          Events. No game engine, no library. The backend is a Fastify server on
          Node.js with PostgreSQL, deployed on Google Cloud Run.
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
          <BugIcon size={280} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>Submit Bugs or Feedback</h2>
        <p>Please report any issues or bugs you encounter while gaming.</p>
        <p>
          Please share your thoughts, feedback, or suggestions to help us
          improve the platform.
        </p>
        <p>
          <a
            href='mailto:stefanbobrowski1@gmail.com'
            className={styles.emailLink}
          >
            stefanbobrowski1@gmail.com
          </a>
        </p>
      </section>

      {/* Section 4 — Business Inquiries × */}
      <section className={styles.section}>
        <div className={`${styles.sectionShape} ${styles.shapeX}`}>
          <EnvelopeIcon size={280} weight='thin' />
        </div>
        <h2 className={styles.sectionHeading}>Business Inquiries</h2>
        <p>
          Feel free to reach out if you're interested in collaborating,
          advertising, sponsoring, or have any business inquiries related to
          Arcade Ladder.
        </p>

        <a
          href='mailto:stefanbobrowski1@gmail.com'
          className={styles.emailLink}
        >
          <EnvelopeSimpleIcon size={20} weight='bold' />
          stefanbobrowski1@gmail.com
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
