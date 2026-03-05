// ============================================
// MitrAI v2 — Premium Landing Page
// Hero with animated orbs, glass cards, stagger animations
// ============================================

import Link from 'next/link';
import {
  Sparkles, Users, Brain, Phone, BookOpen, BarChart3,
  MessageCircle, Zap, Target, ArrowRight, Star, Shield
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen overflow-hidden">
      {/* ─── Ambient Background Orbs ─── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite' }} />
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-25"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite reverse' }} />
        <div className="absolute top-[40%] right-[10%] w-[30%] h-[30%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(244,114,182,0.08) 0%, transparent 70%)', animation: 'float 12s ease-in-out infinite' }} />
      </div>

      {/* ─── Hero Section ─── */}
      <section className="relative z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 sm:pt-32 sm:pb-28">
          <div className="text-center max-w-2xl mx-auto slide-up">

            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full mb-8 scale-in"
              style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', backdropFilter: 'blur(12px)' }}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--success)]" />
              </span>
              <span className="text-xs font-semibold text-[var(--muted)]">Built for SVNIT Students</span>
              <Sparkles size={12} className="text-[var(--accent)]" />
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] mb-5 tracking-tight slide-up-stagger-1">
              Find your ideal<br />
              <span className="gradient-text">study partner</span>
            </h1>
            <p className="text-base sm:text-lg text-[var(--muted)] font-medium mb-3 slide-up-stagger-2">
              at SVNIT Surat
            </p>

            <p className="text-sm text-[var(--muted)] mb-10 max-w-md mx-auto leading-relaxed slide-up-stagger-2">
              MitrAI matches SVNIT students with compatible study partners using AI — across departments, subjects, schedules, and goals.
            </p>

            {/* CTAs */}
            <div className="flex gap-3 justify-center slide-up-stagger-3">
              <Link href="/login" className="btn-primary px-7 py-3 text-base font-bold flex items-center gap-2 group">
                Get Started
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link href="/home" className="btn-secondary px-7 py-3 text-base font-medium">
                View Demo
              </Link>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-center gap-8 sm:gap-12 mt-16 slide-up-stagger-4">
              <Stat value="10+" label="Departments" />
              <div className="w-px h-8 bg-[var(--border)]" />
              <Stat value="5D" label="AI Matching" />
              <div className="w-px h-8 bg-[var(--border)]" />
              <Stat value="24/7" label="AI Support" />
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--primary-light)] mb-3">How it works</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Four simple steps</h2>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">From sign-up to study session in under 2 minutes</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StepCard step={1} icon={<MessageCircle size={20} />} title="Chat with AI" description="Tell our agent about your department, subjects, goals, and schedule through a quick conversation." color="var(--primary)" />
            <StepCard step={2} icon={<Brain size={20} />} title="AI Analysis" description="Your profile is analyzed across 100+ factors to find compatible SVNIT students." color="var(--accent)" />
            <StepCard step={3} icon={<Target size={20} />} title="Get Matched" description="Receive ranked matches across departments with compatibility scores and insights." color="var(--secondary)" />
            <StepCard step={4} icon={<Zap size={20} />} title="Study Together" description="Connect via voice/video calls from your hostel and get AI assistance during sessions." color="var(--success)" />
          </div>
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section className="relative z-10 py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent)] mb-3">Features</span>
            <h2 className="text-2xl sm:text-3xl font-bold mb-3">Built for serious students</h2>
            <p className="text-sm text-[var(--muted)] max-w-md mx-auto">Everything you need for effective partner-based studying</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <FeatureCard icon={<Star size={20} />} title="5-Dimension Matching" description="Scored across subject overlap, schedule fit, learning style, goals, and personality." color="var(--primary)" />
            <FeatureCard icon={<Users size={20} />} title="Complementary Strengths" description="Matched with partners strong where you need help, and vice versa." color="var(--accent)" />
            <FeatureCard icon={<BookOpen size={20} />} title="AI Study Plans" description="Weekly plans that coordinate solo work and buddy sessions for best results." color="var(--secondary)" />
            <FeatureCard icon={<Phone size={20} />} title="Voice & Video Calls" description="Connect with your partner directly through built-in calling. No extra apps needed." color="var(--success)" />
            <FeatureCard icon={<Sparkles size={20} />} title="In-Session AI" description="An AI assistant joins study sessions to explain concepts and generate practice questions." color="var(--warning)" />
            <FeatureCard icon={<BarChart3 size={20} />} title="Progress Tracking" description="Monitor your study hours, topics covered, and improvement over time." color="var(--primary-light)" />
          </div>
        </div>
      </section>

      {/* ─── Social Proof ─── */}
      <section className="relative z-10 py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="card-glass p-8 sm:p-12 text-center relative overflow-hidden">
            {/* Gradient accent top border */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent" />
            <Shield size={28} className="mx-auto mb-4 text-[var(--primary-light)]" />
            <p className="text-lg sm:text-xl font-semibold mb-3 leading-snug">
              &ldquo;Trusted by students across <span className="gradient-text">10+ departments</span> at SVNIT Surat&rdquo;
            </p>
            <p className="text-sm text-[var(--muted)]">
              Secure, AI-powered, and built by SVNIT students for SVNIT students
            </p>
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="relative z-10 py-20">
        <div className="max-w-lg mx-auto px-4 text-center">
          <div className="relative inline-block mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white mx-auto"
              style={{ animation: 'float 4s ease-in-out infinite', boxShadow: '0 8px 32px rgba(124,58,237,0.4)' }}>
              <Sparkles size={28} />
            </div>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to find your study partner?</h2>
          <p className="text-sm text-[var(--muted)] mb-8 max-w-sm mx-auto leading-relaxed">
            Create an account and let AI match you with the right person from your college. Takes under 2 minutes.
          </p>
          <Link href="/login" className="btn-primary px-10 py-3 text-base font-bold inline-flex items-center gap-2 group">
            Create Account
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8 border-t border-[var(--glass-border)]">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white text-[8px] font-bold">M</div>
            <span>&copy; 2026 MitrAI — SVNIT Surat</span>
          </div>
          <div className="flex gap-5">
            <a href="/feedback" className="hover:text-[var(--foreground)] transition-colors">Feedback</a>
            <a href="https://github.com/Razz0711/MITRAI" target="_blank" rel="noopener noreferrer" className="hover:text-[var(--foreground)] transition-colors">GitHub</a>
            <a href="mailto:rajkumaratsvnit@gmail.com" className="hover:text-[var(--foreground)] transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub Components ─── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl sm:text-3xl font-extrabold gradient-text">{value}</div>
      <div className="text-[10px] text-[var(--muted)] uppercase tracking-[0.15em] mt-1 font-medium">{label}</div>
    </div>
  );
}

function StepCard({ step, icon, title, description, color }: { step: number; icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="card-glass p-5 relative group glow-hover overflow-hidden">
      {/* Step number watermark */}
      <div className="absolute top-3 right-4 text-5xl font-black opacity-[0.04] select-none" style={{ color }}>
        {step}
      </div>
      {/* Icon */}
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        {icon}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1.5 block" style={{ color }}>Step {step}</span>
      <h3 className="text-sm font-bold mt-1 mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}

function FeatureCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
  return (
    <div className="card-hover p-5 group relative overflow-hidden">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 w-full h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, ${color}, transparent)` }} />
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}>
        {icon}
      </div>
      <h3 className="text-sm font-bold mb-2 text-[var(--foreground)]">{title}</h3>
      <p className="text-xs text-[var(--muted)] leading-relaxed">{description}</p>
    </div>
  );
}
