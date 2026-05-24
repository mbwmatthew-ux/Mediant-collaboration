import { Link } from 'react-router-dom'
import styles from './Legal.module.css'

export default function Privacy() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.back}>← Back to Mediant</Link>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: May 2025</p>

        <section className={styles.section}>
          <h2>What we collect</h2>
          <p>When you use Mediant, we collect:</p>
          <ul>
            <li>Your email address and name when you create an account.</li>
            <li>Video and audio recordings you upload for analysis.</li>
            <li>Sheet music files (images, PDFs, or MusicXML) you upload.</li>
            <li>Analysis results, session history, and feedback generated from your recordings.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How we use your data</h2>
          <ul>
            <li>To run the performance analysis and generate measure-level feedback.</li>
            <li>To display your session history and progress over time.</li>
            <li>To improve Mediant's analysis accuracy (aggregate and anonymised only).</li>
            <li>We do not sell your data to third parties.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Third-party services</h2>
          <p>Mediant uses the following third-party services to operate:</p>
          <ul>
            <li><strong>Supabase</strong> — database and file storage (your recordings and scores are stored here).</li>
            <li><strong>Anthropic</strong> — AI analysis of your performance. Recordings are processed and not retained by Anthropic beyond the API call.</li>
            <li><strong>Stripe</strong> — payment processing for Pro subscriptions. We never store your card details.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data retention</h2>
          <p>Your recordings and scores are stored for as long as your account is active. You can delete any recording at any time from your session history. If you delete your account, all associated files are permanently removed within 30 days.</p>
        </section>

        <section className={styles.section}>
          <h2>Your rights</h2>
          <p>You may request a copy of your data or ask for it to be deleted at any time by emailing us at <a href="mailto:mediantteam@gmail.com">mediantteam@gmail.com</a>.</p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>Questions about this policy? Email <a href="mailto:mediantteam@gmail.com">mediantteam@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
