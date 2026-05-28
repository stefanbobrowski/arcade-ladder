import styles from './StatCard.module.scss';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
}

export default function StatCard({ icon, value, label }: StatCardProps) {
  return (
    <div className={styles.card}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.value}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
