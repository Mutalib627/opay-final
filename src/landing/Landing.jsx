import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  ShieldCheck,
  Users,
  Wallet,
  Landmark,
  ListChecks,
  MessageSquareText,
  Link2,
  Eye,
  Brain,
  ArrowUpRight,
  ArrowRight,
  Bell,
  CheckCircle2,
  XCircle,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  FileClock,
  Fingerprint,
  Mic,
  Globe2,
  Vote,
  Gauge,
  PiggyBank,
  CalendarClock,
  Target,
  TrendingUp,
  Award,
  Twitter,
  Instagram,
  Linkedin,
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

// Auto-advances through a set of N items every `intervalMs`, pausable on hover,
// with manual prev/next control. Used by the team presentation.
function useAutoRotate(count, intervalMs = 6000) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (count <= 1 || paused) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => clearInterval(id);
  }, [count, intervalMs, paused]);

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  return { index, setIndex, next, prev, paused, setPaused };
}

/* ------------------------------------------------------------------ */
/*  Content — kept separate from markup so copy can be edited freely  */
/* ------------------------------------------------------------------ */

const TYPED_PHRASES = [
  "Smarter Cooperative Operations.",
  "Simpler Member Experiences.",
  "AI-Powered Cooperative Management.",
  "Transparent. Intelligent. Inclusive.",
];

const PROBLEMS = [
  { icon: FileClock, title: "Too much paperwork", copy: "Paper and scattered spreadsheets make information easy to lose and hard to check." },
  { icon: Eye, title: "Inaccurate, scattered records", copy: "Members often can't see an accurate, up-to-date picture of their own savings." },
  { icon: ListChecks, title: "Slow loan processing", copy: "Treasurers and secretaries lose hours to repetitive tasks that software can handle." },
  { icon: Users, title: "Difficult member communication", copy: "Meetings and paperwork cost members time, transport, and sometimes personal safety." },
  { icon: Link2, title: "Financial risks and fraud", copy: "Finance and governance run in separate systems, so nothing is checked automatically." },
];

const ECOSYSTEM_NODES = [
  "Members", "Contributions", "Savings", "Loans", "Credit Scoring",
  "Repayments", "Governance", "Reports", "Insights",
];

const DIFFERENTIATORS = [
  { icon: Brain, title: "AI-Powered Operations", copy: "AI helps automate repetitive cooperative tasks and surfaces useful operational insights." },
  { icon: Gauge, title: "Intelligent Credit Scoring", copy: "Evaluates members using their financial and contribution data before loan decisions." },
  { icon: Globe2, title: "Inclusive Access", copy: "Simple interfaces, voice and local-language support for members with limited digital literacy." },
  { icon: ShieldCheck, title: "Fraud & Risk Monitoring", copy: "Helps administrators spot unusual activity and potential risks early." },
  { icon: Vote, title: "Digital Governance", copy: "Transparent voting, communication, meetings and cooperative decision-making." },
];

const HOW_IT_WORKS = [
  { n: "01", title: "Create your cooperative", copy: "Set up your cooperative on Coop Guard in minutes." },
  { n: "02", title: "Add and manage members", copy: "Bring your members onto the platform and keep their records organized." },
  { n: "03", title: "Manage savings, contributions and loans", copy: "Run day-to-day operations from one connected dashboard." },
  { n: "04", title: "Monitor performance and decide", copy: "Track cooperative health and make better, informed decisions." },
];

const FEATURES = [
  { icon: Users, title: "Manage Members", copy: "Keep member information organized, accurate and easy to find." },
  { icon: Wallet, title: "Manage Savings", copy: "Track every member's contributions and balances easily, as they happen." },
  { icon: Landmark, title: "Manage Loans", copy: "Handle applications, approvals and repayments in one place, from request to payoff." },
  { icon: MessageSquareText, title: "Keep Everyone Connected", copy: "Give members simple access to their cooperative services and information." },
];

// Cooperative Credit Scoring — conceptual example data (demonstration only).
const CREDIT_SCORE_FACTORS = [
  { label: "Contribution consistency", value: "Excellent", tone: "ok" },
  { label: "Repayment history", value: "Good", tone: "ok" },
  { label: "Loan obligations", value: "Low", tone: "ok" },
  { label: "Financial participation", value: "Strong", tone: "ok" },
];

const CREDIT_FLOW = ["Member Activity", "Financial Records", "Credit Profile", "Better Lending Decisions"];

const CREDIT_STATS = [
  { icon: TrendingUp, label: "Repayment", value: "96% On Time" },
  { icon: ShieldCheck, label: "Risk Level", value: "Low" },
  { icon: Wallet, label: "Contribution", value: "Consistent" },
];

const AI_FLOW = ["Monitor", "Analyze", "Identify", "Recommend", "Human Approval", "Execute", "Audit"];

const AI_EXAMPLE_QUERIES = [
  "How much have I saved?",
  "Can I apply for a ₦200,000 loan?",
  "Show me members with overdue loans.",
  "Why was my loan application flagged?",
  "Send a reminder to these members.",
];

const AI_CAPABILITIES = [
  { title: "Loan Operations", copy: "Reviews authorized loan information and prepares a recommendation for the loan officer." },
  { title: "Transaction Monitoring", copy: "Watches for unusual transaction patterns and raises an alert when one appears." },
  { title: "Repayment Monitoring", copy: "Tracks repayment schedules and handles the routine reminders automatically." },
  { title: "Administrative Automation", copy: "Drafts reports, summaries and notifications so staff aren't starting from a blank page." },
];

const HUMAN_CONTROL_FLOW = [
  { icon: Brain, label: "AI Recommendation" },
  { icon: Eye, label: "Administrator Review" },
  { icon: ListChecks, label: "Approve / Reject / Request Info" },
  { icon: CheckCircle2, label: "Final Action" },
  { icon: FileClock, label: "Audit Trail" },
];

