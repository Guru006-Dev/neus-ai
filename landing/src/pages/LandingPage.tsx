import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
import HeroScene from '@/components/HeroScene';
import { Globe, BookOpen, FileText, ShieldCheck, Play, Send } from 'lucide-react';

const LANDING_NAV_ITEMS = [
  {
    id: 1,
    label: 'Pipeline',
    subMenus: [
      {
        title: 'Agents',
        items: [
          { label: 'Explorer',  description: 'Crawl & extract product metadata', icon: Globe },
          { label: 'Knowledge', description: 'Build structured knowledge graph',  icon: BookOpen },
          { label: 'Docs',      description: 'Generate docs & onboarding guides', icon: FileText },
        ],
      },
      {
        title: 'Output',
        items: [
          { label: 'QA',      description: 'Quality checks & content gaps',  icon: ShieldCheck },
          { label: 'Demo',    description: 'Demo scripts & talking points',   icon: Play },
          { label: 'Release', description: 'Go-to-market brief & checklist',  icon: Send },
        ],
      },
    ],
  },
  { id: 2, label: 'Pricing', link: '#' },
  { id: 3, label: 'Docs',    link: '#' },
];

const AGENT_CARDS = [
  { name: 'Explorer',  icon: Globe,       desc: 'Crawls the product URL and extracts metadata, pricing, and feature lists.' },
  { name: 'Knowledge', icon: BookOpen,    desc: 'Builds a structured knowledge graph from raw research data.' },
  { name: 'Docs',      icon: FileText,    desc: 'Generates README, API reference and onboarding drafts.' },
  { name: 'QA',        icon: ShieldCheck, desc: 'Runs automated quality checks and content-gap analysis.' },
  { name: 'Demo',      icon: Play,        desc: 'Produces a demo script and suggested walkthrough flow.' },
  { name: 'Release',   icon: Send,        desc: 'Assembles the release brief and go-to-market checklist.' },
];

function Nav({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(7,8,11,0.82)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)' }}>
      <nav style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{ width: 16, height: 16, background: 'var(--color-accent)' }} />
          <span style={{ fontFamily: 'var(--font-family-label)', fontWeight: 700, fontSize: 13, letterSpacing: '.12em', color: 'var(--color-ink)' }}>NEXUS</span>
        </div>
        <DropdownNavigation navItems={LANDING_NAV_ITEMS} />
        <button
          onClick={onLaunch}
          className="btn-sharp"
          style={{ padding: '9px 20px', fontSize: 11, background: 'var(--color-accent)', color: '#fff', border: 'none' }}
        >
          Explore the Dashboard →
        </button>
      </nav>
    </div>
  );
}

