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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Some mobile browsers won't reliably autoplay a stream attached
        // after the initial render, even when muted — kick it explicitly.
        try { await videoRef.current.play(); } catch (playErr) { /* ignore — autoplay attr still applies */ }
      }
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

      {/* Always mounted (just hidden) so the camera stream has a real <video>
          node to attach to the moment getUserMedia resolves — attaching to a
          ref that hasn't mounted yet is what was leaving this black before. */}
      <div className="cg-face-camera" style={{ display: (phase === "live" || phase === "loading") ? "block" : "none" }}>
        <video ref={videoRef} autoPlay playsInline muted />
        <div className={`cg-face-frame status-${display.status}`} />
      </div>

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
        desc="A portable trust profile that follows you across cooperatives — combining loan repayment history, savings consistency, governance compliance, participation, and audit performance into one verifiable score."
      />

      <div className="cg-card cg-passport">
        <div className="cg-passport-top">
          <div>
            <div className="cg-balance-label">Reputation Passport</div>
            <div className="cg-creditcheck-name" style={{ color: "var(--cg-paper)", fontSize: 18 }}>{currentUser.name}</div>
            <div className="cg-passport-id">{passportId(currentUser)} · Member {currentUser.memberNo} · Since {currentUser.joined}</div>
          </div>
          <span className={`cg-rep-badge ${badge.cls}`}><Medal size={14} /> {badge.label} member</span>
        </div>
        <div className="cg-passport-bottom">
          <div className="cg-passport-score">{score}<span>/100</span></div>
          <p className="cg-passport-sub">{reputationInsight(currentUser.reputation)}</p>
        </div>
        <div className="cg-passport-foot">
          <ArrowRightLeft size={14} /> Portable: this Passport ID can be presented to any participating cooperative for instant verification of your standing.
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3><Gauge size={18} className="cg-inline-icon" /> Score breakdown</h3></div>
        <div className="cg-rep-grid">
          {indicatorKeys.map((key) => {
            const val = currentUser.reputation[key] ?? 0;
            return (
              <div className="cg-rep-row" key={key}>
                <div className="cg-rep-name">{REPUTATION_LABELS[key]}</div>
                <div className="cg-rep-weight">{Math.round(REPUTATION_WEIGHTS[key] * 100)}% weight</div>
                <div className="cg-rep-bar"><div className="cg-rep-bar-fill" style={{ width: `${val}%`, background: val >= 85 ? "#2f7d4f" : val >= 70 ? "var(--cg-teal)" : val >= 50 ? "#c98a4f" : "var(--cg-red)" }} /></div>
                <div className="cg-rep-score">{val}/100</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="cg-grid-2">
        <div className="cg-card">
          <div className="cg-card-head"><h3><History size={18} className="cg-inline-icon" /> Reputation history</h3></div>
          {myEvents.length === 0 ? <Empty text="No reputation-affecting events recorded yet. Deposits, repayments, votes, and meeting attendance all build your passport." /> : (
            <ul className="cg-rep-history">
              {myEvents.map((e) => (
                <li className="cg-rep-event" key={e.id}>
                  {e.delta >= 0 ? <TrendingUp size={15} className="cg-rep-event-icon up" /> : <TrendingDown size={15} className="cg-rep-event-icon down" />}
                  <div className="cg-rep-event-body">
                    <div className="cg-rep-event-text">{e.reason}</div>
                    <div className="cg-rep-event-meta">{REPUTATION_LABELS[e.indicator]} · {fmtDate(e.ts)}</div>
                  </div>
                  <div className={`cg-rep-event-delta ${e.delta >= 0 ? "up" : "down"}`}>{e.delta > 0 ? "+" : ""}{e.delta}</div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="cg-card">
          <div className="cg-card-head"><h3><AlertOctagon size={18} className="cg-inline-icon" /> Complaints & dispute records</h3></div>
          {myDisputes.length === 0 ? <Empty text="No complaints on file. A clean dispute record strengthens your audit performance score." /> : (
            <ul className="cg-rep-history">
              {myDisputes.map((d) => (
                <li className="cg-dispute" key={d.id}>
                  <div>
                    <div className="cg-rep-event-text">{d.reason}</div>
                    <div className="cg-rep-event-meta">Raised by {d.raisedBy} · {fmtDate(d.ts)}</div>
                  </div>
                  <span className={`cg-pill cg-pill-${d.status === "resolved" ? "muted" : "warn"}`}>{d.status === "resolved" ? "Resolved" : "Open"}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isStaff && (
        <>
          <div className="cg-card">
            <div className="cg-card-head"><h3><Users size={18} className="cg-inline-icon" /> Cooperative reputation overview</h3></div>
            <div className="cg-table-wrap">
              <table className="cg-table">
                <thead><tr><th>Member</th><th>Passport ID</th><th>Score</th><th>Badge</th><th>Last change</th><th>Status</th></tr></thead>
                <tbody>
                  {members.map((m) => {
                    const s = computeReputationScore(m.reputation);
                    const b = reputationBadge(s);
                    const lastEvent = repEvents.find((e) => e.userId === m.id);
                    const openDispute = disputes.some((d) => d.userId === m.id && d.status === "open");
                    return (
                      <tr key={m.id}>
                        <td>{m.name}</td>
                        <td><code className="cg-passport-id-inline">{passportId(m)}</code></td>
                        <td>{s}/100</td>
                        <td><span className={`cg-rep-badge ${b.cls}`}><Medal size={12} /> {b.label}</span></td>
                        <td>
                          {lastEvent ? (
                            <span className={lastEvent.delta >= 0 ? "cg-text-ok" : "cg-text-bad"}>
                              {lastEvent.delta > 0 ? "+" : ""}{lastEvent.delta} {REPUTATION_LABELS[lastEvent.indicator]}
                            </span>
                          ) : <span className="cg-hint">—</span>}
                        </td>
                        <td>
                          {s < 50 ? <span className="cg-pill cg-pill-bad">Early warning</span> : openDispute ? <span className="cg-pill cg-pill-warn">Open dispute</span> : <span className="cg-pill cg-pill-ok">Good standing</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <ComplaintsAndVerify members={members} disputes={disputes} onFileComplaint={onFileComplaint} onResolveDispute={onResolveDispute} currentUserId={currentUser.id} />
        </>
      )}
    </div>
  );
}

// ---------- Staff tools: file complaints, resolve disputes, verify external passports ----------
function ComplaintsAndVerify({ members, disputes, onFileComplaint, onResolveDispute, currentUserId }) {
  const [complaintMember, setComplaintMember] = useState(members.find((m) => m.id !== currentUserId)?.id || "");
  const [complaintReason, setComplaintReason] = useState("");
  const [verifyId, setVerifyId] = useState("");
  const [verifyResult, setVerifyResult] = useState(null); // { kind: 'external'|'internal'|'notfound', data }

  const submitComplaint = (e) => {
    e.preventDefault();
    if (!complaintMember || !complaintReason.trim()) return;
    onFileComplaint(complaintMember, complaintReason.trim());
    setComplaintReason("");
  };

  const runVerify = (e) => {
    e.preventDefault();
    const id = verifyId.trim().toUpperCase();
    if (!id) return;
    const ext = EXTERNAL_PASSPORTS[id];
    if (ext) {
      setVerifyResult({ kind: "external", data: ext, score: computeReputationScore(ext.reputation), badge: reputationBadge(computeReputationScore(ext.reputation)) });
      return;
    }
    const internal = members.find((m) => passportId(m) === id);
    if (internal) {
      setVerifyResult({ kind: "internal", data: internal, score: computeReputationScore(internal.reputation), badge: reputationBadge(computeReputationScore(internal.reputation)) });
      return;
    }
    setVerifyResult({ kind: "notfound" });
  };

  return (
    <div className="cg-grid-2">
      <div className="cg-card">
        <div className="cg-card-head"><h3><AlertOctagon size={18} className="cg-inline-icon" /> Member complaints & dispute records</h3></div>
        {disputes.length === 0 ? <Empty text="No disputes on record." /> : (
          <ul className="cg-rep-history">
            {disputes.map((d) => {
              const m = members.find((mm) => mm.id === d.userId);
              return (
                <li className={`cg-dispute ${d.status === "resolved" ? "resolved" : ""}`} key={d.id}>
                  <div>
                    <div className="cg-rep-event-text">{m?.name}: {d.reason}</div>
                    <div className="cg-rep-event-meta">Raised by {d.raisedBy} · {fmtDate(d.ts)}</div>
                  </div>
                  {d.status === "resolved" ? (
                    <span className="cg-pill cg-pill-muted">Resolved</span>
                  ) : (
                    <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => onResolveDispute(d.id)}>Mark resolved</button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="cg-rep-divider" />
        <h4 className="cg-rep-subhead">File a new complaint</h4>
        <form className="cg-form" onSubmit={submitComplaint}>
          <label>Member</label>
          <select value={complaintMember} onChange={(e) => setComplaintMember(e.target.value)}>
            {members.filter((m) => m.id !== currentUserId).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label>Reason / dispute details</label>
          <textarea rows={2} value={complaintReason} onChange={(e) => setComplaintReason(e.target.value)} placeholder="e.g. Missed two consecutive contribution deadlines" required />
          <button type="submit" className="cg-btn cg-btn-secondary">Log complaint on passport</button>
          <div className="cg-hint">Logging a complaint lowers the member's audit performance score and creates an open dispute record.</div>
        </form>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3><Building2 size={18} className="cg-inline-icon" /> Verify a Reputation Passport</h3></div>
        <p className="cg-bio-sub">A member transferring from another cooperative can present their Passport ID. Enter it below to instantly verify their savings, loan, and governance history before accepting them.</p>
        <form className="cg-form" onSubmit={runVerify}>
          <label>Passport ID</label>
          <input type="text" placeholder="e.g. CRP-7C2F9A3D" value={verifyId} onChange={(e) => setVerifyId(e.target.value)} />
          <div className="cg-hint">Try CRP-7C2F9A3D (clean record) or CRP-1B5E8F02 (open dispute elsewhere).</div>
          <button type="submit" className="cg-btn cg-btn-primary"><Search size={16} /> Verify passport</button>
        </form>

        {verifyResult?.kind === "notfound" && (
          <div className="cg-verify-result">
            <div className="cg-hint">No Reputation Passport found with that ID.</div>
          </div>
        )}
        {verifyResult && verifyResult.kind !== "notfound" && (
          <div className="cg-verify-result">
            <div className="cg-creditresult-head" style={{ marginTop: 0 }}>
              <Award size={22} />
              <div>
                <div className="cg-creditresult-name">{verifyResult.data.name}</div>
                <div className="cg-hint">{verifyResult.kind === "external" ? verifyResult.data.homeCoop : "Existing member of this cooperative"}</div>
              </div>
              <span className={`cg-rep-badge ${verifyResult.badge.cls}`}><Medal size={12} /> {verifyResult.badge.label}</span>
            </div>
            <div className="cg-creditresult-score" style={{ marginTop: 8 }}>{verifyResult.score}<span> /100</span></div>
            <div className="cg-rep-grid" style={{ marginTop: 10 }}>
              {Object.keys(REPUTATION_WEIGHTS).map((key) => (
                <div className="cg-rep-row" key={key}>
                  <div className="cg-rep-name">{REPUTATION_LABELS[key]}</div>
                  <div className="cg-rep-weight">{Math.round(REPUTATION_WEIGHTS[key] * 100)}%</div>
                  <div className="cg-rep-bar"><div className="cg-rep-bar-fill" style={{ width: `${verifyResult.data.reputation[key]}%`, background: "var(--cg-teal)" }} /></div>
                  <div className="cg-rep-score">{verifyResult.data.reputation[key]}/100</div>
                </div>
              ))}
            </div>
            {verifyResult.kind === "external" && <div className="cg-hint" style={{ marginTop: 10 }}>{verifyResult.data.notes}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

function MeetingPanel({ currentUser, members, chat, onSend, onJoin }) {
  const [text, setText] = useState("");
  const [joined, setJoined] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const onlineMembers = members.filter((m) => ["u1", "u2", "u4", currentUser.id].includes(m.id));

  return (
    <div className="cg-page">
      <PageHead eyebrow="Governance" title="Live cooperative meeting" desc="Join the virtual meeting room for general meetings, board sessions, and decision walkthroughs — with live chat alongside." />

      {!joined ? (
        <div className="cg-card cg-meeting-lobby">
          <Video size={40} />
          <h3>Monthly General Meeting — in progress</h3>
          <p className="cg-hint">12 members currently in the room. Joining is simulated — no camera or microphone access is requested.</p>
          <button className="cg-btn cg-btn-primary" onClick={() => { setJoined(true); onJoin?.(); }}><Video size={16} /> Join meeting</button>
        </div>
      ) : (
        <div className="cg-meeting-grid">
          <div className="cg-card cg-meeting-stage">
            <div className="cg-meeting-tiles">
              {onlineMembers.map((m) => (
                <div className={`cg-meeting-tile ${m.id === currentUser.id ? "self" : ""}`} key={m.id}>
                  {camOn || m.id !== currentUser.id ? (
                    <div className="cg-meeting-avatar">{m.name.split(" ").map(n=>n[0]).slice(0,2).join("")}</div>
                  ) : (
                    <div className="cg-meeting-avatar cg-meeting-camoff"><VideoOff size={20} /></div>
                  )}
                  <div className="cg-meeting-tile-name">{m.name}{m.id === currentUser.id ? " (You)" : ""}</div>
                  {m.role !== "member" && <span className="cg-meeting-tag">{m.role.replace("_"," ")}</span>}
                </div>
              ))}
            </div>
            <div className="cg-meeting-controls">
              <button className={`cg-meeting-btn ${micOn ? "" : "off"}`} onClick={() => setMicOn(!micOn)}>{micOn ? <Mic size={18} /> : <MicOff size={18} />}</button>
              <button className={`cg-meeting-btn ${camOn ? "" : "off"}`} onClick={() => setCamOn(!camOn)}>{camOn ? <Video size={18} /> : <VideoOff size={18} />}</button>
              <button className="cg-meeting-btn cg-meeting-leave" onClick={() => setJoined(false)}><PhoneOff size={18} /></button>
            </div>
          </div>

          <div className="cg-card cg-meeting-chat">
            <div className="cg-card-head"><h3><MessageSquare size={16} className="cg-inline-icon" /> Meeting chat</h3></div>
            <div className="cg-chat-list">
              {chat.map((c) => {
                const m = members.find((mm) => mm.id === c.userId);
                return (
                  <div className={`cg-chat-msg ${c.userId === currentUser.id ? "self" : ""}`} key={c.id}>
                    <div className="cg-chat-author">{m?.name}</div>
                    <div className="cg-chat-text">{c.text}</div>
                    <div className="cg-chat-time">{fmtDate(c.ts)}</div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>
            <form className="cg-chat-input" onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }}>
              <input type="text" placeholder="Type a message…" value={text} onChange={(e) => setText(e.target.value)} />
              <button type="submit" className="cg-btn cg-btn-primary cg-btn-tiny"><Send size={14} /></button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOAN OFFICER DESK
// ============================================================
function LoanOfficerPanel({ loans, members, onDecide }) {
  const pending = loans.filter((l) => ["under_review", "pending_guarantors"].includes(l.status));

  return (
    <div className="cg-page">
      <PageHead eyebrow="Loan Officer Desk" title="Applicant tracking & BVN credit verification" desc="Review each applicant's automated risk assessment, BVN-linked credit history across institutions, and identity verification status before deciding." />

      {pending.length === 0 ? <Empty text="No applications awaiting your review." /> : (
        pending.map((l) => {
          const m = members.find((mm) => mm.id === l.userId);
          const band = m ? creditBand(m.creditScore) : null;
          const bureau = m ? BVN_BUREAU[m.bvn] : null;
          return (
            <div className="cg-card" key={l.id}>
              <div className="cg-card-head">
                <h3>{m?.name} — {naira(l.amount)} for {l.purpose}</h3>
                <StatusBadge status={l.status} />
              </div>
              <div className="cg-officer-grid">
                <div>
                  <div className="cg-hint">Identity verification</div>
                  {l.verification ? (
                    <div className="cg-bio-rows">
                      <div className="cg-bio-row"><ScanFace size={16} /> Face <BioPill state={l.verification.faceMatch ? "pass" : "fail"} /></div>
                      <div className="cg-bio-row"><Fingerprint size={16} /> Fingerprint <BioPill state={l.verification.fingerprintMatch ? "pass" : "fail"} /></div>
                    </div>
                  ) : <div className="cg-hint">Not verified at application.</div>}
                </div>
                <div>
                  <div className="cg-hint">BVN credit score</div>
                  <div className="cg-creditresult-head" style={{ marginTop: 4 }}>
                    <Gauge size={20} />
                    <div>
                      <div className="cg-creditresult-score">{m?.creditScore}<span> / 850</span></div>
                      {band && <span className={`cg-pill cg-pill-${band.cls}`}>{band.label}</span>}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="cg-hint">External facilities (via BVN)</div>
                  {bureau?.activeLoans.length ? bureau.activeLoans.map((al, i) => (
                    <div key={i} className="cg-hint">{al.institution}: <span className={/overdue|default/i.test(al.status) ? "cg-text-bad" : ""}>{al.status}</span></div>
                  )) : <div className="cg-hint">None on record.</div>}
                </div>
              </div>
              {l.risk && (
                <div className="cg-creditresult" style={{ marginTop: 10 }}>
                  <div className="cg-creditresult-head" style={{ marginTop: 0 }}>
                    <Brain size={20} />
                    <div className="cg-hint">Automated assessment</div>
                    <DecisionPill decision={l.risk.decision} />
                  </div>
                  <ul className="cg-creditresult-reasons">
                    {l.risk.reasons.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </div>
              )}
              {l.status === "under_review" && (
                <div className="cg-btn-row" style={{ marginTop: 10 }}>
                  <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => onDecide(l.id, "rejected")}>Reject</button>
                  <button className="cg-btn cg-btn-tiny cg-btn-primary" onClick={() => onDecide(l.id, "approved")}>Approve</button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ============================================================
// AI OPERATIONS CENTER — Coop Guard Intelligence
// Operational-intelligence layer: OBSERVE → ANALYZE → REASON → ACT →
// ESCALATE → HUMAN APPROVAL → AUDIT. AI handles the routine; humans
// control the decisions.
// ============================================================

const AI_WORKFLOW = [
  { key: "observe", label: "Observe", icon: Search, desc: "Monitors contributions, savings, loans, repayments, transactions and governance activity as it happens." },
  { key: "analyze", label: "Analyze", icon: Gauge, desc: "Identifies unusual patterns, repayment issues, loan-risk indicators and inconsistent records." },
  { key: "reason", label: "Reason", icon: Brain, desc: "Explains why something needs attention — no unexplained decisions." },
  { key: "act", label: "Act", icon: CheckCircle2, desc: "Handles approved low-risk tasks: reminders, notifications, summaries, routine reports." },
  { key: "escalate", label: "Escalate", icon: AlertTriangle, desc: "Routes anything with financial, governance or security consequence to a human." },
  { key: "approve", label: "Human approval", icon: Users, desc: "Administrator reviews the recommendation and approves or rejects it." },
  { key: "audit", label: "Audit", icon: Hash, desc: "Every recommendation, action and decision is written to the audit ledger." },
];

const AI_HUB = [
  { key: "loans", label: "Loans", icon: FileText, steps: "Analyze → Assess → Recommend" },
  { key: "transactions", label: "Transactions", icon: ArrowRightLeft, steps: "Monitor → Detect → Alert" },
  { key: "repayments", label: "Repayments", icon: Clock, steps: "Track → Remind → Escalate" },
  { key: "admin", label: "Administration", icon: ShieldCheck, steps: "Automate → Summarize → Report" },
  { key: "governance", label: "Governance", icon: Vote, steps: "Monitor → Summarize → Assist" },
];

const AI_AUTONOMY = [
  {
    level: "Automatic", cls: "auto", icon: CheckCircle2,
    desc: "Low-risk routine tasks. AI executes.",
    examples: ["Repayment reminders", "Routine notifications", "Meeting summaries", "Routine reports"],
  },
  {
    level: "Review", cls: "review", icon: ShieldQuestion,
    desc: "AI recommends → human approves or rejects.",
    examples: ["Loan recommendations", "Suspicious activity alerts", "High-risk cases"],
  },
  {
    level: "Human control", cls: "human", icon: Users,
    desc: "Critical decisions. Human decides.",
    examples: ["Final loan approval", "Account termination", "Major financial actions", "Governance decisions"],
  },
];

const AI_BEFORE = ["Checks transactions manually", "Reviews loan applications one by one", "Tracks repayments by hand", "Sends reminders individually", "Prepares reports from scratch", "Searches records manually", "Monitors member activity manually"];
const AI_AFTER = ["Continuously monitors every activity", "Identifies exceptions automatically", "Performs routine tasks on its own", "Prepares clear recommendations", "Sends approved routine notifications", "Generates instant summaries", "Escalates only what matters"];

function AiOperationsCenter({ scans, members, fraudFlags, loans, audit, currentUser, setTab }) {
  const unreviewedFlags = fraudFlags.filter((f) => !f.reviewed);
  const highRiskFlags = unreviewedFlags.filter((f) => f.flags.length >= 2);
  const watchFlags = unreviewedFlags.filter((f) => f.flags.length === 1);

  const riskyLoans = loans.filter((l) => l.risk && ["under_review", "pending_guarantors"].includes(l.status));
  const highRiskLoans = riskyLoans.filter((l) => l.risk.decision === "not_eligible");
  const reviewLoans = riskyLoans.filter((l) => l.risk.decision === "conditional");

  const totalMonitored = Math.max(0, audit.length - 1); // exclude SYSTEM_INIT
  const highPriorityCount = highRiskFlags.length + highRiskLoans.length;
  const attentionCount = watchFlags.length + reviewLoans.length;
  const normalCount = Math.max(0, totalMonitored - highPriorityCount - attentionCount);

  const repayingLoans = loans.filter((l) => l.status === "repaying").length;

  const priorityAlerts = [
    ...highRiskLoans.map((l) => {
      const m = members.find((mm) => mm.id === l.userId);
      return { id: `loan-${l.id}`, kind: "loan", severity: "high", title: `Loan application #${l.id}`, sub: `${m?.name} · ${naira(l.amount)}`, reason: l.risk.reasons[0], go: "officer" };
    }),
    ...reviewLoans.map((l) => {
      const m = members.find((mm) => mm.id === l.userId);
      return { id: `loan-${l.id}`, kind: "loan", severity: "moderate", title: `Loan application #${l.id}`, sub: `${m?.name} · ${naira(l.amount)}`, reason: l.risk.reasons[0], go: "officer" };
    }),
    ...highRiskFlags.map((f) => {
      const m = members.find((mm) => mm.id === f.userId);
      return { id: `flag-${f.id}`, kind: "transaction", severity: "high", title: `Transaction anomaly · ${m?.name}`, sub: `${naira(f.tx.amount)} ${f.tx.type.replace("_", " ")}`, reason: f.flags[0]?.detail, go: "fraud" };
    }),
    ...watchFlags.map((f) => {
      const m = members.find((mm) => mm.id === f.userId);
      return { id: `flag-${f.id}`, kind: "transaction", severity: "moderate", title: `Transaction anomaly · ${m?.name}`, sub: `${naira(f.tx.amount)} ${f.tx.type.replace("_", " ")}`, reason: f.flags[0]?.detail, go: "fraud" };
    }),
  ].slice(0, 6);

  return (
    <div className="cg-page cg-ai-center">
      <PageHead eyebrow="AI-powered cooperative operations" title="Meet Coop Guard Intelligence" desc="An AI Operations Agent designed to reduce administrative workload and help cooperative teams focus on decisions that matter. AI handles the routine. Humans control the decisions." />

      {/* ---- Operations Center header ---- */}
      <div className="cg-card cg-ai-hero">
        <div className="cg-ai-hero-greet">Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, {currentUser.name.split(" ")[0]}.</div>
        <div className="cg-ai-hero-sub">Coop Guard Intelligence has monitored <strong>{totalMonitored}</strong> activities this session.</div>
        <div className="cg-ai-hero-stats">
          <div className="cg-ai-hero-stat">
            <span className="cg-ai-hero-num ok">{normalCount}</span>
            <span className="cg-ai-hero-label">Normal</span>
          </div>
          <div className="cg-ai-hero-stat">
            <span className="cg-ai-hero-num warn">{attentionCount}</span>
            <span className="cg-ai-hero-label">Requires attention</span>
          </div>
          <div className="cg-ai-hero-stat">
            <span className="cg-ai-hero-num bad">{highPriorityCount}</span>
            <span className="cg-ai-hero-label">High priority</span>
          </div>
        </div>
      </div>

      {/* ---- Priority alerts ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><AlertTriangle size={16} /> Priority alerts</h3></div>
        {priorityAlerts.length === 0 ? (
          <Empty text="Nothing needs attention right now. The agent is quietly monitoring in the background." />
        ) : (
          <div className="cg-ai-alerts">
            {priorityAlerts.map((a) => (
              <div className={`cg-ai-alert cg-ai-alert-${a.severity}`} key={a.id}>
                <div className="cg-ai-alert-icon">{a.severity === "high" ? <AlertOctagon size={18} /> : <ShieldQuestion size={18} />}</div>
                <div className="cg-ai-alert-body">
                  <div className="cg-ai-alert-title">{a.title}</div>
                  <div className="cg-hint">{a.sub}</div>
                  <div className="cg-ai-alert-reason"><strong>Reason:</strong> {a.reason}</div>
                </div>
                <div className="cg-ai-alert-side">
                  <span className={`cg-pill cg-pill-${a.severity === "high" ? "bad" : "warn"}`}>{a.severity === "high" ? "High priority" : "Moderate"}</span>
                  <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => setTab(a.go)}>Review {a.kind === "loan" ? "application" : "transaction"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ---- Operations summary ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><FileText size={16} /> Operations summary</h3></div>
        <div className="cg-ai-summary-grid">
          <div className="cg-ai-summary-item">
            <span className="cg-ai-summary-num">{repayingLoans}</span>
            <span>repayment reminder{repayingLoans === 1 ? "" : "s"} ready to send automatically</span>
          </div>
          <div className="cg-ai-summary-item">
            <span className="cg-ai-summary-num">{highRiskLoans.length}</span>
            <span>loan{highRiskLoans.length === 1 ? "" : "s"} escalated for manual review</span>
          </div>
          <div className="cg-ai-summary-item">
            <span className="cg-ai-summary-num">{unreviewedFlags.length}</span>
            <span>financial anomal{unreviewedFlags.length === 1 ? "y" : "ies"} awaiting review</span>
          </div>
        </div>
      </div>

      {/* ---- How the agent works ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><Brain size={16} /> How the agent works</h3></div>
        <div className="cg-ai-flow">
          {AI_WORKFLOW.map((step, i) => (
            <React.Fragment key={step.key}>
              <div className="cg-ai-flow-step">
                <div className="cg-ai-flow-icon"><step.icon size={18} /></div>
                <div className="cg-ai-flow-label">{step.label}</div>
                <div className="cg-ai-flow-desc">{step.desc}</div>
              </div>
              {i < AI_WORKFLOW.length - 1 && <ChevronRight className="cg-ai-flow-arrow" size={16} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ---- Hub: connected across the cooperative ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><ShieldCheck size={16} /> Connected across Coop Guard</h3></div>
        <div className="cg-ai-hub">
          <div className="cg-ai-hub-center"><Brain size={26} /><span>Coop Guard<br />Intelligence</span></div>
          <div className="cg-ai-hub-spokes">
            {AI_HUB.map((h) => (
              <div className="cg-ai-hub-spoke" key={h.key}>
                <div className="cg-ai-hub-spoke-icon"><h.icon size={16} /></div>
                <div className="cg-ai-hub-spoke-label">{h.label}</div>
                <div className="cg-ai-hub-spoke-steps">{h.steps}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ---- Autonomy model ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><Lock size={16} /> AI autonomy model</h3></div>
        <div className="cg-ai-autonomy">
          {AI_AUTONOMY.map((a) => (
            <div className={`cg-ai-autonomy-col cg-ai-autonomy-${a.cls}`} key={a.level}>
              <div className="cg-ai-autonomy-icon"><a.icon size={18} /></div>
              <div className="cg-ai-autonomy-level">{a.level}</div>
              <div className="cg-ai-autonomy-desc">{a.desc}</div>
              <ul className="cg-ai-autonomy-examples">
                {a.examples.map((ex) => <li key={ex}>{ex}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Before / after ---- */}
      <div className="cg-card">
        <div className="cg-card-head"><h3><History size={16} /> From manual administration to intelligent operations</h3></div>
        <div className="cg-ai-baf">
          <div className="cg-ai-baf-col">
            <div className="cg-ai-baf-head cg-ai-baf-before">Before Coop Guard</div>
            <ul>{AI_BEFORE.map((t) => <li key={t}>{t}</li>)}</ul>
          </div>
          <div className="cg-ai-baf-col">
            <div className="cg-ai-baf-head cg-ai-baf-after">With Coop Guard AI</div>
            <ul>{AI_AFTER.map((t) => <li key={t}>{t}</li>)}</ul>
            <div className="cg-ai-baf-role">Administrator: <strong>Reviews → Approves/Rejects → Oversees</strong></div>
          </div>
        </div>
      </div>

      {/* ---- Live activity feed (real-time simulation) ---- */}
      <AiLiveFeed scans={scans} members={members} />

      <div className="cg-hint cg-ai-disclaimer">Prototype interface — figures reflect this simulated session only, not real financial data.</div>
    </div>
  );
}

// ============================================================
// AI LIVE FEED — real-time simulated fraud-scanning feed (AUDIT step)
// ============================================================
function AiLiveFeed({ scans, members }) {
  return (
    <div className="cg-card">
      <div className="cg-card-head"><h3><Hash size={16} /> Live activity feed</h3></div>
      <div className="cg-hint" style={{ marginBottom: 10 }}>Every wallet transaction is scanned the instant it's created and scored against behavioral, threshold and pattern-based rules.</div>
      {scans.length === 0 ? (
        <Empty text="No scans yet. Deposits and withdrawals from the Virtual Wallet will appear here in real time." />
      ) : (
        <div className="cg-ai-feed">
          {scans.map((s) => {
            const m = members.find((mm) => mm.id === s.userId);
            return (
              <div className={`cg-ai-row cg-ai-${s.verdict}`} key={s.id}>
                <div className="cg-ai-icon">
                  {s.verdict === "clear" && <CheckCircle2 size={18} />}
                  {s.verdict === "watch" && <ShieldQuestion size={18} />}
                  {s.verdict === "high_risk" && <AlertTriangle size={18} />}
                </div>
                <div className="cg-ai-body">
                  <div className="cg-ai-title">{m?.name} — {s.tx.type.replace("_"," ")} of {naira(s.tx.amount)}</div>
                  <div className="cg-hint">{fmtDate(s.ts)} · {s.flags.length} rule(s) triggered</div>
                  {s.flags.length > 0 && (
                    <ul className="cg-ai-reasons">
                      {s.flags.map((f, i) => <li key={i}>{f.detail}</li>)}
                    </ul>
                  )}
                </div>
                <span className={`cg-pill cg-pill-${s.verdict === "clear" ? "ok" : s.verdict === "watch" ? "warn" : "bad"}`}>
                  {s.verdict === "clear" ? "Clear" : s.verdict === "watch" ? "Watchlist" : "High risk"}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


function AdminPanel({ members, loans, tx, setMembers, pushAudit, pushNotification, currentUser, isAdmin }) {
  const toggleStatus = (id) => {
    setMembers((prev) => prev.map((m) => {
      if (m.id !== id) return m;
      const status = m.status === "active" ? "suspended" : "active";
      pushAudit("MEMBER_STATUS_CHANGE", currentUser.name, { member: m.name, status });
      pushNotification(id, status === "suspended" ? "Account suspended" : "Account reactivated", status === "suspended" ? "Your account has been suspended by the cooperative administrator." : "Your account has been reactivated.");
      return { ...m, status };
    }));
  };

  return (
    <div className="cg-page">
      <PageHead eyebrow="Administration" title="Cooperative control center" desc="Manage members, oversee the savings book, and post announcements — all changes are written to the audit ledger." />
      <div className="cg-card">
        <div className="cg-card-head"><h3>Member directory</h3></div>
        <div className="cg-table-wrap">
          <table className="cg-table">
            <thead><tr><th>Member</th><th>No.</th><th>Role</th><th>Balance</th><th>Status</th>{isAdmin && <th>Action</th>}</tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.memberNo}</td>
                  <td>{m.role.replace("_", " ")}</td>
                  <td>{naira(m.balance)}</td>
                  <td><span className={`cg-pill ${m.status === "active" ? "cg-pill-ok" : "cg-pill-warn"}`}>{m.status}</span></td>
                  {isAdmin && (
                    <td>
                      <button className="cg-btn cg-btn-tiny cg-btn-secondary" onClick={() => toggleStatus(m.id)} disabled={m.id === currentUser.id}>
                        {m.status === "active" ? "Suspend" : "Reactivate"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>All transactions (cooperative-wide)</h3></div>
        <div className="cg-table-wrap">
          <table className="cg-table">
            <thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>Date</th><th>Note</th></tr></thead>
            <tbody>
              {tx.slice(0, 20).map((t) => {
                const m = members.find((mm) => mm.id === t.userId);
                return (
                  <tr key={t.id}>
                    <td>{m?.name}</td>
                    <td>{t.type.replace("_", " ")}</td>
                    <td>{naira(t.amount)}</td>
                    <td>{fmtDate(t.ts)}</td>
                    <td>{t.desc}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SHARED UI BITS
// ============================================================
function PageHead({ eyebrow, title, desc }) {
  return (
    <div className="cg-pagehead">
      <div className="cg-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{desc}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: { label: "Draft", cls: "muted" },
    pending_guarantors: { label: "Awaiting guarantors", cls: "warn" },
    under_review: { label: "Under review", cls: "warn" },
    approved: { label: "Approved", cls: "ok" },
    rejected: { label: "Rejected", cls: "bad" },
    disbursed: { label: "Disbursed", cls: "ok" },
    repaying: { label: "Repaying", cls: "info" },
    closed: { label: "Closed", cls: "muted" },
  };
  const m = map[status] || { label: status, cls: "muted" };
  return <span className={`cg-pill cg-pill-${m.cls}`}>{m.label}</span>;
}

function Toast({ toast }) {
  return (
    <div className={`cg-toast cg-toast-${toast.kind}`}>
      {toast.kind === "success" && <CheckCircle2 size={16} />}
      {toast.kind === "error" && <XCircle size={16} />}
      {toast.kind === "info" && <Bell size={16} />}
      <span>{toast.msg}</span>
    </div>
  );
}

// ============================================================
// STYLES
// ============================================================
function Style() {
  return (
    <style>{`
      .cg-root {
        --cg-ink: #16233A;
        --cg-paper: #F7F9FA;
        --cg-paper-2: #EEF2F4;
        --cg-navy: #0E1A30;
        --cg-navy-2: #1B2E4D;
        --cg-teal: #569192;
        --cg-blue: #2E5C8A;
        --cg-red: #C0392B;
        --cg-line: #DCE3E7;
        font-family: 'Inter', -apple-system, system-ui, sans-serif;
        color: var(--cg-ink);
        background: var(--cg-paper);
        min-height: 100vh;
        -webkit-font-smoothing: antialiased;
      }
      .cg-root * { box-sizing: border-box; }
      .cg-shell { display: flex; min-height: 100vh; }

      /* Sidebar */
      .cg-sidebar {
        width: 248px; flex-shrink: 0; background: var(--cg-navy);
        color: var(--cg-paper); display: flex; flex-direction: column;
        padding: 24px 16px; position: sticky; top: 0; height: 100vh;
      }
      .cg-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 24px; border-bottom: 1px solid rgba(247,243,232,0.12); margin-bottom: 16px; }
      .cg-brand-mark { width: 34px; height: 34px; border-radius: 8px; background: var(--cg-teal); color: var(--cg-navy); display: flex; align-items: center; justify-content: center; }
      .cg-brand-name { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-weight: 700; font-size: 17px; letter-spacing: 0.02em; }
      .cg-brand-sub { font-size: 11px; opacity: 0.65; letter-spacing: 0.06em; text-transform: uppercase; }
      .cg-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .cg-nav-item {
        display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
        background: none; border: none; color: var(--cg-paper); opacity: 0.78; font-size: 13.5px;
        cursor: pointer; text-align: left; font-family: inherit; position: relative; transition: 0.15s;
      }
      .cg-nav-item:hover { opacity: 1; background: rgba(247,243,232,0.06); }
      .cg-nav-item.active { opacity: 1; background: rgba(86,145,146,0.16); color: var(--cg-teal); font-weight: 600; }
      .cg-nav-badge { margin-left: auto; background: var(--cg-red); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 6px; }
      .cg-sidebar-foot { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(247,243,232,0.12); }
      .cg-sim-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin-bottom: 6px; }
      .cg-select { width: 100%; background: rgba(247,243,232,0.08); color: var(--cg-paper); border: 1px solid rgba(247,243,232,0.2); border-radius: 6px; padding: 7px 8px; font-size: 12.5px; font-family: inherit; margin-bottom: 12px; }
      .cg-select option { color: var(--cg-ink); }
      .cg-disclaimer { font-size: 10.5px; opacity: 0.55; line-height: 1.5; }

      /* Main */
      .cg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .cg-topbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 32px; border-bottom: 1px solid var(--cg-line); background: var(--cg-paper); }
      .cg-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cg-navy-2); font-weight: 700; margin-bottom: 4px; }
      .cg-topbar-name { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
      .cg-mini-stat { text-align: right; }
      .cg-mini-label { display: block; font-size: 11px; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; }
      .cg-mini-value { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 22px; font-weight: 700; color: var(--cg-navy); }
      .cg-content { padding: 28px 32px 60px; flex: 1; }
      .cg-page { display: flex; flex-direction: column; gap: 20px; max-width: 1100px; }
      .cg-pagehead h1 { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 28px; margin: 4px 0 8px; }
      .cg-pagehead p { color: #4B5563; font-size: 14px; max-width: 640px; line-height: 1.6; margin: 0; }

      /* Stats grid */
      .cg-grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
      .cg-stat { background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; border-left: 4px solid var(--cg-navy); }
      .cg-accent-green { border-left-color: var(--cg-navy); }
      .cg-accent-gold { border-left-color: var(--cg-teal); }
      .cg-accent-blue { border-left-color: var(--cg-blue); }
      .cg-accent-red { border-left-color: var(--cg-red); }
      .cg-stat-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--cg-paper-2); display: flex; align-items: center; justify-content: center; color: var(--cg-navy); flex-shrink: 0; }
      .cg-stat-value { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 21px; font-weight: 700; }
      .cg-stat-label { font-size: 12px; color: #64748B; margin-top: 2px; }

      /* Cards */
      .cg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 880px) { .cg-grid-2 { grid-template-columns: 1fr; } }
      .cg-card { background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 18px 20px; }
      .cg-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .cg-card-head h3 { font-size: 15px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; }
      .cg-inline-icon { color: var(--cg-navy); vertical-align: -3px; }
      .cg-inline-icon.credit { color: #2f7d4f; }
      .cg-inline-icon.debit { color: var(--cg-red); }
      .cg-balance-card { background: linear-gradient(135deg, var(--cg-navy) 0%, var(--cg-navy-2) 100%); color: var(--cg-paper); border: none; }
      .cg-balance-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
      .cg-balance-value { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 38px; font-weight: 700; color: var(--cg-teal); margin: 4px 0; }
      .cg-balance-sub { font-size: 12.5px; opacity: 0.7; }

      /* Tx list */
      .cg-tx-list, .cg-loan-list, .cg-notif-list, .cg-flag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .cg-tx-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #E7ECEE; }
      .cg-tx-row:last-child { border-bottom: none; }
      .cg-tx-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cg-tx-icon.credit { background: #e6f4ea; color: #2f7d4f; }
      .cg-tx-icon.debit { background: #fbe9e7; color: var(--cg-red); }
      .cg-tx-body { flex: 1; min-width: 0; }
      .cg-tx-desc { font-size: 13.5px; font-weight: 600; }
      .cg-tx-meta { font-size: 11.5px; color: #6B7785; }
      .cg-tx-amount { font-weight: 700; font-size: 14px; white-space: nowrap; }
      .cg-tx-amount.credit { color: #2f7d4f; }
      .cg-tx-amount.debit { color: var(--cg-red); }

      .cg-loan-mini, .cg-loan-detail { padding: 10px 0; border-bottom: 1px solid #E7ECEE; display: flex; flex-direction: column; gap: 8px; }
      .cg-loan-mini { flex-direction: row; align-items: center; justify-content: space-between; }
      .cg-loan-mini:last-child, .cg-loan-detail:last-child { border-bottom: none; }
      .cg-loan-detail-head { display: flex; justify-content: space-between; align-items: center; }
      .cg-loan-mini-purpose { font-weight: 600; font-size: 13.5px; }
      .cg-loan-mini-meta { font-size: 11.5px; color: #6B7785; }

      .cg-empty { color: #94A3AC; font-size: 13px; padding: 20px 0; text-align: center; font-style: italic; }

      /* Forms */
      .cg-form { display: flex; flex-direction: column; gap: 6px; }
      .cg-form label { font-size: 12px; font-weight: 600; color: #4B5563; margin-top: 6px; }
      .cg-form input, .cg-form select, .cg-form textarea {
        border: 1px solid var(--cg-line); border-radius: 8px; padding: 9px 11px; font-size: 13.5px; font-family: inherit; background: var(--cg-paper);
      }
      .cg-form input:focus, .cg-form select:focus, .cg-form textarea:focus { outline: 2px solid var(--cg-teal); outline-offset: 1px; }
      .cg-hint { font-size: 11.5px; color: #6B7785; margin-top: 4px; }
      .cg-estimate { background: var(--cg-paper-2); border-radius: 8px; padding: 8px 11px; font-size: 13px; margin-top: 6px; }
      .cg-checkrow { display: flex; flex-wrap: wrap; gap: 10px; }
      .cg-check { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; background: var(--cg-paper-2); padding: 5px 10px; border-radius: 999px; }

      /* Buttons */
      .cg-btn { border: none; border-radius: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; transition: 0.15s; }
      .cg-btn-primary { background: var(--cg-navy); color: var(--cg-paper); }
      .cg-btn-primary:hover { background: var(--cg-navy-2); }
      .cg-btn-secondary { background: var(--cg-paper-2); color: var(--cg-ink); border: 1px solid var(--cg-line); }
      .cg-btn-secondary:hover { background: #E3E8EB; }
      .cg-btn-tiny { padding: 5px 11px; font-size: 12px; }
      .cg-btn-row { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
      .cg-btn-row input[type=number] { width: 110px; border: 1px solid var(--cg-line); border-radius: 8px; padding: 6px 8px; font-family: inherit; }
      .cg-icon-btn { background: none; border: none; cursor: pointer; color: #6B7785; padding: 4px; }

      /* Status pills */
      .cg-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: capitalize; display: inline-block; }
      .cg-pill-ok { background: #e6f4ea; color: #2f7d4f; }
      .cg-pill-warn { background: #fdf3da; color: #a4760d; }
      .cg-pill-bad { background: #fbe9e7; color: var(--cg-red); }
      .cg-pill-info { background: #e6eef7; color: var(--cg-blue); }
      .cg-pill-muted { background: var(--cg-paper-2); color: #64748B; }
      .cg-pill { margin-left: 8px; background: rgba(86,145,146,0.16); color: var(--cg-teal); }

      /* Table */
      .cg-table-wrap { overflow-x: auto; }
      .cg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .cg-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6B7785; padding: 8px 10px; border-bottom: 2px solid var(--cg-line); }
      .cg-table td { padding: 10px; border-bottom: 1px solid #E7ECEE; }

      /* Repay */
      .cg-progress { height: 6px; background: var(--cg-paper-2); border-radius: 999px; overflow: hidden; }
      .cg-progress-fill { height: 100%; background: var(--cg-teal); }
      .cg-repay { display: flex; flex-direction: column; gap: 6px; }

      /* Voting */
      .cg-status-open { background: #e6f4ea; color: #2f7d4f; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .cg-status-closed { background: var(--cg-paper-2); color: #64748B; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .cg-prop-desc { font-size: 13.5px; color: #4B5563; line-height: 1.6; margin: 0 0 8px; }
      .cg-prop-meta { font-size: 11.5px; color: #6B7785; margin-bottom: 10px; }
      .cg-vote-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--cg-paper-2); }
      .cg-vote-seg.yes { background: #2f7d4f; }
      .cg-vote-seg.no { background: var(--cg-red); }
      .cg-vote-seg.abstain { background: #C7CFD6; }
      .cg-vote-legend { display: flex; gap: 16px; font-size: 12px; margin-top: 8px; color: #4B5563; }
      .cg-vote-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
      .cg-vote-legend .dot.yes { background: #2f7d4f; }
      .cg-vote-legend .dot.no { background: var(--cg-red); }
      .cg-vote-legend .dot.abstain { background: #C7CFD6; }

      /* Notifications */
      .cg-notif { display: flex; gap: 12px; padding: 12px; border-radius: 10px; background: var(--cg-paper-2); }
      .cg-notif.unread { background: #EAF4F3; border-left: 3px solid var(--cg-teal); }
      .cg-notif-icon { color: var(--cg-navy); margin-top: 2px; }
      .cg-notif-title { font-weight: 700; font-size: 13.5px; }
      .cg-notif-body { font-size: 12.5px; color: #4B5563; margin-top: 2px; }
      .cg-notif-time { font-size: 11px; color: #94A3AC; margin-top: 4px; }

      /* Audit ledger */
      .cg-ledger { display: flex; flex-direction: column; gap: 0; max-height: 640px; overflow-y: auto; }
      .cg-ledger-row { display: grid; grid-template-columns: 220px 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid #E7ECEE; align-items: center; }
      .cg-ledger-row:first-child { background: #EAF4F3; margin: -10px -20px 0; padding: 14px 20px; border-radius: 10px 10px 0 0; }
      .cg-ledger-hash { display: flex; flex-direction: column; gap: 2px; font-size: 11px; }
      .cg-ledger-hash code { background: var(--cg-navy); color: var(--cg-teal); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 11px; display: inline-block; width: fit-content; }
      .cg-ledger-prev { background: var(--cg-paper-2) !important; color: #64748B !important; }
      .cg-ledger-hash-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #94A3AC; }
      .cg-ledger-action { font-weight: 700; font-size: 13px; text-transform: capitalize; }
      .cg-ledger-detail { font-size: 12px; color: #4B5563; font-family: 'SF Mono', monospace; word-break: break-all; }
      .cg-ledger-time { font-size: 11px; color: #94A3AC; margin-top: 2px; }

      /* Fraud */
      .cg-flag { border: 1px solid var(--cg-line); border-radius: 10px; padding: 14px; }
      .cg-flag.reviewed { opacity: 0.6; }
      .cg-flag-head { display: flex; align-items: flex-start; gap: 10px; }
      .cg-flag-icon { color: var(--cg-red); margin-top: 2px; }
      .cg-flag-title { font-weight: 700; font-size: 13.5px; }
      .cg-flag-time { font-size: 11px; color: #94A3AC; }
      .cg-flag-reasons { margin: 10px 0 0 28px; font-size: 12.5px; color: #4B5563; display: flex; flex-direction: column; gap: 3px; }

      /* Toast */
      .cg-toast {
        position: fixed; bottom: 24px; right: 24px; background: var(--cg-navy); color: var(--cg-paper);
        padding: 12px 18px; border-radius: 10px; display: flex; align-items: center; gap: 8px;
        font-size: 13.5px; font-weight: 600; box-shadow: 0 8px 24px rgba(14,26,48,0.3); z-index: 999;
        animation: cg-toast-in 0.25s ease;
      }
      .cg-toast-error { background: var(--cg-red); }
      .cg-toast-success { background: #2f7d4f; }
      @keyframes cg-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      /* Sign-in page — light, matches landing-page branding */
      .cg-signin { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at 30% 15%, rgba(86,145,146,0.10), transparent 55%), var(--cg-paper-2); }
      .cg-signin-card { background: #fff; border: 1px solid var(--cg-line); border-radius: 18px; padding: 36px; max-width: 480px; width: 100%; box-shadow: 0 20px 50px -20px rgba(15,30,45,0.18); }
      .cg-signin-brand { display: flex; align-items: center; justify-content: center; margin-bottom: 22px; }
      .cg-signin-logo { height: 34px; width: auto; display: block; }
      .cg-signin-welcome h2 { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 21px; margin: 0 0 6px; letter-spacing: -0.01em; color: var(--cg-navy); text-align: center; }
      .cg-signin-welcome p { font-size: 13.5px; color: #4B5563; line-height: 1.6; margin: 0 0 16px; text-align: center; }
      .cg-signin-security-note { display: flex; align-items: flex-start; gap: 8px; background: var(--cg-paper-2); border-radius: 10px; padding: 10px 12px; font-size: 12px; line-height: 1.55; color: #4B5563; margin-bottom: 18px; }
      .cg-signin-security-note svg { flex-shrink: 0; margin-top: 1px; color: var(--cg-teal); }
      .cg-btn-block { width: 100%; justify-content: center; margin-top: 8px; }
      .cg-signin-pin-field { position: relative; display: flex; align-items: center; }
      .cg-signin-pin-field input { width: 100%; padding-right: 40px; }
      .cg-signin-pin-toggle { position: absolute; right: 10px; background: none; border: none; padding: 4px; cursor: pointer; color: #6B7785; display: flex; align-items: center; }
      .cg-signin-pin-toggle:hover { color: var(--cg-ink); }
      .cg-signin-row { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; }
      .cg-signin-remember { font-size: 12.5px; color: #4B5563; }
      .cg-signin-link { background: none; border: none; padding: 0; font: inherit; font-size: 12.5px; color: var(--cg-blue); cursor: pointer; text-decoration: underline; text-underline-offset: 2px; }
      .cg-signin-error { background: #fbe9e7; color: var(--cg-red); font-size: 12.5px; padding: 8px 10px; border-radius: 8px; margin-top: 10px; }
      .cg-signin-steps-preview { display: flex; align-items: center; justify-content: center; gap: 6px; margin: 16px 0 4px; font-size: 11.5px; color: #8A97A3; }
      .cg-signin-steps-label { text-transform: uppercase; letter-spacing: 0.05em; font-size: 10.5px; margin-right: 2px; }
      .cg-signin-steps-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--cg-paper-2); border-radius: 999px; padding: 3px 9px; color: #6B7785; }
      .cg-signin-steps-chip.is-next { color: var(--cg-teal-deep, var(--cg-teal)); background: #E3F5F2; font-weight: 600; }
      .cg-signin-create { text-align: center; font-size: 12.5px; color: #4B5563; margin-top: 16px; }
      .cg-signin-notice { display: flex; align-items: flex-start; gap: 8px; background: #EAF2F8; border: 1px solid #CBDCEA; border-radius: 10px; padding: 12px; margin-top: 14px; font-size: 12.5px; }
      .cg-signin-notice svg { flex-shrink: 0; margin-top: 2px; color: var(--cg-blue); }
      .cg-signin-notice strong { display: block; font-size: 13px; margin-bottom: 3px; }
      .cg-signin-notice p { margin: 0; color: #4B5563; line-height: 1.5; }
      .cg-signin-notice .cg-icon-btn { margin-left: auto; }
      .cg-signin-demo { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--cg-line); }
      .cg-signin-demo-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #6B7785; margin-bottom: 8px; }
      .cg-signin-demo-grid { display: flex; flex-direction: column; gap: 6px; }
      .cg-signin-demo-chip { text-align: left; background: var(--cg-paper-2); border: 1px solid var(--cg-line); border-radius: 8px; padding: 8px 10px; font-size: 12.5px; cursor: pointer; font-family: inherit; display: flex; justify-content: space-between; align-items: center; }
      .cg-signin-demo-chip:hover { background: #E3E8EB; }
      .cg-signin-demo-role { color: #6B7785; text-transform: capitalize; font-size: 11px; }
      .cg-signin-footer { color: #6B7785; font-size: 12px; margin-top: 16px; text-align: center; max-width: 480px; line-height: 1.5; }
      .cg-signin-progress { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 20px; }
      .cg-signin-progress-step { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; color: #A6B0B9; padding: 5px 10px; border-radius: 999px; background: var(--cg-paper-2); }
      .cg-signin-progress-step.is-active { color: #fff; background: var(--cg-teal); }
      .cg-signin-progress-step.is-done { color: #2f7d4f; background: #E3F5EA; }
      .cg-signin-progress-line { width: 18px; height: 2px; background: var(--cg-line); }
      .cg-signin-progress-line.is-done { background: #8fd3a8; }

      /* Biometric — shared (loan-application BiometricStep) */
      .cg-bio h2 { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 18px; margin: 0 0 4px; }
      .cg-bio-sub { font-size: 13px; color: #4B5563; line-height: 1.6; margin: 0 0 14px; }
      .cg-bio-stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; background: var(--cg-paper-2); border-radius: 12px; margin-bottom: 14px; }
      .cg-bio-face { width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 3px solid var(--cg-line); display: flex; align-items: center; justify-content: center; color: #6B7785; position: relative; overflow: hidden; transition: 0.3s; }
      .cg-bio-face.scanning { border-color: var(--cg-teal); color: var(--cg-teal); }
      .cg-bio-face.ok { border-color: #2f7d4f; color: #2f7d4f; }
      .cg-bio-face.bad { border-color: var(--cg-red); color: var(--cg-red); }
      .cg-bio-scanline { position: absolute; left: 0; right: 0; height: 3px; background: var(--cg-teal); box-shadow: 0 0 12px var(--cg-teal); animation: cg-scan 1.2s ease-in-out infinite; }
      @keyframes cg-scan { 0% { top: 0; } 50% { top: 90px; } 100% { top: 0; } }
      .cg-bio-status { font-size: 13px; text-align: center; color: #4B5563; min-height: 20px; }
      .cg-bio-pass { color: #2f7d4f; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; justify-content: center; }
      .cg-bio-fail { color: var(--cg-red); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
      .cg-bio-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
      .cg-bio-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
      .cg-bio-pill { margin-left: auto; }
      .cg-bio-noenroll { background: var(--cg-paper-2); border-radius: 10px; padding: 12px; margin-bottom: 14px; font-size: 13px; }
      .cg-bio-noenroll p { margin: 0 0 8px; color: #4B5563; }
      .cg-pill-scanning, .cg-pill-info { background: #e6eef7; color: var(--cg-blue); }

      /* Biometric — login-specific (Face + Fingerprint verification) */
      .cg-bio-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
      .cg-bio-head .cg-icon-btn { flex-shrink: 0; margin-top: 2px; }
      .cg-bio-disclaimer { font-size: 11px; color: #8A97A3; line-height: 1.5; margin: 14px 0 0; text-align: center; }
      .cg-face-footer { justify-content: center; gap: 20px; margin-top: 14px; }
      .cg-face-permission { display: flex; flex-direction: column; align-items: center; gap: 12px; text-align: center; padding: 32px 16px; background: var(--cg-paper-2); border-radius: 14px; color: #4B5563; }
      .cg-face-permission svg { color: var(--cg-teal); }
      .cg-face-permission p { font-size: 13px; line-height: 1.6; margin: 0; max-width: 340px; }
      .cg-face-permission-error svg { color: var(--cg-red); }
      .cg-face-spinner { width: 26px; height: 26px; border-radius: 50%; border: 3px solid var(--cg-line); border-top-color: var(--cg-teal); animation: cg-spin 0.8s linear infinite; }
      @keyframes cg-spin { to { transform: rotate(360deg); } }
      .cg-face-camera { position: relative; width: 100%; aspect-ratio: 4 / 3; border-radius: 14px; overflow: hidden; background: #0B1220; margin-bottom: 10px; }
      .cg-face-camera video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
      .cg-face-frame { position: absolute; inset: 12%; border: 3px solid rgba(255,255,255,0.55); border-radius: 50% / 46%; box-shadow: 0 0 0 2000px rgba(11,18,32,0.35); pointer-events: none; transition: border-color 0.25s ease; }
      .cg-face-frame.status-positioning { border-color: #F2C94C; }
      .cg-face-frame.status-active { border-color: #4CD787; }
      .cg-face-status-text { text-align: center; font-size: 13.5px; font-weight: 600; color: var(--cg-navy); margin: 0 0 4px; min-height: 18px; }
      .cg-face-hint { text-align: center; font-size: 11.5px; color: #8A97A3; display: flex; align-items: center; justify-content: center; gap: 5px; margin: 0 0 8px; }
      .cg-face-instruction { text-align: center; }
      .cg-face-instruction p { font-size: 13.5px; color: #4B5563; margin: 0 0 6px; }
      .cg-face-success-icon { color: #2f7d4f; display: flex; align-items: center; justify-content: center; margin-bottom: 6px; }
      .cg-face-steps { display: flex; flex-direction: column; gap: 8px; margin: 10px 0 4px; }
      .cg-face-step { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #8A97A3; padding: 8px 10px; border-radius: 8px; transition: 0.2s; }
      .cg-face-step.is-active { background: var(--cg-paper-2); color: var(--cg-ink); font-weight: 600; }
      .cg-face-step.is-done { color: #2f7d4f; }
      .cg-face-step-dot { width: 20px; height: 20px; border-radius: 50%; background: #EEF2F4; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; color: inherit; }
      .cg-face-step.is-done .cg-face-step-dot { background: #E3F5EA; }
      .cg-face-step.is-active .cg-face-step-dot { background: var(--cg-teal); color: #fff; }

      .cg-fingerprint-stage { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 32px 16px; background: var(--cg-paper-2); border-radius: 14px; margin-bottom: 14px; }
      .cg-fingerprint-sensor { position: relative; width: 104px; height: 104px; border-radius: 50%; background: #fff; border: 3px solid var(--cg-line); display: flex; align-items: center; justify-content: center; color: #6B7785; cursor: pointer; transition: 0.2s; }
      .cg-fingerprint-sensor:hover:not(:disabled) { border-color: var(--cg-teal); color: var(--cg-teal); }
      .cg-fingerprint-sensor:disabled { cursor: default; }
      .cg-fingerprint-sensor.scanning { border-color: var(--cg-teal); color: var(--cg-teal); }
      .cg-fingerprint-sensor.success { border-color: #2f7d4f; color: #2f7d4f; }
      .cg-fingerprint-ring { position: absolute; inset: -6px; border-radius: 50%; border: 3px solid var(--cg-teal); opacity: 0; animation: cg-fp-ring 1.5s ease-out infinite; }
      @keyframes cg-fp-ring { 0% { opacity: 0.7; transform: scale(0.9); } 100% { opacity: 0; transform: scale(1.25); } }
      .cg-fingerprint-check { position: absolute; bottom: -4px; right: -4px; background: #2f7d4f; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
      .cg-fingerprint-status { font-size: 13px; color: #4B5563; text-align: center; min-height: 20px; }

      .cg-access-granted { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 20px 8px 8px; }
      .cg-access-check { width: 64px; height: 64px; border-radius: 50%; background: #E3F5EA; color: #2f7d4f; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; animation: cg-access-pop 0.35s ease; }
      @keyframes cg-access-pop { from { transform: scale(0.7); opacity: 0; } to { transform: scale(1); opacity: 1; } }
      .cg-access-granted h2 { font-size: 19px; margin: 0 0 6px; color: var(--cg-navy); }
      .cg-access-granted p { font-size: 13px; color: #6B7785; margin: 0; }

      /* Credit check */
      .cg-creditcheck-id { display: flex; align-items: center; gap: 12px; background: var(--cg-paper-2); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      .cg-creditcheck-name { font-weight: 700; font-size: 14px; }
      .cg-scanning-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #4B5563; padding: 10px 0; }
      .cg-spinner { width: 18px; height: 18px; border: 3px solid var(--cg-paper-2); border-top-color: var(--cg-teal); border-radius: 50%; animation: cg-spin 0.8s linear infinite; }
      @keyframes cg-spin { to { transform: rotate(360deg); } }
      .cg-creditresult { background: var(--cg-paper-2); border-radius: 10px; padding: 14px; }
      .cg-creditresult-head { display: flex; align-items: center; gap: 12px; }
      .cg-creditresult-score { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 24px; font-weight: 700; }
      .cg-creditresult-score span { font-size: 13px; color: #6B7785; font-weight: 400; }
      .cg-creditresult-reasons { margin: 10px 0; padding-left: 20px; font-size: 12.5px; color: #4B5563; display: flex; flex-direction: column; gap: 4px; }
      .cg-creditresult-name { font-weight: 700; font-size: 14px; }
      .cg-text-bad { color: var(--cg-red); font-weight: 700; }
      .cg-text-ok { color: #2f7d4f; font-weight: 700; }

      /* Reputation Passport */
      .cg-passport { background: linear-gradient(135deg, var(--cg-navy) 0%, var(--cg-navy-2) 100%); color: var(--cg-paper); border: none; }
      .cg-passport-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
      .cg-passport-id { font-family: 'SF Mono', monospace; font-size: 11.5px; letter-spacing: 0.06em; opacity: 0.75; margin-top: 4px; }
      .cg-passport-bottom { margin-top: 16px; }
      .cg-passport-score { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 44px; font-weight: 700; color: var(--cg-teal); line-height: 1; }
      .cg-passport-score span { font-size: 14px; color: var(--cg-paper); opacity: 0.6; font-weight: 400; }
      .cg-passport-sub { font-size: 13px; opacity: 0.85; margin: 6px 0 0; line-height: 1.6; max-width: 640px; }
      .cg-passport-foot { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(247,243,232,0.15); font-size: 12px; opacity: 0.75; display: flex; align-items: center; gap: 8px; }
      .cg-passport-id-inline { font-size: 11px; background: var(--cg-paper-2); color: #4B5563; padding: 2px 6px; border-radius: 4px; }

      .cg-passport-mini { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; }
      @media (max-width: 700px) { .cg-passport-mini { grid-template-columns: 1fr; } }
      .cg-passport-score-mini { font-family: 'Inter', -apple-system, system-ui, sans-serif; font-size: 36px; font-weight: 700; color: var(--cg-navy); line-height: 1; }
      .cg-passport-score-mini span { font-size: 13px; color: #6B7785; font-weight: 400; }
      .cg-passport-mini-body { min-width: 0; }

      .cg-rep-badge { font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 999px; display: inline-flex; align-items: center; gap: 5px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
      .cg-rep-badge.gold { background: linear-gradient(135deg, #f5d985, #d4a537); color: #5c4400; }
      .cg-rep-badge.silver { background: linear-gradient(135deg, #eef0f3, #b9bcc6); color: #4a4f5c; }
      .cg-rep-badge.bronze { background: linear-gradient(135deg, #e6b793, #b87333); color: #4a2c12; }
      .cg-rep-badge.risk { background: #fbe9e7; color: var(--cg-red); }

      .cg-rep-grid { display: flex; flex-direction: column; gap: 12px; }
      .cg-rep-row { display: grid; grid-template-columns: 1fr 80px 1fr 56px; gap: 12px; align-items: center; }
      @media (max-width: 700px) { .cg-rep-row { grid-template-columns: 1fr 56px; grid-template-rows: auto auto; } .cg-rep-bar { grid-column: 1 / -1; } }
      .cg-rep-name { font-size: 13px; font-weight: 600; }
      .cg-rep-weight { font-size: 11px; color: #6B7785; text-align: center; }
      .cg-rep-bar { height: 8px; background: var(--cg-paper-2); border-radius: 999px; overflow: hidden; }
      .cg-rep-bar-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
      .cg-rep-score { font-size: 12.5px; font-weight: 700; text-align: right; color: #4B5563; }

      .cg-rep-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
      .cg-rep-event { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #E7ECEE; }
      .cg-rep-event:last-child { border-bottom: none; }
      .cg-rep-event-icon.up { color: #2f7d4f; margin-top: 2px; }
      .cg-rep-event-icon.down { color: var(--cg-red); margin-top: 2px; }
      .cg-rep-event-body { flex: 1; min-width: 0; }
      .cg-rep-event-text { font-size: 13px; font-weight: 600; }
      .cg-rep-event-meta { font-size: 11px; color: #6B7785; margin-top: 2px; }
      .cg-rep-event-delta { font-weight: 700; font-size: 13px; white-space: nowrap; }
      .cg-rep-event-delta.up { color: #2f7d4f; }
      .cg-rep-event-delta.down { color: var(--cg-red); }

      .cg-dispute { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #E7ECEE; }
      .cg-dispute:last-child { border-bottom: none; }
      .cg-dispute.resolved { opacity: 0.6; }

      .cg-rep-divider { border-top: 1px solid var(--cg-line); margin: 16px 0 12px; }
      .cg-rep-subhead { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
      .cg-verify-result { background: var(--cg-paper-2); border-radius: 10px; padding: 14px; margin-top: 12px; }

      /* Meeting */
      .cg-meeting-lobby { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; text-align: center; color: var(--cg-navy); }
      .cg-meeting-lobby h3 { font-family: 'Inter', -apple-system, system-ui, sans-serif; margin: 4px 0; }
      .cg-meeting-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
      @media (max-width: 880px) { .cg-meeting-grid { grid-template-columns: 1fr; } }
      .cg-meeting-stage { background: var(--cg-navy); color: var(--cg-paper); display: flex; flex-direction: column; gap: 16px; }
      .cg-meeting-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
      .cg-meeting-tile { background: rgba(247,243,232,0.06); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; border: 1px solid rgba(247,243,232,0.1); }
      .cg-meeting-tile.self { border-color: var(--cg-teal); }
      .cg-meeting-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--cg-teal); color: var(--cg-navy); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
      .cg-meeting-camoff { background: rgba(247,243,232,0.15); color: var(--cg-paper); }
      .cg-meeting-tile-name { font-size: 12px; text-align: center; }
      .cg-meeting-tag { position: absolute; top: 6px; right: 6px; background: var(--cg-teal); color: var(--cg-navy); font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px; text-transform: capitalize; }
      .cg-meeting-controls { display: flex; gap: 10px; justify-content: center; }
      .cg-meeting-btn { width: 42px; height: 42px; border-radius: 50%; border: none; background: rgba(247,243,232,0.1); color: var(--cg-paper); display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .cg-meeting-btn.off { background: var(--cg-red); }
      .cg-meeting-leave { background: var(--cg-red); }
      .cg-meeting-chat { display: flex; flex-direction: column; height: 480px; }
      .cg-chat-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
      .cg-chat-msg { background: var(--cg-paper-2); border-radius: 10px; padding: 8px 10px; max-width: 90%; }
      .cg-chat-msg.self { align-self: flex-end; background: rgba(86,145,146,0.16); }
      .cg-chat-author { font-size: 11px; font-weight: 700; color: var(--cg-navy); }
      .cg-chat-text { font-size: 13px; margin: 2px 0; }
      .cg-chat-time { font-size: 10px; color: #94A3AC; }
      .cg-chat-input { display: flex; gap: 8px; }
      .cg-chat-input input { flex: 1; border: 1px solid var(--cg-line); border-radius: 8px; padding: 9px 11px; font-size: 13px; font-family: inherit; }

      /* Loan officer desk */
      .cg-officer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 8px; }
      @media (max-width: 880px) { .cg-officer-grid { grid-template-columns: 1fr; } }

      /* AI feed */
      .cg-ai-feed { display: flex; flex-direction: column; gap: 10px; }
      .cg-ai-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid var(--cg-line); }
      .cg-ai-clear { border-left: 4px solid #2f7d4f; }
      .cg-ai-watch { border-left: 4px solid var(--cg-teal); }
      .cg-ai-high_risk { border-left: 4px solid var(--cg-red); }
      .cg-ai-icon { margin-top: 2px; }
      .cg-ai-clear .cg-ai-icon { color: #2f7d4f; }
      .cg-ai-watch .cg-ai-icon { color: var(--cg-teal); }
      .cg-ai-high_risk .cg-ai-icon { color: var(--cg-red); }
      .cg-ai-body { flex: 1; }
      .cg-ai-title { font-weight: 700; font-size: 13.5px; }
      .cg-ai-reasons { margin: 6px 0 0 18px; font-size: 12px; color: #4B5563; }

      /* AI Operations Center */
      .cg-ai-disclaimer { text-align: center; padding-top: 4px; }

      .cg-ai-hero { background: linear-gradient(135deg, var(--cg-navy), var(--cg-navy-2)); color: var(--cg-paper); border: none; }
      .cg-ai-hero-greet { font-family: 'Inter', sans-serif; font-size: 19px; font-weight: 700; }
      .cg-ai-hero-sub { font-size: 13.5px; opacity: 0.82; margin-top: 4px; }
      .cg-ai-hero-stats { display: flex; gap: 28px; margin-top: 18px; }
      .cg-ai-hero-stat { display: flex; flex-direction: column; gap: 2px; }
      .cg-ai-hero-num { font-size: 26px; font-weight: 800; font-family: 'Inter', sans-serif; }
      .cg-ai-hero-num.ok { color: #6FD3A6; }
      .cg-ai-hero-num.warn { color: #E8C36B; }
      .cg-ai-hero-num.bad { color: #F0958A; }
      .cg-ai-hero-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.75; }

      .cg-ai-alerts { display: flex; flex-direction: column; gap: 10px; }
      .cg-ai-alert { display: flex; align-items: flex-start; gap: 12px; padding: 14px; border-radius: 10px; border: 1px solid var(--cg-line); }
      .cg-ai-alert-high { border-left: 4px solid var(--cg-red); background: #fbe9e7; }
      .cg-ai-alert-moderate { border-left: 4px solid var(--cg-teal); background: #EAF4F3; }
      .cg-ai-alert-icon { margin-top: 2px; }
      .cg-ai-alert-high .cg-ai-alert-icon { color: var(--cg-red); }
      .cg-ai-alert-moderate .cg-ai-alert-icon { color: var(--cg-teal); }
      .cg-ai-alert-body { flex: 1; }
      .cg-ai-alert-title { font-weight: 700; font-size: 13.5px; }
      .cg-ai-alert-reason { font-size: 12.5px; margin-top: 6px; color: #333c47; }
      .cg-ai-alert-side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }

      .cg-ai-summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
      .cg-ai-summary-item { display: flex; flex-direction: column; gap: 4px; padding: 14px; background: var(--cg-paper-2); border-radius: 10px; font-size: 12.5px; color: #4B5563; }
      .cg-ai-summary-num { font-family: 'Inter', sans-serif; font-size: 26px; font-weight: 800; color: var(--cg-navy); }

      .cg-ai-flow { display: flex; align-items: stretch; gap: 6px; overflow-x: auto; padding-bottom: 4px; }
      .cg-ai-flow-step { flex: 1 1 130px; min-width: 130px; background: var(--cg-paper-2); border-radius: 10px; padding: 12px; }
      .cg-ai-flow-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--cg-teal); color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 8px; }
      .cg-ai-flow-label { font-weight: 700; font-size: 13px; margin-bottom: 4px; }
      .cg-ai-flow-desc { font-size: 11.5px; color: #64748B; line-height: 1.45; }
      .cg-ai-flow-arrow { align-self: center; color: #B7C0C7; flex-shrink: 0; }

      .cg-ai-hub { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
      .cg-ai-hub-center { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; width: 110px; height: 110px; border-radius: 50%; background: var(--cg-navy); color: var(--cg-paper); text-align: center; font-size: 11.5px; font-weight: 700; flex-shrink: 0; }
      .cg-ai-hub-spokes { flex: 1; display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
      .cg-ai-hub-spoke { background: var(--cg-paper-2); border-radius: 10px; padding: 12px; }
      .cg-ai-hub-spoke-icon { color: var(--cg-teal); margin-bottom: 6px; }
      .cg-ai-hub-spoke-label { font-weight: 700; font-size: 13px; margin-bottom: 3px; }
      .cg-ai-hub-spoke-steps { font-size: 11px; color: #64748B; }

      .cg-ai-autonomy { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
      .cg-ai-autonomy-col { border-radius: 10px; padding: 16px; border: 1px solid var(--cg-line); }
      .cg-ai-autonomy-auto { background: #E6F4EA; border-color: #bfe3cc; }
      .cg-ai-autonomy-review { background: #EAF4F3; border-color: #bfdbd9; }
      .cg-ai-autonomy-human { background: #FBE9E7; border-color: #f0c9c3; }
      .cg-ai-autonomy-icon { margin-bottom: 8px; }
      .cg-ai-autonomy-auto .cg-ai-autonomy-icon { color: #2f7d4f; }
      .cg-ai-autonomy-review .cg-ai-autonomy-icon { color: var(--cg-teal); }
      .cg-ai-autonomy-human .cg-ai-autonomy-icon { color: var(--cg-red); }
      .cg-ai-autonomy-level { font-weight: 800; font-size: 14px; margin-bottom: 4px; }
      .cg-ai-autonomy-desc { font-size: 12px; color: #4B5563; margin-bottom: 10px; }
      .cg-ai-autonomy-examples { margin: 0; padding-left: 18px; font-size: 12px; color: #333c47; display: flex; flex-direction: column; gap: 4px; }

      .cg-ai-baf { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
      @media (max-width: 880px) { .cg-ai-baf { grid-template-columns: 1fr; } }
      .cg-ai-baf-col ul { margin: 10px 0 0; padding-left: 18px; font-size: 12.5px; color: #333c47; display: flex; flex-direction: column; gap: 7px; }
      .cg-ai-baf-head { font-weight: 800; font-size: 13.5px; padding-bottom: 8px; border-bottom: 2px solid var(--cg-line); }
      .cg-ai-baf-before { color: #6B7785; }
      .cg-ai-baf-after { color: var(--cg-navy); }
      .cg-ai-baf-role { margin-top: 14px; font-size: 12.5px; background: var(--cg-paper-2); border-radius: 8px; padding: 10px 12px; }

      /* Sign out */
      .cg-signout { margin-top: 12px; width: 100%; background: none; border: 1px solid rgba(247,243,232,0.2); color: var(--cg-paper); border-radius: 8px; padding: 8px; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; }
      .cg-signout:hover { background: rgba(247,243,232,0.08); }
    `}</style>
  );
}
