import type { User } from '../../types';

export const DICEBEAR_OPTIONS = [
  { key: 'bot-alpha', seed: 'alpha' },
  { key: 'bot-nova', seed: 'nova' },
  { key: 'bot-pixel', seed: 'pixel' },
  { key: 'bot-glitch', seed: 'glitch' },
  { key: 'bot-zero', seed: 'zero' },
  { key: 'bot-spark', seed: 'spark' },
  { key: 'bot-hex', seed: 'hex' },
  { key: 'bot-echo', seed: 'echo' },
  { key: 'bot-flux', seed: 'flux' },
  { key: 'bot-core', seed: 'core' },
] as const;

const DICEBEAR_SEED_MAP: Record<string, string> = Object.fromEntries(
  DICEBEAR_OPTIONS.map(({ key, seed }) => [key, seed])
);

function dicebearUrl(seed: string) {
  return `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`;
}

interface AvatarProps {
  user: Pick<User, 'avatar_url' | 'chosen_avatar' | 'username'>;
  size?: number;
}

export default function Avatar({ user, size = 40 }: AvatarProps) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    objectFit: 'cover',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
    fontSize: size * 0.5,
    flexShrink: 0,
  };

  if (user.chosen_avatar && DICEBEAR_SEED_MAP[user.chosen_avatar]) {
    return (
      <img
        src={dicebearUrl(DICEBEAR_SEED_MAP[user.chosen_avatar])}
        alt={user.username}
        style={style}
        referrerPolicy='no-referrer'
      />
    );
  }

  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        style={style}
        referrerPolicy='no-referrer'
      />
    );
  }

  // Fallback: first letter
  return (
    <div style={style} title={user.username} aria-label={user.username}>
      {user.username[0]?.toUpperCase()}
    </div>
  );
}
