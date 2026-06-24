import { Link } from 'react-router-dom'
import styles from './Legal.module.css'

export default function Privacy() {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Link to="/" className={styles.back}>← Back to Mediant</Link>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: June 2026</p>

        <section className={styles.section}>
          <h2>What we collect</h2>
          <p>When you use Mediant, we collect:</p>
          <ul>
            <li>Your email address and name when you create an account.</li>
            <li>Video and audio recordings you upload for analysis.</li>
            <li>Sheet music files (images, PDFs, or MusicXML) you upload.</li>
            <li>Analysis results, session history, and feedback generated from your recordings.</li>
            <li>Basic usage data such as session timestamps and feature interactions, used only to improve the product.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>How we use your data</h2>
          <ul>
            <li>To run the performance analysis and generate measure-level feedback.</li>
            <li>To display your session history and progress over time.</li>
            <li>To improve Mediant's analysis accuracy (aggregate and anonymised only).</li>
            <li>We do not sell your data to third parties.</li>
            <li>We do not use your recordings to train AI models.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Cookies</h2>
          <p>Mediant uses cookies solely for authentication — to keep you logged in between sessions. We do not use advertising or tracking cookies. You can disable cookies in your browser settings, but the app will not function without them.</p>
        </section>

        <section className={styles.section}>
          <h2>Third-party services</h2>
          <p>Mediant uses the following third-party services to operate:</p>
          <ul>
            <li><strong>Supabase</strong> — database and file storage. Your recordings and sheet music are stored on Supabase-managed infrastructure.</li>
            <li><strong>Google Gemini</strong> — AI video and audio analysis of your performance. Recordings are sent to Google's API for processing and are not retained by Google beyond the API call.</li>
            <li><strong>Anthropic Claude</strong> — AI coaching feedback and score analysis. Content is processed per-request and not stored by Anthropic.</li>
            <li><strong>Stripe</strong> — payment processing for Pro subscriptions. We never store your card details.</li>
            <li><strong>Vercel</strong> — web hosting and content delivery.</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2>Data retention</h2>
          <p>Your recordings and scores are stored for as long as your account is active. You can delete any recording at any time from your session history. If you delete your account, all associated files are permanently removed within 30 days.</p>
        </section>

        <section className={styles.section}>
          <h2>Your rights</h2>
          <p>You have the right to access, correct, or delete your personal data at any time. You may request a full export of your data or ask for your account to be permanently deleted by emailing us at <a href="mailto:mediantteam@gmail.com">mediantteam@gmail.com</a>. We will respond within 30 days.</p>
        </section>

        <section className={styles.section}>
          <h2>Children</h2>
          <p>Mediant is not directed at children under 13. We do not knowingly collect data from children under 13. If you believe a child has created an account, please contact us and we will delete it promptly.</p>
        </section>

        <section className={styles.section}>
          <h2>Contact</h2>
          <p>Questions about this policy? Email <a href="mailto:mediantteam@gmail.com">mediantteam@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
