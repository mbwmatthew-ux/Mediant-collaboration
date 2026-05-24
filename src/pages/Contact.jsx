import { Link } from 'react-router-dom'
import styles from './Legal.module.css'

export default function Contact() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.back}>← Back to Mediant</Link>
        <h1 className={styles.title}>Contact Us</h1>
        <p className={styles.updated}>We'd love to hear from you</p>

        <section className={styles.section}>
          <h2>Who we are</h2>
          <p>
            Mediant is built by a group of high schoolers who are passionate about music and technology.
            We started this project because we wanted better feedback on our own playing — and realized
            nothing like it existed. So we built it ourselves.
          </p>
          <p>
            We're a small team, and we genuinely read every message we receive. Whether you're a
            musician with feedback, a teacher who wants to use Mediant with students, or just curious
            about what we're building — reach out.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Get in touch</h2>
          <p>
            Email us at{' '}
            <a href="mailto:mediantteam@gmail.com">mediantteam@gmail.com</a>
            {' '}for anything — bug reports, feature requests, feedback, or just to say hi.
          </p>
        </section>

        <section className={styles.section}>
          <h2>Response time</h2>
          <p>We aim to reply within 24–48 hours. If you're reporting a bug, please include your browser, device, and a short description of what happened.</p>
        </section>
      </div>
    </div>
  )
}
