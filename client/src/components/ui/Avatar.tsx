import type { User } from '../../types';

const PREDEFINED: Record<string, string> = {
  'abstract-1': '🟣',
  'abstract-2': '🔷',
  'abstract-3': '🟡',
  'abstract-4': '🟢',
  'abstract-5': '🔴',
};

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

  if (user.chosen_avatar && PREDEFINED[user.chosen_avatar]) {
    return (
      <div style={style} title={user.username} aria-label={user.username}>
        {PREDEFINED[user.chosen_avatar]}
      </div>
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
