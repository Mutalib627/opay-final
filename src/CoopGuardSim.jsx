import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Wallet, FileText, BarChart3, ShieldCheck, AlertTriangle, Vote, Bell,
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, XCircle, Clock, Users,
  TrendingUp, TrendingDown, Hash, Lock, ChevronRight, X, Plus, LogOut, ShieldAlert,
  ScanFace, Fingerprint, Video, VideoOff, MessageSquare, Send, Search, Gauge,
  CreditCard, Brain, ShieldQuestion, Mic, MicOff, PhoneOff,
  Award, Medal, ArrowRightLeft, AlertOctagon, Building2, History,
  Eye, EyeOff, RefreshCw, ArrowLeft, Info,
} from "lucide-react";
import { loadFaceLandmarker, analyzeFace } from "./lib/faceLandmarker";

/* ============================================================
   COOPGUARD — Transparent Digital Cooperative Management System
   Simulation Prototype (in-memory, single file)
   ============================================================ */

// ---------- Helpers ----------
const naira = (n) =>
  "₦" + Number(n).toLocaleString("en-NG", { maximumFractionDigits: 2 });

const fmtDate = (d) =>
  new Date(d).toLocaleString("en-NG", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// simple deterministic-ish hash for "blockchain-style" audit chain
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, "0").slice(0, 8);
}

let idCounter = 1000;
const nextId = () => ++idCounter;

// ---------- Seed data ----------
const SEED_MEMBERS = [
  { id: "u1", name: "Mutalib Adebayo", memberNo: "CG-0001", role: "admin", status: "active", balance: 482500, joined: "2023-02-14", bvn: "22198837465", creditScore: 781, biometricEnrolled: true,
    reputation: { loanRepayment: 96, savingsConsistency: 92, governanceCompliance: 94, participation: 88, auditPerformance: 98 } },
  { id: "u2", name: "Funke Oyelaran", memberNo: "CG-0002", role: "member", status: "active", balance: 156000, joined: "2023-05-02", bvn: "22187623910", creditScore: 702, biometricEnrolled: true,
    reputation: { loanRepayment: 84, savingsConsistency: 80, governanceCompliance: 74, participation: 68, auditPerformance: 88 } },
  { id: "u3", name: "Chidi Okafor", memberNo: "CG-0003", role: "member", status: "active", balance: 92500, joined: "2024-01-20", bvn: "22154098231", creditScore: 588, biometricEnrolled: false,
    reputation: { loanRepayment: 70, savingsConsistency: 62, governanceCompliance: 58, participation: 52, auditPerformance: 65 } },
  { id: "u4", name: "Aisha Bello", memberNo: "CG-0004", role: "loan_officer", status: "active", balance: 210000, joined: "2022-11-09", bvn: "22176453821", creditScore: 745, biometricEnrolled: true,
    reputation: { loanRepayment: 91, savingsConsistency: 89, governanceCompliance: 93, participation: 82, auditPerformance: 96 } },
  { id: "u5", name: "Tunde Salako", memberNo: "CG-0005", role: "member", status: "active", balance: 38000, joined: "2024-06-11", bvn: "22109887641", creditScore: 511, biometricEnrolled: false,
    reputation: { loanRepayment: 38, savingsConsistency: 44, governanceCompliance: 35, participation: 30, auditPerformance: 42 } },
];

const SEED_TX = [
  { id: nextId(), userId: "u1", type: "deposit", amount: 50000, ts: Date.now() - 86400000 * 12, desc: "Monthly savings contribution" },
  { id: nextId(), userId: "u2", type: "deposit", amount: 25000, ts: Date.now() - 86400000 * 9, desc: "Monthly savings contribution" },
  { id: nextId(), userId: "u3", type: "withdrawal", amount: 10000, ts: Date.now() - 86400000 * 6, desc: "Emergency withdrawal" },
  { id: nextId(), userId: "u5", type: "deposit", amount: 8000, ts: Date.now() - 86400000 * 2, desc: "Monthly savings contribution" },
];

const SEED_LOANS = [
  { id: nextId(), userId: "u2", amount: 120000, purpose: "Shop inventory restock", term: 6, rate: 12, status: "under_review", guarantors: ["u1", "u4"], createdAt: Date.now() - 86400000 * 4 },
  { id: nextId(), userId: "u3", amount: 60000, purpose: "Tuition fee support", term: 4, rate: 12, status: "repaying", guarantors: ["u2"], createdAt: Date.now() - 86400000 * 40, monthlyPayment: 15534, paid: 31068 },
];

const SEED_PROPOSALS = [
  {
    id: nextId(),
    title: "Approve 8% annual dividend payout for FY2025",
    description: "The finance committee recommends an 8% dividend on members' total savings, payable in the first week of January.",
    deadline: Date.now() + 86400000 * 3,
    votes: { u1: "yes", u4: "yes" },
    status: "open",
  },
  {
    id: nextId(),
    title: "Increase maximum loan ceiling from ₦500,000 to ₦750,000",
    description: "To accommodate growing member needs for business capital, raise the per-member loan ceiling.",
    deadline: Date.now() - 86400000 * 1,
    votes: { u1: "yes", u2: "yes", u3: "no", u4: "yes", u5: "abstain" },
    status: "closed",
  },
];

// ---------- Fraud heuristics ----------
function evaluateFraud(tx, allTx, members) {
  const flags = [];
  const member = members.find((m) => m.id === tx.userId);

  // Rule 1: large transaction relative to balance
  if (tx.amount > (member?.balance || 0) * 0.8 && tx.type === "withdrawal") {
    flags.push({ rule: "LARGE_WITHDRAWAL", detail: "Withdrawal exceeds 80% of account balance" });
  }
  // Rule 2: rapid repeated transactions (within 2 min sim-time, using count)
  const recent = allTx.filter((t) => t.userId === tx.userId && Math.abs(t.ts - tx.ts) < 1000 * 60 * 2 && t.id !== tx.id);
  if (recent.length >= 2) {
    flags.push({ rule: "RAPID_ACTIVITY", detail: `${recent.length + 1} transactions in a short window` });
  }
  // Rule 3: round-trip — withdrawal shortly after a large deposit
  const lastDeposit = [...allTx].filter((t) => t.userId === tx.userId && t.type === "deposit").sort((a, b) => b.ts - a.ts)[0];
  if (tx.type === "withdrawal" && lastDeposit && tx.amount >= lastDeposit.amount * 0.9 && (tx.ts - lastDeposit.ts) < 86400000 * 2) {
    flags.push({ rule: "DEPOSIT_WITHDRAW_PATTERN", detail: "Withdrawal closely mirrors a recent deposit (possible layering)" });
  }
  // Rule 4: above statutory single-transaction threshold
  if (tx.amount > 300000) {
    flags.push({ rule: "THRESHOLD_BREACH", detail: "Transaction exceeds ₦300,000 single-transaction threshold" });
  }
  return flags;
}

// ---------- Credit score banding ----------
function creditBand(score) {
  if (score >= 750) return { label: "Excellent", cls: "ok" };
  if (score >= 650) return { label: "Good", cls: "ok" };
  if (score >= 550) return { label: "Fair", cls: "warn" };
  return { label: "Poor", cls: "bad" };
}

// ============================================================
// COOPERATIVE REPUTATION PASSPORT (CRP)
// A portable trust & credibility profile per member, scored from
// weighted behavioral + financial indicators.
// ============================================================
const REPUTATION_WEIGHTS = {
  loanRepayment: 0.30,
  savingsConsistency: 0.20,
  governanceCompliance: 0.20,
  participation: 0.15,
  auditPerformance: 0.15,
};

const REPUTATION_LABELS = {
  loanRepayment: "Loan repayment history",
  savingsConsistency: "Savings consistency",
  governanceCompliance: "Governance compliance",
  participation: "Member participation",
  auditPerformance: "Audit performance",
};

// Weighted Reputation Score (0–100)
function computeReputationScore(rep) {
  if (!rep) return 0;
  const raw = Object.keys(REPUTATION_WEIGHTS).reduce(
    (sum, key) => sum + (rep[key] ?? 0) * REPUTATION_WEIGHTS[key],
    0
  );
  return Math.max(0, Math.min(100, Math.round(raw)));
}

// Reputation badge tiers
function reputationBadge(score) {
  if (score >= 85) return { label: "Gold", cls: "gold" };
  if (score >= 70) return { label: "Silver", cls: "silver" };
  if (score >= 50) return { label: "Bronze", cls: "bronze" };
  return { label: "At Risk", cls: "risk" };
}

// Deterministic portable Passport ID, derived from member identity —
// in production this would be the publicly-verifiable, blockchain-anchored ID.
function passportId(member) {
  return "CRP-" + simpleHash(`${member.id}|${member.memberNo}|${member.bvn}`).toUpperCase();
}

// AI-style early-warning / recommendation note based on the score profile
function reputationInsight(rep) {
  const score = computeReputationScore(rep);
  const weakest = Object.keys(REPUTATION_WEIGHTS).reduce((a, b) => (rep[a] ?? 0) <= (rep[b] ?? 0) ? a : b);
  if (score >= 85) {
    return "Excellent standing. Eligible for fast-track loan approval, reduced collateral requirements, and priority guarantor status.";
  }
  if (score >= 70) {
    return `Stable, trustworthy profile. ${REPUTATION_LABELS[weakest]} is the area with the most room to improve.`;
  }
  if (score >= 50) {
    return `Fair standing. Recommend monitoring — improving ${REPUTATION_LABELS[weakest].toLowerCase()} would raise this member's badge to Silver.`;
  }
  return `Early-warning: score is below the cooperative's safe threshold, driven mainly by weak ${REPUTATION_LABELS[weakest].toLowerCase()}. Recommend manual review before approving new credit.`;
}

// ---------- Simulated cross-institution BVN credit bureau ----------
// In production this would call a real credit bureau / NIBSS BVN API.
const BVN_BUREAU = {
  "22198837465": {
    fullName: "Mutalib Adebayo",
    score: 781,
    activeLoans: [
      { institution: "FirstCoop Multipurpose Society", amount: 0, status: "Closed — fully repaid" },
    ],
    history: "5 yrs · 0 defaults · 100% on-time repayment",
    riskNote: "No adverse records across participating institutions.",
  },
  "22187623910": {
    fullName: "Funke Oyelaran",
    score: 702,
    activeLoans: [
      { institution: "Unity Traders Cooperative", amount: 45000, status: "Active — repaying" },
    ],
    history: "3 yrs · 0 defaults · 1 late payment (2024)",
    riskNote: "One late payment recorded 14 months ago; no current delinquency.",
  },
  "22154098231": {
    fullName: "Chidi Okafor",
    score: 588,
    activeLoans: [
      { institution: "Campus Staff Coop, KWASU", amount: 60000, status: "Active — repaying" },
      { institution: "QuickCash Microfinance", amount: 22000, status: "Overdue — 1 missed payment" },
    ],
    history: "2 yrs · 1 default (resolved) · 2 late payments",
    riskNote: "Existing overdue facility detected at another institution. Recommend reduced exposure.",
  },
  "22176453821": {
    fullName: "Aisha Bello",
    score: 745,
    activeLoans: [],
    history: "6 yrs · 0 defaults · 100% on-time repayment",
    riskNote: "Clean record across all participating institutions.",
  },
  "22109887641": {
    fullName: "Tunde Salako",
    score: 511,
    activeLoans: [
      { institution: "Naija MicroLoans Ltd", amount: 35000, status: "Defaulted — 90+ days" },
    ],
    history: "1 yr · 1 active default · multiple missed payments",
    riskNote: "Active default at another lender. High risk — manual review strongly recommended.",
  },
};

