import { useEffect, useCallback, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DropdownNavigation } from '@/components/ui/dropdown-navigation';
import HalftoneMark from '@/components/HalftoneMark';
import ThemeToggle from '@/components/ThemeToggle';
import IntroSplash from '@/components/IntroSplash';
import LogoScatter from '@/components/LogoScatter';
import NexusLogo from '@/components/NexusLogo';
import Reveal from '@/components/Reveal';
import { useSmoothScroll } from '@/lib/useSmoothScroll';
import { Globe, BookOpen, FileText, ShieldCheck, Play, Send, ArrowRight } from 'lucide-react';

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

const STATS = [
  { value: '6', label: 'Specialized agents', tone: 'ink' },
  { value: '<5 min', label: 'Avg. pipeline run', tone: 'accent' },
  { value: '100%', label: 'Structured output', tone: 'faint' },
  { value: '24/7', label: 'API availability', tone: 'ink' },
];

const BENEFITS = [
  { title: 'Built for speed', desc: 'A full six-agent run completes in under five minutes — no manual research queue.' },
  { title: 'Structured by default', desc: 'Every output is typed and consistent — no scraping free-form text out of a chat log.' },
  { title: 'Auditable end to end', desc: 'Every agent’s output is stored and reviewable, not just the final summary.' },
];

/** Live clock cycling real timezones, matching Aspen's "05:52 AM NYC" → "02:52 AM LA" nav detail. */
const CLOCK_ZONES: { tz: string; label: string }[] = [
  { tz: 'America/New_York', label: 'NYC' },
  { tz: 'America/Los_Angeles', label: 'LA' },
  { tz: 'Europe/London', label: 'LDN' },
];

function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  const [zoneIdx, setZoneIdx] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000);
    const cycle = setInterval(() => setZoneIdx(i => (i + 1) % CLOCK_ZONES.length), 4000);
    return () => { clearInterval(tick); clearInterval(cycle); };
  }, []);

  const zone = CLOCK_ZONES[zoneIdx];
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: zone.tz });
  return (
    <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 11, letterSpacing: '.02em', color: 'var(--color-ink-dim)' }}>
      {time} {zone.label}
    </span>
  );
}