const MEMBER_CARDS = [
  { icon: PiggyBank, label: "My Savings", value: "₦125,000", sub: "Updated in real time" },
  { icon: Landmark, label: "My Loan", value: "₦40,000 remaining", sub: "On schedule" },
  { icon: CheckCircle2, label: "Contribution", value: "Paid", sub: "This month", tone: "ok" },
  { icon: CalendarClock, label: "Next Repayment", value: "5 September", sub: "Reminder set" },
];

const VOICE_MODES = [
  { icon: Mic, label: "Voice" },
  { icon: Eye, label: "Simple Visuals" },
  { icon: Globe2, label: "Local Language" },
];

const ABOUT_MISSION = "Coop Guard is built by a small, multidisciplinary team combining product research, software engineering, design and financial-inclusion thinking. We're united by one goal: making cooperative societies more transparent, efficient, secure and accessible for every member — from committee administrators to first-time savers.";

const ABOUT_STATS = [
  { icon: Users, value: 5, suffix: "", label: "Founding team members" },
  { icon: Target, value: 1, suffix: "", label: "Shared product vision" },
  { icon: Award, value: 100, suffix: "%", label: "Human-controlled decisions" },
];

// Real team information — photos live in /public/team, referenced by path.
const TEAM_MEMBERS = [
  {
    name: "Alli-Akinde Olashubomi Abdul Rahman",
    role: "Co-Founder & CEO",
    bio: "Focused on using technology and AI to make cooperative societies more transparent, efficient, secure and accessible. His vision is an intelligent cooperative ecosystem — smarter loan assessment, credit scoring and risk monitoring — that keeps people at the center of important decisions.",
    photoUrl: "", // no photo available yet — renders as an icon placeholder
  },
  {
    name: "Salisu Abdulmutalib",
    role: "Co-Founder & CTO / Software Developer",
    bio: "Leads Coop Guard's technical direction, product architecture and AI integration — turning the platform's vision into a scalable, intelligent and user-centered product that makes financial services more accessible to underserved members.",
    photoUrl: "/team/salisu.jpg",
  },
  {
    name: "Adedeji Kafilat Omotunrayo",
    role: "Co-Founder & Product & Research Officer",
    bio: "Focuses on understanding real user needs and translating research and identified challenges into practical product opportunities — shaping features, documentation and user-centered design.",
    photoUrl: "/team/kafilat.jpg",
  },
  {
    name: "Amos Precious Ayomide",
    role: "Co-Founder & Chief Technical Design Officer",
    bio: "Focuses on ensuring complex technology is delivered through intuitive, secure and user-centered digital experiences — translating system architecture and workflows into simple, usable interfaces.",
    photoUrl: "/team/precious.jpg",
  },
  {
    name: "Nosirudeen Mariam Titilope",
    role: "Co-Founder & Business, Marketing & Operations Officer",
    bio: "Connects Coop Guard's product strategy with real market needs, user adoption and sustainable operations — with a focus on market women, petty traders, artisans and members with limited digital literacy.",
    photoUrl: "/team/maryam.jpg",
  },
];

const COMPARE = {
  before: ["Manual monitoring", "Information overload", "Member dependency", "Delayed action"],
  after: ["AI monitoring", "Important issues surfaced", "Simple member access", "Human-controlled decisions", "Transparent records"],
};

const SECURITY_POINTS = [
  { icon: Fingerprint, title: "Role-based access", copy: "Members, loan officers and administrators each see only what their role permits." },
  { icon: ShieldCheck, title: "Secure records", copy: "Cooperative data is stored and handled with dedicated safeguards, not open spreadsheets." },
  { icon: FileClock, title: "Full traceability", copy: "Financial activity can always be traced back to when and how it happened." },
  { icon: Eye, title: "Nothing hidden", copy: "Every automated action Coop Guard takes is logged and reviewable." },
];

const BUSINESS_MODEL_TIERS = ["Cooperative A", "Cooperative B", "Cooperative C"];

const FOOTER_COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Features", href: "#solution" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "AI Assistant", href: "#ai" },
      { label: "Credit Scoring", href: "#credit-scoring" },
      { label: "Cooperative Management", href: "#members" },
      { label: "Security", href: "#trust" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About Us", href: "#team" },
      { label: "Our Team", href: "#team" },
      { label: "Resources", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Privacy Policy", href: "#" },
      { label: "Terms of Service", href: "#" },
      { label: "Cookie Policy", href: "#" },
      { label: "Security & Compliance", href: "#" },
      { label: "Delete Account", href: "#" },
    ],
  },
];

