import styles from '../loading.module.css'

export default function ReportsLoading() {
  return (
    <div>
      <div className={`${styles.skeleton} ${styles['menu-header']}`} style={{ marginBottom: 'var(--space-6)' }} />
      <div className={styles['reports-grid']}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles['stat-card']}`} />
        ))}
      </div>
      <div className={`${styles.skeleton} ${styles['menu-header']}`} style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)', width: '160px' }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles['table-row']}`} />
      ))}
    </div>
  )
}
