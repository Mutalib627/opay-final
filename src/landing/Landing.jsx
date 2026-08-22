import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ShieldCheck,
  Users,
  Wallet,
  Landmark,
  ListChecks,
  MessageSquareText,
  BarChart3,
  Link2,
  Eye,
  Brain,
  Zap,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  ChevronRight,
  FileClock,
  Fingerprint,
  Vote,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Small shared hooks                                                 */
/* ------------------------------------------------------------------ */

// Reveals an element (adds .is-visible) the first time it scrolls into view.
function useReveal(options = {}) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2, ...options }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return [ref, visible];
}

// Rotates through a list of phrases, typing and deleting each one.
function useTypewriter(phrases, { typeSpeed = 42, holdMs = 1400, deleteSpeed = 22 } = {}) {
  const [text, setText] = useState("");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setText(phrases[0]);
      return;
    }

    const current = phrases[phraseIndex % phrases.length];
    let timeout;

    if (!deleting && text.length < current.length) {
      timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typeSpeed);
    } else if (!deleting && text.length === current.length) {
      timeout = setTimeout(() => setDeleting(true), holdMs);
    } else if (deleting && text.length > 0) {
      timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), deleteSpeed);
    } else if (deleting && text.length === 0) {
      setDeleting(false);
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeout);
  }, [text, deleting, phraseIndex, phrases, typeSpeed, holdMs, deleteSpeed]);

  return text;
}

// Counts a number up from 0 once the given "trigger" becomes true.
function useCountUp(target, trigger, durationMs = 1100) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!trigger) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) {
      setValue(target);
      return;
    }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [trigger, target, durationMs]);

  return value;
}

/* ------------------------------------------------------------------ */
/*  Content — kept separate from markup so copy can be edited freely  */
/* ------------------------------------------------------------------ */

const TYPED_PHRASES = [
  "Built for modern cooperatives.",
  "Powered by intelligent operations.",
  "Designed for greater transparency.",
  "Built to reduce administrative workload.",
];

const VALUE_PROPS = [
  { icon: Link2, title: "Centralized", copy: "Contributions, loans, repayments and governance, in one ecosystem instead of scattered ledgers." },
  { icon: Eye, title: "Transparent", copy: "Every record and action is traceable, so members always know where their money stands." },
  { icon: Brain, title: "Intelligent", copy: "An AI Operations Agent watches routine activity and flags what actually needs attention." },
  { icon: Users, title: "Connected", copy: "Members and administrators stay informed without waiting for the next physical meeting." },
];

const PROBLEMS = [
  { icon: FileClock, title: "Manual records", copy: "Paper and fragmented spreadsheets make information easy to lose and hard to verify." },
  { icon: Eye, title: "Limited visibility", copy: "Members often can't see an accurate, up-to-date picture of their own contributions." },
  { icon: ListChecks, title: "Administrative burden", copy: "Treasurers and secretaries lose hours to repetitive tasks that software can absorb." },
  { icon: Users, title: "Physical dependency", copy: "Meetings and paperwork cost members time, transport, and sometimes personal safety." },
  { icon: Link2, title: "Fragmented operations", copy: "Finance and governance run in separate systems, so nothing reconciles automatically." },
];

const ECOSYSTEM_NODES = [
  "Members", "Contributions", "Savings", "Loans",
  "Repayments", "Transactions", "Governance", "Reports",
];

const FEATURES = [
  { icon: Wallet, title: "Contributions & Savings", copy: "Digitally track every contribution and savings balance as it happens, not at month-end." },
  { icon: Landmark, title: "Loan Management", copy: "Run requests, assessment, approval and repayment through one consistent workflow." },
  { icon: BarChart3, title: "Financial Monitoring", copy: "Give committees a live, accurate view of cooperative finances at any moment." },
  { icon: ShieldCheck, title: "Transaction Audit Trails", copy: "Every meaningful action is written to a tamper-evident, hash-chained ledger." },
  { icon: Vote, title: "Digital Governance", copy: "Hold meetings, votes and member discussions without requiring everyone in one room." },
  { icon: MessageSquareText, title: "Reports & Insights", copy: "Turn raw cooperative data into summaries administrators can act on quickly." },
];

const AI_FLOW = ["Observe", "Analyze", "Reason", "Act", "Escalate", "Human Approval", "Audit"];

const AI_CAPABILITIES = [
  { title: "Loan Operations", copy: "Reviews authorized loan information and prepares a recommendation for the loan officer." },
  { title: "Transaction Monitoring", copy: "Watches for unusual transaction patterns and raises an alert when one appears." },
  { title: "Repayment Monitoring", copy: "Tracks repayment schedules and handles the routine reminders automatically." },
  { title: "Administrative Automation", copy: "Drafts reports, summaries and notifications so staff aren't starting from a blank page." },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Join", copy: "Create an account and join your cooperative in minutes." },
  { n: "02", title: "Participate", copy: "Manage contributions, loans and cooperative activity from your dashboard." },
  { n: "03", title: "Monitor", copy: "Coop Guard Intelligence continuously watches routine activity for you." },
  { n: "04", title: "Decide", copy: "The agent prepares recommendations. Authorized humans make the final call." },
];

