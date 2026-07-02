import styles from '../loading.module.css'

export default function TablesLoading() {
  return (
    <div>
      <div className={`${styles.skeleton} ${styles['menu-header']}`} style={{ marginBottom: 'var(--space-6)' }} />
      <div className={styles['tables-grid']}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`${styles.skeleton} ${styles['table-card']}`} />
        ))}
      </div>
    </div>
  )
}
