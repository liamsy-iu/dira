import styles from '../loading.module.css'

export default function MenuLoading() {
  return (
    <div>
      <div className={`${styles.skeleton} ${styles['menu-header']}`} />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className={`${styles.skeleton} ${styles['table-row']}`} />
      ))}
    </div>
  )
}
