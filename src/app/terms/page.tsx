// ============================================
// MitrrAi - Terms of Service
// ============================================

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-[var(--foreground)]">Terms of Service</h1>
      <p className="text-xs text-[var(--muted)]">Last updated: February 28, 2026</p>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">1. Acceptance of Terms</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          By accessing and using MitrrAi (&quot;the Platform&quot;), you agree to be bound by these Terms of Service. 
          MitrrAi is an AI-powered study buddy matching platform exclusively for students of Sardar Vallabhbhai 
          National Institute of Technology (SVNIT), Surat. If you do not agree with these terms, please do not use the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">2. Eligibility</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          You must be a currently enrolled student at SVNIT with a valid SVNIT email address (@svnit.ac.in) to use 
          this Platform. Your account is personal and non-transferable.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">3. Account Responsibilities</h2>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li>You are responsible for maintaining the confidentiality of your account and password.</li>
          <li>You agree to provide accurate and up-to-date information.</li>
          <li>You must not share your account credentials with others.</li>
          <li>You are responsible for all activities under your account.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">4. Acceptable Use</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">You agree not to:</p>
        <ul className="list-disc list-inside text-xs text-[var(--muted)] leading-relaxed space-y-1">
          <li>Upload harmful, offensive, or copyrighted content without permission.</li>
          <li>Harass, bully, or intimidate other users.</li>
          <li>Use the Platform for any illegal or unauthorized purpose.</li>
          <li>Upload executable files, malware, or other dangerous content.</li>
          <li>Attempt to gain unauthorized access to other accounts or system resources.</li>
          <li>Scrape, spam, or abuse the Platform&apos;s services.</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">5. Content & Materials</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          Users may upload study materials for academic purposes. By uploading content, you confirm you have the 
          right to share it. MitrrAi does not claim ownership of your content but reserves the right to remove 
          content that violates these terms.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">6. AI-Generated Content</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          MitrrAi uses artificial intelligence for matching, study plans, and session chat. AI-generated content 
          is provided for educational guidance only and should not be considered professional advice. Always 
          verify information with your course materials and professors.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">7. Subscription & Payments</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          The Platform offers free and paid subscription tiers. Paid subscriptions require UPI payment and manual 
          admin approval. Refund requests are handled on a case-by-case basis.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">8. Termination</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          We reserve the right to suspend or terminate accounts that violate these terms. You may delete your 
          account at any time from your dashboard settings.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">9. Disclaimer</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          MitrrAi is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the availability, 
          accuracy, or reliability of the Platform. Academic performance outcomes depend on individual effort.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">10. Changes to Terms</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          We may update these terms from time to time. Continued use of the Platform after changes constitutes 
          acceptance of the new terms. We will notify users of significant changes via the Platform.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Contact</h2>
        <p className="text-xs text-[var(--muted)] leading-relaxed">
          For questions about these terms, contact us through the Feedback page or email the development team.
        </p>
      </section>
    </div>
  );
}