function Footer() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const faqs = [
    { q: 'What does APIP actually do?', a: 'It runs a six-agent pipeline — Explorer, Knowledge, Docs, QA, Demo and Release — against any product URL and returns structured intelligence for each stage.' },
    { q: 'How long does a full run take?', a: 'Typically under five minutes end to end, depending on the size of the target product surface.' },
    { q: 'Where can I follow updates?', a: 'Sign up below, or watch the Docs section in the pipeline nav for the latest agent capabilities.' },
  ];
  return (
    <footer style={{ position: 'relative', borderTop: '1px solid var(--color-surface-border)', overflow: 'hidden', padding: '64px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 32, marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Sign up to stay sharp</div>
            <div style={{ display: 'flex', border: '1px solid var(--color-surface-border)', maxWidth: 320 }}>
              <input type="email" placeholder="Enter your email" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, color: 'var(--color-ink)' }} />
              <button className="btn-sharp" style={{ padding: '10px 16px', fontSize: 10, background: 'var(--color-accent)', color: '#fff', border: 'none' }}>Sign Up →</button>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Navigation</div>
            {['Home', 'Pipeline', 'Docs', 'Pricing'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Social</div>
            {['GitHub', 'Twitter', 'LinkedIn'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--color-surface-border)', paddingTop: 20 }}>
          {faqs.map((f, i) => (
            <div key={f.q} style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: '14px 0', color: 'var(--color-ink)', fontFamily: 'var(--font-family-display)', fontSize: 15, textAlign: 'left' }}
              >
                {f.q}
                <span style={{ fontSize: 18, color: 'var(--color-accent)' }}>{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <p style={{ fontSize: 12, color: 'var(--color-ink-dim)', lineHeight: 1.7, paddingBottom: 16, maxWidth: 560 }}>{f.a}</p>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 24, fontSize: 11, color: 'var(--color-ink-faint)' }}>
          <span>© 2026 Nexus / APIP. All rights reserved.</span>
          <span>Privacy Policy · Terms of Use</span>
        </div>
      </div>

      <div
        aria-hidden
        style={{
          position: 'absolute', left: 0, right: 0, bottom: -40, textAlign: 'center',
          fontFamily: 'var(--font-family-display)', fontWeight: 800,
          fontSize: 'clamp(80px, 16vw, 220px)', letterSpacing: '-0.04em',
          color: 'transparent', WebkitTextStroke: '1px rgba(243,243,243,0.08)',
          filter: 'blur(1px)', pointerEvents: 'none', userSelect: 'none', lineHeight: 1,
        }}
      >
        NEXUS
      </div>
    </footer>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();

  const launchDashboard = useCallback(() => { navigate('/dashboard'); }, [navigate]);

  useEffect(() => { document.title = 'Nexus — Autonomous Product Intelligence'; }, []);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-ink)', minHeight: '100vh' }}>
      <style>{`
        @keyframes word-in {
          from { opacity: 0; filter: blur(16px); transform: translateY(14px); }
          to   { opacity: 1; filter: blur(0);     transform: translateY(0); }
        }
        .word-reveal {
          display: inline-block; opacity: 0;
          animation: word-in .7s cubic-bezier(.16,1,.3,1) both;
          animation-delay: calc(var(--d,0ms) + var(--i,0) * 90ms);
        }
        @media (prefers-reduced-motion: reduce) { .word-reveal { animation: none; opacity: 1; filter: none; } }
      `}</style>

      <Nav onLaunch={launchDashboard} />

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', paddingTop: 72, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: '-6%', top: '50%', transform: 'translateY(-50%)', width: '52%', height: '70%', opacity: 0.9 }}>
          <HeroScene />
        </div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', width: '100%', padding: '0 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-accent)' }}>Nexus</span>
            <span style={{ width: 32, height: 1, background: 'var(--color-surface-border)' }} />
            <span style={{ fontSize: 11, color: 'var(--color-ink-faint)' }}>Autonomous Product Intelligence · 6-agent pipeline</span>
          </div>

          <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 500, fontSize: 'clamp(44px,7vw,92px)', lineHeight: 0.98, letterSpacing: '-0.03em', color: 'var(--color-ink)', margin: '0 0 20px', maxWidth: 780 }}>
            {['Autonomous', 'Product', 'Intelligence.'].map((word, wi) => (
              <div key={word}>
                <span className="word-reveal" style={{ '--d': `${150 + wi * 160}ms`, '--i': 0 } as React.CSSProperties}>{word}</span>
              </div>
            ))}
          </h1>

          <p style={{ fontSize: 14, lineHeight: 1.75, color: 'var(--color-ink-dim)', maxWidth: 420, margin: '0 0 32px' }}>
            A multi-agent platform that transforms any product brief into structured intelligence — research, documentation, QA and release signals delivered in a single pipeline run.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button onClick={launchDashboard} className="btn-sharp" style={{ padding: '13px 26px', fontSize: 12, background: 'var(--color-accent)', color: '#fff', border: 'none' }}>
              Explore the Dashboard →
            </button>
            <button className="btn-sharp" style={{ padding: '13px 26px', fontSize: 12, background: 'transparent', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>
              See Investor Information
            </button>
          </div>
        </div>
      </section>

      {/* ── Opportunity band ─────────────────────────────────────── */}
      <section style={{ padding: '96px 32px', borderTop: '1px solid var(--color-surface-border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>The opportunity of a generation</span>
            <button className="btn-sharp" style={{ padding: '8px 16px', fontSize: 10, background: 'transparent', color: 'var(--color-ink-dim)', border: '1px solid var(--color-surface-border)' }}>Learn More →</button>
          </div>
          <p style={{ fontFamily: 'var(--font-family-display)', fontSize: 'clamp(24px,3.4vw,38px)', lineHeight: 1.3, letterSpacing: '-0.01em', maxWidth: 920, margin: 0 }}>
            <span style={{ fontWeight: 600, color: 'var(--color-ink)' }}>Product intelligence as infrastructure makes it the most compelling operating advantage of our lifetime.</span>{' '}
            <span style={{ fontWeight: 400, color: 'var(--color-ink-faint)' }}>Six specialized agents, one pipeline run, structured signal at every stage — and this is just the beginning.</span>
          </p>
        </div>
      </section>

      {/* ── Agent pipeline showcase ──────────────────────────────── */}
      <section style={{ padding: '0 32px 96px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--color-surface-border)', border: '1px solid var(--color-surface-border)' }}>
            {AGENT_CARDS.map(({ name, icon: Icon, desc }) => (
              <div key={name} style={{ background: 'var(--color-bg)', padding: '28px 24px' }}>
                <Icon size={20} strokeWidth={1.6} color="var(--color-accent)" style={{ marginBottom: 16 }} />
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>{name}</div>
                <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-ink-dim)', margin: 0 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
