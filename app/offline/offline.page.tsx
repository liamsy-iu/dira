import { Compass, WifiOff } from 'lucide-react'
import styles from './page.module.css'

export const metadata = { title: 'Offline — Dira' }

export default function OfflinePage() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icons}>
          <Compass size={32} strokeWidth={1.5} className={styles.compass} />
          <WifiOff size={20} strokeWidth={1.5} className={styles.wifi} />
        </div>
        <h1 className={styles.title}>You're offline</h1>
        <p className={styles.sub}>
          Dira needs an internet connection to sync orders and process payments.
          Check your connection and try again.
        </p>
        <button
          className={styles.retry}
          onClick={() => window.location.reload()}
        >
          Try again
        </button>
      </div>
    </div>
  )
}
