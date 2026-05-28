import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { OverallEntry, ActivityEvent, SiteStats } from '../../types';
import Avatar from '../../components/ui/Avatar';
import StatCard from '../../components/ui/StatCard';
import styles from './Home.module.scss';

export default function Home() {
  const [top3, setTop3] = useState<OverallEntry[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);

  useEffect(() => {
    api
      .get<OverallEntry[]>('/leaderboard/top')
      .then((r) => setTop3(r.data.slice(0, 3)));
    api
      .get<ActivityEvent[]>('/leaderboard/activity')
      .then((r) => setActivity(r.data));
    api.get<SiteStats>('/leaderboard/stats').then((r) => setStats(r.data));
  }, []);

  const [first, second, third] = top3;

  return (
    <div className={styles.page}>
      {/* Podium */}
      <section className={styles.podiumSection}>
        <h1 className={styles.heading}>Leaderboard Hall</h1>
        <p className={styles.subheading}>
          Ranked by combined best scores across all games
        </p>
        <div className={styles.podium}>
          {second && <PodiumCard entry={second} rank={2} />}
          {first && <PodiumCard entry={first} rank={1} />}
          {third && <PodiumCard entry={third} rank={3} />}
        </div>
      </section>

      {/* Stat cards */}
      {stats && (
        <div className={styles.stats}>
          <StatCard
            icon='👥'
            value={stats.total_players}
            label='Total Players'
          />
          <StatCard icon='⚡' value={stats.total_plays} label='Games Played' />
          <StatCard
            icon='🎮'
            value={stats.games_available}
            label='Games Available'
          />
        </div>
      )}

      {/* Live Activity */}
      <section>
        <h2 className={styles.sectionHeading}>
          <span className={styles.liveDot} /> Live Activity
        </h2>
        <ul className={styles.feed}>
          {activity.map((event, i) => (
            <li key={i} className={styles.feedItem}>
              <Link
                to={`/profile/${event.username}`}
                className={styles.avatarLink}
              >
                <Avatar
                  user={{
                    avatar_url: event.avatar_url,
                    chosen_avatar: event.chosen_avatar,
                    username: event.username,
                  }}
                  size={36}
                />
              </Link>
              <span className={styles.feedText}>
                <Link
                  to={`/profile/${event.username}`}
                  className={styles.userLink}
                >
                  <strong>{event.username}</strong>
                </Link>{' '}
                scored <strong>{event.score.toLocaleString()}</strong> in{' '}
                <Link
                  to={`/games/${event.game_slug}`}
                  className={styles.gameLink}
                >
                  {event.game_title}
                </Link>
                {event.podium_rank != null && (
                  <span className={styles.podiumBadge}>
                    {event.podium_rank === 1
                      ? ' 🥇 1st'
                      : event.podium_rank === 2
                        ? ' 🥈 2nd'
                        : ' 🥉 3rd'}
                  </span>
                )}
              </span>
              <span className={styles.feedTime}>
                {timeAgo(event.created_at)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function PodiumCard({ entry, rank }: { entry: OverallEntry; rank: 1 | 2 | 3 }) {
  const medals: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };
  return (
    <Link
      to={`/profile/${entry.username}`}
      className={`${styles.podiumCard} ${styles[`rank${rank}`]}`}
    >
      <div className={styles.podiumRank}>#{rank}</div>
      <Avatar
        user={{
          avatar_url: entry.avatar_url,
          chosen_avatar: entry.chosen_avatar,
          username: entry.username,
        }}
        size={56}
      />
      <div className={styles.podiumName}>{entry.username}</div>
      <div className={styles.podiumScore}>
        {entry.total_score.toLocaleString()}
      </div>
      <div className={styles.podiumMedal}>{medals[rank]}</div>
    </Link>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
