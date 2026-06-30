import styles from './MusicAmbience.module.css'

/**
 * MusicAmbience — purely decorative, ambient equalizer bars that gently rise
 * and fall as a subtle hint of musical motion. Sits behind content at low
 * opacity. Aria-hidden and honors prefers-reduced-motion.
 */
export default function MusicAmbience({ bars = 44, className = '' }) {
  return (
    <div className={`${styles.ambience} ${className}`} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span key={i} className={styles.bar} style={{ '--i': i }} />
      ))}
    </div>
  )
}