function loanRiskAssessment(member, loanAmount) {
  const bureau = BVN_BUREAU[member.bvn];
  const reasons = [];
  let decision = "eligible";

  if (!bureau) {
    reasons.push("BVN record not found in credit bureau — manual verification required.");
    decision = "manual_review";
  } else {
    if (bureau.score < 580) {
      reasons.push(`Credit score ${bureau.score} is below the cooperative's minimum threshold of 580.`);
      decision = "not_eligible";
    } else if (bureau.score < 650) {
      reasons.push(`Credit score ${bureau.score} is in the "Fair" band — eligible with conditions.`);
      if (decision === "eligible") decision = "conditional";
    }
    const overdue = bureau.activeLoans.find((l) => /overdue|default/i.test(l.status));
    if (overdue) {
      reasons.push(`Active ${overdue.status.toLowerCase()} facility found at ${overdue.institution}.`);
      decision = "not_eligible";
    }
    if (loanAmount > member.balance * 5) {
      reasons.push("Requested amount exceeds 5x the member's current savings balance.");
      if (decision === "eligible") decision = "conditional";
    }
    const repScore = computeReputationScore(member.reputation);
    if (repScore < 50) {
      reasons.push(`Cooperative Reputation Passport score (${repScore}/100) is below the safe threshold — increased scrutiny advised.`);
      decision = decision === "not_eligible" ? "not_eligible" : "conditional";
    } else if (repScore >= 85 && decision === "eligible") {
      reasons.push(`Cooperative Reputation Passport score (${repScore}/100, Gold) qualifies this member for fast-track processing.`);
    }
    if (reasons.length === 0) reasons.push("All automated checks passed.");
  }
  return { decision, reasons, bureau };
}

// ---------- Reputation Passport: seed events, disputes, and cross-cooperative registry ----------
const SEED_REP_EVENTS = [
  { id: nextId(), userId: "u3", indicator: "loanRepayment", delta: 2, reason: "On-time loan repayment recorded", ts: Date.now() - 86400000 * 38 },
  { id: nextId(), userId: "u2", indicator: "governanceCompliance", delta: 1, reason: "Participated in cooperative vote", ts: Date.now() - 86400000 * 25 },
  { id: nextId(), userId: "u5", indicator: "auditPerformance", delta: -8, reason: "Fraud flag raised on a recent transaction", ts: Date.now() - 86400000 * 14 },
  { id: nextId(), userId: "u5", indicator: "governanceCompliance", delta: -5, reason: "Missed two consecutive general meetings", ts: Date.now() - 86400000 * 10 },
  { id: nextId(), userId: "u1", indicator: "auditPerformance", delta: 1, reason: "Clean quarterly audit — no exceptions raised", ts: Date.now() - 86400000 * 5 },
];

const SEED_DISPUTES = [
  {
    id: nextId(), userId: "u5", raisedBy: "Aisha Bello",
    reason: "Member has an active default with another lender (per BVN check) and missed contribution deadlines for two consecutive months.",
    status: "open", ts: Date.now() - 86400000 * 9,
  },
  {
    id: nextId(), userId: "u3", raisedBy: "Mutalib Adebayo",
    reason: "Late submission of project participation report for the Q1 community outreach drive.",
    status: "resolved", ts: Date.now() - 86400000 * 60,
  },
];

// Simulated registry of Reputation Passports issued by OTHER cooperatives —
// demonstrates portability: a transferring member's history can be instantly
// verified by entering their Passport ID, without re-running due diligence.
const EXTERNAL_PASSPORTS = {
  "CRP-7C2F9A3D": {
    name: "Ngozi Eze",
    homeCoop: "Unity Traders Cooperative, Lagos",
    memberSince: "2021-08-03",
    reputation: { loanRepayment: 90, savingsConsistency: 93, governanceCompliance: 84, participation: 78, auditPerformance: 95 },
    notes: "Clean record across 3 cooperatives — 0 defaults, 100% meeting attendance last 12 months. Eligible for fast-track loan processing and reduced collateral.",
  },
  "CRP-1B5E8F02": {
    name: "Emeka Obi",
    homeCoop: "Campus Staff Cooperative, KWASU",
    memberSince: "2022-11-19",
    reputation: { loanRepayment: 35, savingsConsistency: 50, governanceCompliance: 40, participation: 38, auditPerformance: 33 },
    notes: "Open dispute at previous cooperative over unpaid contribution arrears (₦64,000). Active default flagged on BVN credit check. Manual review strongly recommended before accepting this member's transfer.",
  },
};


// ---------- Seed meeting chat ----------
const SEED_CHAT = [
  { id: nextId(), userId: "u1", text: "Good evening everyone — welcome to the Q3 cooperative review.", ts: Date.now() - 1000 * 60 * 9 },
  { id: nextId(), userId: "u4", text: "Evening all. I have the loan portfolio summary ready to share.", ts: Date.now() - 1000 * 60 * 8 },
  { id: nextId(), userId: "u2", text: "Can we discuss the dividend proposal before loans?", ts: Date.now() - 1000 * 60 * 6 },
  { id: nextId(), userId: "u1", text: "Sure — let's take the dividend vote first, then move to loans.", ts: Date.now() - 1000 * 60 * 5 },
];

// ---------- Audit log (hash-chained) ----------
function buildAuditEntry(prevHash, action, actor, details) {
  const ts = Date.now();
  const payload = `${prevHash}|${action}|${actor}|${JSON.stringify(details)}|${ts}`;
  const hash = simpleHash(payload);
  return { id: nextId(), ts, action, actor, details, prevHash, hash };
}

