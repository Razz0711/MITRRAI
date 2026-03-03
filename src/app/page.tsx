// ============================================
// MitrAI - Landing Page
// ============================================

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--primary)]/5 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-20 pb-24">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)] text-xs text-[var(--muted)] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
              Built for SVNIT Students
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4 tracking-tight">
              Find your ideal{' '}
              <span className="gradient-text">study partner</span>
              <span className="block text-lg font-normal text-[var(--muted)] mt-2">at SVNIT Surat</span>
            </h1>

            <p className="text-sm text-[var(--muted)] mb-8 max-w-lg mx-auto leading-relaxed">
              MitrAI matches SVNIT students with compatible study partners using AI — across departments, subjects, schedules, and goals.
            </p>

            <div className="flex gap-3 justify-center">
              <Link href="/login" className="btn-primary px-6">
                Get Started
              </Link>
              <Link href="/home" className="btn-secondary px-6">
                View Demo
              </Link>
            </div>

            <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto mt-14">
              <Stat value="10+" label="Departments" />
              <Stat value="5D" label="AI Matching" />
              <Stat value="24/7" label="AI Support" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold mb-2">How it works</h2>
            <p className="text-xs text-[var(--muted)]">Four steps to find your study partner</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StepCard step={1} title="Chat with AI" description="Tell our agent about your department, subjects, goals, and schedule through a quick conversation." />
            <StepCard step={2} title="AI Analysis" description="Your profile is analyzed across 100+ factors to find compatible SVNIT students." />
            <StepCard step={3} title="Get Matched" description="Receive ranked matches across departments with compatibility scores and insights." />
            <StepCard step={4} title="Study Together" description="Connect via voice/video calls from your hostel and get AI assistance during sessions." />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-xl font-bold mb-2">Built for serious students</h2>
            <p className="text-xs text-[var(--muted)]">Everything you need for effective partner-based studying</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FeatureCard title="5-Dimension Matching" description="Scored across subject overlap, schedule fit, learning style, goals, and personality." />
            <FeatureCard title="Complementary Strengths" description="Matched with partners strong where you need help, and vice versa." />
            <FeatureCard title="AI Study Plans" description="Weekly plans that coordinate solo work and buddy sessions for best results." />
            <FeatureCard title="Voice & Video Calls" description="Connect with your partner directly through built-in calling. No extra apps needed." />
            <FeatureCard title="In-Session AI" description="An AI assistant joins study sessions to explain concepts and generate practice questions." />
            <FeatureCard title="Progress Tracking" description="Monitor your study hours, topics covered, and improvement over time." />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-[var(--border)]">
        <div className="max-w-lg mx-auto px-4 text-center">
          <h2 className="text-xl font-bold mb-3">Ready to find your SVNIT study partner?</h2>
          <p className="text-xs text-[var(--muted)] mb-6">
            Create an account and let AI match you with the right person from your college. Takes under 2 minutes.
          </p>
          <Link href="/login" className="btn-primary px-8">
            Create Account
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[var(--muted)]">
          <p>&copy; 2026 MitrAI - SVNIT Surat</p>
          <div className="flex gap-4">
            <a href="/feedback" className="hover:text-[var(--foreground)] transition-colors">Feedback</a>
            <a href="https://github.com/Razz0711/MITRAI" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">GitHub</a>
            <a href="mailto:rajkumaratsvnit@gmail.com" className="hover:text-[var(--foreground)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold text-[var(--foreground)]">{value}</div>
      <div className="text-[10px] text-[var(--muted)] uppercase tracking-wide">{label}</div>
    </div>
  );
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="card p-4 relative">
      <span className="text-[10px] font-bold text-[var(--primary-light)] uppercase tracking-wider">Step {step}</span>
      <h3 className="text-sm font-semibold mt-1 mb-1.5">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="card-hover p-4">
      <h3 className="text-sm font-semibold mb-1.5">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}
