import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { Game, LeaderboardEntry } from '../../types';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import styles from './Leaderboard.module.scss';

export default function Leaderboard() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [myEntry, setMyEntry] = useState<{
    rank: number;
    best_score: number;
    total_players: number;
  } | null>(null);

  useEffect(() => {
    api.get<Game[]>('/games').then((r) => {
      setGames(r.data);
      if (r.data[0]) setSelectedSlug(r.data[0].slug);
    });
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    api
      .get<LeaderboardEntry[]>(`/games/${selectedSlug}/leaderboard`)
      .then((r) => setEntries(r.data));
    if (user) {
      api
        .get(`/games/${selectedSlug}/leaderboard/me`)
        .then((r) => setMyEntry(r.data))
        .catch(() => setMyEntry(null));
    }
  }, [selectedSlug, user]);

  const isInTop50 = user && entries.some((e) => e.user_id === user.id);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Leaderboard</h1>

      {/* Game selector tabs */}
      <div className={styles.tabs}>
        {games.map((g) => (
          <button
            key={g.slug}
            className={`${styles.tab} ${selectedSlug === g.slug ? styles.activeTab : ''}`}
            onClick={() => setSelectedSlug(g.slug)}
          >
            {g.emoji} {g.title}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Best Score</th>
              <th>Plays</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.user_id}
                className={user?.id === entry.user_id ? styles.myRow : ''}
              >
                <td>{rankDisplay(entry.rank)}</td>
                <td>
                  <div className={styles.playerCell}>
                    <Avatar
                      user={{
                        avatar_url: entry.avatar_url,
                        chosen_avatar: entry.chosen_avatar,
                        username: entry.username,
                      }}
                      size={28}
                    />
                    <Link
                      to={`/profile/${entry.username}`}
                      className={styles.usernameLink}
                    >
                      {entry.username}
                    </Link>
                  </div>
                </td>
                <td>{entry.best_score.toLocaleString()}</td>
                <td>{entry.play_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pinned user row if outside top 50 */}
      {user && myEntry && !isInTop50 && (
        <div className={styles.myPosition}>
          You are ranked <strong>#{myEntry.rank}</strong> out of{' '}
          <strong>{myEntry.total_players}</strong> players
        </div>
      )}
    </div>
  );
}

function rankDisplay(rank: number) {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  return `#${rank}`;
}
