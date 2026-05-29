import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import styles from './StatCard.module.scss';

interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  to?: string;
  onClick?: () => void;
}

export default function StatCard({
  icon,
  value,
  label,
  to,
  onClick,
}: StatCardProps) {
  const content = (
    <>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.value}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className={styles.label}>{label}</span>
    </>
  );

  const cls = `${styles.card}${to || onClick ? ' ' + styles.interactive : ''}`;

  if (to)
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  if (onClick)
    return (
      <button type='button' className={cls} onClick={onClick}>
        {content}
      </button>
    );
  return <div className={cls}>{content}</div>;
}
