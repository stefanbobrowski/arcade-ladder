import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import type { Game, LadderEntry, OverallEntry } from '../../types';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { MedalIcon } from '@phosphor-icons/react';
import styles from './Ladder.module.scss';

const OVERALL = '__overall__';

const MEDAL_COLORS: Record<number, string> = {
  1: '#f59e0b',
  2: '#a8bccf',
  3: '#c07030',
};

export default function Ladder() {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(OVERALL);
  const [entries, setEntries] = useState<LadderEntry[]>([]);
  const [overallEntries, setOverallEntries] = useState<OverallEntry[]>([]);
  const [myEntry, setMyEntry] = useState<{
    rank: number;
    best_score: number;
    total_players: number;
  } | null>(null);

  useEffect(() => {
    api.get<Game[]>('/games').then((r) => setGames(r.data));
  }, []);

  useEffect(() => {
    if (!selectedSlug) return;
    if (selectedSlug === OVERALL) {
      api
        .get<OverallEntry[]>('/ladder/top')
        .then((r) => setOverallEntries(r.data));
      return;
    }
    api
      .get<LadderEntry[]>(`/games/${selectedSlug}/ladder`)
      .then((r) => setEntries(r.data));
    if (user) {
      api
        .get(`/games/${selectedSlug}/ladder/me`)
        .then((r) => setMyEntry(r.data))
        .catch(() => setMyEntry(null));
    }
  }, [selectedSlug, user]);

  const isOverall = selectedSlug === OVERALL;
  const isInTop50 = user && entries.some((e) => e.user_id === user.id);

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Ladder</h1>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${isOverall ? styles.activeTab : ''}`}
          onClick={() => setSelectedSlug(OVERALL)}
        >
          🏆 Total Score
        </button>
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
              {isOverall ? (
                <th>Total Score</th>
              ) : (
                <>
                  <th>Best Score</th>
                  <th>Plays</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {isOverall
              ? overallEntries.map((entry) => (
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
                    <td>{Number(entry.total_score).toLocaleString()}</td>
                  </tr>
                ))
              : entries.map((entry) => (
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

      {/* Pinned row when user is outside top 50 on a game ladder */}
      {!isOverall && user && myEntry && !isInTop50 && (
        <div className={styles.myPosition}>
          You are ranked <strong>#{myEntry.rank}</strong> out of{' '}
          <strong>{myEntry.total_players}</strong> players
        </div>
      )}
    </div>
  );
}

function rankDisplay(rank: number) {
  if (rank <= 3)
    return (
      <span className={styles.medalCell}>
        <MedalIcon size={18} weight='fill' color={MEDAL_COLORS[rank]} />
        <span>#{rank}</span>
      </span>
    );
  return <span>#{rank}</span>;
}