// ============================================================
// MAIN APP
// ============================================================
export default function CoopGuardSim() {
  const [members, setMembers] = useState(SEED_MEMBERS);
  const [currentUserId, setCurrentUserId] = useState("u1");
  const [tx, setTx] = useState(SEED_TX);
  const [loans, setLoans] = useState(SEED_LOANS);
  const [proposals, setProposals] = useState(SEED_PROPOSALS);
  const [notifications, setNotifications] = useState([
    { id: nextId(), userId: "u1", title: "Welcome to CoopGuard", body: "Your simulation environment is ready.", ts: Date.now() - 3600000, read: false },
  ]);
  const [fraudFlags, setFraudFlags] = useState([]);
  const [audit, setAudit] = useState(() => [
    buildAuditEntry("00000000", "SYSTEM_INIT", "system", { note: "Ledger initialized" }),
  ]);
  const [tab, setTab] = useState("dashboard");
  const [toast, setToast] = useState(null);
  const [authedUserId, setAuthedUserId] = useState(null); // null = sign-in screen
  const [chat, setChat] = useState(SEED_CHAT);
  const [aiScans, setAiScans] = useState([]); // live AI fraud-scan feed
  const [repEvents, setRepEvents] = useState(SEED_REP_EVENTS); // Reputation Passport history
  const [disputes, setDisputes] = useState(SEED_DISPUTES); // member complaints / dispute records

  const currentUser = members.find((m) => m.id === currentUserId);
  const isStaff = currentUser?.role === "admin" || currentUser?.role === "loan_officer";
  const isAdmin = currentUser?.role === "admin";

  const showToast = useCallback((msg, kind = "info") => {
    setToast({ msg, kind, id: nextId() });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const pushAudit = useCallback((action, actor, details) => {
    setAudit((prev) => {
      const last = prev[prev.length - 1];
      return [...prev, buildAuditEntry(last.hash, action, actor, details)];
    });
  }, []);

  const pushNotification = useCallback((userId, title, body) => {
    setNotifications((prev) => [{ id: nextId(), userId, title, body, ts: Date.now(), read: false }, ...prev]);
  }, []);

  const adjustBalance = useCallback((userId, delta) => {
    setMembers((prev) => prev.map((m) => (m.id === userId ? { ...m, balance: m.balance + delta } : m)));
  }, []);

  // ---------- Reputation Passport helpers ----------
  const bumpReputation = useCallback((userId, indicator, delta, reason) => {
    setMembers((prev) => prev.map((m) => {
      if (m.id !== userId) return m;
      const current = m.reputation?.[indicator] ?? 0;
      const next = Math.max(0, Math.min(100, current + delta));
      return { ...m, reputation: { ...m.reputation, [indicator]: next } };
    }));
    setRepEvents((prev) => [{ id: nextId(), userId, indicator, delta, reason, ts: Date.now() }, ...prev].slice(0, 60));
  }, []);

  const fileComplaint = (userId, reason) => {
    const member = members.find((m) => m.id === userId);
    setDisputes((prev) => [{ id: nextId(), userId, raisedBy: currentUser.name, reason, status: "open", ts: Date.now() }, ...prev]);
    bumpReputation(userId, "auditPerformance", -5, `Complaint logged: ${reason}`);
    pushAudit("REPUTATION_COMPLAINT_FILED", currentUser.name, { member: member?.name, reason });
    pushNotification(userId, "Complaint recorded on your Reputation Passport", reason);
    showToast("Complaint logged on member's Reputation Passport", "info");
  };

  const resolveDispute = (disputeId) => {
    const d = disputes.find((x) => x.id === disputeId);
    if (!d) return;
    setDisputes((prev) => prev.map((x) => x.id === disputeId ? { ...x, status: "resolved" } : x));
    bumpReputation(d.userId, "auditPerformance", 3, "Dispute resolved favorably");
    pushAudit("REPUTATION_DISPUTE_RESOLVED", currentUser.name, { disputeId });
    pushNotification(d.userId, "Dispute resolved", "A complaint on your Reputation Passport has been marked as resolved.");
    showToast("Dispute marked resolved", "success");
  };

  // ---------- Actions ----------
  const doDeposit = (amount, desc) => {
    const newTx = { id: nextId(), userId: currentUserId, type: "deposit", amount, ts: Date.now(), desc: desc || "Member deposit (virtual)" };
    setTx((prev) => [newTx, ...prev]);
    adjustBalance(currentUserId, amount);
    pushAudit("DEPOSIT", currentUser.name, { amount, ref: `DEP-${newTx.id}` });
    pushNotification(currentUserId, "Deposit received", `Your virtual deposit of ${naira(amount)} has been recorded.`);
    const flags = evaluateFraud(newTx, [newTx, ...tx], members);
    runAiScan(newTx, flags);
    if (flags.length) registerFraud(newTx, flags);
    else bumpReputation(currentUserId, "savingsConsistency", 1, "On-time savings contribution recorded");
    showToast(`Deposited ${naira(amount)}`, "success");
  };

  const doWithdraw = (amount, desc) => {
    if (amount > currentUser.balance) {
      showToast("Insufficient balance for this withdrawal", "error");
      return;
    }
    const newTx = { id: nextId(), userId: currentUserId, type: "withdrawal", amount, ts: Date.now(), desc: desc || "Member withdrawal (virtual)" };
    setTx((prev) => [newTx, ...prev]);
    adjustBalance(currentUserId, -amount);
    pushAudit("WITHDRAWAL", currentUser.name, { amount, ref: `WD-${newTx.id}` });
    pushNotification(currentUserId, "Withdrawal processed", `Your virtual withdrawal of ${naira(amount)} has been recorded.`);
    const flags = evaluateFraud(newTx, [newTx, ...tx], members);
    runAiScan(newTx, flags);
    if (flags.length) registerFraud(newTx, flags);
    showToast(`Withdrew ${naira(amount)}`, "success");
  };

  const registerFraud = (transaction, flags) => {
    const entry = { id: nextId(), tx: transaction, flags, ts: Date.now(), reviewed: false, userId: transaction.userId };
    setFraudFlags((prev) => [entry, ...prev]);
    pushAudit("FRAUD_FLAG_RAISED", "AI Fraud Engine", { txId: transaction.id, rules: flags.map((f) => f.rule) });
    bumpReputation(transaction.userId, "auditPerformance", -flags.length * 4, `Fraud flag raised: ${flags.map((f) => f.rule).join(", ")}`);
    // notify admins
    members.filter((m) => m.role === "admin").forEach((a) => {
      pushNotification(a.id, "⚠ Suspicious activity flagged", `Transaction ${transaction.id} for ${members.find(m=>m.id===transaction.userId)?.name} flagged by ${flags.length} rule(s).`);
    });
  };

  const applyForLoan = (amount, purpose, term, guarantorIds, verification) => {
    const rate = 12;
    const r = rate / 100 / 12;
    const monthly = (amount * r) / (1 - Math.pow(1 + r, -term));
    const risk = loanRiskAssessment(currentUser, amount);
    const newLoan = {
      id: nextId(), userId: currentUserId, amount, purpose, term, rate,
      monthlyPayment: Math.round(monthly), paid: 0,
      status: guarantorIds.length ? "pending_guarantors" : "under_review",
      guarantors: guarantorIds, createdAt: Date.now(),
      verification, // { faceMatch, fingerprintMatch, livenessPassed }
      risk, // { decision, reasons, bureau }
    };
    setLoans((prev) => [newLoan, ...prev]);
    pushAudit("LOAN_APPLICATION", currentUser.name, { loanId: newLoan.id, amount, purpose });
    pushAudit("IDENTITY_VERIFICATION", currentUser.name, { loanId: newLoan.id, faceMatch: verification.faceMatch, fingerprintMatch: verification.fingerprintMatch, livenessPassed: verification.livenessPassed });
    pushAudit("BVN_CREDIT_CHECK", "CoopGuard Risk Engine", { loanId: newLoan.id, bvn: currentUser.bvn, score: risk.bureau?.score ?? "not_found", decision: risk.decision });
    guarantorIds.forEach((g) => pushNotification(g, "Guarantor request", `${currentUser.name} requested you as a guarantor for a loan of ${naira(amount)}.`));
    if (risk.decision === "not_eligible") {
      members.filter((m) => m.role === "loan_officer" || m.role === "admin").forEach((s) =>
        pushNotification(s.id, "⚠ High-risk loan application", `${currentUser.name}'s application for ${naira(amount)} failed automated credit checks. Manual review required.`)
      );
    }
    showToast("Loan application submitted", "success");
  };

  const decideLoan = (loanId, decision) => {
    setLoans((prev) => prev.map((l) => {
      if (l.id !== loanId) return l;
      return { ...l, status: decision, decidedAt: Date.now() };
    }));
    const loan = loans.find((l) => l.id === loanId);
    if (decision === "approved") {
      pushAudit("LOAN_APPROVED", currentUser.name, { loanId, automated: true });
      pushNotification(loan.userId, "Loan approved", `Your loan of ${naira(loan.amount)} has been approved by automated assessment + staff review.`);
    } else if (decision === "rejected") {
      pushAudit("LOAN_REJECTED", currentUser.name, { loanId });
      pushNotification(loan.userId, "Loan rejected", `Your loan application of ${naira(loan.amount)} was not approved.`);
    } else if (decision === "disbursed") {
      adjustBalance(loan.userId, loan.amount);
      const newTx = { id: nextId(), userId: loan.userId, type: "loan_disbursement", amount: loan.amount, ts: Date.now(), desc: `Loan ${loanId} disbursed (virtual)` };
      setTx((prev) => [newTx, ...prev]);
      pushAudit("LOAN_DISBURSED", currentUser.name, { loanId, amount: loan.amount });
      pushNotification(loan.userId, "Loan disbursed", `${naira(loan.amount)} has been credited to your virtual wallet.`);
      setLoans((prev) => prev.map((l) => l.id === loanId ? { ...l, status: "repaying", paid: 0 } : l));
    }
    showToast(`Loan ${decision}`, decision === "rejected" ? "error" : "success");
  };

  const repayLoan = (loanId, amount) => {
    const loan = loans.find((l) => l.id === loanId);
    if (amount > currentUser.balance) {
      showToast("Insufficient balance to make repayment", "error");
      return;
    }
    adjustBalance(currentUserId, -amount);
    const newTx = { id: nextId(), userId: currentUserId, type: "loan_repayment", amount, ts: Date.now(), desc: `Repayment toward loan ${loanId} (virtual)` };
    setTx((prev) => [newTx, ...prev]);
    let justClosed = false;
    setLoans((prev) => prev.map((l) => {
      if (l.id !== loanId) return l;
      const paid = (l.paid || 0) + amount;
      const total = l.amount * (1 + l.rate / 100);
      justClosed = paid >= total;
      return { ...l, paid, status: justClosed ? "closed" : l.status };
    }));
    pushAudit("LOAN_REPAYMENT", currentUser.name, { loanId, amount });
    pushNotification(currentUserId, "Repayment recorded", `${naira(amount)} applied to loan ${loanId}.`);
    bumpReputation(currentUserId, "loanRepayment", 2, "On-time loan repayment recorded");
    if (justClosed) bumpReputation(currentUserId, "loanRepayment", 5, "Loan fully repaid — excellent repayment record");
    showToast(`Repaid ${naira(amount)}`, "success");
  };

  const respondGuarantor = (loanId, decision) => {
    setLoans((prev) => prev.map((l) => {
      if (l.id !== loanId) return l;
      const allApproved = decision === "approved"; // simplified single-step for sim
      return { ...l, status: decision === "rejected" ? "rejected" : "under_review" };
    }));
    const loan = loans.find((l) => l.id === loanId);
    pushAudit("GUARANTOR_RESPONSE", currentUser.name, { loanId, decision });
    pushNotification(loan.userId, "Guarantor responded", `A guarantor ${decision} your loan request.`);
    showToast(`Guarantor response: ${decision}`, decision === "rejected" ? "error" : "success");
  };

  const castVote = (proposalId, choice) => {
    setProposals((prev) => prev.map((p) => {
      if (p.id !== proposalId) return p;
      return { ...p, votes: { ...p.votes, [currentUserId]: choice } };
    }));
    pushAudit("VOTE_CAST", currentUser.name, { proposalId, choice });
    bumpReputation(currentUserId, "governanceCompliance", 1, "Participated in cooperative vote");
    showToast("Your vote has been recorded", "success");
  };

  const createProposal = (title, description, days) => {
    const p = { id: nextId(), title, description, deadline: Date.now() + 86400000 * days, votes: {}, status: "open" };
    setProposals((prev) => [p, ...prev]);
    pushAudit("PROPOSAL_CREATED", currentUser.name, { title });
    members.forEach((m) => pushNotification(m.id, "New proposal open for voting", title));
    showToast("Proposal created", "success");
  };

  const reviewFraud = (id, action) => {
    const flag = fraudFlags.find((f) => f.id === id);
    setFraudFlags((prev) => prev.map((f) => f.id === id ? { ...f, reviewed: true, action } : f));
    pushAudit("FRAUD_REVIEW", currentUser.name, { flagId: id, action });
    if (flag) {
      if (action === "dismissed") {
        bumpReputation(flag.userId, "auditPerformance", 3, "Flagged transaction reviewed and cleared by staff");
      } else if (action === "escalated") {
        bumpReputation(flag.userId, "governanceCompliance", -3, "Transaction escalated to committee for review");
      }
    }
    showToast(`Flag marked as ${action}`, "success");
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => n.userId === currentUserId ? { ...n, read: true } : n));
  };

  const sendChat = (text) => {
    setChat((prev) => [...prev, { id: nextId(), userId: currentUserId, text, ts: Date.now() }]);
  };

  const enrollBiometric = () => {
    setMembers((prev) => prev.map((m) => m.id === currentUserId ? { ...m, biometricEnrolled: true } : m));
    pushAudit("BIOMETRIC_ENROLLED", currentUser.name, { method: "Face + Fingerprint (simulated)" });
    pushNotification(currentUserId, "Biometric profile enrolled", "Your facial scan and fingerprint template were captured for secure loan verification.");
    showToast("Biometric enrollment complete", "success");
  };

  const runAiScan = (transaction, flags) => {
    const verdict = flags.length === 0 ? "clear" : flags.length === 1 ? "watch" : "high_risk";
    const entry = { id: nextId(), tx: transaction, flags, verdict, ts: Date.now(), userId: transaction.userId };
    setAiScans((prev) => [entry, ...prev].slice(0, 30));
    return entry;
  };

  const sortedMyTx = tx.filter((t) => t.userId === currentUserId);
  const myLoans = loans.filter((l) => l.userId === currentUserId);
  const myNotifs = notifications.filter((n) => n.userId === currentUserId);
  const unreadCount = myNotifs.filter((n) => !n.read).length;
  const myTx = sortedMyTx;

  const stats = useMemo(() => {
    const totalSavings = members.reduce((s, m) => s + m.balance, 0);
    const pendingLoans = loans.filter((l) => l.status === "under_review" || l.status === "pending_guarantors").length;
    const activeLoans = loans.filter((l) => ["approved", "disbursed", "repaying"].includes(l.status)).length;
    const totalDisbursed = loans.filter((l) => ["disbursed", "repaying", "closed", "approved"].includes(l.status)).reduce((s, l) => s + l.amount, 0);
    const openFlags = fraudFlags.filter((f) => !f.reviewed).length;
    return { totalSavings, pendingLoans, activeLoans, totalDisbursed, openFlags, memberCount: members.length };
  }, [members, loans, fraudFlags]);

  const NAV = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "wallet", label: "Virtual Wallet", icon: Wallet },
    { id: "loans", label: "Loans", icon: FileText },
    { id: "credit", label: "Credit & BVN", icon: CreditCard },
    { id: "reputation", label: "Reputation Passport", icon: Award },
    { id: "voting", label: "Decisions & Voting", icon: Vote },
    { id: "meeting", label: "Live Meeting", icon: Video },
    { id: "notifications", label: "Notifications", icon: Bell, badge: unreadCount },
    { id: "audit", label: "Audit Ledger", icon: Hash },
    ...(isStaff ? [{ id: "admin", label: "Cooperative Control", icon: ShieldCheck }] : []),
    { id: "officer", label: "Loan Officer Desk", icon: Gauge, staffOnly: true },
    { id: "fraud", label: "Fraud Watch", icon: ShieldAlert, staffOnly: true },
    { id: "ai", label: "AI Operations Center", icon: Brain, staffOnly: true },
  ].filter((item) => !item.staffOnly || isStaff);

  if (!authedUserId) {
    return (
      <div className="cg-root">
        <Style />
        <SignInPage members={members} onSignIn={(id) => { setAuthedUserId(id); setCurrentUserId(id); }} />
      </div>
    );
  }

  return (
    <div className="cg-root">
      <Style />
      <div className="cg-shell">
        <Sidebar
          nav={NAV} tab={tab} setTab={setTab}
          currentUser={currentUser} members={members}
          currentUserId={currentUserId} setCurrentUserId={setCurrentUserId}
          stats={stats} onSignOut={() => setAuthedUserId(null)}
        />
        <main className="cg-main">
          <TopBar currentUser={currentUser} stats={stats} />
          <div className="cg-content">
            {tab === "dashboard" && <Dashboard stats={stats} members={members} loans={loans} tx={tx} currentUser={currentUser} myTx={myTx} myLoans={myLoans} fraudFlags={fraudFlags} isStaff={isStaff} setTab={setTab} />}
            {tab === "wallet" && <WalletPanel currentUser={currentUser} myTx={myTx} onDeposit={doDeposit} onWithdraw={doWithdraw} />}
            {tab === "loans" && <LoansPanel currentUser={currentUser} myLoans={myLoans} loans={loans} members={members} isStaff={isStaff} onApply={applyForLoan} onDecide={decideLoan} onRepay={repayLoan} onGuarantorRespond={respondGuarantor} currentUserId={currentUserId} onEnrollBiometric={enrollBiometric} />}
            {tab === "credit" && <CreditPanel currentUser={currentUser} members={members} isStaff={isStaff} />}
            {tab === "reputation" && <ReputationPanel currentUser={currentUser} members={members} repEvents={repEvents} disputes={disputes} isStaff={isStaff} onFileComplaint={fileComplaint} onResolveDispute={resolveDispute} />}
            {tab === "voting" && <VotingPanel proposals={proposals} members={members} currentUserId={currentUserId} isStaff={isStaff} onVote={castVote} onCreate={createProposal} />}
            {tab === "meeting" && <MeetingPanel currentUser={currentUser} members={members} chat={chat} onSend={sendChat} onJoin={() => bumpReputation(currentUserId, "participation", 1, "Attended live cooperative meeting")} />}
            {tab === "notifications" && <NotificationsPanel notifs={myNotifs} onMarkAll={markAllRead} />}
            {tab === "audit" && <AuditPanel audit={audit} />}
            {tab === "admin" && isStaff && <AdminPanel members={members} loans={loans} tx={tx} setMembers={setMembers} pushAudit={pushAudit} pushNotification={pushNotification} currentUser={currentUser} isAdmin={isAdmin} />}
            {tab === "officer" && isStaff && <LoanOfficerPanel loans={loans} members={members} onDecide={decideLoan} />}
            {tab === "fraud" && isStaff && <FraudPanel flags={fraudFlags} members={members} onReview={reviewFraud} />}
            {tab === "ai" && isStaff && <AiOperationsCenter scans={aiScans} members={members} fraudFlags={fraudFlags} loans={loans} audit={audit} currentUser={currentUser} setTab={setTab} />}
          </div>
        </main>
      </div>
      {toast && <Toast toast={toast} />}
    </div>
  );
}

