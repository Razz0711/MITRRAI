// ============================================
// MitrrAi - Contact & Feedback Page
// ============================================

'use client';

import { useState } from 'react';

const TYPES = [
  { value: 'feedback' as const, label: 'Feedback', desc: 'Share your thoughts' },
  { value: 'bug' as const, label: 'Bug Report', desc: 'Something broken?' },
  { value: 'feature' as const, label: 'Feature Idea', desc: 'Suggest something new' },
  { value: 'contact' as const, label: 'Contact Us', desc: 'Reach out directly' },
];

const FAQS = [
  { q: 'Is MitrrAi free to use?', a: 'MitrrAi is currently free for all SVNIT students. Some premium features may be introduced in the future.' },
  { q: 'How does the matching work?', a: 'Our AI analyzes 5 dimensions — subjects, schedule, study style, goals, and personality — to find your ideal study buddy with a 100-point scoring system.' },
  { q: 'Can I suggest new features?', a: 'Absolutely! Use the Feature Idea option above to share your ideas. We love hearing from our users.' },
];

export default function FeedbackPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState<'feedback' | 'bug' | 'feature' | 'contact'>('feedback');
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSending(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, type, rating, message }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('submitFeedback:', err);
      alert('Something went wrong. Please try again.');
    }

    setSending(false);
  };

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <div className="card p-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/15 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl text-green-400">✓</span>
          </div>
          <h2 className="text-xl font-bold mb-2">
            <span className="gradient-text">Thank You!</span>
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6 max-w-xs mx-auto">
            Your {type === 'bug' ? 'bug report' : type === 'feature' ? 'feature idea' : type === 'contact' ? 'message' : 'feedback'} has been received. We appreciate your input!
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSubmitted(false);
                setMessage('');
                setRating(0);
                setType('feedback');
              }}
              className="btn-secondary text-xs px-5 py-2.5"
            >
              Send Another
            </button>
            <a href="/home" className="btn-primary text-xs px-5 py-2.5 inline-block">
              Back to Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center">
          <span className="text-lg font-bold gradient-text">F</span>
        </div>
        <h1 className="text-2xl font-extrabold mb-1">
          <span className="gradient-text">Contact & Feedback</span>
        </h1>
        <p className="text-sm text-[var(--muted)]">Help us make MitrrAi better for everyone</p>
      </div>

      {/* Type Selection — Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {TYPES.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setType(opt.value)}
            className={`p-3 rounded-xl text-center transition-all duration-200 ${
              type === opt.value
                ? 'bg-[var(--primary)]/15 border-2 border-[var(--primary)] shadow-md shadow-[var(--primary)]/10 scale-[1.02]'
                : 'bg-[var(--surface)] border-2 border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-light)]'
            }`}
          >
            <span className={`text-xs font-semibold block ${type === opt.value ? 'text-[var(--primary-light)]' : 'text-[var(--foreground)]'}`}>
              {opt.label}
            </span>
            <span className="text-[9px] text-[var(--muted)] block mt-0.5">{opt.desc}</span>
          </button>
        ))}
      </div>

      {/* Feedback Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name & Email row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Optional"
              className="input-field"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Optional, for us to reply"
              className="input-field"
            />
          </div>
        </div>

        {/* Star Rating */}
        {type === 'feedback' && (
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] mb-2 block">How would you rate MitrrAi?</label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star === rating ? 0 : star)}
                  className="text-2xl transition-transform hover:scale-125 focus:outline-none"
                >
                  {star <= rating ? '★' : '☆'}
                </button>
              ))}
              {rating > 0 && (
                <span className="text-xs text-[var(--muted)] ml-2 font-medium">
                  {['', 'Needs work', 'Fair', 'Good', 'Great', 'Excellent!'][rating]}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Message */}
        <div>
          <label className="text-xs font-semibold text-[var(--muted)] mb-1.5 block">
            {type === 'bug' ? 'Describe the bug *' :
             type === 'feature' ? 'Describe your idea *' :
             type === 'contact' ? 'Your message *' :
             'Your feedback *'}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              type === 'bug' ? 'What happened? What did you expect? Steps to reproduce...' :
              type === 'feature' ? 'What feature would you like to see? How would it help?' :
              type === 'contact' ? 'How can we help you?' :
              'Tell us what you think about MitrrAi...'
            }
            rows={4}
            className="input-field resize-none"
            required
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!message.trim() || sending}
          className="btn-primary w-full py-3 text-sm font-semibold"
        >
          {sending ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </span>
          ) : (
            `Send ${type === 'bug' ? 'Bug Report' : type === 'feature' ? 'Feature Idea' : type === 'contact' ? 'Message' : 'Feedback'}`
          )}
        </button>
      </form>

      {/* Quick Contact */}
      <div className="mt-8 card p-5 text-center">
        <h3 className="text-sm font-bold mb-1">Need Quick Help?</h3>
        <p className="text-xs text-[var(--muted)] mb-4">Reach out to us directly anytime</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <a
            href="https://wa.me/917061001946?text=Hi%2C%20I%20have%20a%20query%20about%20MitrrAi"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500/15 border border-green-500/30 text-xs font-semibold text-green-400 hover:bg-green-500/25 transition-all"
          >
            WhatsApp
          </a>
          <a
            href="mailto:rajkumaratsvnit@gmail.com?subject=MitrrAi%20Query"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs font-semibold text-blue-400 hover:bg-blue-500/25 transition-all"
          >
            Email
          </a>
        </div>
      </div>

      {/* FAQ — Accordion */}
      <div className="mt-6 card p-5">
        <h3 className="text-sm font-bold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-1">
          {FAQS.map((faq, i) => (
            <div key={i} className="rounded-xl overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between px-3 py-3 text-left hover:bg-[var(--surface-light)] transition-colors rounded-xl"
              >
                <span className="text-sm font-semibold text-[var(--foreground)] pr-4">{faq.q}</span>
                <span className={`text-[var(--muted)] text-xs transition-transform duration-200 shrink-0 ${openFaq === i ? 'rotate-180' : ''}`}>
                  ▾
                </span>
              </button>
              {openFaq === i && (
                <div className="px-3 pb-3 text-sm text-[var(--muted)] leading-relaxed animate-in slide-in-from-top-1">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
