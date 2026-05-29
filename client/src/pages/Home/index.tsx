import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { OverallEntry, ActivityEvent, SiteStats } from '../../types';
import Avatar from '../../components/ui/Avatar';
import {
  UsersIcon,
  LightningIcon,
  GameControllerIcon,
  CrownSimpleIcon,
  MedalIcon,
  PulseIcon,
  JoystickIcon,
  BombIcon,
  DotsNineIcon,
  SkullIcon,
} from '@phosphor-icons/react';
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
        {/* Floating PS-button shapes — concave around the podium */}
        <div className={`${styles.homeShape} ${styles.homeShapeTL}`}>
          <JoystickIcon size={110} weight='thin' />
        </div>
        <div className={`${styles.homeShape} ${styles.homeShapeBL}`}>
          <BombIcon size={130} weight='thin' />
        </div>
        <div className={`${styles.homeShape} ${styles.homeShapeTR}`}>
          <DotsNineIcon size={120} weight='thin' />
        </div>
        <div className={`${styles.homeShape} ${styles.homeShapeBR}`}>
          <SkullIcon size={110} weight='thin' />
        </div>
        <h1 className={styles.heading}>Arcade Ladder Hall</h1>
        <p className={styles.subheading}>
          Top players across all games, ranked by total score
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
            icon={<UsersIcon size={28} weight='duotone' color='#7c3aed' />}
            value={stats.total_players}
            label='Total Players'
            to='/leaderboard'
          />
          <StatCard
            icon={<LightningIcon size={28} weight='duotone' color='#06b6d4' />}
            value={stats.total_plays}
            label='Games Played'
            to='/leaderboard'
          />
          <StatCard
            icon={
              <GameControllerIcon size={28} weight='duotone' color='#ec4899' />
            }
            value={stats.games_available}
            label='Games Available'
            to='/arcade'
          />
          <StatCard
            icon={<PulseIcon size={28} weight='duotone' color='#22c55e' />}
            value={stats.active_today}
            label='Active Today'
            onClick={() =>
              document
                .getElementById('live-activity')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          />
        </div>
      )}

      {/* Live Activity */}
      <section id='live-activity'>
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
                    {' '}
                    <MedalIcon
                      size={13}
                      weight='fill'
                      color={
                        event.podium_rank === 1
                          ? '#f59e0b'
                          : event.podium_rank === 2
                            ? '#a8bccf'
                            : '#c07030'
                      }
                      style={{
                        display: 'inline',
                        verticalAlign: 'middle',
                        position: 'relative',
                        top: '-1px',
                      }}
                    />{' '}
                    {event.podium_rank === 1
                      ? '1st'
                      : event.podium_rank === 2
                        ? '2nd'
                        : '3rd'}
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
  return (
    <div className={`${styles.podiumOuter} ${styles[`rank${rank}`]}`}>
      {rank === 1 && (
        <div className={styles.podiumCrown}>
          <CrownSimpleIcon size={48} weight='duotone' color='#f59e0b' />
        </div>
      )}
      <Link to={`/profile/${entry.username}`} className={styles.podiumCard}>
        <div className={styles.podiumRankNum}>
          {rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'}
        </div>
        <Avatar
          user={{
            avatar_url: entry.avatar_url,
            chosen_avatar: entry.chosen_avatar,
            username: entry.username,
          }}
          size={rank === 1 ? 68 : 56}
        />
        <div className={styles.podiumName}>{entry.username}</div>
        <div className={styles.podiumScore}>
          {entry.total_score.toLocaleString()}
        </div>
      </Link>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
