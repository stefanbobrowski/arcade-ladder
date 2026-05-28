import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api/client';
import type { User, UserRanking } from '../../types';
import Avatar from '../../components/ui/Avatar';
import styles from './Profile.module.scss';

interface ProfileData extends User {
  overall_rank?: number;
  total_players?: number;
  total_score?: number;
}

export default function Profile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [rankings, setRankings] = useState<UserRanking[]>([]);

  useEffect(() => {
    if (!username) return;
    api.get<ProfileData>(`/users/${username}`).then((r) => setProfile(r.data));
    api
      .get<UserRanking[]>(`/users/${username}/rankings`)
      .then((r) => setRankings(r.data));
  }, [username]);

  if (!profile) return <div className={styles.loading}>Loading profile...</div>;

  const level = xpToLevel(profile.xp);

  return (
    <div className={styles.page}>
      <div className={styles.headerCard}>
        <Avatar user={profile} size={80} />
        <div className={styles.headerInfo}>
          <div className={styles.usernameRow}>
            <h1 className={styles.username}>{profile.username}</h1>
          </div>
          <p className={styles.memberSince}>
            Member since{' '}
            {new Date(profile.created_at).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <span className={styles.statValue}>Lvl {level}</span>
              <span className={styles.statLabel}>Level</span>
            </div>
            {profile.total_score != null && profile.total_score > 0 && (
              <div className={styles.stat}>
                <span className={styles.statValue}>
                  {Number(profile.total_score).toLocaleString()}
                </span>
                <span className={styles.statLabel}>Total Score</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.xpCard}>
        <div className={styles.xpHeader}>
          <span>Level {level}</span>
          <span>{profile.xp.toLocaleString()} XP</span>
        </div>
        <div className={styles.xpBar}>
          <div
            className={styles.xpFill}
            style={{ width: `${xpProgress(profile.xp)}%` }}
          />
        </div>
        <p className={styles.xpNext}>
          {xpToNextLevel(profile.xp).toLocaleString()} XP to Level {level + 1}
        </p>
      </div>

      <div className={styles.rankingsCard}>
        <h2 className={styles.sectionTitle}>🎯 Game Rankings</h2>
        {rankings.map((r) => {
          const isPodium = r.rank != null && r.rank <= 3;
          const podiumIcon =
            r.rank === 1
              ? '🥇'
              : r.rank === 2
                ? '🥈'
                : r.rank === 3
                  ? '🥉'
                  : null;
          return (
            <div
              key={r.slug}
              className={`${styles.rankRow} ${isPodium ? styles.rankRowPodium : ''}`}
            >
              <div
                className={styles.rankNumber}
                style={{
                  color: isPodium
                    ? '#f59e0b'
                    : r.rank
                      ? '#a855f7'
                      : 'rgba(255,255,255,0.3)',
                }}
              >
                {podiumIcon != null
                  ? `${podiumIcon} #${r.rank}`
                  : r.rank
                    ? `#${r.rank}`
                    : '—'}
              </div>
              <div className={styles.rankGame}>
                <span className={styles.rankGameTitle}>
                  {r.emoji} {r.title}
                </span>
                <span className={styles.rankPlays}>
                  {r.play_count} plays
                  {r.best_score != null
                    ? ` · best ${r.best_score.toLocaleString()}`
                    : ''}
                </span>
              </div>
              <div className={styles.rankRight}>
                <span className={styles.percentile}>
                  {r.percentile != null
                    ? `Top ${r.percentile}%`
                    : r.play_count === 0
                      ? 'Unplayed'
                      : ''}
                </span>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressFill}
                    style={{ width: `${r.percentile ?? 0}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── XP helpers ────────────────────────────────────────────────────────────────

const XP_THRESHOLDS = [0, 100, 250, 500, 1000, 2500, 5000, 10000, 20000, 50000];

function xpToLevel(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

function xpProgress(xp: number): number {
  const level = xpToLevel(xp);
  const current = XP_THRESHOLDS[level - 1] ?? 0;
  const next = XP_THRESHOLDS[level] ?? current + 10000;
  return Math.min(100, ((xp - current) / (next - current)) * 100);
}

function xpToNextLevel(xp: number): number {
  const level = xpToLevel(xp);
  const next = XP_THRESHOLDS[level] ?? XP_THRESHOLDS[XP_THRESHOLDS.length - 1];
  return Math.max(0, next - xp);
}