function Nav({ onLaunch }: { onLaunch: () => void }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, borderBottom: '1px solid var(--color-surface-border)', background: 'var(--color-bg)' }}>
      <nav className="landing-nav" style={{ maxWidth: 1240, margin: '0 auto', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <LogoScatter size={18}>
            <NexusLogo size={18} />
          </LogoScatter>
          <span style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 15, letterSpacing: '-.01em', color: 'var(--color-ink)' }}>Nexus</span>
          <LiveClock />
        </div>
        <div className="landing-nav-items" style={{ minWidth: 0, overflow: 'hidden' }}>
          <DropdownNavigation navItems={LANDING_NAV_ITEMS} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
          <ThemeToggle />
          <button
            onClick={onLaunch}
            className="btn-sharp landing-nav-cta"
            style={{ padding: '9px 20px', fontSize: 11, background: 'var(--color-ink)', color: 'var(--color-bg)', border: 'none', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <span className="landing-nav-cta-full">Explore the Dashboard</span>
            <span className="landing-nav-cta-short">Dashboard</span>
            <ArrowRight size={12} strokeWidth={2} />
          </button>
        </div>
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
              <button className="btn-sharp" style={{ padding: '10px 16px', fontSize: 10, background: 'var(--color-ink)', color: 'var(--color-bg)', border: 'none' }}>Sign Up</button>
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
  useSmoothScroll();

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-ink)', minHeight: '100vh' }}>
      <IntroSplash />
      <style>{`
        @media (max-width: 900px) { .landing-nav-items { display: none; } }
        .landing-nav-cta-short { display: none; }
        @media (max-width: 560px) {
          .landing-nav-cta-full { display: none; }
          .landing-nav-cta-short { display: inline; }
        }
        @media (max-width: 780px) { .agent-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 680px) { .stats-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 680px) { .benefits-grid { grid-template-columns: 1fr !important; gap: 28px !important; } }
        @media (max-width: 680px) { .footer-grid { grid-template-columns: 1fr !important; gap: 28px !important; } }
        @media (max-width: 680px) {
          .hero-grid { grid-template-columns: 1fr !important; grid-template-rows: 180px 140px 140px auto !important; }
          .hero-split { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <Nav onLaunch={launchDashboard} />

      {/* ── Hero — 2x2 grid: wordmark, halftone texture, halftone texture, black/mint split ─ */}
      <section style={{ paddingTop: 56 }}>
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '260px 260px', borderBottom: '1px solid var(--color-surface-border)' }}>
          <div style={{ borderRight: '1px solid var(--color-surface-border)', borderBottom: '1px solid var(--color-surface-border)', padding: 20, display: 'flex', alignItems: 'flex-end' }}>
            <h1 style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(56px,12.5vw,180px)', lineHeight: 0.9, letterSpacing: '-0.04em', margin: 0 }}>Nexus</h1>
          </div>
          <div style={{ borderBottom: '1px solid var(--color-surface-border)', overflow: 'hidden', opacity: 0.5 }}>
            <HalftoneMark />
          </div>
          <div style={{ borderRight: '1px solid var(--color-surface-border)', overflow: 'hidden', opacity: 0.5 }}>
            <HalftoneMark flip />
          </div>
          <div className="hero-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Reveal delay={0.15} style={{ background: 'var(--color-ink)', color: 'var(--color-bg)', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <p style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(15px,1.6vw,19px)', lineHeight: 1.35, letterSpacing: '-0.01em', margin: 0 }}>
                Structured intelligence from any product brief — research, docs, QA and release signals, every run.
              </p>
              <button onClick={launchDashboard} className="btn-sharp" style={{ padding: '8px 14px', fontSize: 10, background: 'var(--color-bg)', color: 'var(--color-ink)', border: 'none', alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Start a Pipeline Run <ArrowRight size={11} strokeWidth={2} />
              </button>
            </Reveal>
            <Reveal delay={0.24} style={{ background: 'var(--color-accent)', padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <p style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--color-ink)', margin: 0 }}>
                We don&apos;t move tickets. We move product briefs into shippable intelligence.
              </p>
              <div>
                <span style={{ fontFamily: 'var(--font-family-label)', fontSize: 9, letterSpacing: '.06em', textTransform: 'uppercase', color: 'rgba(35,35,35,.6)', display: 'block', marginBottom: 8 }}>Six agents:</span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {AGENT_CARDS.map(({ name, icon: Icon }) => (
                    <Icon key={name} size={16} strokeWidth={1.8} color="var(--color-ink)" />
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Agent roster detail ─────────────────────────────────── */}
      <section style={{ padding: '96px 32px', borderBottom: '1px solid var(--color-surface-border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal><span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', display: 'block', marginBottom: 32 }}>The Pipeline</span></Reveal>
          <div className="agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'var(--color-surface-border)', border: '1px solid var(--color-surface-border)' }}>
            {AGENT_CARDS.map(({ name, icon: Icon, desc }, i) => (
              <Reveal key={name} delay={(i % 3) * 0.08} style={{ background: 'var(--color-bg)', padding: '24px' }}>
                <Icon size={18} strokeWidth={1.8} color="var(--color-ink)" style={{ marginBottom: 14 }} />
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 15, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 6 }}>{name}</div>
                <p style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--color-ink-dim)', margin: 0 }}>{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats grid — matching Aspen's "Connecting top-tier talent" cell grid ─ */}
      <section style={{ borderBottom: '1px solid var(--color-surface-border)' }}>
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map(({ value, label, tone }, i) => (
            <Reveal key={label} delay={i * 0.08} y={26} style={{
              padding: 20, minHeight: 180, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
              border: '1px solid var(--color-surface-border)', marginLeft: -1, marginTop: -1,
              background: tone === 'ink' ? 'var(--color-ink)' : tone === 'accent' ? 'var(--color-accent)' : 'var(--color-surface-strong)',
              color: tone === 'ink' ? 'var(--color-bg)' : 'var(--color-ink)',
            }}>
              <div style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(28px,4vw,52px)', letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 12, marginTop: 8, opacity: 0.75 }}>{label}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Benefits — replaces Aspen's Testimonials with honest product claims, not fabricated quotes ─ */}
      <section style={{ padding: '96px 32px', borderBottom: '1px solid var(--color-surface-border)' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal><span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', display: 'block', marginBottom: 32 }}>Why Nexus</span></Reveal>
          <div className="benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
            {BENEFITS.map(({ title, desc }, i) => (
              <Reveal key={title} delay={i * 0.1}>
                <div style={{ fontFamily: 'var(--font-family-display)', fontSize: 18, fontWeight: 700, color: 'var(--color-ink)', marginBottom: 10 }}>{title}</div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--color-ink-dim)', margin: 0 }}>{desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA — matching Aspen's "Let's Start a Conversation" band ─ */}
      <section style={{ background: 'var(--color-ink)', color: 'var(--color-bg)', padding: '80px 32px', textAlign: 'center' }}>
        <Reveal y={24}>
          <p style={{ fontFamily: 'var(--font-family-display)', fontWeight: 700, fontSize: 'clamp(28px,4.5vw,52px)', letterSpacing: '-0.02em', margin: '0 0 28px' }}>
            Ready to run your first analysis?
          </p>
          <button onClick={launchDashboard} className="btn-sharp" style={{ padding: '13px 28px', fontSize: 12, background: 'var(--color-accent)', color: 'var(--color-accent-ink)', border: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            Explore the Dashboard <ArrowRight size={13} strokeWidth={2} />
          </button>
        </Reveal>
      </section>

      {/* ── About — scroll-revealed paragraph, matching Aspen's about section ─ */}
      <section style={{ padding: '120px 32px' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <Reveal><span style={{ fontFamily: 'var(--font-family-label)', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--color-ink-faint)', display: 'block', marginBottom: 32 }}>About Nexus</span></Reveal>
          <ScrollReveal sentences={ABOUT_SENTENCES} />
        </div>
      </section>

      <Footer />
    </div>
  );
}
