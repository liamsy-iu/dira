import styles from '../loading.module.css'

export default function POSLoading() {
  return (
    <div className={styles.pos}>
      <div className={styles['pos-left']}>
        <div className={`${styles.skeleton} ${styles['pos-search']}`} />
        <div className={styles['pos-grid']}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className={`${styles.skeleton} ${styles['pos-card']}`} />
          ))}
        </div>
      </div>
      <div className={styles['pos-right']} />
    </div>
  )
}