const FOOTER_SOCIAL = [
  { icon: Twitter, label: "X", href: "#" },
  { icon: Instagram, label: "Instagram", href: "#" },
  { icon: Linkedin, label: "LinkedIn", href: "#" },
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
    { href: "#solution", label: "Product" },
    { href: "#different", label: "Why Coop Guard" },
    { href: "#ai", label: "AI Assistant" },
    { href: "#members", label: "For Members" },
    { href: "#team", label: "About" },
  ];

  return (
    <header className={`cgl-nav ${scrolled ? "is-scrolled" : ""}`}>
      <div className="cgl-nav-inner">
        <a href="#home" className="cgl-brand" onClick={() => setOpen(false)}>
          <img
            src="/brand/coopguard-logo.png"
            alt="CoopGuard"
            className="cgl-brand-logo"
          />
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
            Explore Coop Guard
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
            <button className="cgl-btn cgl-btn-primary" onClick={() => onNavigate("/app")}>Explore Coop Guard</button>
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
        <p className="cgl-eyebrow">For cooperative societies</p>
        <h1>
          Manage Your Cooperative.
          <br />
          Smarter.
        </h1>
        <p className="cgl-hero-typed">
          <span className="cgl-mono">{typed}</span>
          <span className="cgl-caret" aria-hidden="true" />
        </p>
        <p className="cgl-hero-sub">
          Coop Guard helps cooperative societies manage members, savings, loans and
          everyday operations — with an AI assistant that helps people get things
          done faster.
        </p>
        <div className="cgl-hero-cta">
          <button className="cgl-btn cgl-btn-primary cgl-btn-lg" onClick={() => onNavigate("/app")}>
            Get Started <ChevronRight size={16} />
          </button>
          <a className="cgl-btn cgl-btn-ghost cgl-btn-lg" href="#solution">
            Explore CoopGuard
          </a>
        </div>
        <div className="cgl-hero-loop" aria-hidden="true">
          <span>Manage</span>
          <ArrowRight size={13} />
          <span>Understand</span>
          <ArrowRight size={13} />
          <span>Act</span>
        </div>
      </div>
      <div className="cgl-hero-visual">
        <LedgerPreview />
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
        <h2>Running a Cooperative Shouldn't Be This Difficult.</h2>
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

function Opportunity({ onNavigate }) {
  return (
    <RevealSection id="members" className="cgl-opportunity">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Built for leaders &amp; members</p>
        <h2>Less work for leaders. Less stress for members.</h2>
        <p className="cgl-section-copy">
          AI handles the routine watching and checking. People stay informed and in
          control — whether they're running the cooperative or simply saving with it.
        </p>
      </div>
      <div className="cgl-opportunity-grid">
        <a href="#ai" className="cgl-opportunity-card">
          <span className="cgl-opportunity-tag">For cooperative leaders</span>
          <h3>Less Work. Better Control.</h3>
          <p>Routine monitoring is handled automatically, so administrators can focus
            on the decisions that actually need a human.</p>
          <span className="cgl-feature-more">See how <ArrowUpRight size={14} /></span>
        </a>
        <div className="cgl-opportunity-card cgl-opportunity-card--accent">
          <span className="cgl-opportunity-tag">For members</span>
          <h3>Everything You Need, Without the Stress.</h3>
          <p>Check your savings, view your loans, track repayments, and get help — all
            without needing advanced digital skills or depending on another person.</p>
        </div>
      </div>
      <div className="cgl-member-grid">
        {MEMBER_CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <div className="cgl-member-card" key={c.label}>
              <span className="cgl-member-icon"><Icon size={18} strokeWidth={2.2} /></span>
              <span className="cgl-member-label">{c.label}</span>
              <span className={`cgl-member-value cgl-mono ${c.tone === "ok" ? "cgl-ok" : ""}`}>{c.value}</span>
              <span className="cgl-member-sub">{c.sub}</span>
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
        <p className="cgl-eyebrow">Meet Coop Guard</p>
        <h2>One platform for the entire cooperative.</h2>
        <p className="cgl-section-copy">
          Coop Guard brings together everything that used to live across notebooks, phone
          calls and separate spreadsheets — members, savings, loans and governance — in one
          place everyone can trust.
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

      <div className="cgl-features-grid">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div className="cgl-feature-card" key={f.title}>
              <span className="cgl-feature-icon"><Icon size={20} strokeWidth={2.2} /></span>
              <h3>{f.title}</h3>
              <p>{f.copy}</p>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function Differentiators() {
  return (
    <RevealSection id="different" className="cgl-features">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Why Coop Guard</p>
        <h2>What Makes Coop Guard Different?</h2>
      </div>
      <div className="cgl-features-grid">
        {DIFFERENTIATORS.map((d) => {
          const Icon = d.icon;
          return (
            <div className="cgl-feature-card" key={d.title}>
              <span className="cgl-feature-icon"><Icon size={20} strokeWidth={2.2} /></span>
              <h3>{d.title}</h3>
              <p>{d.copy}</p>
            </div>
          );
        })}
      </div>
    </RevealSection>
  );
}

function HowItWorks() {
  return (
    <RevealSection id="how-it-works" className="cgl-how">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">How it works</p>
        <h2>From sign-up to better decisions.</h2>
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

function AIAgent() {
  return (
    <RevealSection id="ai" className="cgl-ai">
      <div className="cgl-section-head cgl-section-head--light">
        <p className="cgl-eyebrow cgl-eyebrow--light">The AI assistant</p>
        <h2>Just Ask Coop Guard.</h2>
        <p className="cgl-section-copy cgl-section-copy--light">
          Instead of digging through menus and spreadsheets, members and administrators
          can simply ask. Coop Guard understands the request, finds the answer, and helps
          get things done — while people stay in control of anything important.
        </p>
      </div>

      <div className="cgl-voice-modes" style={{ justifyContent: "center", marginBottom: "1.5rem" }}>
        {AI_EXAMPLE_QUERIES.map((q) => (
          <span key={q} className="cgl-voice-mode" style={{ cursor: "default" }}>
            "{q}"
          </span>
        ))}
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
      <p className="cgl-flow-caption">AI assists. Humans decide.</p>

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

function CreditScoreMeter({ score = 82, visible }) {
  const animated = useCountUp(score, visible, 1300);
  const pct = Math.min(100, Math.max(0, animated));
  return (
    <div className="cgl-credit-meter" role="img" aria-label={`Member credit score ${score} out of 100`}>
      <svg viewBox="0 0 200 110" className="cgl-credit-meter-svg">
        <path d="M14 100 A86 86 0 0 1 186 100" className="cgl-credit-meter-track" />
        <path
          d="M14 100 A86 86 0 0 1 186 100"
          className="cgl-credit-meter-fill"
          style={{ strokeDashoffset: 270 - (270 * pct) / 100 }}
        />
      </svg>
      <div className="cgl-credit-meter-readout">
        <span className="cgl-mono cgl-credit-meter-num">{animated}</span>
        <span className="cgl-credit-meter-den">/ 100</span>
      </div>
    </div>
  );
}

function CreditScoreSection() {
  const [ref, visible] = useReveal();
  return (
    <RevealSection id="credit-scoring" className="cgl-credit">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Real AI loan example</p>
        <h2>Ask Coop Guard instead of searching through menus.</h2>
        <p className="cgl-section-copy">
          Coop Guard checks a member's savings and repayment history, then gives
          administrators a clear recommendation — not a decision. Here's what that
          looks like in practice.
        </p>
      </div>

      <div className="cgl-voice-demo" style={{ marginBottom: "1.5rem" }}>
        <div className="cgl-voice-bubble cgl-voice-bubble--member">
          <span className="cgl-voice-tag">Member</span>
          <p>"How much have I saved?"</p>
        </div>
        <div className="cgl-voice-bubble cgl-voice-bubble--agent">
          <span className="cgl-voice-tag">Coop Guard</span>
          <p>"You have saved ₦85,000."</p>
        </div>
        <div className="cgl-voice-bubble cgl-voice-bubble--member">
          <span className="cgl-voice-tag">Member</span>
          <p>"Can I apply for a ₦200,000 loan?"</p>
        </div>
      </div>

      <div className="cgl-credit-flow">
        {CREDIT_FLOW.map((step, i) => (
          <React.Fragment key={step}>
            <div className="cgl-credit-flow-step" style={{ "--d": `${i * 100}ms` }}>{step}</div>
            {i < CREDIT_FLOW.length - 1 && <span className="cgl-flow-arrow" aria-hidden="true">→</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="cgl-credit-panel" ref={ref}>
        <div className="cgl-credit-card">
          <div className="cgl-credit-card-head">
            <span className="cgl-badge cgl-badge-ok">Demonstration data</span>
            <span className="cgl-credit-card-title">Member Credit Score</span>
          </div>
          <div className="cgl-credit-card-body">
            <CreditScoreMeter score={82} visible={visible} />
            <ul className="cgl-credit-breakdown">
              {CREDIT_SCORE_FACTORS.map((f) => (
                <li key={f.label}>
                  <span>{f.label}</span>
                  <span className={`cgl-credit-tag ${f.tone === "ok" ? "cgl-ok" : ""}`}>{f.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="cgl-credit-stats">
          {CREDIT_STATS.map((s) => {
            const Icon = s.icon;
            return (
              <div className="cgl-credit-stat" key={s.label}>
                <span className="cgl-credit-stat-icon"><Icon size={17} strokeWidth={2.2} /></span>
                <div>
                  <span className="cgl-member-label">{s.label}</span>
                  <span className="cgl-member-value cgl-mono">{s.value}</span>
                </div>
              </div>
            );
          })}
          <p className="cgl-credit-note">
            Coop Guard recommends. The loan officer decides.
          </p>
        </div>
      </div>
    </RevealSection>
  );
}

function HumanControlled() {
  return (
    <RevealSection id="trust" className="cgl-human">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Built for modern cooperative societies</p>
        <h2>AI Helps. People Stay in Control.</h2>
        <p className="cgl-section-copy">
          Every AI recommendation passes through an authorized administrator before
          anything happens. Sensitive financial decisions always stay with a person —
          every action is logged and can be reviewed. Security, transparency and
          accountability are built into how Coop Guard works.
        </p>
      </div>
      <div className="cgl-human-flow">
        {HUMAN_CONTROL_FLOW.map((step, i) => {
          const Icon = step.icon;
          return (
            <React.Fragment key={step.label}>
              <div className="cgl-human-step" style={{ "--d": `${i * 100}ms` }}>
                <span className="cgl-human-step-icon"><Icon size={18} strokeWidth={2.2} /></span>
                <span>{step.label}</span>
              </div>
              {i < HUMAN_CONTROL_FLOW.length - 1 && (
                <span className="cgl-flow-arrow" aria-hidden="true">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <div className="cgl-security-grid" style={{ marginTop: "2rem" }}>
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

function VoiceInteraction() {
  const [active, setActive] = useState(0);
  return (
    <RevealSection className="cgl-voice">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">Built for everyone</p>
        <h2>Technology Shouldn't Be a Barrier.</h2>
        <p className="cgl-section-copy">
          Coop Guard is designed for people with different levels of digital experience —
          simple language, easy navigation, and conversational interaction, so no member
          is left behind.
        </p>
      </div>
      <div className="cgl-voice-demo">
        <div className="cgl-voice-bubble cgl-voice-bubble--member">
          <span className="cgl-voice-tag">Member</span>
          <p>"Ina son sanin ko zan iya karbar bashi." (Hausa)</p>
        </div>
        <div className="cgl-voice-bubble cgl-voice-bubble--agent">
          <span className="cgl-voice-tag">Coop Guard</span>
          <p>"Yes — based on your savings history, you can apply for a loan. Want me to start it?"</p>
        </div>
        <div className="cgl-voice-modes">
          {VOICE_MODES.map((m, i) => {
            const Icon = m.icon;
            return (
              <button
                key={m.label}
                className={`cgl-voice-mode ${active === i ? "is-active" : ""}`}
                onClick={() => setActive(i)}
                type="button"
              >
                <Icon size={16} strokeWidth={2.2} /> {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </RevealSection>
  );
}

function AboutStat({ stat, visible, delay }) {
  const Icon = stat.icon;
  const animated = useCountUp(stat.value, visible, 1100);
  return (
    <div className="cgl-about-stat" style={{ "--d": `${delay}ms` }}>
      <span className="cgl-about-stat-icon"><Icon size={18} strokeWidth={2.2} /></span>
      <span className="cgl-about-stat-value cgl-mono">{animated}{stat.suffix}</span>
      <span className="cgl-about-stat-label">{stat.label}</span>
    </div>
  );
}

function TeamSection() {
  const count = TEAM_MEMBERS.length;
  const { index, setIndex, next, prev, setPaused } = useAutoRotate(count, 6000);
  const [statsRef, statsVisible] = useReveal();

  return (
    <RevealSection id="team" className="cgl-team">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">About us</p>
        <h2>The people building Coop Guard</h2>
        <p className="cgl-section-copy">{ABOUT_MISSION}</p>
      </div>

      <div className={`cgl-about-stats ${statsVisible ? "is-visible" : ""}`} ref={statsRef}>
        {ABOUT_STATS.map((s, i) => (
          <AboutStat stat={s} visible={statsVisible} delay={i * 110} key={s.label} />
        ))}
      </div>

      {count === 0 ? (
        <div className="cgl-team-pending">
          <Users size={22} strokeWidth={1.8} />
          <p>Team introductions are coming soon.</p>
        </div>
      ) : (
        <div
          className="cgl-team-carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <button className="cgl-team-nav" onClick={prev} aria-label="Previous team member" type="button">
            <ChevronLeft size={18} />
          </button>

          <div className="cgl-team-card" key={index}>
            <div className="cgl-team-photo-ring">
              <div className="cgl-team-photo">
                {TEAM_MEMBERS[index].photoUrl ? (
                  <img src={TEAM_MEMBERS[index].photoUrl} alt={TEAM_MEMBERS[index].name} />
                ) : (
                  <Users size={28} strokeWidth={1.8} />
                )}
              </div>
            </div>
            <h3>{TEAM_MEMBERS[index].name}</h3>
            <p className="cgl-team-role">{TEAM_MEMBERS[index].role}</p>
            {TEAM_MEMBERS[index].bio && <p className="cgl-team-bio">{TEAM_MEMBERS[index].bio}</p>}
            <div className="cgl-team-progress-track">
              <div className="cgl-team-progress-fill" />
            </div>
          </div>

          <button className="cgl-team-nav" onClick={next} aria-label="Next team member" type="button">
            <ChevronRight size={18} />
          </button>

          <div className="cgl-team-dots">
            {TEAM_MEMBERS.map((m, i) => (
              <button
                key={m.name}
                className={`cgl-team-dot ${i === index ? "is-active" : ""}`}
                onClick={() => setIndex(i)}
                aria-label={`Show ${m.name}`}
                type="button"
              />
            ))}
          </div>
        </div>
      )}
    </RevealSection>
  );
}

function Compare() {
  return (
    <RevealSection className="cgl-compare">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">More Than Digital Records</p>
        <h2>We don't just help cooperatives store information. We help them use it.</h2>
      </div>
      <div className="cgl-compare-grid">
        <div className="cgl-compare-col">
          <h3>Traditional cooperative management</h3>
          <ul className="cgl-compare-chain">
            {COMPARE.before.map((c, i) => (
              <li key={c}>
                {c}
                {i < COMPARE.before.length - 1 && <span className="cgl-compare-chain-arrow">↓</span>}
              </li>
            ))}
          </ul>
        </div>
        <div className="cgl-compare-col cgl-compare-col--accent">
          <h3>Coop Guard</h3>
          <ul className="cgl-compare-chain">
            {COMPARE.after.map((c, i) => (
              <li key={c}>
                <CheckCircle2 size={15} /> {c}
                {i < COMPARE.after.length - 1 && <span className="cgl-compare-chain-arrow cgl-compare-chain-arrow--accent">↓</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </RevealSection>
  );
}


function BusinessModel() {
  return (
    <RevealSection className="cgl-opportunity">
      <div className="cgl-section-head">
        <p className="cgl-eyebrow">How Coop Guard works</p>
        <h2>Built for Cooperatives.</h2>
        <p className="cgl-section-copy">
          Coop Guard is the technology provider. Existing cooperative societies
          subscribe to the platform and use it to manage their operations and members —
          Coop Guard itself is not a cooperative society.
        </p>
      </div>
      <div className="cgl-human-flow" style={{ flexDirection: "column", gap: "0.75rem" }}>
        <div className="cgl-human-step">
          <span className="cgl-human-step-icon"><ShieldCheck size={18} strokeWidth={2.2} /></span>
          <span>Coop Guard (the platform)</span>
        </div>
        <span className="cgl-flow-arrow" aria-hidden="true">↓</span>
        <div className="cgl-human-flow" style={{ flexWrap: "wrap", justifyContent: "center" }}>
          {BUSINESS_MODEL_TIERS.map((t, i) => (
            <React.Fragment key={t}>
              <div className="cgl-human-step">
                <span className="cgl-human-step-icon"><Landmark size={18} strokeWidth={2.2} /></span>
                <span>{t}</span>
              </div>
              {i < BUSINESS_MODEL_TIERS.length - 1 && <span className="cgl-flow-arrow" aria-hidden="true"> </span>}
            </React.Fragment>
          ))}
        </div>
        <span className="cgl-flow-arrow" aria-hidden="true">↓</span>
        <div className="cgl-human-step">
          <span className="cgl-human-step-icon"><Users size={18} strokeWidth={2.2} /></span>
          <span>Their members</span>
        </div>
      </div>
    </RevealSection>
  );
}

function FinalCTA({ onNavigate }) {
  return (
    <RevealSection className="cgl-final">
      <h2>Making Cooperative Services Easier for Everyone.</h2>
      <p>
        A future where joining, managing and participating in a cooperative is as
        simple as using your phone — starting in Nigeria, with room to grow across Africa.
      </p>
      <div className="cgl-final-cta">
        <button className="cgl-btn cgl-btn-primary cgl-btn-lg" onClick={() => onNavigate("/app")}>
          Get Started <ChevronRight size={16} />
        </button>
        <a className="cgl-btn cgl-btn-outline cgl-btn-lg" href="#solution">
          Explore CoopGuard
        </a>
      </div>
    </RevealSection>
  );
}

function Footer() {
  return (
    <footer className="cgl-footer">
      <div className="cgl-footer-inner">
        <div className="cgl-footer-top">
          <div className="cgl-footer-brand-col">
            <div className="cgl-footer-brand">
              <img src="/brand/coopguard-mark.png" alt="CoopGuard" className="cgl-footer-mark" />
              <span className="cgl-brand-name">Coop Guard</span>
            </div>
            <p className="cgl-footer-copy">
              Digital cooperative management with intelligent, human-controlled automation.
            </p>
            <div className="cgl-footer-social">
              {FOOTER_SOCIAL.map((s) => {
                const Icon = s.icon;
                return (
                  <a key={s.label} href={s.href} aria-label={s.label} className="cgl-footer-social-link">
                    <Icon size={16} strokeWidth={2} />
                  </a>
                );
              })}
            </div>
          </div>

          {FOOTER_COLUMNS.map((col) => (
            <div className="cgl-footer-col" key={col.heading}>
              <span className="cgl-footer-col-heading">{col.heading}</span>
              <ul>
                {col.links.map((l) => (
                  <li key={l.label}><a href={l.href}>{l.label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="cgl-footer-bottom">
          <p className="cgl-footer-fine cgl-footer-fine--muted">
            Simulation prototype. Figures and AI alerts shown across this site are demonstration data.
          </p>
          <p className="cgl-footer-fine">© {new Date().getFullYear()} Coop Guard. All rights reserved.</p>
          <p className="cgl-footer-fine">Built for modern cooperative societies.</p>
        </div>
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
      <Problem />
      <Solution />
      <Differentiators />
      <HowItWorks />
      <AIAgent />
      <CreditScoreSection />
      <Opportunity onNavigate={navigate} />
      <VoiceInteraction />
      <Compare />
      <HumanControlled />
      <BusinessModel />
      <TeamSection />
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
      .cgl-brand-logo { height: 26px; width: auto; display: block; }
      .cgl-footer-mark { height: 22px; width: auto; display: block; }
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
      .cgl-hero-loop { display: flex; align-items: center; gap: 8px; margin-top: 24px; font-size: 12px; font-weight: 600; color: var(--cgl-teal-deep); text-transform: uppercase; letter-spacing: 0.06em; }
      .cgl-hero-loop svg { opacity: 0.6; }

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

      /* Gaps */
      .cgl-gaps-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 720px) { .cgl-gaps-grid { grid-template-columns: 1fr; } }
      .cgl-gap-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 16px; padding: 24px; position: relative; }
      .cgl-gap-audience { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--cgl-teal-deep); }
      .cgl-gap-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--cgl-paper-2); color: var(--cgl-navy); display: flex; align-items: center; justify-content: center; margin: 12px 0 12px; }
      .cgl-gap-card h3 { font-size: 16px; margin: 0 0 8px; line-height: 1.35; }
      .cgl-gap-card p { font-size: 13px; line-height: 1.7; color: #4B5D6E; margin: 0; }

      /* Opportunity */
      .cgl-opportunity-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 720px) { .cgl-opportunity-grid { grid-template-columns: 1fr; } }
      .cgl-opportunity-card { display: block; background: #fff; border: 1px solid var(--cgl-line); border-radius: 16px; padding: 24px; text-decoration: none; color: inherit; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
      .cgl-opportunity-card:hover { transform: translateY(-3px); box-shadow: 0 16px 32px -18px rgba(14,26,48,0.25); border-color: var(--cgl-teal); }
      .cgl-opportunity-tag { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700; color: var(--cgl-teal-deep); }
      .cgl-opportunity-card h3 { font-size: 19px; margin: 8px 0 8px; color: var(--cgl-navy); }
      .cgl-opportunity-card p { font-size: 13px; line-height: 1.7; color: #4B5D6E; margin: 0 0 12px; }
      .cgl-opportunity-card--accent { background: var(--cgl-navy); border-color: var(--cgl-navy); }
      .cgl-opportunity-card--accent .cgl-opportunity-tag { color: var(--cgl-teal); }
      .cgl-opportunity-card--accent h3 { color: #fff; }
      .cgl-opportunity-card--accent p { color: rgba(247,249,250,0.72); }
      .cgl-opportunity-card--accent .cgl-feature-more { color: var(--cgl-teal); }

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

      /* Credit scoring */
      .cgl-credit-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: 32px; }
      .cgl-credit-flow-step { background: var(--cgl-paper-2); border: 1px solid var(--cgl-line); border-radius: 999px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: var(--cgl-ink); opacity: 0; transform: translateY(6px); animation: cgl-card-in 0.5s ease forwards; animation-delay: var(--d, 0ms); }
      .is-visible .cgl-credit-flow-step { animation-play-state: running; }
      .cgl-credit-panel { display: grid; grid-template-columns: minmax(0, 380px) 1fr; gap: 20px; align-items: stretch; }
      @media (max-width: 860px) { .cgl-credit-panel { grid-template-columns: 1fr; } }
      .cgl-credit-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 18px; padding: 24px; box-shadow: 0 20px 46px -26px rgba(14,26,48,0.25); }
      .cgl-credit-card-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 18px; }
      .cgl-credit-card-title { font-size: 12.5px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.05em; }
      .cgl-badge-ok { background: rgba(111,207,151,0.16); color: #2E7D52; }
      .cgl-credit-card-body { display: flex; flex-direction: column; align-items: center; gap: 18px; }
      .cgl-credit-meter { position: relative; width: 200px; }
      .cgl-credit-meter-svg { width: 100%; height: auto; display: block; }
      .cgl-credit-meter-track { fill: none; stroke: var(--cgl-paper-2); stroke-width: 14; stroke-linecap: round; }
      .cgl-credit-meter-fill { fill: none; stroke: var(--cgl-teal-deep); stroke-width: 14; stroke-linecap: round; stroke-dasharray: 270; transition: stroke-dashoffset 0.3s ease; }
      .cgl-credit-meter-readout { position: absolute; left: 50%; bottom: -4px; transform: translateX(-50%); display: flex; align-items: baseline; gap: 3px; }
      .cgl-credit-meter-num { font-size: 30px; font-weight: 700; color: var(--cgl-navy); }
      .cgl-credit-meter-den { font-size: 13px; color: #94A3B0; }
      .cgl-credit-breakdown { list-style: none; margin: 6px 0 0; padding: 0; width: 100%; display: flex; flex-direction: column; gap: 10px; }
      .cgl-credit-breakdown li { display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #4B5D6E; border-top: 1px dashed var(--cgl-line); padding-top: 10px; }
      .cgl-credit-breakdown li:first-child { border-top: none; padding-top: 0; }
      .cgl-credit-tag { font-weight: 700; }
      .cgl-credit-stats { display: flex; flex-direction: column; gap: 12px; }
      .cgl-credit-stat { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 16px 18px; }
      .cgl-credit-stat > div { display: flex; flex-direction: column; gap: 2px; }
      .cgl-credit-stat-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--cgl-paper-2); color: var(--cgl-teal-deep); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cgl-credit-note { font-size: 12.5px; line-height: 1.7; color: #64748B; background: var(--cgl-paper-2); border-radius: 14px; padding: 16px 18px; margin: 4px 0 0; }

      /* Exception dashboard */
      .cgl-exception-panel { background: #fff; border: 1px solid var(--cgl-line); border-radius: 18px; padding: 26px; display: grid; grid-template-columns: auto 1fr; gap: 28px; align-items: center; opacity: 0; transform: translateY(10px); transition: opacity 0.6s ease, transform 0.6s ease; }
      .cgl-exception-panel.is-visible { opacity: 1; transform: translateY(0); }
      @media (max-width: 640px) { .cgl-exception-panel { grid-template-columns: 1fr; text-align: center; } }
      .cgl-exception-total { display: flex; flex-direction: column; gap: 4px; padding-right: 28px; border-right: 1px solid var(--cgl-line); }
      @media (max-width: 640px) { .cgl-exception-total { border-right: none; border-bottom: 1px solid var(--cgl-line); padding: 0 0 18px; } }
      .cgl-exception-total .cgl-mono { font-size: 32px; font-weight: 700; color: var(--cgl-navy); }
      .cgl-exception-total span:last-child { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; }
      .cgl-exception-rows { display: flex; flex-direction: column; gap: 10px; grid-column: 2; }
      @media (max-width: 640px) { .cgl-exception-rows { grid-column: 1; } }
      .cgl-exception-row { display: flex; align-items: center; gap: 10px; font-size: 13.5px; }
      .cgl-exception-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
      .cgl-exception-dot--ok { background: #6FCF97; }
      .cgl-exception-dot--warn { background: var(--cgl-amber); }
      .cgl-exception-dot--risk { background: var(--cgl-red); }
      .cgl-exception-row-label { flex: 1; color: #4B5D6E; }
      .cgl-exception-row-value { font-weight: 700; }
      .cgl-exception-note { grid-column: 1 / -1; margin: 4px 0 0; font-size: 11.5px; color: #94A3B0; }

      /* Human-controlled AI / assisted independence flows */
      .cgl-human-flow, .cgl-assisted-flow { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
      .cgl-human-step { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid var(--cgl-line); border-radius: 999px; padding: 8px 14px; font-size: 12.5px; font-weight: 600; color: var(--cgl-ink); opacity: 0; transform: translateY(6px); animation: cgl-card-in 0.5s ease forwards; animation-delay: var(--d, 0ms); }
      .is-visible .cgl-human-step { animation-play-state: running; }
      .cgl-human-step-icon { width: 22px; height: 22px; border-radius: 6px; background: var(--cgl-paper-2); color: var(--cgl-navy); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

      /* Member experience */
      .cgl-member-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
      @media (max-width: 860px) { .cgl-member-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 480px) { .cgl-member-grid { grid-template-columns: 1fr; } }
      .cgl-member-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 18px; display: flex; flex-direction: column; gap: 4px; transition: transform 0.2s ease, box-shadow 0.2s ease; }
      .cgl-member-card:hover { transform: translateY(-3px); box-shadow: 0 14px 30px -18px rgba(14,26,48,0.22); }
      .cgl-member-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--cgl-paper-2); color: var(--cgl-teal-deep); display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
      .cgl-member-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 600; }
      .cgl-member-value { font-size: 18px; font-weight: 700; color: var(--cgl-navy); }
      .cgl-member-sub { font-size: 11.5px; color: #94A3B0; }

      /* Voice interaction */
      .cgl-voice-demo { background: #fff; border: 1px solid var(--cgl-line); border-radius: 18px; padding: 22px; max-width: 460px; }
      .cgl-voice-bubble { border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; }
      .cgl-voice-bubble p { margin: 4px 0 0; font-size: 13.5px; line-height: 1.5; }
      .cgl-voice-tag { font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 700; color: #64748B; }
      .cgl-voice-bubble--member { background: var(--cgl-paper-2); }
      .cgl-voice-bubble--agent { background: var(--cgl-navy); color: #fff; }
      .cgl-voice-bubble--agent .cgl-voice-tag { color: var(--cgl-teal); }
      .cgl-voice-modes { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
      .cgl-voice-mode { display: inline-flex; align-items: center; gap: 6px; background: var(--cgl-paper-2); border: 1px solid var(--cgl-line); border-radius: 999px; padding: 7px 13px; font-size: 12px; font-weight: 600; color: var(--cgl-ink); cursor: pointer; transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease; font-family: inherit; }
      .cgl-voice-mode.is-active { background: var(--cgl-navy); border-color: var(--cgl-navy); color: #fff; }

      /* Transparency receipt */
      .cgl-receipt-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 16px; padding: 22px; max-width: 380px; }
      .cgl-receipt-row { display: flex; align-items: center; justify-content: space-between; font-size: 14.5px; font-weight: 600; padding: 10px 0; }
      .cgl-receipt-row--sub { font-size: 12.5px; font-weight: 500; color: #64748B; border-top: 1px dashed var(--cgl-line); }

      /* How it works */
      .cgl-how-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
      @media (max-width: 860px) { .cgl-how-grid { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-how-grid { grid-template-columns: 1fr; } }
      .cgl-how-step { border-left: 2px solid var(--cgl-line); padding-left: 16px; }
      .cgl-how-num { display: block; font-size: 12px; color: var(--cgl-teal-deep); font-weight: 700; margin-bottom: 6px; }
      .cgl-how-step h3 { font-size: 15px; margin: 0 0 6px; }
      .cgl-how-step p { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }

      /* About / Team */
      .cgl-about-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin: 28px 0 44px; }
      @media (max-width: 640px) { .cgl-about-stats { grid-template-columns: 1fr; } }
      .cgl-about-stat { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 18px 20px; display: flex; flex-direction: column; gap: 4px; opacity: 0; transform: translateY(8px); animation: cgl-card-in 0.5s ease forwards; animation-delay: var(--d, 0ms); }
      .is-visible .cgl-about-stat { animation-play-state: running; }
      .cgl-about-stat-icon { width: 30px; height: 30px; border-radius: 8px; background: var(--cgl-paper-2); color: var(--cgl-teal-deep); display: flex; align-items: center; justify-content: center; margin-bottom: 4px; }
      .cgl-about-stat-value { font-size: 22px; font-weight: 700; color: var(--cgl-navy); }
      .cgl-about-stat-label { font-size: 12px; color: #64748B; }
      .cgl-team-photo-ring { width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 14px; padding: 4px; background: conic-gradient(var(--cgl-teal), var(--cgl-teal-deep), var(--cgl-navy), var(--cgl-teal)); }
      .cgl-team-photo-ring .cgl-team-photo { width: 100%; height: 100%; margin: 0; }
      .cgl-team-progress-track { margin-top: 16px; height: 3px; border-radius: 999px; background: var(--cgl-paper-2); overflow: hidden; }
      .cgl-team-progress-fill { height: 100%; width: 0%; background: var(--cgl-teal-deep); border-radius: 999px; animation: cgl-team-progress 6s linear forwards; }
      @keyframes cgl-team-progress { from { width: 0%; } to { width: 100%; } }

      /* Team */
      .cgl-team-pending { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 48px 20px; color: #94A3B0; text-align: center; }
      .cgl-team-pending p { margin: 0; font-size: 13.5px; }
      .cgl-team-carousel { position: relative; display: flex; align-items: center; justify-content: center; gap: 16px; max-width: 480px; margin: 0 auto; }
      .cgl-team-nav { background: #fff; border: 1px solid var(--cgl-line); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: var(--cgl-navy); flex-shrink: 0; transition: background 0.15s ease; }
      .cgl-team-nav:hover { background: var(--cgl-paper-2); }
      .cgl-team-card { background: #fff; border: 1px solid var(--cgl-line); border-radius: 18px; padding: 28px; text-align: center; flex: 1; animation: cgl-team-fade 0.5s ease; }
      @keyframes cgl-team-fade { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      .cgl-team-photo { width: 84px; height: 84px; border-radius: 50%; background: var(--cgl-paper-2); color: var(--cgl-navy); display: flex; align-items: center; justify-content: center; margin: 0 auto 14px; overflow: hidden; }
      .cgl-team-photo img { width: 100%; height: 100%; object-fit: cover; object-position: center; }
      .cgl-team-card h3 { font-size: 17px; margin: 0 0 4px; }
      .cgl-team-role { font-size: 12.5px; font-weight: 600; color: var(--cgl-teal-deep); margin: 0 0 10px; }
      .cgl-team-bio { font-size: 12.5px; line-height: 1.6; color: #64748B; margin: 0; }
      .cgl-team-dots { position: absolute; bottom: -28px; left: 0; right: 0; display: flex; justify-content: center; gap: 6px; }
      .cgl-team-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cgl-line); border: none; cursor: pointer; padding: 0; }
      .cgl-team-dot.is-active { background: var(--cgl-navy); }

      /* Compare */
      .cgl-compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 720px) { .cgl-compare-grid { grid-template-columns: 1fr; } }
      .cgl-compare-col { background: #fff; border: 1px solid var(--cgl-line); border-radius: 14px; padding: 22px; }
      .cgl-compare-col h3 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748B; margin: 0 0 14px; }
      .cgl-compare-chain { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
      .cgl-compare-chain li { font-size: 13.5px; color: #4B5D6E; padding: 2px 0 2px 16px; position: relative; display: flex; align-items: center; gap: 6px; }
      .cgl-compare-chain li::before { content: "–"; position: absolute; left: 0; color: #B0BAC2; }
      .cgl-compare-chain-arrow { position: absolute; left: -1px; bottom: -14px; font-size: 11px; color: #B0BAC2; }
      .cgl-compare-col--accent { background: var(--cgl-navy); border-color: var(--cgl-navy); }
      .cgl-compare-col--accent h3 { color: var(--cgl-teal); }
      .cgl-compare-col--accent .cgl-compare-chain li { color: #fff; padding-left: 22px; }
      .cgl-compare-col--accent .cgl-compare-chain li::before { content: none; }
      .cgl-compare-col--accent .cgl-compare-chain li svg { color: var(--cgl-teal); flex-shrink: 0; }
      .cgl-compare-chain-arrow--accent { color: rgba(247,249,250,0.35); left: 5px; }

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
      .cgl-footer { border-top: 1px solid var(--cgl-line); padding: 56px 24px 28px; }
      .cgl-footer-inner { max-width: 1180px; margin: 0 auto; }
      .cgl-footer-top { display: grid; grid-template-columns: 1.6fr repeat(3, 1fr); gap: 36px; padding-bottom: 36px; border-bottom: 1px solid var(--cgl-line); }
      @media (max-width: 860px) { .cgl-footer-top { grid-template-columns: 1fr 1fr; } }
      @media (max-width: 560px) { .cgl-footer-top { grid-template-columns: 1fr; } }
      .cgl-footer-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
      .cgl-footer-copy { font-size: 13px; color: #4B5D6E; margin: 0 0 16px; max-width: 260px; line-height: 1.6; }
      .cgl-footer-social { display: flex; gap: 10px; }
      .cgl-footer-social-link { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--cgl-line); display: flex; align-items: center; justify-content: center; color: var(--cgl-navy); transition: background 0.15s ease, color 0.15s ease; }
      .cgl-footer-social-link:hover { background: var(--cgl-navy); color: #fff; }
      .cgl-footer-col-heading { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--cgl-navy); margin-bottom: 14px; }
      .cgl-footer-col ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
      .cgl-footer-col a { font-size: 13px; color: #4B5D6E; text-decoration: none; }
      .cgl-footer-col a:hover { color: var(--cgl-navy); }
      .cgl-footer-bottom { padding-top: 20px; display: flex; flex-wrap: wrap; gap: 6px 18px; align-items: center; justify-content: space-between; }
      .cgl-footer-fine { font-size: 11.5px; color: #94A3B0; margin: 0; }
      .cgl-footer-fine--muted { width: 100%; }

      @media (prefers-reduced-motion: reduce) {
        .cgl-root * { animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; transition-duration: 0.001ms !important; }
      }
    `}</style>
  );
}