// ============================================================
// SIGN-IN PAGE
// ============================================================
function SignInPage({ members, onSignIn }) {
  const [memberNo, setMemberNo] = useState("");
  const [pin, setPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null); // { title, body } for forgot-password / create-account
  // credentials -> face -> fingerprint -> success
  const [stage, setStage] = useState("credentials");
  const [pendingUserId, setPendingUser] = useState(null);
  const pendingUser = members.find((m) => m.id === pendingUserId);

  const handleCredentials = (e) => {
    e.preventDefault();
    const m = members.find((mm) => mm.memberNo.toLowerCase() === memberNo.trim().toLowerCase());
    if (!m) { setError("Member number not recognized. Try CG-0001 to CG-0005."); return; }
    if (pin.length < 4) { setError("Enter your 4-digit PIN (any digits work in this simulation)."); return; }
    setError("");
    setPendingUser(m.id);
    setStage("face"); // PIN verified — facial verification is required next, no skipping ahead
  };

  const restart = () => { setStage("credentials"); setPendingUser(null); };

  return (
    <div className="cg-signin">
      <div className="cg-signin-card">
        <div className="cg-signin-brand">
          <img src="/brand/coopguard-logo.png" alt="CoopGuard" className="cg-signin-logo" />
        </div>

        {stage === "credentials" && (
          <>
            <div className="cg-signin-welcome">
              <h2>Welcome back</h2>
              <p>Sign in with your member number and PIN. Face and fingerprint verification follow before your dashboard opens.</p>
            </div>

            <div className="cg-signin-security-note">
              <ShieldCheck size={15} />
              <span>Every sign-in confirms your PIN, your face, and your fingerprint in sequence. Sensitive actions always ask for your confirmation too.</span>
            </div>

            <form className="cg-form cg-signin-form" onSubmit={handleCredentials}>
              <label>Member number</label>
              <input type="text" placeholder="e.g. CG-0001" value={memberNo} onChange={(e) => setMemberNo(e.target.value)} autoFocus />

              <label>PIN</label>
              <div className="cg-signin-pin-field">
                <input
                  type={showPin ? "text" : "password"}
                  placeholder="••••"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                />
                <button type="button" className="cg-signin-pin-toggle" onClick={() => setShowPin((v) => !v)} aria-label={showPin ? "Hide PIN" : "Show PIN"}>
                  {showPin ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="cg-signin-row">
                <label className="cg-check cg-signin-remember">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /> Remember me
                </label>
                <button
                  type="button"
                  className="cg-signin-link"
                  onClick={() => setNotice({
                    title: "Forgot your PIN?",
                    body: "Password/PIN reset isn't wired up in this simulation. In production this would send a secure reset link to your registered phone or email — for now, contact your cooperative administrator.",
                  })}
                >
                  Forgot PIN?
                </button>
              </div>

              {error && <div className="cg-signin-error">{error}</div>}

              <button type="submit" className="cg-btn cg-btn-primary cg-btn-block">Continue</button>

              <div className="cg-signin-steps-preview">
                <span className="cg-signin-steps-label">Next:</span>
                <span className="cg-signin-steps-chip is-next"><ScanFace size={13} /> Face</span>
                <ChevronRight size={13} />
                <span className="cg-signin-steps-chip"><Fingerprint size={13} /> Fingerprint</span>
              </div>

              <div className="cg-signin-create">
                New to your cooperative?{" "}
                <button
                  type="button"
                  className="cg-signin-link"
                  onClick={() => setNotice({
                    title: "Create an account",
                    body: "Self-service registration isn't enabled in this simulation. In production, new members would be onboarded by their cooperative administrator or through a verified sign-up flow. Explore CoopGuard with one of the demo accounts below.",
                  })}
                >
                  Create an account
                </button>
              </div>

              {notice && (
                <div className="cg-signin-notice">
                  <Info size={15} />
                  <div>
                    <strong>{notice.title}</strong>
                    <p>{notice.body}</p>
                  </div>
                  <button type="button" className="cg-icon-btn" onClick={() => setNotice(null)} aria-label="Dismiss"><X size={14} /></button>
                </div>
              )}

              <div className="cg-signin-demo">
                <div className="cg-signin-demo-title">Demo accounts (any 4-digit PIN)</div>
                <div className="cg-signin-demo-grid">
                  {members.map((m) => (
                    <button type="button" key={m.id} className="cg-signin-demo-chip" onClick={() => { setMemberNo(m.memberNo); setPin("1234"); setError(""); }}>
                      {m.memberNo} · {m.name.split(" ")[0]} <span className="cg-signin-demo-role">{m.role.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </>
        )}

        {(stage === "face" || stage === "fingerprint" || stage === "success") && pendingUser && (
          <div className="cg-signin-progress">
            <div className={`cg-signin-progress-step is-done`}><CheckCircle2 size={13} /> PIN</div>
            <span className="cg-signin-progress-line is-done" />
            <div className={`cg-signin-progress-step ${stage !== "face" ? "is-done" : "is-active"}`}>
              {stage !== "face" ? <CheckCircle2 size={13} /> : <ScanFace size={13} />} Face
            </div>
            <span className={`cg-signin-progress-line ${stage === "success" ? "is-done" : ""}`} />
            <div className={`cg-signin-progress-step ${stage === "success" ? "is-done" : stage === "fingerprint" ? "is-active" : ""}`}>
              {stage === "success" ? <CheckCircle2 size={13} /> : <Fingerprint size={13} />} Fingerprint
            </div>
          </div>
        )}

        {stage === "face" && pendingUser && (
          <FaceVerification
            user={pendingUser}
            onSuccess={() => setStage("fingerprint")}
            onCancel={restart}
          />
        )}

        {stage === "fingerprint" && pendingUser && (
          <FingerprintVerification
            user={pendingUser}
            onSuccess={() => setStage("success")}
            onCancel={restart}
          />
        )}

        {stage === "success" && pendingUser && (
          <AccessGranted user={pendingUser} onDone={() => onSignIn(pendingUser.id)} />
        )}
      </div>
      <div className="cg-signin-footer">
        Simulation only — no real biometric data, BVN, or funds are processed. Face verification runs real, on-device face detection; fingerprint verification is a clearly simulated prototype experience.
      </div>
    </div>
  );
}

// ============================================================
// FACE VERIFICATION (login) — real camera preview + live face detection
// ============================================================
const FACE_CHALLENGES = [
  { key: "forward", label: "Look at the camera", instruction: "Hold your face centered in the frame." },
  { key: "blink", label: "Blink", instruction: "Blink both eyes naturally." },
  { key: "left", label: "Turn your head left", instruction: "Slowly turn your head to your left." },
  { key: "right", label: "Turn your head right", instruction: "Slowly turn your head to your right." },
];

const HOLD_TICKS_TO_START = 8;   // consecutive detections of a held face before liveness steps begin (~1s)
const STEP_HOLD_TICKS = 5;        // consecutive satisfied detections before a step is marked complete
const DETECT_INTERVAL_MS = 110;   // throttle detection to ~9fps — plenty for liveness, easy on low-end devices
const NO_FACE_HINT_MS = 6000;     // show a lighting/positioning hint if no face is found for this long

function FaceVerification({ user, onSuccess, onCancel }) {
  // phase: permission -> requesting -> denied -> loading -> model-error -> live -> success
  const [phase, setPhase] = useState("permission");
  const [errorMsg, setErrorMsg] = useState("");
  const [display, setDisplay] = useState({ status: "searching", stepIndex: 0, showHint: false });

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const rafRef = useRef(null);
  const runningRef = useRef(false);

  const statusRef = useRef("searching"); // searching | positioning | active
  const stepIndexRef = useRef(0);
  const holdRef = useRef(0);
  const blinkCaughtRef = useRef(false);
  const lastDetectRef = useRef(0);
  const noFaceSinceRef = useRef(0);
  const lastRenderedRef = useRef({ status: "searching", stepIndex: 0, showHint: false });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const stopLoop = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => () => { stopLoop(); stopCamera(); }, [stopLoop, stopCamera]);
  useAutoAdvance(phase === "success", onSuccess, 1300);

  const syncDisplay = () => {
    const next = { status: statusRef.current, stepIndex: stepIndexRef.current, showHint: display_showHint() };
    const last = lastRenderedRef.current;
    if (next.status !== last.status || next.stepIndex !== last.stepIndex || next.showHint !== last.showHint) {
      lastRenderedRef.current = next;
      setDisplay(next);
    }
  };
  const display_showHint = () => statusRef.current === "searching" && noFaceSinceRef.current && Date.now() - noFaceSinceRef.current > NO_FACE_HINT_MS;

  const evaluateStep = (face) => {
    const idx = stepIndexRef.current;
    const step = FACE_CHALLENGES[idx];
    if (!step) return;
    let satisfied = false;
    if (step.key === "forward") satisfied = face.facingForward;
    else if (step.key === "blink") { if (face.blinking) blinkCaughtRef.current = true; satisfied = blinkCaughtRef.current; }
    else if (step.key === "left") satisfied = face.turnedLeft;
    else if (step.key === "right") satisfied = face.turnedRight;

    if (satisfied) {
      holdRef.current += 1;
      if (holdRef.current >= STEP_HOLD_TICKS) {
        holdRef.current = 0;
        blinkCaughtRef.current = false;
        if (idx + 1 >= FACE_CHALLENGES.length) {
          statusRef.current = "done";
          stopLoop();
          stopCamera();
          setPhase("success");
        } else {
          stepIndexRef.current = idx + 1;
        }
      }
    } else if (step.key !== "blink") {
      holdRef.current = Math.max(0, holdRef.current - 1); // tolerate brief jitter
    }
  };

  const tick = useCallback(() => {
    if (!runningRef.current) return;
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;
    const now = performance.now();

    if (!document.hidden && video && landmarker && video.readyState >= 2 && now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
      lastDetectRef.current = now;
      const result = landmarker.detectForVideo(video, now);
      const face = analyzeFace(result);

      if (!face) {
        holdRef.current = 0;
        if (!noFaceSinceRef.current) noFaceSinceRef.current = Date.now();
        if (statusRef.current !== "active") statusRef.current = "searching";
      } else {
        noFaceSinceRef.current = 0;
        if (statusRef.current === "searching") { statusRef.current = "positioning"; holdRef.current = 0; }
        if (statusRef.current === "positioning") {
          holdRef.current += 1;
          if (holdRef.current >= HOLD_TICKS_TO_START) {
            statusRef.current = "active";
            holdRef.current = 0;
            stepIndexRef.current = 0;
            blinkCaughtRef.current = false;
          }
        } else if (statusRef.current === "active") {
          evaluateStep(face);
        }
      }
      syncDisplay();
    }
    rafRef.current = requestAnimationFrame(tick);
    // evaluateStep/syncDisplay only read/write refs and stable setState/
    // useCallback functions, so the closures captured on mount stay correct
    // across the life of this loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requestCamera = async () => {
    setPhase("requesting");
    setErrorMsg("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorMsg("This browser doesn't support camera access. Try a recent version of Chrome, Edge, or Safari.");
      setPhase("denied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setPhase("loading");
      try {
        landmarkerRef.current = await loadFaceLandmarker();
        statusRef.current = "searching";
        stepIndexRef.current = 0;
        holdRef.current = 0;
        noFaceSinceRef.current = 0;
        setPhase("live");
        runningRef.current = true;
        rafRef.current = requestAnimationFrame(tick);
      } catch (modelErr) {
        setErrorMsg("Couldn't load the face verification model. Check your internet connection and try again.");
        setPhase("model-error");
      }
    } catch (err) {
      setErrorMsg(
        err && err.name === "NotAllowedError"
          ? "Camera access was denied. Face verification needs camera permission to continue."
          : "We couldn't reach a camera on this device."
      );
      setPhase("denied");
    }
  };

  const cancel = () => { stopLoop(); stopCamera(); onCancel(); };

  const statusText = () => {
    if (display.status === "searching") return "No face detected — position your face inside the frame.";
    if (display.status === "positioning") return "Face detected — hold still…";
    return FACE_CHALLENGES[display.stepIndex]?.instruction || "";
  };

  return (
    <div className="cg-bio">
      <div className="cg-bio-head">
        <button type="button" className="cg-icon-btn" onClick={cancel} aria-label="Cancel and return to sign-in"><ArrowLeft size={16} /></button>
        <div>
          <h2>Face Verification</h2>
          <p className="cg-bio-sub">Confirming it's {user.name.split(" ")[0]} before continuing.</p>
        </div>
      </div>

      {phase === "permission" && (
        <div className="cg-face-permission">
          <Video size={30} />
          <p>CoopGuard needs your camera to verify your face. Detection runs on this device — nothing is uploaded or stored.</p>
          <button className="cg-btn cg-btn-primary" onClick={requestCamera}><Video size={16} /> Enable camera</button>
        </div>
      )}

      {phase === "requesting" && (
        <div className="cg-face-permission">
          <div className="cg-face-spinner" />
          <p>Waiting for camera permission…</p>
        </div>
      )}

      {phase === "loading" && (
        <div className="cg-face-permission">
          <div className="cg-face-spinner" />
          <p>Loading face verification…</p>
        </div>
      )}

      {(phase === "denied" || phase === "model-error") && (
        <div className="cg-face-permission cg-face-permission-error">
          <VideoOff size={30} />
          <p>{errorMsg}</p>
          <div className="cg-btn-row">
            <button className="cg-btn cg-btn-secondary" onClick={requestCamera}><RefreshCw size={15} /> Try again</button>
            <button className="cg-btn cg-btn-secondary" onClick={cancel}>Cancel and return to sign-in</button>
          </div>
        </div>
      )}

      {(phase === "live" || phase === "loading") && (
        <div className="cg-face-camera" style={{ display: phase === "live" ? "block" : "none" }}>
          <video ref={videoRef} autoPlay playsInline muted />
          <div className={`cg-face-frame status-${display.status}`} />
        </div>
      )}

      {phase === "live" && (
        <>
          <p className="cg-face-status-text">{statusText()}</p>
          {display.showHint && (
            <p className="cg-face-hint"><Info size={13} /> Make sure you're in a well-lit area and facing the camera.</p>
          )}

          {display.status === "active" && (
            <div className="cg-face-steps">
              {FACE_CHALLENGES.map((c, i) => {
                const done = i < display.stepIndex;
                const active = i === display.stepIndex;
                return (
                  <div key={c.key} className={`cg-face-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}>
                    <span className="cg-face-step-dot">{done ? <CheckCircle2 size={13} /> : i + 1}</span>
                    <span>{c.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cg-btn-row cg-face-footer">
            <button type="button" className="cg-signin-link" onClick={cancel}>Cancel</button>
          </div>
        </>
      )}

      {phase === "success" && (
        <div className="cg-face-instruction">
          <div className="cg-face-success-icon"><CheckCircle2 size={40} /></div>
          <p className="cg-bio-pass">Face verification successful.</p>
          <p className="cg-bio-sub">Continuing to fingerprint verification…</p>
        </div>
      )}

      <p className="cg-bio-disclaimer">Face detection and liveness checks run live in your browser. This confirms a real, responsive face is present — it does not identify or match who you are, and no images are stored.</p>
    </div>
  );
}

// Auto-advance once face verification succeeds — brief pause so the success
// state is actually visible before moving to the next required step.
function useAutoAdvance(active, onAdvance, delayMs = 1100) {
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(onAdvance, delayMs);
    return () => clearTimeout(t);
  }, [active, onAdvance, delayMs]);
}

// ============================================================
// FINGERPRINT VERIFICATION (login) — clearly simulated sensor UI
// ============================================================
function FingerprintVerification({ user, onSuccess, onCancel }) {
  const [phase, setPhase] = useState("idle"); // idle -> scanning -> success
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useAutoAdvance(phase === "success", onSuccess, 1100);

  const scan = () => {
    setPhase("scanning");
    timer.current = setTimeout(() => setPhase("success"), 1700);
  };

  return (
    <div className="cg-bio">
      <div className="cg-bio-head">
        <button type="button" className="cg-icon-btn" onClick={onCancel} aria-label="Cancel and return to sign-in"><ArrowLeft size={16} /></button>
        <div>
          <h2>Fingerprint Verification</h2>
          <p className="cg-bio-sub">Last step before opening {user.name.split(" ")[0]}'s dashboard.</p>
        </div>
      </div>

      <div className="cg-fingerprint-stage">
        <button
          type="button"
          className={`cg-fingerprint-sensor ${phase}`}
          onClick={phase === "idle" ? scan : undefined}
          disabled={phase !== "idle"}
          aria-label="Place your finger on the sensor"
        >
          <Fingerprint size={44} />
          {phase === "scanning" && <span className="cg-fingerprint-ring" />}
          {phase === "success" && <span className="cg-fingerprint-check"><CheckCircle2 size={20} /></span>}
        </button>

        <p className="cg-fingerprint-status">
          {phase === "idle" && "Tap the sensor to simulate placing your finger."}
          {phase === "scanning" && "Reading fingerprint…"}
          {phase === "success" && <span className="cg-bio-pass"><CheckCircle2 size={16} /> Fingerprint verified.</span>}
        </p>
      </div>

      {phase !== "success" && (
        <div className="cg-btn-row cg-face-footer">
          <button type="button" className="cg-signin-link" onClick={onCancel}>Cancel</button>
        </div>
      )}

      <p className="cg-bio-disclaimer">This is a visual simulation — CoopGuard does not access your device's real fingerprint sensor. Biometric verification is currently simulated for this prototype.</p>
    </div>
  );
}

// ============================================================
// ACCESS GRANTED — final step after PIN + Face + Fingerprint all pass
// ============================================================
function AccessGranted({ user, onDone }) {
  const [welcomed, setWelcomed] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setWelcomed(true), 900);
    const t2 = setTimeout(onDone, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <div className="cg-access-granted">
      <div className="cg-access-check"><CheckCircle2 size={40} /></div>
      <h2>{welcomed ? `Welcome to CoopGuard, ${user.name.split(" ")[0]}` : "Identity verification complete"}</h2>
      <p>{welcomed ? "Opening your dashboard…" : "PIN, face, and fingerprint all confirmed."}</p>
    </div>
  );
}

// ============================================================
// BIOMETRIC VERIFICATION STEP (face + fingerprint simulation) — used by loan
// application identity verification. Left as-is; the login page above uses
// its own dedicated FaceVerification / FingerprintVerification flows.
// ============================================================
function BiometricStep({ user, purpose, onComplete, onBack }) {
  const [phase, setPhase] = useState("idle"); // idle -> scanning_face -> scanning_finger -> result
  const [faceMatch, setFaceMatch] = useState(null);
  const [fingerprintMatch, setFingerprintMatch] = useState(null);
  const [liveness, setLiveness] = useState(null);

  const start = () => {
    setPhase("scanning_face");
    setTimeout(() => {
      setLiveness(true);
      setFaceMatch(user.biometricEnrolled ? true : Math.random() > 0.15);
      setPhase("scanning_finger");
      setTimeout(() => {
        setFingerprintMatch(user.biometricEnrolled ? true : Math.random() > 0.1);
        setPhase("result");
      }, 1400);
    }, 1600);
  };

  const passed = faceMatch && fingerprintMatch && liveness;

  return (
    <div className="cg-bio">
      <h2>Biometric verification</h2>
      <p className="cg-bio-sub">
        {purpose === "sign-in"
          ? "Confirm it's really you before accessing the cooperative dashboard."
          : "Identity verification is required before submitting a loan application."}
      </p>

      <div className="cg-bio-stage">
        <div className={`cg-bio-face ${phase === "scanning_face" ? "scanning" : ""} ${phase === "result" && faceMatch ? "ok" : ""} ${phase === "result" && !faceMatch ? "bad" : ""}`}>
          <ScanFace size={56} />
          {phase === "scanning_face" && <div className="cg-bio-scanline" />}
        </div>
        <div className="cg-bio-status">
          {phase === "idle" && <span>Position your face in frame and place your finger on the sensor to begin.</span>}
          {phase === "scanning_face" && <span>Scanning face — checking liveness and match against enrolled profile…</span>}
          {phase === "scanning_finger" && <span>Face verified ✓ — reading fingerprint…</span>}
          {phase === "result" && passed && <span className="cg-bio-pass"><CheckCircle2 size={16} /> Identity verified — face and fingerprint match {user.name}'s enrolled profile.</span>}
          {phase === "result" && !passed && <span className="cg-bio-fail"><XCircle size={16} /> Verification failed — face or fingerprint did not match enrolled profile. Please try again or visit a branch.</span>}
        </div>
      </div>

      <div className="cg-bio-rows">
        <div className="cg-bio-row">
          <ScanFace size={16} /> Facial recognition
          <BioPill state={phase === "idle" ? "pending" : phase === "scanning_face" ? "scanning" : faceMatch ? "pass" : "fail"} />
        </div>
        <div className="cg-bio-row">
          <Fingerprint size={16} /> Fingerprint match
          <BioPill state={["idle", "scanning_face"].includes(phase) ? "pending" : phase === "scanning_finger" ? "scanning" : fingerprintMatch ? "pass" : "fail"} />
        </div>
        <div className="cg-bio-row">
          <ShieldQuestion size={16} /> Liveness check
          <BioPill state={phase === "idle" ? "pending" : phase === "scanning_face" ? "scanning" : liveness ? "pass" : "fail"} />
        </div>
      </div>

      <div className="cg-btn-row">
        {onBack && <button className="cg-btn cg-btn-secondary" onClick={onBack}>Back</button>}
        {phase === "idle" && <button className="cg-btn cg-btn-primary" onClick={start}><ScanFace size={16} /> Start biometric scan</button>}
        {phase === "result" && passed && <button className="cg-btn cg-btn-primary" onClick={() => onComplete({ faceMatch, fingerprintMatch, livenessPassed: liveness })}>Continue</button>}
        {phase === "result" && !passed && <button className="cg-btn cg-btn-secondary" onClick={() => { setPhase("idle"); setFaceMatch(null); setFingerprintMatch(null); setLiveness(null); }}>Retry scan</button>}
      </div>
    </div>
  );
}

function BioPill({ state }) {
  const map = {
    pending: { label: "Pending", cls: "muted" },
    scanning: { label: "Scanning…", cls: "info" },
    pass: { label: "Match", cls: "ok" },
    fail: { label: "No match", cls: "bad" },
  };
  const s = map[state];
  return <span className={`cg-pill cg-pill-${s.cls} cg-bio-pill`}>{s.label}</span>;
}


function Sidebar({ nav, tab, setTab, currentUser, members, currentUserId, setCurrentUserId, stats, onSignOut }) {
  return (
    <aside className="cg-sidebar">
      <div className="cg-brand">
        <div className="cg-brand-mark"><Lock size={18} /></div>
        <div>
          <div className="cg-brand-name">CoopGuard</div>
          <div className="cg-brand-sub">Simulation Mode</div>
        </div>
      </div>

      <nav className="cg-nav">
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`cg-nav-item ${tab === item.id ? "active" : ""}`}
              onClick={() => setTab(item.id)}
            >
              <Icon size={17} />
              <span>{item.label}</span>
              {item.badge > 0 && <span className="cg-nav-badge">{item.badge}</span>}
            </button>
          );
        })}
      </nav>

      <div className="cg-sidebar-foot">
        <div className="cg-sim-label">Switch role (demo)</div>
        <select className="cg-select" value={currentUserId} onChange={(e) => setCurrentUserId(e.target.value)}>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name} — {m.role.replace("_", " ")}</option>
          ))}
        </select>
        <div className="cg-disclaimer">
          All funds, transactions, loans, and votes shown are <b>virtual simulation data</b>. No real money moves.
        </div>
        <button className="cg-signout" onClick={onSignOut}><LogOut size={14} /> Sign out</button>
      </div>
    </aside>
  );
}

// ============================================================
// TOP BAR
// ============================================================
function TopBar({ currentUser, stats }) {
  return (
    <header className="cg-topbar">
      <div>
        <div className="cg-eyebrow">Member</div>
        <div className="cg-topbar-name">{currentUser.name} <span className="cg-pill">{currentUser.role.replace("_", " ")}</span></div>
      </div>
      <div className="cg-topbar-right">
        <div className="cg-mini-stat">
          <span className="cg-mini-label">Virtual wallet balance</span>
          <span className="cg-mini-value">{naira(currentUser.balance)}</span>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ stats, members, loans, tx, currentUser, myTx, myLoans, fraudFlags, isStaff, setTab }) {
  const repScore = computeReputationScore(currentUser.reputation);
  const repBadge = reputationBadge(repScore);
  const repAccent = { gold: "gold", silver: "blue", bronze: "green", risk: "red" }[repBadge.cls];

  return (
    <div className="cg-page">
      <PageHead eyebrow="Overview" title="Real-time financial dashboard" desc="A live snapshot of cooperative health — savings, loans, and activity, simulated end to end." />

      <div className="cg-grid-stats">
        <StatCard icon={Wallet} label="Total cooperative savings" value={naira(stats.totalSavings)} accent="green" />
        <StatCard icon={Users} label="Registered members" value={stats.memberCount} accent="blue" />
        <StatCard icon={Clock} label="Loans pending decision" value={stats.pendingLoans} accent="gold" />
        <StatCard icon={TrendingUp} label="Total disbursed" value={naira(stats.totalDisbursed)} accent="green" />
        <StatCard icon={Award} label="Your reputation score" value={`${repScore}/100 · ${repBadge.label}`} accent={repAccent} />
        {isStaff && <StatCard icon={ShieldAlert} label="Open fraud flags" value={stats.openFlags} accent={stats.openFlags > 0 ? "red" : "blue"} />}
      </div>

      <div className="cg-grid-2">
        <div className="cg-card">
          <div className="cg-card-head">
            <h3>Your recent activity</h3>
          </div>
          {myTx.length === 0 ? (
            <Empty text="No transactions yet. Visit Virtual Wallet to deposit or withdraw." />
          ) : (
            <ul className="cg-tx-list">
              {myTx.slice(0, 5).map((t) => <TxRow key={t.id} t={t} />)}
            </ul>
          )}
        </div>

        <div className="cg-card">
          <div className="cg-card-head">
            <h3>Your loan status</h3>
          </div>
          {myLoans.length === 0 ? (
            <Empty text="No loan applications yet. Visit Loans to apply." />
          ) : (
            <ul className="cg-loan-list">
              {myLoans.map((l) => <LoanMini key={l.id} l={l} />)}
            </ul>
          )}
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head">
          <h3><Award size={16} className="cg-inline-icon" /> Cooperative Reputation Passport</h3>
          <span className={`cg-rep-badge ${repBadge.cls}`}><Medal size={13} /> {repBadge.label}</span>
        </div>
        <div className="cg-passport-mini">
          <div className="cg-passport-score-mini">{repScore}<span>/100</span></div>
          <div className="cg-passport-mini-body">
            <div className="cg-progress"><div className="cg-progress-fill" style={{ width: `${repScore}%`, background: repBadge.cls === "gold" ? "var(--cg-teal)" : repBadge.cls === "silver" ? "#b9bcc6" : repBadge.cls === "bronze" ? "#c98a4f" : "var(--cg-red)" }} /></div>
            <p className="cg-hint" style={{ marginTop: 8 }}>{reputationInsight(currentUser.reputation)}</p>
          </div>
          <button className="cg-btn cg-btn-secondary" onClick={() => setTab?.("reputation")}>View full passport <ChevronRight size={14} /></button>
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Cooperative-wide loan book</h3></div>
        <LoanTable loans={loans} members={members} compact />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className={`cg-stat cg-accent-${accent}`}>
      <div className="cg-stat-icon"><Icon size={20} /></div>
      <div>
        <div className="cg-stat-value">{value}</div>
        <div className="cg-stat-label">{label}</div>
      </div>
    </div>
  );
}

function TxRow({ t }) {
  const isCredit = t.type === "deposit" || t.type === "loan_disbursement";
  const Icon = isCredit ? ArrowDownCircle : ArrowUpCircle;
  return (
    <li className="cg-tx-row">
      <div className={`cg-tx-icon ${isCredit ? "credit" : "debit"}`}><Icon size={16} /></div>
      <div className="cg-tx-body">
        <div className="cg-tx-desc">{t.desc}</div>
        <div className="cg-tx-meta">{fmtDate(t.ts)} · {t.type.replace("_", " ")}</div>
      </div>
      <div className={`cg-tx-amount ${isCredit ? "credit" : "debit"}`}>{isCredit ? "+" : "−"}{naira(t.amount)}</div>
    </li>
  );
}

function LoanMini({ l }) {
  return (
    <li className="cg-loan-mini">
      <div>
        <div className="cg-loan-mini-purpose">{l.purpose}</div>
        <div className="cg-loan-mini-meta">{naira(l.amount)} · {l.term} months @ {l.rate}%</div>
      </div>
      <StatusBadge status={l.status} />
    </li>
  );
}

function Empty({ text }) {
  return <div className="cg-empty">{text}</div>;
}

// ============================================================
// WALLET
// ============================================================
function WalletPanel({ currentUser, myTx, onDeposit, onWithdraw }) {
  const [depAmt, setDepAmt] = useState("");
  const [depDesc, setDepDesc] = useState("");
  const [wdAmt, setWdAmt] = useState("");
  const [wdDesc, setWdDesc] = useState("");

  return (
    <div className="cg-page">
      <PageHead eyebrow="Your account" title="Virtual digital wallet" desc="Simulate deposits, withdrawals, dividends, and loan disbursements — every entry is recorded permanently in the audit ledger." />

      <div className="cg-card cg-balance-card">
        <div className="cg-balance-label">Current virtual balance</div>
        <div className="cg-balance-value">{naira(currentUser.balance)}</div>
        <div className="cg-balance-sub">Member: {currentUser.name} · {currentUser.memberNo}</div>
      </div>

      <div className="cg-grid-2">
        <div className="cg-card">
          <div className="cg-card-head"><h3><ArrowDownCircle size={18} className="cg-inline-icon credit" /> Make a virtual deposit</h3></div>
          <form className="cg-form" onSubmit={(e) => { e.preventDefault(); const a = Number(depAmt); if (a > 0) { onDeposit(a, depDesc); setDepAmt(""); setDepDesc(""); } }}>
            <label>Amount (₦)</label>
            <input type="number" min="1" placeholder="e.g. 25000" value={depAmt} onChange={(e) => setDepAmt(e.target.value)} required />
            <label>Note (optional)</label>
            <input type="text" placeholder="e.g. Monthly contribution" value={depDesc} onChange={(e) => setDepDesc(e.target.value)} />
            <button type="submit" className="cg-btn cg-btn-primary">Simulate deposit</button>
          </form>
        </div>

        <div className="cg-card">
          <div className="cg-card-head"><h3><ArrowUpCircle size={18} className="cg-inline-icon debit" /> Make a virtual withdrawal</h3></div>
          <form className="cg-form" onSubmit={(e) => { e.preventDefault(); const a = Number(wdAmt); if (a > 0) { onWithdraw(a, wdDesc); setWdAmt(""); setWdDesc(""); } }}>
            <label>Amount (₦)</label>
            <input type="number" min="1" placeholder="e.g. 10000" value={wdAmt} onChange={(e) => setWdAmt(e.target.value)} required />
            <label>Note (optional)</label>
            <input type="text" placeholder="e.g. Emergency withdrawal" value={wdDesc} onChange={(e) => setWdDesc(e.target.value)} />
            <button type="submit" className="cg-btn cg-btn-secondary">Simulate withdrawal</button>
            <div className="cg-hint">Large or unusual withdrawals may be flagged by the fraud detection engine.</div>
          </form>
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Transaction history</h3></div>
        {myTx.length === 0 ? <Empty text="No transactions yet." /> : (
          <ul className="cg-tx-list">
            {myTx.map((t) => <TxRow key={t.id} t={t} />)}
          </ul>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LOANS
// ============================================================
function LoansPanel({ currentUser, myLoans, loans, members, isStaff, onApply, onDecide, onRepay, onGuarantorRespond, currentUserId, onEnrollBiometric }) {
  const [showForm, setShowForm] = useState(false);
  const [formStage, setFormStage] = useState("details"); // details -> verify -> credit -> done
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [term, setTerm] = useState(6);
  const [guarantors, setGuarantors] = useState([]);
  const [verification, setVerification] = useState(null);

  const candidateGuarantors = members.filter((m) => m.id !== currentUserId);

  const toggleGuarantor = (id) => {
    setGuarantors((prev) => prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]);
  };

  const guaranteeingFor = loans.filter((l) => l.guarantors?.includes(currentUserId) && l.status === "pending_guarantors");

  const resetForm = () => {
    setShowForm(false); setFormStage("details"); setAmount(""); setPurpose(""); setGuarantors([]); setVerification(null);
  };

  const finalizeApplication = (verif) => {
    onApply(Number(amount), purpose, Number(term), guarantors, verif);
    resetForm();
  };

  return (
    <div className="cg-page">
      <PageHead eyebrow="Loans" title="Automated loan assessment & tracking" desc="Apply for a virtual loan, get an instant repayment estimate, and track approvals through the cooperative's automated rules engine — secured by facial recognition, fingerprint verification, and a cross-institution BVN credit check." />

      {!showForm ? (
        <button className="cg-btn cg-btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Apply for a virtual loan</button>
      ) : formStage === "details" ? (
        <div className="cg-card">
          <div className="cg-card-head"><h3>New loan application</h3><button className="cg-icon-btn" onClick={resetForm}><X size={16} /></button></div>
          <form className="cg-form" onSubmit={(e) => { e.preventDefault(); if (Number(amount) > 0 && purpose.trim()) { setFormStage("verify"); } }}>
            <label>Loan amount (₦)</label>
            <input type="number" min="1000" max="5000000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <label>Purpose</label>
            <input type="text" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g. Business expansion" required />
            <label>Term (months)</label>
            <select value={term} onChange={(e) => setTerm(e.target.value)}>
              {[3, 6, 9, 12, 18, 24].map((t) => <option key={t} value={t}>{t} months</option>)}
            </select>
            <label>Guarantors (select members)</label>
            <div className="cg-checkrow">
              {candidateGuarantors.map((m) => (
                <label key={m.id} className="cg-check">
                  <input type="checkbox" checked={guarantors.includes(m.id)} onChange={() => toggleGuarantor(m.id)} /> {m.name}
                </label>
              ))}
            </div>
            {Number(amount) > 0 && (
              <div className="cg-estimate">
                Estimated monthly repayment at 12% APR: <b>{naira(((Number(amount) * 0.01) / (1 - Math.pow(1.01, -term))).toFixed(0))}</b>
              </div>
            )}
            <button type="submit" className="cg-btn cg-btn-primary">Continue to identity verification</button>
          </form>
        </div>
      ) : formStage === "verify" ? (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Step 1 of 2 — Identity verification</h3><button className="cg-icon-btn" onClick={resetForm}><X size={16} /></button></div>
          {!currentUser.biometricEnrolled && (
            <div className="cg-bio-noenroll">
              <p>You haven't enrolled a biometric profile yet. In this simulation, you can enroll instantly so future scans match.</p>
              <button className="cg-btn cg-btn-secondary" onClick={onEnrollBiometric}><Fingerprint size={16} /> Enroll face & fingerprint now</button>
            </div>
          )}
          <BiometricStep
            user={currentUser}
            purpose="loan"
            onComplete={(verif) => { setVerification(verif); setFormStage("credit"); }}
            onBack={() => setFormStage("details")}
          />
        </div>
      ) : formStage === "credit" && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Step 2 of 2 — Automated credit assessment</h3><button className="cg-icon-btn" onClick={resetForm}><X size={16} /></button></div>
          <CreditCheckStep user={currentUser} amount={Number(amount)} onFinish={() => finalizeApplication(verification)} />
        </div>
      )}

      {guaranteeingFor.length > 0 && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Guarantor requests awaiting your response</h3></div>
          <ul className="cg-loan-list">
            {guaranteeingFor.map((l) => (
              <li key={l.id} className="cg-loan-mini">
                <div>
                  <div className="cg-loan-mini-purpose">{members.find(m=>m.id===l.userId)?.name} requests {naira(l.amount)}</div>
                  <div className="cg-loan-mini-meta">{l.purpose}</div>
                </div>
                <div className="cg-btn-row">
                  <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => onGuarantorRespond(l.id, "rejected")}>Decline</button>
                  <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onGuarantorRespond(l.id, "approved")}>Approve</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="cg-card">
        <div className="cg-card-head"><h3>Your loan applications</h3></div>
        {myLoans.length === 0 ? <Empty text="No loans yet." /> : (
          <ul className="cg-loan-list">
            {myLoans.map((l) => (
              <li key={l.id} className="cg-loan-detail">
                <div className="cg-loan-detail-head">
                  <div>
                    <div className="cg-loan-mini-purpose">{l.purpose}</div>
                    <div className="cg-loan-mini-meta">{naira(l.amount)} · {l.term} months @ {l.rate}% · monthly {naira(l.monthlyPayment)}</div>
                  </div>
                  <StatusBadge status={l.status} />
                </div>
                {l.verification && (
                  <div className="cg-hint">
                    Identity verified at application: face {l.verification.faceMatch ? "✓" : "✗"} · fingerprint {l.verification.fingerprintMatch ? "✓" : "✗"}
                    {l.risk && <> · Credit decision: <b>{l.risk.decision.replace("_", " ")}</b> (score {l.risk.bureau?.score ?? "n/a"})</>}
                  </div>
                )}
                {l.status === "repaying" && (
                  <RepayBox loan={l} onRepay={onRepay} />
                )}
                {l.status === "closed" && <div className="cg-hint">Loan fully repaid. ✅</div>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {isStaff && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Cooperative-wide loan book — staff decisions</h3></div>
          <LoanTable loans={loans} members={members} onDecide={onDecide} isStaff />
        </div>
      )}
    </div>
  );
}

// ---------- Credit check step (BVN simulation) ----------
function CreditCheckStep({ user, amount, onFinish }) {
  const [phase, setPhase] = useState("idle"); // idle -> checking -> done
  const [result, setResult] = useState(null);

  const start = () => {
    setPhase("checking");
    setTimeout(() => {
      setResult(loanRiskAssessment(user, amount));
      setPhase("done");
    }, 1800);
  };

  return (
    <div className="cg-bio">
      <p className="cg-bio-sub">CoopGuard cross-checks the applicant's BVN against participating institutions for existing loans, defaults, and credit score before routing the application.</p>
      <div className="cg-creditcheck-id">
        <CreditCard size={20} />
        <div>
          <div className="cg-creditcheck-name">{user.name}</div>
          <div className="cg-hint">BVN: {user.bvn.slice(0, 3)}••••••{user.bvn.slice(-2)}</div>
        </div>
      </div>

      {phase === "idle" && (
        <button className="cg-btn cg-btn-primary" onClick={start}><Search size={16} /> Run BVN credit check</button>
      )}
      {phase === "checking" && (
        <div className="cg-scanning-row"><div className="cg-spinner" /> Querying credit bureau across participating cooperatives & lenders…</div>
      )}
      {phase === "done" && result && (
        <div className="cg-creditresult">
          <div className="cg-creditresult-head">
            <Gauge size={20} />
            <div>
              <div className="cg-creditresult-score">{result.bureau?.score ?? "—"}<span> / 850</span></div>
              <CreditBandPill score={result.bureau?.score ?? 0} />
            </div>
            <DecisionPill decision={result.decision} />
          </div>
          <ul className="cg-creditresult-reasons">
            {result.reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          {result.decision === "not_eligible" && (
            <div className="cg-hint">Your application will still be submitted for manual review by a loan officer, but automated approval is not available.</div>
          )}
          <button className="cg-btn cg-btn-primary" onClick={onFinish}>Submit application</button>
        </div>
      )}
    </div>
  );
}

function CreditBandPill({ score }) {
  const b = creditBand(score);
  return <span className={`cg-pill cg-pill-${b.cls}`}>{b.label}</span>;
}

function DecisionPill({ decision }) {
  const map = {
    eligible: { label: "Auto-eligible", cls: "ok" },
    conditional: { label: "Eligible (conditions)", cls: "warn" },
    manual_review: { label: "Manual review", cls: "info" },
    not_eligible: { label: "Not eligible", cls: "bad" },
  };
  const d = map[decision] || { label: decision, cls: "muted" };
  return <span className={`cg-pill cg-pill-${d.cls}`}>{d.label}</span>;
}



function RepayBox({ loan, onRepay }) {
  const [amt, setAmt] = useState(loan.monthlyPayment);
  const total = loan.amount * (1 + loan.rate / 100);
  const remaining = Math.max(0, total - (loan.paid || 0));
  const pct = Math.min(100, ((loan.paid || 0) / total) * 100);
  return (
    <div className="cg-repay">
      <div className="cg-progress"><div className="cg-progress-fill" style={{ width: `${pct}%` }} /></div>
      <div className="cg-hint">Repaid {naira(loan.paid || 0)} of {naira(Math.round(total))} · Remaining {naira(Math.round(remaining))}</div>
      <div className="cg-btn-row">
        <input type="number" min="1" max={Math.round(remaining)} value={amt} onChange={(e) => setAmt(Number(e.target.value))} />
        <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onRepay(loan.id, Math.min(amt, remaining))}>Make repayment</button>
      </div>
    </div>
  );
}

function LoanTable({ loans, members, onDecide, isStaff, compact }) {
  if (loans.length === 0) return <Empty text="No loans recorded." />;
  return (
    <div className="cg-table-wrap">
      <table className="cg-table">
        <thead>
          <tr>
            <th>Member</th><th>Amount</th><th>Purpose</th><th>Status</th>
            {isStaff && !compact && <th>Action</th>}
          </tr>
        </thead>
        <tbody>
          {loans.map((l) => {
            const m = members.find((mm) => mm.id === l.userId);
            return (
              <tr key={l.id}>
                <td>{m?.name}</td>
                <td>{naira(l.amount)}</td>
                <td>{l.purpose}</td>
                <td><StatusBadge status={l.status} /></td>
                {isStaff && !compact && (
                  <td>
                    {l.status === "under_review" && (
                      <div className="cg-btn-row">
                        <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => onDecide(l.id, "rejected")}>Reject</button>
                        <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onDecide(l.id, "approved")}>Approve</button>
                      </div>
                    )}
                    {l.status === "approved" && (
                      <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onDecide(l.id, "disbursed")}>Disburse</button>
                    )}
                    {!["under_review", "approved"].includes(l.status) && <span className="cg-hint">—</span>}
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// VOTING
// ============================================================
function VotingPanel({ proposals, members, currentUserId, isStaff, onVote, onCreate }) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [days, setDays] = useState(3);

  return (
    <div className="cg-page">
      <PageHead eyebrow="Governance" title="Decisions & voting portal" desc="Members vote electronically on cooperative matters. Results update live and feed straight into the audit ledger." />

      {isStaff && (
        !showForm ? (
          <button className="cg-btn cg-btn-primary" onClick={() => setShowForm(true)}><Plus size={16} /> Create proposal</button>
        ) : (
          <div className="cg-card">
            <div className="cg-card-head"><h3>New proposal</h3><button className="cg-icon-btn" onClick={() => setShowForm(false)}><X size={16} /></button></div>
            <form className="cg-form" onSubmit={(e) => { e.preventDefault(); if (title.trim()) { onCreate(title, desc, Number(days)); setTitle(""); setDesc(""); setShowForm(false); } }}>
              <label>Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required />
              <label>Description</label>
              <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} />
              <label>Voting window (days)</label>
              <input type="number" min="1" max="30" value={days} onChange={(e) => setDays(e.target.value)} />
              <button type="submit" className="cg-btn cg-btn-primary">Open for voting</button>
            </form>
          </div>
        )
      )}

      {proposals.map((p) => {
        const votes = Object.values(p.votes);
        const yes = votes.filter((v) => v === "yes").length;
        const no = votes.filter((v) => v === "no").length;
        const abstain = votes.filter((v) => v === "abstain").length;
        const total = members.length;
        const cast = votes.length;
        const myVote = p.votes[currentUserId];
        const isOpen = p.deadline > Date.now();
        const yesPct = cast ? (yes / cast) * 100 : 0;
        const noPct = cast ? (no / cast) * 100 : 0;
        const abstainPct = cast ? (abstain / cast) * 100 : 0;

        return (
          <div className="cg-card" key={p.id}>
            <div className="cg-card-head">
              <h3>{p.title}</h3>
              <span className={`cg-status cg-status-${isOpen ? "open" : "closed"}`}>{isOpen ? "Open" : "Closed"}</span>
            </div>
            <p className="cg-prop-desc">{p.description}</p>
            <div className="cg-prop-meta">
              {cast} of {total} members voted · {isOpen ? `Closes ${fmtDate(p.deadline)}` : `Closed ${fmtDate(p.deadline)}`}
            </div>
            <div className="cg-vote-bar">
              <div className="cg-vote-seg yes" style={{ width: `${yesPct}%` }} />
              <div className="cg-vote-seg no" style={{ width: `${noPct}%` }} />
              <div className="cg-vote-seg abstain" style={{ width: `${abstainPct}%` }} />
            </div>
            <div className="cg-vote-legend">
              <span><i className="dot yes" /> Yes — {yes}</span>
              <span><i className="dot no" /> No — {no}</span>
              <span><i className="dot abstain" /> Abstain — {abstain}</span>
            </div>
            {isOpen && (
              <div className="cg-btn-row" style={{ marginTop: 12 }}>
                {["yes", "no", "abstain"].map((choice) => (
                  <button
                    key={choice}
                    className={`cg-btn cg-btn-tiny ${myVote === choice ? "cg-btn-primary" : "cg-btn-secondary"}`}
                    onClick={() => onVote(p.id, choice)}
                  >
                    {myVote === choice ? "✓ " : ""}{choice === "yes" ? "Vote yes" : choice === "no" ? "Vote no" : "Abstain"}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// NOTIFICATIONS
// ============================================================
function NotificationsPanel({ notifs, onMarkAll }) {
  return (
    <div className="cg-page">
      <PageHead eyebrow="Inbox" title="Notifications" desc="Instant alerts for deposits, withdrawals, loan decisions, votes, and announcements." />
      {notifs.some((n) => !n.read) && (
        <button className="cg-btn cg-btn-secondary" onClick={onMarkAll}>Mark all as read</button>
      )}
      {notifs.length === 0 ? <Empty text="No notifications yet." /> : (
        <ul className="cg-notif-list">
          {notifs.map((n) => (
            <li key={n.id} className={`cg-notif ${n.read ? "" : "unread"}`}>
              <Bell size={16} className="cg-notif-icon" />
              <div>
                <div className="cg-notif-title">{n.title}</div>
                <div className="cg-notif-body">{n.body}</div>
                <div className="cg-notif-time">{fmtDate(n.ts)}</div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ============================================================
// AUDIT LEDGER (signature element — hash-chained feed)
// ============================================================
function AuditPanel({ audit }) {
  return (
    <div className="cg-page">
      <PageHead eyebrow="Transparency" title="Tamper-evident audit ledger" desc="Every action in CoopGuard is written to an append-only, hash-chained record. Each entry references the hash of the one before it — altering history would break the chain." />
      <div className="cg-card cg-ledger">
        {audit.slice().reverse().map((entry, i) => (
          <div className="cg-ledger-row" key={entry.id}>
            <div className="cg-ledger-hash">
              <span className="cg-ledger-hash-label">hash</span>
              <code>{entry.hash}</code>
              <span className="cg-ledger-hash-label">prev</span>
              <code className="cg-ledger-prev">{entry.prevHash}</code>
            </div>
            <div className="cg-ledger-body">
              <div className="cg-ledger-action">{entry.action.replace(/_/g, " ")}</div>
              <div className="cg-ledger-detail">
                {entry.actor} {Object.keys(entry.details).length > 0 && `· ${JSON.stringify(entry.details)}`}
              </div>
              <div className="cg-ledger-time">{fmtDate(entry.ts)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FRAUD WATCH (AI fraud detection — heuristic engine)
// ============================================================
function FraudPanel({ flags, members, onReview }) {
  return (
    <div className="cg-page">
      <PageHead eyebrow="AI Fraud Detection" title="Fraud Watch — flagged transactions" desc="A rules-based detection engine continuously scans transactions for patterns associated with mismanagement, layering, or unusual activity." />
      {flags.length === 0 ? (
        <Empty text="No suspicious activity detected yet. Try simulating a large withdrawal in the Virtual Wallet." />
      ) : (
        <div className="cg-card">
          <ul className="cg-flag-list">
            {flags.map((f) => {
              const m = members.find((mm) => mm.id === f.userId);
              return (
                <li key={f.id} className={`cg-flag ${f.reviewed ? "reviewed" : ""}`}>
                  <div className="cg-flag-head">
                    <AlertTriangle size={18} className="cg-flag-icon" />
                    <div>
                      <div className="cg-flag-title">{m?.name} — {f.tx.type.replace("_", " ")} of {naira(f.tx.amount)}</div>
                      <div className="cg-flag-time">{fmtDate(f.ts)}</div>
                    </div>
                    {f.reviewed ? <span className="cg-pill cg-pill-muted">{f.action}</span> : <span className="cg-pill cg-pill-warn">Needs review</span>}
                  </div>
                  <ul className="cg-flag-reasons">
                    {f.flags.map((r, i) => <li key={i}><b>{r.rule.replace(/_/g, " ")}:</b> {r.detail}</li>)}
                  </ul>
                  {!f.reviewed && (
                    <div className="cg-btn-row">
                      <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => onReview(f.id, "dismissed")}>Dismiss</button>
                      <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onReview(f.id, "escalated")}>Escalate to committee</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREDIT & BVN PANEL
// ============================================================
function CreditPanel({ currentUser, members, isStaff }) {
  const bureau = BVN_BUREAU[currentUser.bvn];
  const band = creditBand(currentUser.creditScore);

  return (
    <div className="cg-page">
      <PageHead eyebrow="Identity & Credit" title="Credit profile & BVN verification" desc="Your Bank Verification Number links your cooperative profile to a shared credit history across participating institutions — used to assess loan eligibility fairly." />

      <div className="cg-grid-2">
        <div className="cg-card">
          <div className="cg-card-head"><h3><CreditCard size={18} className="cg-inline-icon" /> Identity</h3></div>
          <div className="cg-creditcheck-id">
            <CreditCard size={28} />
            <div>
              <div className="cg-creditcheck-name">{currentUser.name}</div>
              <div className="cg-hint">BVN: {currentUser.bvn.slice(0, 3)}••••••{currentUser.bvn.slice(-2)}</div>
              <div className="cg-hint">Member: {currentUser.memberNo} · Joined {currentUser.joined}</div>
            </div>
          </div>
          <div className="cg-bio-rows" style={{ marginTop: 12 }}>
            <div className="cg-bio-row"><ScanFace size={16} /> Facial recognition profile <BioPill state={currentUser.biometricEnrolled ? "pass" : "pending"} /></div>
            <div className="cg-bio-row"><Fingerprint size={16} /> Fingerprint template <BioPill state={currentUser.biometricEnrolled ? "pass" : "pending"} /></div>
          </div>
        </div>

        <div className="cg-card">
          <div className="cg-card-head"><h3><Gauge size={18} className="cg-inline-icon" /> Cooperative credit score</h3></div>
          <div className="cg-creditresult-head" style={{ marginTop: 0 }}>
            <Gauge size={28} />
            <div>
              <div className="cg-creditresult-score">{currentUser.creditScore}<span> / 850</span></div>
              <span className={`cg-pill cg-pill-${band.cls}`}>{band.label}</span>
            </div>
          </div>
          <div className="cg-progress" style={{ marginTop: 12 }}>
            <div className="cg-progress-fill" style={{ width: `${(currentUser.creditScore / 850) * 100}%`, background: band.cls === "bad" ? "var(--cg-red)" : band.cls === "warn" ? "var(--cg-teal)" : "#2f7d4f" }} />
          </div>
          <div className="cg-hint">{bureau?.history}</div>
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Cross-institution loan history (via BVN)</h3></div>
        {bureau?.activeLoans.length ? (
          <div className="cg-table-wrap">
            <table className="cg-table">
              <thead><tr><th>Institution</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {bureau.activeLoans.map((l, i) => (
                  <tr key={i}>
                    <td>{l.institution}</td>
                    <td>{l.amount ? naira(l.amount) : "—"}</td>
                    <td><span className={`cg-pill cg-pill-${/overdue|default/i.test(l.status) ? "bad" : "ok"}`}>{l.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <Empty text="No external loan facilities found on this BVN." />}
        <div className="cg-hint" style={{ marginTop: 10 }}>{bureau?.riskNote}</div>
      </div>

      {isStaff && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>All members — credit overview (staff view)</h3></div>
          <div className="cg-table-wrap">
            <table className="cg-table">
              <thead><tr><th>Member</th><th>BVN</th><th>Score</th><th>Band</th><th>External facilities</th></tr></thead>
              <tbody>
                {members.map((m) => {
                  const b = BVN_BUREAU[m.bvn];
                  const band2 = creditBand(m.creditScore);
                  const flagged = b?.activeLoans.some((l) => /overdue|default/i.test(l.status));
                  return (
                    <tr key={m.id}>
                      <td>{m.name}</td>
                      <td>{m.bvn.slice(0,3)}••••••{m.bvn.slice(-2)}</td>
                      <td>{m.creditScore}</td>
                      <td><span className={`cg-pill cg-pill-${band2.cls}`}>{band2.label}</span></td>
                      <td>{flagged ? <span className="cg-pill cg-pill-bad">Overdue elsewhere</span> : <span className="cg-pill cg-pill-ok">Clean</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COOPERATIVE REPUTATION PASSPORT (CRP)
// ============================================================
function ReputationPanel({ currentUser, members, repEvents, disputes, isStaff, onFileComplaint, onResolveDispute }) {
  const score = computeReputationScore(currentUser.reputation);
  const badge = reputationBadge(score);
  const myEvents = repEvents.filter((e) => e.userId === currentUser.id).slice(0, 8);
  const myDisputes = disputes.filter((d) => d.userId === currentUser.id);

  const indicatorKeys = Object.keys(REPUTATION_WEIGHTS);

  return (
    <div className="cg-page">
      <PageHead
        eyebrow="Trust & Identity"
        title="Cooperative Reputation Passport"
        desc="A portable trust profile that follows you across cooperatives — combining loan repaym
