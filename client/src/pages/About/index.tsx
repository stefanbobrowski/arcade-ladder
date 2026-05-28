import { Link } from 'react-router-dom';
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

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What is this?</h2>
        <p>
          Arcade Ladder is a collection of fast, browser-based mini-games with a
          shared leaderboard. Play a round of{' '}
          <Link to='/games/typing-speed' className={styles.link}>
            Typing Speed
          </Link>
          , test your reflexes in{' '}
          <Link to='/games/reaction-grid' className={styles.link}>
            Reaction Grid
          </Link>
          , and see how you stack up against everyone else — all in one place.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>Built by one person</h2>
        <p>
          This entire site — the backend API, database, authentication, every
          game, and the UI — was designed and built solo. No team, no agency.
          Just a developer who enjoys building things from scratch and wanted a
          fun side project to sharpen full-stack skills.
        </p>
        <p>
          The stack is React + TypeScript on the frontend, Fastify + PostgreSQL
          on the backend, and it's deployed on Google Cloud Run. The games are
          written in pure React with no game engine.
        </p>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionHeading}>What's coming</h2>
        <ul className={styles.list}>
          <li>More games</li>
          <li>XP &amp; leveling system</li>
          <li>Customizable player profiles</li>
          <li>Daily challenges</li>
        </ul>
      </section>

      <div className={styles.cta}>
        <Link to='/games' className={styles.ctaBtn}>
          Start Playing
        </Link>
      </div>
    </div>
  );
}
