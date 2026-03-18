// ============================================
// MitrRAI - Privacy Policy
// ============================================

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Privacy Policy</h1>
      <p className="text-xs text-[var(--muted)]">Last updated: February 28, 2026</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">1. Information We Collect</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">When you use MitrRAI, we collect:</p>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li><strong>Account Information:</strong> Name, SVNIT email, admission number, department, year, date of birth.</li>
          <li><strong>Academic Data:</strong> Subjects, study preferences, schedules, learning style, goals.</li>
          <li><strong>Usage Data:</strong> Messages, study sessions, attendance records, uploaded materials.</li>
          <li><strong>Automatically Collected:</strong> Browser type, IP address (for rate limiting only — not stored permanently).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">2. How We Use Your Information</h2>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li><strong>Study Matching:</strong> To find compatible study partners within your batch.</li>
          <li><strong>AI Features:</strong> To generate personalized study plans and session guidance.</li>
          <li><strong>Communication:</strong> To facilitate messaging between matched students.</li>
          <li><strong>Analytics:</strong> To show you your study progress and session history.</li>
          <li><strong>Platform Improvement:</strong> Aggregated, anonymized data to improve matching algorithms.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">3. Data Storage & Security</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Your data is stored securely on Supabase (PostgreSQL) with encryption at rest and in transit. 
          We use Row Level Security (RLS) policies to ensure users can only access their own data. 
          Authentication uses Supabase Auth with hashed passwords and secure cookie-based sessions.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">4. Data Sharing</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">We do <strong>not</strong> sell or share your personal data with third parties. Limited data is shared within the Platform:</p>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li>Your name, department, and year are visible to other SVNIT students on the Platform.</li>
          <li>Study preferences are used for matching but not publicly displayed in full.</li>
          <li>Birthday (day/month only) is shown if you opt in.</li>
          <li>xAI Grok AI processes study-related queries (no personal data sent).</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">5. Your Rights (GDPR & Data Protection)</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">You have the right to:</p>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li><strong>Access:</strong> View all data we hold about you.</li>
          <li><strong>Export:</strong> Download a complete copy of your data (available from Dashboard → Export Data).</li>
          <li><strong>Rectification:</strong> Update or correct your personal information.</li>
          <li><strong>Deletion:</strong> Delete your account and all associated data (available from Dashboard).</li>
          <li><strong>Portability:</strong> Export your data in machine-readable JSON format.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">6. Privacy Controls</h2>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li><strong>Birthday:</strong> Toggle birthday visibility on/off.</li>
          <li><strong>Online Status:</strong> Choose to appear offline or hide what you&apos;re studying.</li>
          <li><strong>Goals:</strong> Personal study goals are hidden from other users by default.</li>
          <li><strong>Blocking:</strong> Block users to prevent them from contacting you.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">7. Cookies</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          We use essential cookies for authentication (Supabase session cookies). We do not use tracking 
          cookies, advertising cookies, or third-party analytics cookies.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">8. Data Retention</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Your data is retained as long as your account is active. When you delete your account, all personal 
          data is permanently removed within 30 days. Anonymized, aggregated data may be retained for 
          platform improvement.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">9. Children&apos;s Privacy</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          MitrRAI is intended for college students (18+). We do not knowingly collect data from individuals 
          under 18 years of age.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">10. Changes to This Policy</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          We may update this policy periodically. Significant changes will be communicated through the Platform. 
          Continued use after updates constitutes acceptance.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Contact</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          For privacy-related questions or data requests, use the Feedback page or contact the development team directly.
        </p>
      </section>
    </div>
  );
}