const COMPARE = {
  before: ["Manual records", "Manual monitoring", "Physical dependency", "Fragmented information", "Reactive administration"],
  after: ["Digital records", "AI-assisted monitoring", "Digital participation", "Centralized information", "Proactive alerts"],
};

const SECURITY_POINTS = [
  { icon: Fingerprint, title: "Role-based access", copy: "Members, loan officers and administrators each see only what their role permits." },
  { icon: ShieldCheck, title: "Secure records", copy: "Cooperative data is stored and handled with dedicated safeguards, not open spreadsheets." },
  { icon: FileClock, title: "Transaction traceability", copy: "Financial activity can be traced back to when and how it happened." },
  { icon: Link2, title: "Hash-chained audit trail", copy: "Each ledger entry is linked to the one before it, making silent edits evident." },
  { icon: Users, title: "Human oversight", copy: "Sensitive decisions stay with authorized people. The agent recommends; it doesn't decide." },
  { icon: Eye, title: "Controlled AI actions", copy: "Every automated action the agent takes is logged and reviewable, not hidden." },
];

/* ------------------------------------------------------------------ */
/*  Section components                                                 */
/* ------------------------------------------------------------------ */

function Nav({ onNavigate }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#home", label: "Home" },
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How It Works" },
    { href: "#ai", label: "AI Intelligence" },
    { href: "#about", label: "About" },
  ];

  return (
    <header className={`cgl-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="cgl-nav-inner">
        <a href="#home" className="cgl-brand" onClick={() => setOpen(false)}>
          <span className="cgl-brand-mark">
            <ShieldCheck size={18} strokeWidth={2.3} />
          </span>
          <span className="cgl-brand-name">Coop Guard</span>
        </a>

        <nav className="cgl-links" aria-label="Primary">
          {links.map((l) => (
            <a key={l.href} href={l.href}>{l.label}</a>
          ))}
        </nav>

        <div className="cgl-nav-cta">
          <button className="cgl-btn cgl-btn-ghost" onClick={() => onNavigate("/app")}>
            Log In
          </button>
          <button className="cgl-btn cgl-btn-primary" onClick={() => onNavigate("/app")}>
            Get Started
          </button>
        </div>

        <button
          className="cgl-burger"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="cgl-mobile-menu">
          {links.map((l) => (
            <a key={l.href} href={l.href} onClick={() => setOpen(false)}>{l.label}</a>
          ))}
          <div className="cgl-mobile-cta">
            <button className="cgl-btn cgl-btn-ghost" onClick={() => onNavigate("/app")}>Log In</button>
            <button className="cgl-btn cgl-btn-primary" onClick={() => onNavigate("/app")}>Get Started</button>
          </div>
        </div>
      )}
    </header>
  );
}

function LedgerPreview() {
  const [ref, visible] = useReveal();
  const savings = useCountUp(4820600, visible);
  const loans = useCountUp(38, visible);
  const members = useCountUp(612, visible);

  const blocks = ["4f0a9c", "8b21e7", "d15f33", "a904b8", "envelope"];

  return (
    <div className={`cgl-preview ${visible ? "is-visible" : ""}`} ref={ref}>
      <div className="cgl-preview-head">
        <span className="cgl-dot cgl-dot-red" />
        <span className="cgl-dot cgl-dot-amber" />
        <span className="cgl-dot cgl-dot-teal" />
        <span className="cgl-preview-title">Coop Guard — Live Overview</span>
      </div>

      <div className="cgl-preview-grid">
        <div className="cgl-preview-card cgl-preview-card--wide" style={{ "--d": "0ms" }}>
          <span className="cgl-preview-label">Total Cooperative Savings</span>
          <span className="cgl-preview-value cgl-mono">₦{savings.toLocaleString()}</span>
          <span className="cgl-preview-sub">Demonstration data</span>
        </div>
        <div className="cgl-preview-card" style={{ "--d": "80ms" }}>
          <span className="cgl-preview-label">Active Loans</span>
          <span className="cgl-preview-value cgl-mono">{loans}</span>
        </div>
        <div className="cgl-preview-card" style={{ "--d": "160ms" }}>
          <span className="cgl-preview-label">Members</span>
          <span className="cgl-preview-value cgl-mono">{members}</span>
        </div>
        <div className="cgl-preview-card cgl-preview-alert" style={{ "--d": "240ms" }}>
          <span className="cgl-preview-alert-dot" />
          <div>
            <span className="cgl-preview-label">AI Insight</span>
            <p>Loan #2048 flagged — amount above the member's contribution pattern.</p>
          </div>
        </div>
      </div>

      <div className="cgl-chain">
        <span className="cgl-chain-label">Audit chain</span>
        <div className="cgl-chain-row">
          {blocks.map((b, i) => (
            <React.Fragment key={b}>
              <span className="cgl-chain-block cgl-mono" style={{ "--d": `${300 + i * 90}ms` }}>
                {b === "envelope" ? "…" : `#${b}`}
              </span>
              {i < blocks.length - 1 && <span className="cgl-chain-link" style={{ "--d": `${340 + i * 90}ms` }} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

function Hero({ onNavigate }) {
  const typed = useTypewriter(TYPED_PHRASES);
  return (
    <section id="home" className="cgl-hero">
      <div className="cgl-hero-copy">
        <p className="cgl-eyebrow">Digital cooperative management</p>
        <h1>
          Smarter Cooperative Management.
          <br />
          Greater Transparency. Stronger Trust.
        </h1>
        <p className="cgl-hero-typed">
          <span className="cgl-mono">{typed}</span>
          <span className="cgl-caret" aria-hidden="true" />
        </p>
        <p className="cgl-hero-sub">
          Coop Guard brings contributions, loans, repayments, governance and cooperative
          records into one secure digital ecosystem — with intelligent automation that
          helps reduce administrative workload.
        </p>
        <div className="cgl-hero-cta">
          <button className="cgl-btn cgl-btn-primary cgl-btn-lg" onClick={() => onNavigate("/app")}>
            Get Started <ChevronRight size={16} />
          </button>
          <a className="cgl-btn cgl-btn-ghost cgl-btn-lg" href="#solution">
            Explore Coop Guard
          </a>
        </div>
      </div>
      <div className="cgl-hero-visual">
        <LedgerPreview />
      </div>
    </section>
  );
}

function ValueProps() {
  return (
    <section className="cgl-values">
      <div className="cgl-values-grid">
        {VALUE_PROPS.map((v) => {
          const Icon = v.icon;
          return (
            <div className="cgl-value" key={v.title}>
              <span className="cgl-value-icon"><Icon size={20} strokeWidth={2.2} /></span>
              <h3>{v.title}</h3>
              <p>{v.copy}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RevealSection({ id, className, children }) {
  const [ref, visible] = useReveal();
  return (
    <section id={id} ref={ref} className={`${className} cgl-reveal ${visible ? "is-visible" : ""}`}>
      {children}
    </section>
  );
}

function Problem() {
  return (
    <RevealSection id="problem" className="cgl-problem">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">The problem</p>
        <h2>Cooperative management shouldn't depend on paperwork and physical processes.</h2>
      </div>
      <div className="cgl-problem-grid">
        {PROBLEMS.map((p) => {
          const Icon = p.icon;
          return (
            <div className="cgl-problem-card" key={p.title}>
              <span className="cgl-problem-icon"><Icon size={18} /></span>
              <h3>{p.title}</h3>
              <p>{p.copy}</p>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function Solution() {
  const radius = 150;
  const cx = 200, cy = 200;
  return (
    <RevealSection id="solution" className="cgl-solution">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">The solution</p>
        <h2>One digital ecosystem for modern cooperative operations.</h2>
        <p className="cgl-section-copy">
          Coop Guard centralizes the activities that used to live across notebooks, phone calls
          and separate spreadsheets — so every part of the cooperative connects to the same
          source of truth.
        </p>
      </div>

      <div className="cgl-ecosystem">
        <svg viewBox="0 0 400 400" className="cgl-ecosystem-svg" aria-hidden="true">
          {ECOSYSTEM_NODES.map((_, i) => {
            const angle = (i / ECOSYSTEM_NODES.length) * Math.PI * 2 - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={x} y2={y}
                className="cgl-ecosystem-line"
                style={{ "--d": `${i * 90}ms` }}
              />
            );
          })}
        </svg>
        <div className="cgl-ecosystem-center">Coop Guard</div>
        {ECOSYSTEM_NODES.map((label, i) => {
          const angle = (i / ECOSYSTEM_NODES.length) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + (radius / 200) * 50 * Math.cos(angle);
          const y = 50 + (radius / 200) * 50 * Math.sin(angle);
          return (
            <div
              key={label}
              className="cgl-ecosystem-node"
              style={{ left: `${x}%`, top: `${y}%`, "--d": `${200 + i * 90}ms` }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function Features() {
  return (
    <RevealSection id="features" className="cgl-features">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Core features</p>
        <h2>Everything a cooperative runs on, in one place.</h2>
      </div>
      <div className="cgl-features-grid">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div className="cgl-feature-card" key={f.title}>
              <span className="cgl-feature-icon"><Icon size={20} strokeWidth={2.2} /></span>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
              <span className="cgl-feature-more">Learn more <ArrowUpRight size={14} /></span>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function AIAgent() {
  return (
    <RevealSection id="ai" className="cgl-ai">
      <div className="cgl-section-head cgl-section-head--light">
        <p className="cgl-eyebrow cgl-eyebrow--light">AI operations</p>
        <h2>Meet Coop Guard Intelligence</h2>
        <p className="cgl-section-copy cgl-section-copy--light">
          An AI Operations Agent designed to monitor routine activity, automate repetitive
          tasks, identify exceptions and prepare recommendations — while authorized humans
          remain in control of important decisions.
        </p>
      </div>

      <div className="cgl-flow">
        {AI_FLOW.map((step, i) => (
          <React.Fragment key={step}>
            <div className="cgl-flow-step" style={{ "--d": `${i * 110}ms` }}>
              <span className="cgl-flow-num cgl-mono">{String(i + 1).padStart(2, "0")}</span>
              <span>{step}</span>
            </div>
            {i < AI_FLOW.length - 1 && <span className="cgl-flow-arrow" aria-hidden="true">→</span>}
          </React.Fragment>
        ))}
      </div>
      <p className="cgl-flow-caption">AI recommends. Authorized humans decide.</p>

      <div className="cgl-ai-capabilities">
        {AI_CAPABILITIES.map((c) => (
          <div className="cgl-ai-capability" key={c.title}>
            <h4>{c.title}</h4>
            <p>{c.copy}</p>
          </div>
        ))}
      </div>

      <AIDemoPanel />
    </RevealSection>
  );
}

function AIDemoPanel() {
  const [dismissed, setDismissed] = useState(false);
  return (
    <div className="cgl-demo">
      <div className="cgl-demo-head">
        <span className="cgl-demo-pulse" />
        <span>Coop Guard Intelligence — monitoring cooperative operations…</span>
      </div>
      <div className="cgl-demo-stats">
        <div><strong className="cgl-mono">247</strong><span>activities monitored</span></div>
        <div><strong className="cgl-mono cgl-ok">241</strong><span>normal</span></div>
        <div><strong className="cgl-mono cgl-warn">4</strong><span>require attention</span></div>
        <div><strong className="cgl-mono cgl-risk">2</strong><span>high priority</span></div>
      </div>

      {!dismissed ? (
        <div className="cgl-demo-alert">
          <div className="cgl-demo-alert-head">
            <span className="cgl-badge cgl-badge-warn">Risk: Moderate</span>
            <span className="cgl-mono">Loan Application #2048</span>
          </div>
          <p>Requested amount is significantly higher than the member's recent contribution pattern.</p>
          <div className="cgl-demo-actions">
            <button className="cgl-btn cgl-btn-primary cgl-btn-sm" onClick={() => setDismissed(true)}>
              <CheckCircle2 size={14} /> Review Application
            </button>
            <button className="cgl-btn cgl-btn-ghost cgl-btn-sm" onClick={() => setDismissed(true)}>
              <XCircle size={14} /> Dismiss
            </button>
          </div>
        </div>
      ) : (
        <div className="cgl-demo-alert cgl-demo-alert--done">
          <Bell size={14} /> No alerts pending review. This panel uses demonstration data only.
        </div>
      )}
    </div>
  );
}

function HowItWorks() {
  return (
    <RevealSection id="how-it-works" className="cgl-how">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">How it works</p>
        <h2>From sign-up to an informed decision.</h2>
      </div>
      <div className="cgl-how-grid">
        {HOW_IT_WORKS.map((s) => (
          <div className="cgl-how-step" key={s.n}>
            <span className="cgl-how-num cgl-mono">{s.n}</span>
            <h3>{s.title}</h3>
            <p>{s.copy}</p>
          </div>
        ))}
      </div>
    </RevealSection>
  );
}

function Compare() {
  return (
    <RevealSection id="about" className="cgl-compare">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Digital transformation</p>
        <h2>The same cooperative, run a better way.</h2>
      </div>
      <div className="cgl-compare-grid">
        <div className="cgl-compare-col">
          <h3>Traditional</h3>
          <ul>
            {COMPARE.before.map((c) => <li key={c}>{c}</li>)}
          </ul>
        </div>
        <div className="cgl-compare-col cgl-compare-col--accent">
          <h3>Coop Guard</h3>
          <ul>
            {COMPARE.after.map((c) => <li key={c}><CheckCircle2 size={15} /> {c}</li>)}
          </ul>
        </div>
      </div>
    </RevealSection>
  );
}

function Security() {
  return (
    <RevealSection className="cgl-security">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Security &amp; accountability</p>
        <h2>Built around transparency and accountability.</h2>
      </div>
      <div className="cgl-security-grid">
        {SECURITY_POINTS.map((s) => {
          const Icon = s.icon;
          return (
            <div className="cgl-security-item" key={s.title}>
              <span className="cgl-security-icon"><Icon size={17} /></span>
              <div>
                <h4>{s.title}</h4>
                <p>{s.copy}</p>
              </div>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function FinalCTA({ onNavigate }) {
  return (
    <RevealSection className="cgl-final">
      <h2>Ready to build a more transparent cooperative?</h2>
      <p>
        Move beyond manual processes and give your cooperative a smarter way to manage,
        monitor and participate.
      </p>
      <div className="cgl-final-cta">
        <button className="cgl-btn cgl-btn-primary cgl-btn-lg" onClick={() => onNavigate("/app")}>
          Get Started <ChevronRight size={16} />
        </button>
        <button className="cgl-btn cgl-btn-outline cgl-btn-lg" onClick={() => onNavigate("/app")}>
          Log In
        </button>
      </div>
    </RevealSection>
  );
}

function Footer() {
  return (
    <footer className="cgl-footer">
      <div className="cgl-footer-inner">
        <div className="cgl-footer-brand">
          <span className="cgl-brand-mark cgl-brand-mark--sm">
            <ShieldCheck size={16} strokeWidth={2.3} />
          </span>
          <span className="cgl-brand-name">Coop Guard</span>
        </div>
        <p className="cgl-footer-copy">
          Digital cooperative management with intelligent, human-controlled automation.
        </p>
        <p className="cgl-footer-fine">
          Simulation prototype. Figures and AI alerts shown across this site are demonstration
          data. © {new Date().getFullYear()} Coop Guard.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function Landing({ onNavigate }) {
  const navigate = useCallback(
    (path) => {
      if (onNavigate) onNavigate(path);
    },
    [onNavigate]
  );

  return (
    <div className="cgl-root">
      <Nav onNavigate={navigate} />
      <Hero onNavigate={navigate} />
      <ValueProps />
      <Problem />
      <Solution />
      <Features />
      <AIAgent />
      <HowItWorks />
      <Compare />
      <Security />
      <FinalCTA onNavigate={navigate} />
      <Footer />
      <LandingStyles />
    </div>
  );
}

function LandingStyles() {
  return (
    <style>{`
      .cgl-root {
        --cgl-ink: #16233A;
        --cgl-paper: #F7F9FA;
        --cgl-paper-2: #EEF2F4;
        --cgl-navy: #0E1A30;
        --cgl-navy-2: #1B2E4D;
        --cgl-teal: #569192;
        --cgl-teal-deep: #3E7071;
        --cgl-blue: #2E5C8A;
        --cgl-red: #C0392B;
        --cgl-amber: #B9832E;
        --cgl-line: #DCE3E7;
        font-family: 'Inter', -apple-system, system-ui, sans-serif;
        color: var(--cgl-ink);
        background: var(--cgl-paper);
        -webkit-font-smoothing: antialiased;
        overflow-x: hidden;
      }
      .cgl-root * { box-sizing: border-box; }
      .cgl-mono { font-family: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

      .cgl-root section { padding: 88px 24px; max-width: 1180px; margin: 0 auto; }
      @media (max-width: 720px) { .cgl-root section { padding: 56px 20px; } }

      .cgl-section-head { max-width: 640px; margin-bottom: 40px; }
      .cgl-section-head h2 { font-size: clamp(24px, 3.2vw, 34px); line-height: 1.25; margin: 8px 0 12px; letter-spacing: -0.01em; }
      .cgl-section-copy { color: #4B5D6E; font-size: 15px; line-height: 1.7; margin: 0; }
      .cgl-eyebrow { font-size: 11.5px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--cgl-teal-deep); font-weight: 700; margin: 0 0 6px; }

      .cgl-reveal { opacity: 0; transform: translateY(18px); transition: opacity 0.6s ease, transform 0.6s ease; }
      .cgl-reveal.is-visible { opacity: 1; transform: translateY(0); }

      /* Buttons */
      .cgl-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; border-radius: 10px; border: 1px solid transparent; font-family: inherit; font-weight: 600; font-size: 13.5px; padding: 10px 18px; cursor: pointer; transition: transform 0.15s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease; text-decoration: none; }
      .cgl-btn:active { transform: translateY(1px); }
      .cgl-btn-primary { background: var(--cgl-navy); color: #fff; }
      .cgl-btn-primary:hover { background: var(--cgl-navy-2); box-shadow: 0 6px 18px rgba(14,26,48,0.22); }
      .cgl-btn-ghost { background: transparent; color: var(--cgl-navy); border-color: var(--cgl-line); }
      .cgl-btn-ghost:hover { background: var(--cgl-paper-2); }
      .cgl-btn-outline { background: transparent; color: #fff; border-color: rgba(255,255,255,0.4); }
      .cgl-btn-outline:hover { background: rgba(255,255,255,0.1); }
      .cgl-btn-lg { padding: 13px 24px; font-size: 14.5px; }
      .cgl-btn-sm { padding: 7px 12px; font-size: 12.5px; }

      /* Nav */
      .cgl-nav { position: sticky; top: 0; z-index: 40; background: rgba(247,249,250,0); border-bottom: 1px solid transparent; transition: background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease; }
      .cgl-nav.is-scrolled { background: rgba(247,249,250,0.92); backdrop-filter: blur(10px); border-color: var(--cgl-line); box-shadow: 0 2px 14px rgba(14,26,48,0.05); }
      .cgl-nav-inner { max-width: 1180px; margin: 0 auto; display: flex; align-items: center; gap: 24px; padding: 14px 24px; }
      .cgl-brand { display: flex; align-items: center; gap: 9px; text-decoration: none; color: var(--cgl-ink); }
      .cgl-brand-mark { width: 30px; height: 30px; border-radius: 8px; background: var(--cgl-navy); color: var(--cgl-teal); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cgl-brand-mark--sm { width: 26px; height: 26px; }
      .cgl-brand-name { font-weight: 700; font-size: 16px; letter-spacing: 0.01em; }
      .cgl-links { display: flex; gap: 22px; flex: 1; }
      .cgl-links a { color: #4B5D6E; text-decoration: none; font-size: 13.5px; font-weight: 500; transition: color 0.15s ease; }
      .cgl-links a:hover { color: var(--cgl-navy); }
      .cgl-nav-cta { display: flex; gap: 8px; }
      .cgl-burger { display: none; background: none; border: none; color: var(--cgl-navy); cursor: pointer; padding: 4px; }
      @media (max-width: 860px) {
        .cgl-links, .cgl-nav-cta { display: none; }
        .cgl-burger { display: inline-flex; margin-left: auto; }
      }
      .cgl-mobile-menu { display: flex; flex-direction: column; gap: 2px; padding: 10px 20px 20px; border-top: 1px solid var(--cgl-line); background: var(--cgl-paper); }
      .cgl-mobile-menu a { padding: 10px 4px; color: var(--cgl-ink); text-decoration: none; font-size: 14.5px; border-bottom: 1px solid var(--cgl-line); }
      .cgl-mobile-cta { display: flex; gap: 8px; margin-top: 14px; }
      .cgl-mobile-cta .cgl-btn { flex: 1; }

      /* Hero */
      .cgl-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 48px; align-items: center; padding-top: 56px; padding-bottom: 64px; }
      @media (max-width: 960px) { .cgl-hero { grid-template-columns: 1fr; padding-top: 32px; } }
      .cgl-hero h1 { font-size: clamp(30px, 4.4vw, 46px); line-height: 1.15; letter-spacing: -0.015em; margin: 6px 0 18px; color: var(--cgl-navy); }
      .cgl-hero-typed { min-height: 22px; margin: 0 0 16px; font-size: 14px; color: var(--cgl-teal-deep); }
      .cgl-caret { display: inline-block; width: 2px; height: 14px; background: var(--cgl-teal-deep); margin-left: 2px; vertical-align: -2px; animation: cgl-blink 1s step-end infinite; }
      @keyframes cgl-blink { 50% { opacity: 0; } }
      .cgl-hero-sub { font-size: 15.5px; line-height: 1.7; color: #4B5D6E; max-width: 480px; margin: 0 0 28px; }
      .cgl-hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }

      /* Hero preview / ledger card */
      .cgl-preview { background: #fff; border: 1px solid var(--cgl-line); border-radius: 18px; padding: 20px; box-shadow: 0 24px 60px -20px rgba(14,26,48,0.28); opacity: 0; transform: translateY(14px) scale(0.98); transition: opacity 0.7s ease, transform 0.7s ease; }
      .cgl-preview.is-visible { opacity: 1; transform: translateY(0) scale(1); }
      .cgl-preview-head { display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
      .cgl-dot { width: 8px; height: 8px; border-radius: 50%; }
      .cgl-dot-red { background: var(--cgl-red); }
      .cgl-dot-amber { background: var(--cgl-amber); }
      .cgl-dot-teal { background: var(--cgl-teal); }
      .cgl-preview-title { margin-left: 8px; font-size: 12px; color: #64748B; font-weight: 600; }
      .cgl-preview-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .cgl-preview-card { background: var(--cgl-paper-2); border-radius: 12px; padding: 13px 14px; display: flex; flex-direction: column; gap: 3px; opacity: 0; transform: translateY(8px); animation: cgl-card-in 0.5s ease forwards; animation-delay: var(--d, 0ms); }
      .is-visible .cgl-preview-card { animation-play-state: running; }
      @keyframes cgl-card-in { to { opacity: 1; transform: translateY(0); } }
      .cgl-preview-card--wide { grid-column: 1 / -1; background: linear-gradient(135deg, var(--cgl-navy) 0%, var(--cgl-navy-2) 100%); color: var(--cgl-paper); }
      .cgl-preview-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.7; }
      .cgl-preview-value { font-size: 20px; font-weight: 700; }
      .cgl-preview-sub { font-size: 10.5px; opacity: 0.55; }
      .cgl-preview-alert { grid-column: 1 / -1; flex-direction: row; align-items: flex-start; gap: 8px; background: #FBF3E7; }
      .cgl-preview-alert-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--cgl-amber); margin-top: 5px; flex-shrink: 0; animation: cgl-pulse 1.8s ease-in-out infinite; }
      @keyframes cgl-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(185,131,46,0.5); } 50% { box-shadow: 0 0 0 6px rgba(185,131,46,0); } }
      .cgl-preview-alert p { margin: 2px 0 0; font-size: 12px; line-height: 1.5; color: #6B4E1E; }

      .cgl-chain { margin-top: 14px; padding-top: 14px; border-top: 1px dashed var(--cgl-line); }
      .cgl-chain-label { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; font-weight: 600; }
      .cgl-chain-row { display: flex; align-items: center; margin-top: 8px; flex-wrap: wrap; }
      .cgl-chain-block { font-size: 10.5px; background: var(--cgl-navy); color: var(--cgl-teal); border-radius: 6px; padding: 4px 7px; opacity: 0; animation: cgl-card-in 0.4s ease forwards; animation-delay: var(--d, 0ms); }
      .cgl-chain-link { width: 14px; height: 1px; background: var(--cgl-line); position: relative; opacity: 0; animation: cgl-card-in 0.4s ease forwards; animation-delay: var(--d, 0ms); }

      /* Value props */
      .cgl-values-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      @media (max-width: 860px) { .cgl-values-grid { grid-template-columns: repeat(2, 1fr); } }
      .cgl-value { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 20px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .cgl-value:hover { transform: translateY(-3px); box-shadow: 0 14px 30px -18px rgba(14,26,48,0.25); }
      .cgl-value-icon { width: 36px; height: 36px; border-radius: 9px; background: var(--cgl-paper-2); color: var(--cgl-navy); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
      .cgl-value h3 { font-size: 14.5px; margin: 0 0 6px; }
      .cgl-value p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }

      /* Problem */
      .cgl-problem-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      @media (max-width: 860px) { .cgl-problem-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-problem-grid { grid-template-columns: 1fr; } }
      .cgl-problem-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 18px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .cgl-problem-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px -18px rgba(14,26,48,0.22); }
      .cgl-problem-icon { width: 32px; height: 32px; border-radius: 8px; background: #FDEDEA; color: var(--cgl-red); display: flex; align-items: center; justify-content: center; margin-bottom: 10px; transition: transform 0.2s ease; }
      .cgl-problem-card:hover .cgl-problem-icon { transform: translateY(-2px); }
      .cgl-problem-card h3 { font-size: 14.5px; margin: 0 0 6px; }
      .cgl-problem-card p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }

      /* Solution / ecosystem */
      .cgl-ecosystem { position: relative; width: min(400px, 90vw); aspect-ratio: 1; margin: 24px auto 0; }
      .cgl-ecosystem-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
      .cgl-ecosystem-line { stroke: var(--cgl-line); stroke-width: 1.5; stroke-dasharray: 4 4; opacity: 0; transition: opacity 0.6s ease; transition-delay: var(--d, 0ms); }
      .is-visible .cgl-ecosystem-line { opacity: 1; }
      .cgl-ecosystem-center { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); background: var(--cgl-navy); color: #fff; font-weight: 700; font-size: 13px; padding: 14px 18px; border-radius: 50%; width: 96px; height: 96px; display: flex; align-items: center; justify-content: center; text-align: center; box-shadow: 0 14px 30px -10px rgba(14,26,48,0.4); }
      .cgl-ecosystem-node { position: absolute; transform: translate(-50%, -50%); background: #fff; border: 1px solid var(--cgl-line); border-radius: 999px; padding: 6px 12px; font-size: 11.5px; font-weight: 600; white-space: nowrap; opacity: 0; transition: opacity 0.5s ease, transform 0.5s ease; transition-delay: var(--d, 0ms); }
      .is-visible .cgl-ecosystem-node { opacity: 1; }

      /* Features */
      .cgl-features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      @media (max-width: 860px) { .cgl-features-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-features-grid { grid-template-columns: 1fr; } }
      .cgl-feature-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 20px; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .cgl-feature-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(14,26,48,0.25); border-color: var(--cgl-teal); }
      .cgl-feature-icon { width: 36px; height: 36px; border-radius: 9px; background: var(--cgl-paper-2); color: var(--cgl-teal-deep); display: flex; align-items: center; justify-content: center; margin-bottom: 12px; }
      .cgl-feature-card h3 { font-size: 15px; margin: 0 0 6px; }
      .cgl-feature-card p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0 0 10px; }
      .cgl-feature-more { display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 600; color: var(--cgl-navy); }

      /* AI section */
      .cgl-ai { background: var(--cgl-navy); color: var(--cgl-paper); border-radius: 28px; max-width: 1180px; margin: 24px auto; }
      .cgl-section-head--light h2 { color: #fff; }
      .cgl-eyebrow--light { color: var(--cgl-teal); }
      .cgl-section-copy--light { color: rgba(247,249,250,0.72); }
      .cgl-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin: 8px 0 28px; }
      .cgl-flow-step { display: flex; align-items: center; gap: 8px; background: rgba(247,249,250,0.06); border: 1px solid rgba(247,249,250,0.14); border-radius: 999px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; opacity: 0; transform: translateY(6px); animation: cgl-card-in 0.5s ease forwards; animation-delay: var(--d, 0ms); }
      .is-visible .cgl-flow-step { animation-play-state: running; }
      .cgl-flow-num { color: var(--cgl-teal); font-size: 11px; }
      .cgl-flow-arrow { opacity: 0.4; }
      .cgl-flow-caption { font-size: 12.5px; color: var(--cgl-teal); font-weight: 600; margin: -8px 0 28px; }
      .cgl-ai-capabilities { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
      @media (max-width: 860px) { .cgl-ai-capabilities { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-ai-capabilities { grid-template-columns: 1fr; } }
      .cgl-ai-capability { background: rgba(247,249,250,0.05); border: 1px solid rgba(247,249,250,0.12); border-radius: 12px; padding: 16px; }
      .cgl-ai-capability h4 { font-size: 13.5px; margin: 0 0 6px; color: #fff; }
      .cgl-ai-capability p { font-size: 12px; line-height: 1.6; color: rgba(247,249,250,0.68); margin: 0; }

      .cgl-demo { background: rgba(247,249,250,0.04); border: 1px solid rgba(247,249,250,0.12); border-radius: 14px; padding: 18px; }
      .cgl-demo-head { display: flex; align-items: center; gap: 8px; font-size: 12.5px; font-weight: 600; color: var(--cgl-teal); margin-bottom: 14px; }
      .cgl-demo-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--cgl-teal); animation: cgl-pulse-teal 1.8s ease-in-out infinite; }
      @keyframes cgl-pulse-teal { 0%,100% { box-shadow: 0 0 0 0 rgba(86,145,146,0.5); } 50% { box-shadow: 0 0 0 6px rgba(86,145,146,0); } }
      .cgl-demo-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
      @media (max-width: 560px) { .cgl-demo-stats { grid-template-columns: 1fr 1fr; } }
      .cgl-demo-stats > div { display: flex; flex-direction: column; gap: 2px; }
      .cgl-demo-stats strong { font-size: 20px; }
      .cgl-demo-stats span { font-size: 11px; color: rgba(247,249,250,0.6); text-transform: uppercase; letter-spacing: 0.05em; }
      .cgl-ok { color: #6FCF97; }
      .cgl-warn { color: var(--cgl-amber); }
      .cgl-risk { color: #E77C6C; }
      .cgl-demo-alert { background: rgba(247,249,250,0.06); border: 1px solid rgba(247,249,250,0.14); border-radius: 12px; padding: 14px 16px; }
      .cgl-demo-alert-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
      .cgl-badge { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; padding: 3px 8px; border-radius: 999px; }
      .cgl-badge-warn { background: rgba(185,131,46,0.2); color: #E3B168; }
      .cgl-demo-alert p { font-size: 12.5px; line-height: 1.6; color: rgba(247,249,250,0.75); margin: 0 0 12px; }
      .cgl-demo-actions { display: flex; gap: 8px; }
      .cgl-demo-alert--done { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: rgba(247,249,250,0.65); }

      /* How it works */
      .cgl-how-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      @media (max-width: 860px) { .cgl-how-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-how-grid { grid-template-columns: 1fr; } }
      .cgl-how-step { border-left: 2px solid var(--cgl-line); padding-left: 16px; }
      .cgl-how-num { display: block; font-size: 12px; color: var(--cgl-teal-deep); font-weight: 700; margin-bottom: 6px; }
      .cgl-how-step h3 { font-size: 15px; margin: 0 0 6px; }
      .cgl-how-step p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }

      /* Compare */
      .cgl-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 720px) { .cgl-compare-grid { grid-template-columns: 1fr; } }
      .cgl-compare-col { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 22px; }
      .cgl-compare-col h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; margin: 0 0 14px; }
      .cgl-compare-col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      .cgl-compare-col li { font-size: 13.5px; color: #4B5D6E; padding-left: 16px; position: relative; }
      .cgl-compare-col li::before { content: "–"; position: absolute; left: 0; color: #B0BAC2; }
      .cgl-compare-col--accent { background: var(--cgl-navy); border-color: var(--cgl-navy); }
      .cgl-compare-col--accent h3 { color: var(--cgl-teal); }
      .cgl-compare-col--accent li { color: #fff; padding-left: 22px; }
      .cgl-compare-col--accent li::before { content: none; }
      .cgl-compare-col--accent li svg { color: var(--cgl-teal); position: absolute; left: 0; top: 2px; }

      /* Security */
      .cgl-security-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
      @media (max-width: 720px) { .cgl-security-grid { grid-template-columns: 1fr; } }
      .cgl-security-item { display: flex; gap: 12px; background: #fff; border: 1px solid var(--cgl-line); border-radius: 12px; padding: 16px; }
      .cgl-security-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--cgl-paper-2); color: var(--cgl-navy); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cgl-security-item h4 { font-size: 13.5px; margin: 0 0 4px; }
      .cgl-security-item p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }

      /* Final CTA */
      .cgl-final { text-align: center; background: linear-gradient(135deg, var(--cgl-navy) 0%, var(--cgl-navy-2) 100%); border-radius: 28px; padding: 72px 24px; color: #fff; }
      .cgl-final h2 { font-size: clamp(24px, 3.4vw, 34px); margin: 0 0 12px; }
      .cgl-final p { max-width: 480px; margin: 0 auto 26px; color: rgba(247,249,250,0.75); font-size: 15px; line-height: 1.7; }
      .cgl-final-cta { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }

      /* Footer */
      .cgl-footer { border-top: 1px solid var(--cgl-line); padding: 40px 24px; }
      .cgl-footer-inner { max-width: 1180px; margin: 0 auto; }
      .cgl-footer-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .cgl-footer-copy { font-size: 13px; color: #4B5D6E; margin: 0 0 6px; }
      .cgl-footer-fine { font-size: 11.5px; color: #94A3B0; margin: 0; }

      @media (prefers-reduced-motion: reduce) {
        .cgl-root * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
      }
    `}</style>
  );
}
