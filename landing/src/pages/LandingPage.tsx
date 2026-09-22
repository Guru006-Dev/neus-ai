import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
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

const ABOUT_SENTENCES = [
  'APIP was built on a simple observation: product teams don’t need another dashboard.',
  'They need a pipeline that actually reads the product — crawls it, structures it, questions it, and hands back something a real team can ship from.',
  'Six agents, one run, structured intelligence at every stage.',
];

/** Live clock, matching Aspen's "05:52 AM NYC" nav detail. */
function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  return (
    <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, letterSpacing: '.02em', color: 'var(--color-ink-dim)' }}>
      {time} UTC
    </span>
  );
}

function Nav({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--color-surface-border)', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(6px)' }}>
      <nav className="landing-nav" style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <div style={{ width: 16, height: 16, background: 'var(--color-ink)' }} />
          <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: 'var(--color-ink)' }}>Nexus</span>
          <LiveClock />
        </div>
        <div className="landing-nav-items" style={{ minWidth: 0, overflow: 'hidden' }}>
          <DropdownNavigation navItems={LANDING_NAV_ITEMS} />
        </div>
        <button
          onClick={onLaunch}
          className="btn-sharp landing-nav-cta"
          style={{ padding: '9px 20px', fontSize: 11, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', border: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}
        >
          <span className="landing-nav-cta-full">Explore the Dashboard</span>
          <span className="landing-nav-cta-short">Dashboard</span>
        </button>
      </nav>
    </div>
  );
}

/** Scroll-driven paragraph reveal, echoing Aspen's about-section fade. */
function ScrollReveal({ sentences }: { sentences: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const total = rect.height - vh * 0.5;
      const scrolled = vh * 0.8 - rect.top;
      setProgress(Math.max(0, Math.min(1, total > 0 ? scrolled / total : 0)));
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {sentences.map((s, i) => {
        const start = i / sentences.length;
        const end = (i + 1) / sentences.length;
        const local = Math.max(0, Math.min(1, (progress - start) / (end - start || 1)));
        return (
          <p key={i} style={{
            fontFamily: 'var(--font-family-display)', fontWeight: 700,
            fontSize: 'clamp(22px,3.6vw,38px)', lineHeight: 1.35, letterSpacing: '-0.01em',
            color: 'var(--color-ink)', opacity: 0.15 + local * 0.85, margin: 0, maxWidth: 760,
          }}>{s}</p>
        );
      })}
    </div>
  );
}

function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--color-surface-border)', padding: '48px 32px 32px' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Sign up to stay sharp</div>
            <div style={{ display: 'flex', border: '1px solid var(--color-surface-border)', maxWidth: 320 }}>
              <input type="email" placeholder="Enter your email" style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', padding: '10px 12px', fontSize: 12, color: 'var(--color-ink)', fontFamily: 'var(--font-family-body)' }} />
              <button className="btn-sharp" style={{ padding: '10px 16px', fontSize: 10, background: 'var(--color-ink)', color: '#fff', border: 'none' }}>Sign Up</button>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Navigation</div>
            {['Home', 'Pipeline', 'Docs', 'Pricing'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, fontWeight: 500, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', marginBottom: 14 }}>Social</div>
            {['GitHub', 'Twitter', 'LinkedIn'].map(l => (
              <div key={l} style={{ fontSize: 13, color: 'var(--color-ink-dim)', padding: '5px 0' }}>{l}</div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, borderTop: '1px solid var(--color-surface-border)', fontSize: 11, color: 'var(--color-ink-faint)' }}>
          <span>© 2026 Nexus / APIP. All rights reserved.</span>
          <span>Privacy Policy · Terms of Use</span>
        </div>
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
        @media (max-width: 900px) { .landing-nav-items { display: none; } }
        .landing-nav-cta-short { display: none; }
        @media (max-width: 560px) {
          .landing-nav-cta-full { display: none; }
          .landing-nav-cta-short { display: inline; }
        }
        @media (max-width: 780px) { .agent-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 680px) { .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; } }
        @media (max-width: 680px) { .hero-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <Nav onLaunch={launchDashboard} />

      {/* ── Hero — 2x2 wordmark grid, matching Aspen's "Aspen / Search" layout ─ */}
      <section style={{ paddingTop: 56 }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--color-surface-border)' }}>
          <div style={{ borderRight: '1px solid var(--color-surface-border)', borderBottom: '1px solid var(--color-surface-border)', padding: '48px 32px', display: 'flex', alignItems: 'flex-end', minHeight: 220 }}>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(56px,9vw,120px)', lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>Nexus</h1>
          </div>
          <div style={{ borderBottom: '1px solid var(--color-surface-border)', padding: '48px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 220 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>Autonomous Product Intelligence</span>
          </div>
          <div style={{ borderRight: '1px solid var(--color-surface-border)', padding: '48px 32px', display: 'flex', alignItems: 'flex-start', minHeight: 220 }}>
            <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)' }}>6-Agent Pipeline</span>
          </div>
          <div style={{ padding: '48px 32px', display: 'flex', alignItems: 'flex-start', minHeight: 220 }}>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(56px,9vw,120px)', lineHeight: 0.9, letterSpacing: '-0.03em', margin: 0 }}>Intel.</h1>
          </div>
        </div>

        {/* ── Black band — bold statement, matching Aspen's "PLACING WINNERS." band ─ */}
        <div style={{ background: 'var(--color-ink)', color: '#fff', padding: '64px 32px' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <h2 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(36px,6vw,72px)', lineHeight: 1, letterSpacing: '-0.02em', margin: '0 0 24px' }}>
              Structured intelligence.<br />Every run.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.75, color: 'rgba(255,255,255,.6)', maxWidth: 480, margin: '0 0 32px' }}>
              A multi-agent platform that transforms any product brief into structured intelligence — research, documentation, QA and release signals delivered in a single pipeline run.
            </p>
            <button onClick={launchDashboard} className="btn-sharp" style={{ padding: '13px 26px', fontSize: 12, background: '#fff', color: 'var(--color-ink)', border: 'none' }}>
              Start a Pipeline Run
            </button>
          </div>
        </div>

        {/* ── Mint band — agent roster, matching Aspen's mint logo-bar section ─ */}
        <div style={{ background: 'var(--color-accent)', padding: '56px 32px' }}>
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <p style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(20px,2.6vw,28px)', lineHeight: 1.4, color: 'var(--color-ink)', maxWidth: 640, margin: '0 0 40px' }}>
              We don&apos;t move tickets. We move product briefs into structured, shippable intelligence.
            </p>
            <div className="agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(35,35,35,.15)' }}>
              {AGENT_CARDS.map(({ name, icon: Icon, desc }) => (
                <div key={name} style={{ background: 'var(--color-accent)', padding: '20px' }}>
                  <Icon size={18} strokeWidth={1.8} color="var(--color-ink)" style={{ marginBottom: 12 }} />
                  <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 14, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 4 }}>{name}</div>
                  <p style={{ fontSize: 11, lineHeight: 1.5, color: 'rgba(35,35,35,.7)', margin: 0 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── About — scroll-revealed paragraph, matching Aspen's about section ─ */}
      <section style={{ padding: '120px 32px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', display: 'block', marginBottom: 32 }}>About Nexus</span>
          <ScrollReveal sentences={ABOUT_SENTENCES} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
