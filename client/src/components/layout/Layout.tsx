import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import styles from './Layout.module.scss';

export default function Layout() {
  return (
    <div className={styles.root}>
      <Navbar />
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
