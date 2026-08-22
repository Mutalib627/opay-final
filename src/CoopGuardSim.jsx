import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Wallet, FileText, BarChart3, ShieldCheck, AlertTriangle, Vote, Bell,
  ArrowDownCircle, ArrowUpCircle, CheckCircle2, XCircle, Clock, Users,
  TrendingUp, TrendingDown, Hash, Lock, ChevronRight, X, Plus, LogOut, ShieldAlert,
  ScanFace, Fingerprint, Video, MessageSquare, Send, Search, Gauge,
  CreditCard, Brain, ShieldQuestion, Mic, MicOff, VideoOff, PhoneOff,
  Award, Medal, ArrowRightLeft, AlertOctagon, Building2, History
} from "lucide-react";

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
    { id: "ai", label: "AI Insights", icon: Brain, staffOnly: true },
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
            {tab === "ai" && isStaff && <AiInsightsPanel scans={aiScans} members={members} fraudFlags={fraudFlags} />}
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
  const [error, setError] = useState("");
  const [stage, setStage] = useState("credentials"); // credentials -> biometric -> done
  const [pendingUserId, setPendingUser] = useState(null);
  const pendingUser = members.find((m) => m.id === pendingUserId);

  const handleCredentials = (e) => {
    e.preventDefault();
    const m = members.find((mm) => mm.memberNo.toLowerCase() === memberNo.trim().toLowerCase());
    if (!m) { setError("Member number not recognized. Try CG-0001 to CG-0005."); return; }
    if (pin.length < 4) { setError("Enter your 4-digit PIN (any digits work in this simulation)."); return; }
    setError("");
    setPendingUser(m.id);
    setStage("biometric");
  };

  return (
    <div className="cg-signin">
      <div className="cg-signin-card">
        <div className="cg-signin-brand">
          <div className="cg-brand-mark cg-brand-mark-lg"><Lock size={22} /></div>
          <div>
            <div className="cg-brand-name cg-brand-name-lg">CoopGuard</div>
            <div className="cg-brand-sub">Transparent Digital Cooperative Management — Simulation</div>
          </div>
        </div>

        {stage === "credentials" && (
          <form className="cg-form cg-signin-form" onSubmit={handleCredentials}>
            <h2>Sign in to your cooperative account</h2>
            <label>Member number</label>
            <input type="text" placeholder="e.g. CG-0001" value={memberNo} onChange={(e) => setMemberNo(e.target.value)} autoFocus />
            <label>PIN</label>
            <input type="password" placeholder="••••" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} />
            {error && <div className="cg-signin-error">{error}</div>}
            <button type="submit" className="cg-btn cg-btn-primary cg-btn-block">Continue</button>
            <div className="cg-signin-demo">
              <div className="cg-signin-demo-title">Demo accounts (any 4-digit PIN)</div>
              <div className="cg-signin-demo-grid">
                {members.map((m) => (
                  <button type="button" key={m.id} className="cg-signin-demo-chip" onClick={() => { setMemberNo(m.memberNo); setPin("1234"); }}>
                    {m.memberNo} · {m.name.split(" ")[0]} <span className="cg-signin-demo-role">{m.role.replace("_", " ")}</span>
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {stage === "biometric" && pendingUser && (
          <BiometricStep
            user={pendingUser}
            purpose="sign-in"
            onComplete={() => onSignIn(pendingUser.id)}
            onBack={() => setStage("credentials")}
          />
        )}
      </div>
      <div className="cg-signin-footer">
        Simulation only — no real biometric data, BVN, or funds are processed.
      </div>
    </div>
  );
}

// ============================================================
// BIOMETRIC VERIFICATION STEP (face + fingerprint simulation)
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
            <div className="cg-progress"><div className="cg-progress-fill" style={{ width: `${repScore}%`, background: repBadge.cls === "gold" ? "var(--cg-gold)" : repBadge.cls === "silver" ? "#b9bcc6" : repBadge.cls === "bronze" ? "#c98a4f" : "var(--cg-red)" }} /></div>
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
            <div className="cg-progress-fill" style={{ width: `${(currentUser.creditScore / 850) * 100}%`, background: band.cls === "bad" ? "var(--cg-red)" : band.cls === "warn" ? "var(--cg-gold)" : "#2f7d4f" }} />
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
                <div className="cg-rep-bar"><div className="cg-rep-bar-fill" style={{ width: `${val}%`, background: val >= 85 ? "#2f7d4f" : val >= 70 ? "var(--cg-gold)" : val >= 50 ? "#c98a4f" : "var(--cg-red)" }} /></div>
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
                  <div className="cg-rep-bar"><div className="cg-rep-bar-fill" style={{ width: `${verifyResult.data.reputation[key]}%`, background: "var(--cg-gold)" }} /></div>
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
// AI INSIGHTS — live fraud-scanning feed
// ============================================================
function AiInsightsPanel({ scans, members, fraudFlags }) {
  return (
    <div className="cg-page">
      <PageHead eyebrow="AI Engine" title="AI fraud-detection live feed" desc="Every wallet transaction is scanned the instant it's created. The model scores each transaction against behavioral, threshold, and pattern-based rules and assigns a verdict." />

      {scans.length === 0 ? (
        <Empty text="No scans yet. Deposits and withdrawals from the Virtual Wallet will appear here in real time." />
      ) : (
        <div className="cg-card cg-ai-feed">
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
        --cg-ink: #1A1A1A;
        --cg-paper: #F7F3E8;
        --cg-paper-2: #EFE8D6;
        --cg-green: #0F3D2E;
        --cg-green-2: #16573F;
        --cg-gold: #D4A537;
        --cg-blue: #2E5C8A;
        --cg-red: #C0392B;
        --cg-line: #D9CFB8;
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
        width: 248px; flex-shrink: 0; background: var(--cg-green);
        color: var(--cg-paper); display: flex; flex-direction: column;
        padding: 24px 16px; position: sticky; top: 0; height: 100vh;
      }
      .cg-brand { display: flex; align-items: center; gap: 10px; padding: 0 8px 24px; border-bottom: 1px solid rgba(247,243,232,0.12); margin-bottom: 16px; }
      .cg-brand-mark { width: 34px; height: 34px; border-radius: 8px; background: var(--cg-gold); color: var(--cg-green); display: flex; align-items: center; justify-content: center; }
      .cg-brand-name { font-family: 'Georgia', serif; font-weight: 700; font-size: 17px; letter-spacing: 0.02em; }
      .cg-brand-sub { font-size: 11px; opacity: 0.65; letter-spacing: 0.06em; text-transform: uppercase; }
      .cg-nav { display: flex; flex-direction: column; gap: 2px; flex: 1; }
      .cg-nav-item {
        display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 8px;
        background: none; border: none; color: var(--cg-paper); opacity: 0.78; font-size: 13.5px;
        cursor: pointer; text-align: left; font-family: inherit; position: relative; transition: 0.15s;
      }
      .cg-nav-item:hover { opacity: 1; background: rgba(247,243,232,0.06); }
      .cg-nav-item.active { opacity: 1; background: rgba(212,165,55,0.16); color: var(--cg-gold); font-weight: 600; }
      .cg-nav-badge { margin-left: auto; background: var(--cg-red); color: #fff; font-size: 10px; font-weight: 700; border-radius: 999px; padding: 1px 6px; }
      .cg-sidebar-foot { margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(247,243,232,0.12); }
      .cg-sim-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6; margin-bottom: 6px; }
      .cg-select { width: 100%; background: rgba(247,243,232,0.08); color: var(--cg-paper); border: 1px solid rgba(247,243,232,0.2); border-radius: 6px; padding: 7px 8px; font-size: 12.5px; font-family: inherit; margin-bottom: 12px; }
      .cg-select option { color: var(--cg-ink); }
      .cg-disclaimer { font-size: 10.5px; opacity: 0.55; line-height: 1.5; }

      /* Main */
      .cg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
      .cg-topbar { display: flex; justify-content: space-between; align-items: center; padding: 18px 32px; border-bottom: 1px solid var(--cg-line); background: var(--cg-paper); }
      .cg-eyebrow { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--cg-green-2); font-weight: 700; margin-bottom: 4px; }
      .cg-topbar-name { font-family: 'Georgia', serif; font-size: 19px; font-weight: 700; display: flex; align-items: center; gap: 8px; }
      .cg-mini-stat { text-align: right; }
      .cg-mini-label { display: block; font-size: 11px; color: #8a8068; text-transform: uppercase; letter-spacing: 0.06em; }
      .cg-mini-value { font-family: 'Georgia', serif; font-size: 22px; font-weight: 700; color: var(--cg-green); }
      .cg-content { padding: 28px 32px 60px; flex: 1; }
      .cg-page { display: flex; flex-direction: column; gap: 20px; max-width: 1100px; }
      .cg-pagehead h1 { font-family: 'Georgia', serif; font-size: 28px; margin: 4px 0 8px; }
      .cg-pagehead p { color: #6b6250; font-size: 14px; max-width: 640px; line-height: 1.6; margin: 0; }

      /* Stats grid */
      .cg-grid-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
      .cg-stat { background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 16px; display: flex; gap: 12px; align-items: flex-start; border-left: 4px solid var(--cg-green); }
      .cg-accent-green { border-left-color: var(--cg-green); }
      .cg-accent-gold { border-left-color: var(--cg-gold); }
      .cg-accent-blue { border-left-color: var(--cg-blue); }
      .cg-accent-red { border-left-color: var(--cg-red); }
      .cg-stat-icon { width: 34px; height: 34px; border-radius: 8px; background: var(--cg-paper-2); display: flex; align-items: center; justify-content: center; color: var(--cg-green); flex-shrink: 0; }
      .cg-stat-value { font-family: 'Georgia', serif; font-size: 21px; font-weight: 700; }
      .cg-stat-label { font-size: 12px; color: #8a8068; margin-top: 2px; }

      /* Cards */
      .cg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      @media (max-width: 880px) { .cg-grid-2 { grid-template-columns: 1fr; } }
      .cg-card { background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 18px 20px; }
      .cg-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
      .cg-card-head h3 { font-size: 15px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; }
      .cg-inline-icon { color: var(--cg-green); vertical-align: -3px; }
      .cg-inline-icon.credit { color: #2f7d4f; }
      .cg-inline-icon.debit { color: var(--cg-red); }
      .cg-balance-card { background: linear-gradient(135deg, var(--cg-green) 0%, var(--cg-green-2) 100%); color: var(--cg-paper); border: none; }
      .cg-balance-label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.7; }
      .cg-balance-value { font-family: 'Georgia', serif; font-size: 38px; font-weight: 700; color: var(--cg-gold); margin: 4px 0; }
      .cg-balance-sub { font-size: 12.5px; opacity: 0.7; }

      /* Tx list */
      .cg-tx-list, .cg-loan-list, .cg-notif-list, .cg-flag-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
      .cg-tx-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid #f0ebdd; }
      .cg-tx-row:last-child { border-bottom: none; }
      .cg-tx-icon { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
      .cg-tx-icon.credit { background: #e6f4ea; color: #2f7d4f; }
      .cg-tx-icon.debit { background: #fbe9e7; color: var(--cg-red); }
      .cg-tx-body { flex: 1; min-width: 0; }
      .cg-tx-desc { font-size: 13.5px; font-weight: 600; }
      .cg-tx-meta { font-size: 11.5px; color: #9a8f76; }
      .cg-tx-amount { font-weight: 700; font-size: 14px; white-space: nowrap; }
      .cg-tx-amount.credit { color: #2f7d4f; }
      .cg-tx-amount.debit { color: var(--cg-red); }

      .cg-loan-mini, .cg-loan-detail { padding: 10px 0; border-bottom: 1px solid #f0ebdd; display: flex; flex-direction: column; gap: 8px; }
      .cg-loan-mini { flex-direction: row; align-items: center; justify-content: space-between; }
      .cg-loan-mini:last-child, .cg-loan-detail:last-child { border-bottom: none; }
      .cg-loan-detail-head { display: flex; justify-content: space-between; align-items: center; }
      .cg-loan-mini-purpose { font-weight: 600; font-size: 13.5px; }
      .cg-loan-mini-meta { font-size: 11.5px; color: #9a8f76; }

      .cg-empty { color: #b0a68c; font-size: 13px; padding: 20px 0; text-align: center; font-style: italic; }

      /* Forms */
      .cg-form { display: flex; flex-direction: column; gap: 6px; }
      .cg-form label { font-size: 12px; font-weight: 600; color: #6b6250; margin-top: 6px; }
      .cg-form input, .cg-form select, .cg-form textarea {
        border: 1px solid var(--cg-line); border-radius: 8px; padding: 9px 11px; font-size: 13.5px; font-family: inherit; background: var(--cg-paper);
      }
      .cg-form input:focus, .cg-form select:focus, .cg-form textarea:focus { outline: 2px solid var(--cg-gold); outline-offset: 1px; }
      .cg-hint { font-size: 11.5px; color: #9a8f76; margin-top: 4px; }
      .cg-estimate { background: var(--cg-paper-2); border-radius: 8px; padding: 8px 11px; font-size: 13px; margin-top: 6px; }
      .cg-checkrow { display: flex; flex-wrap: wrap; gap: 10px; }
      .cg-check { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; background: var(--cg-paper-2); padding: 5px 10px; border-radius: 999px; }

      /* Buttons */
      .cg-btn { border: none; border-radius: 8px; padding: 10px 16px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; transition: 0.15s; }
      .cg-btn-primary { background: var(--cg-green); color: var(--cg-paper); }
      .cg-btn-primary:hover { background: var(--cg-green-2); }
      .cg-btn-secondary { background: var(--cg-paper-2); color: var(--cg-ink); border: 1px solid var(--cg-line); }
      .cg-btn-secondary:hover { background: #e6ddc6; }
      .cg-btn-tiny { padding: 5px 11px; font-size: 12px; }
      .cg-btn-row { display: flex; gap: 8px; align-items: center; margin-top: 6px; }
      .cg-btn-row input[type=number] { width: 110px; border: 1px solid var(--cg-line); border-radius: 8px; padding: 6px 8px; font-family: inherit; }
      .cg-icon-btn { background: none; border: none; cursor: pointer; color: #9a8f76; padding: 4px; }

      /* Status pills */
      .cg-pill { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 999px; text-transform: capitalize; display: inline-block; }
      .cg-pill-ok { background: #e6f4ea; color: #2f7d4f; }
      .cg-pill-warn { background: #fdf3da; color: #a4760d; }
      .cg-pill-bad { background: #fbe9e7; color: var(--cg-red); }
      .cg-pill-info { background: #e6eef7; color: var(--cg-blue); }
      .cg-pill-muted { background: var(--cg-paper-2); color: #8a8068; }
      .cg-pill { margin-left: 8px; background: rgba(212,165,55,0.16); color: var(--cg-gold); }

      /* Table */
      .cg-table-wrap { overflow-x: auto; }
      .cg-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .cg-table th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #9a8f76; padding: 8px 10px; border-bottom: 2px solid var(--cg-line); }
      .cg-table td { padding: 10px; border-bottom: 1px solid #f0ebdd; }

      /* Repay */
      .cg-progress { height: 6px; background: var(--cg-paper-2); border-radius: 999px; overflow: hidden; }
      .cg-progress-fill { height: 100%; background: var(--cg-gold); }
      .cg-repay { display: flex; flex-direction: column; gap: 6px; }

      /* Voting */
      .cg-status-open { background: #e6f4ea; color: #2f7d4f; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .cg-status-closed { background: var(--cg-paper-2); color: #8a8068; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
      .cg-prop-desc { font-size: 13.5px; color: #6b6250; line-height: 1.6; margin: 0 0 8px; }
      .cg-prop-meta { font-size: 11.5px; color: #9a8f76; margin-bottom: 10px; }
      .cg-vote-bar { display: flex; height: 10px; border-radius: 999px; overflow: hidden; background: var(--cg-paper-2); }
      .cg-vote-seg.yes { background: #2f7d4f; }
      .cg-vote-seg.no { background: var(--cg-red); }
      .cg-vote-seg.abstain { background: #cbbf9e; }
      .cg-vote-legend { display: flex; gap: 16px; font-size: 12px; margin-top: 8px; color: #6b6250; }
      .cg-vote-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
      .cg-vote-legend .dot.yes { background: #2f7d4f; }
      .cg-vote-legend .dot.no { background: var(--cg-red); }
      .cg-vote-legend .dot.abstain { background: #cbbf9e; }

      /* Notifications */
      .cg-notif { display: flex; gap: 12px; padding: 12px; border-radius: 10px; background: var(--cg-paper-2); }
      .cg-notif.unread { background: #fdf6e3; border-left: 3px solid var(--cg-gold); }
      .cg-notif-icon { color: var(--cg-green); margin-top: 2px; }
      .cg-notif-title { font-weight: 700; font-size: 13.5px; }
      .cg-notif-body { font-size: 12.5px; color: #6b6250; margin-top: 2px; }
      .cg-notif-time { font-size: 11px; color: #b0a68c; margin-top: 4px; }

      /* Audit ledger */
      .cg-ledger { display: flex; flex-direction: column; gap: 0; max-height: 640px; overflow-y: auto; }
      .cg-ledger-row { display: grid; grid-template-columns: 220px 1fr; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0ebdd; align-items: center; }
      .cg-ledger-row:first-child { background: #fdf6e3; margin: -10px -20px 0; padding: 14px 20px; border-radius: 10px 10px 0 0; }
      .cg-ledger-hash { display: flex; flex-direction: column; gap: 2px; font-size: 11px; }
      .cg-ledger-hash code { background: var(--cg-green); color: var(--cg-gold); padding: 2px 6px; border-radius: 4px; font-family: 'SF Mono', monospace; font-size: 11px; display: inline-block; width: fit-content; }
      .cg-ledger-prev { background: var(--cg-paper-2) !important; color: #8a8068 !important; }
      .cg-ledger-hash-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #b0a68c; }
      .cg-ledger-action { font-weight: 700; font-size: 13px; text-transform: capitalize; }
      .cg-ledger-detail { font-size: 12px; color: #6b6250; font-family: 'SF Mono', monospace; word-break: break-all; }
      .cg-ledger-time { font-size: 11px; color: #b0a68c; margin-top: 2px; }

      /* Fraud */
      .cg-flag { border: 1px solid var(--cg-line); border-radius: 10px; padding: 14px; }
      .cg-flag.reviewed { opacity: 0.6; }
      .cg-flag-head { display: flex; align-items: flex-start; gap: 10px; }
      .cg-flag-icon { color: var(--cg-red); margin-top: 2px; }
      .cg-flag-title { font-weight: 700; font-size: 13.5px; }
      .cg-flag-time { font-size: 11px; color: #b0a68c; }
      .cg-flag-reasons { margin: 10px 0 0 28px; font-size: 12.5px; color: #6b6250; display: flex; flex-direction: column; gap: 3px; }

      /* Toast */
      .cg-toast {
        position: fixed; bottom: 24px; right: 24px; background: var(--cg-green); color: var(--cg-paper);
        padding: 12px 18px; border-radius: 10px; display: flex; align-items: center; gap: 8px;
        font-size: 13.5px; font-weight: 600; box-shadow: 0 8px 24px rgba(15,61,46,0.3); z-index: 999;
        animation: cg-toast-in 0.25s ease;
      }
      .cg-toast-error { background: var(--cg-red); }
      .cg-toast-success { background: #2f7d4f; }
      @keyframes cg-toast-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

      /* Sign-in page */
      .cg-signin { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; background: radial-gradient(circle at 30% 20%, rgba(212,165,55,0.12), transparent 50%), var(--cg-green); }
      .cg-signin-card { background: var(--cg-paper); border-radius: 16px; padding: 32px; max-width: 460px; width: 100%; box-shadow: 0 20px 60px rgba(0,0,0,0.25); }
      .cg-signin-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
      .cg-brand-mark-lg { width: 46px; height: 46px; border-radius: 10px; }
      .cg-brand-name-lg { font-size: 22px; }
      .cg-signin-form h2 { font-family: 'Georgia', serif; font-size: 18px; margin: 0 0 8px; }
      .cg-btn-block { width: 100%; justify-content: center; margin-top: 8px; }
      .cg-signin-error { background: #fbe9e7; color: var(--cg-red); font-size: 12.5px; padding: 8px 10px; border-radius: 8px; }
      .cg-signin-demo { margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--cg-line); }
      .cg-signin-demo-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #9a8f76; margin-bottom: 8px; }
      .cg-signin-demo-grid { display: flex; flex-direction: column; gap: 6px; }
      .cg-signin-demo-chip { text-align: left; background: var(--cg-paper-2); border: 1px solid var(--cg-line); border-radius: 8px; padding: 8px 10px; font-size: 12.5px; cursor: pointer; font-family: inherit; display: flex; justify-content: space-between; align-items: center; }
      .cg-signin-demo-chip:hover { background: #e6ddc6; }
      .cg-signin-demo-role { color: #9a8f76; text-transform: capitalize; font-size: 11px; }
      .cg-signin-footer { color: var(--cg-paper); opacity: 0.6; font-size: 12px; margin-top: 16px; text-align: center; max-width: 460px; }

      /* Biometric */
      .cg-bio h2 { font-family: 'Georgia', serif; font-size: 18px; margin: 0 0 4px; }
      .cg-bio-sub { font-size: 13px; color: #6b6250; line-height: 1.6; margin: 0 0 14px; }
      .cg-bio-stage { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 24px; background: var(--cg-paper-2); border-radius: 12px; margin-bottom: 14px; }
      .cg-bio-face { width: 96px; height: 96px; border-radius: 50%; background: #fff; border: 3px solid var(--cg-line); display: flex; align-items: center; justify-content: center; color: #9a8f76; position: relative; overflow: hidden; transition: 0.3s; }
      .cg-bio-face.scanning { border-color: var(--cg-gold); color: var(--cg-gold); }
      .cg-bio-face.ok { border-color: #2f7d4f; color: #2f7d4f; }
      .cg-bio-face.bad { border-color: var(--cg-red); color: var(--cg-red); }
      .cg-bio-scanline { position: absolute; left: 0; right: 0; height: 3px; background: var(--cg-gold); box-shadow: 0 0 12px var(--cg-gold); animation: cg-scan 1.2s ease-in-out infinite; }
      @keyframes cg-scan { 0% { top: 0; } 50% { top: 90px; } 100% { top: 0; } }
      .cg-bio-status { font-size: 13px; text-align: center; color: #6b6250; min-height: 20px; }
      .cg-bio-pass { color: #2f7d4f; font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
      .cg-bio-fail { color: var(--cg-red); font-weight: 700; display: inline-flex; align-items: center; gap: 6px; }
      .cg-bio-rows { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
      .cg-bio-row { display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; }
      .cg-bio-pill { margin-left: auto; }
      .cg-bio-noenroll { background: var(--cg-paper-2); border-radius: 10px; padding: 12px; margin-bottom: 14px; font-size: 13px; }
      .cg-bio-noenroll p { margin: 0 0 8px; color: #6b6250; }
      .cg-pill-scanning, .cg-pill-info { background: #e6eef7; color: var(--cg-blue); }

      /* Credit check */
      .cg-creditcheck-id { display: flex; align-items: center; gap: 12px; background: var(--cg-paper-2); border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      .cg-creditcheck-name { font-weight: 700; font-size: 14px; }
      .cg-scanning-row { display: flex; align-items: center; gap: 10px; font-size: 13px; color: #6b6250; padding: 10px 0; }
      .cg-spinner { width: 18px; height: 18px; border: 3px solid var(--cg-paper-2); border-top-color: var(--cg-gold); border-radius: 50%; animation: cg-spin 0.8s linear infinite; }
      @keyframes cg-spin { to { transform: rotate(360deg); } }
      .cg-creditresult { background: var(--cg-paper-2); border-radius: 10px; padding: 14px; }
      .cg-creditresult-head { display: flex; align-items: center; gap: 12px; }
      .cg-creditresult-score { font-family: 'Georgia', serif; font-size: 24px; font-weight: 700; }
      .cg-creditresult-score span { font-size: 13px; color: #9a8f76; font-weight: 400; }
      .cg-creditresult-reasons { margin: 10px 0; padding-left: 20px; font-size: 12.5px; color: #6b6250; display: flex; flex-direction: column; gap: 4px; }
      .cg-creditresult-name { font-weight: 700; font-size: 14px; }
      .cg-text-bad { color: var(--cg-red); font-weight: 700; }
      .cg-text-ok { color: #2f7d4f; font-weight: 700; }

      /* Reputation Passport */
      .cg-passport { background: linear-gradient(135deg, var(--cg-green) 0%, var(--cg-green-2) 100%); color: var(--cg-paper); border: none; }
      .cg-passport-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
      .cg-passport-id { font-family: 'SF Mono', monospace; font-size: 11.5px; letter-spacing: 0.06em; opacity: 0.75; margin-top: 4px; }
      .cg-passport-bottom { margin-top: 16px; }
      .cg-passport-score { font-family: 'Georgia', serif; font-size: 44px; font-weight: 700; color: var(--cg-gold); line-height: 1; }
      .cg-passport-score span { font-size: 14px; color: var(--cg-paper); opacity: 0.6; font-weight: 400; }
      .cg-passport-sub { font-size: 13px; opacity: 0.85; margin: 6px 0 0; line-height: 1.6; max-width: 640px; }
      .cg-passport-foot { margin-top: 16px; padding-top: 12px; border-top: 1px solid rgba(247,243,232,0.15); font-size: 12px; opacity: 0.75; display: flex; align-items: center; gap: 8px; }
      .cg-passport-id-inline { font-size: 11px; background: var(--cg-paper-2); color: #6b6250; padding: 2px 6px; border-radius: 4px; }

      .cg-passport-mini { display: grid; grid-template-columns: auto 1fr auto; gap: 18px; align-items: center; }
      @media (max-width: 700px) { .cg-passport-mini { grid-template-columns: 1fr; } }
      .cg-passport-score-mini { font-family: 'Georgia', serif; font-size: 36px; font-weight: 700; color: var(--cg-green); line-height: 1; }
      .cg-passport-score-mini span { font-size: 13px; color: #9a8f76; font-weight: 400; }
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
      .cg-rep-weight { font-size: 11px; color: #9a8f76; text-align: center; }
      .cg-rep-bar { height: 8px; background: var(--cg-paper-2); border-radius: 999px; overflow: hidden; }
      .cg-rep-bar-fill { height: 100%; border-radius: 999px; transition: width 0.3s ease; }
      .cg-rep-score { font-size: 12.5px; font-weight: 700; text-align: right; color: #6b6250; }

      .cg-rep-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
      .cg-rep-event { display: flex; align-items: flex-start; gap: 10px; padding: 8px 0; border-bottom: 1px solid #f0ebdd; }
      .cg-rep-event:last-child { border-bottom: none; }
      .cg-rep-event-icon.up { color: #2f7d4f; margin-top: 2px; }
      .cg-rep-event-icon.down { color: var(--cg-red); margin-top: 2px; }
      .cg-rep-event-body { flex: 1; min-width: 0; }
      .cg-rep-event-text { font-size: 13px; font-weight: 600; }
      .cg-rep-event-meta { font-size: 11px; color: #9a8f76; margin-top: 2px; }
      .cg-rep-event-delta { font-weight: 700; font-size: 13px; white-space: nowrap; }
      .cg-rep-event-delta.up { color: #2f7d4f; }
      .cg-rep-event-delta.down { color: var(--cg-red); }

      .cg-dispute { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #f0ebdd; }
      .cg-dispute:last-child { border-bottom: none; }
      .cg-dispute.resolved { opacity: 0.6; }

      .cg-rep-divider { border-top: 1px solid var(--cg-line); margin: 16px 0 12px; }
      .cg-rep-subhead { font-size: 13px; font-weight: 700; margin: 0 0 8px; }
      .cg-verify-result { background: var(--cg-paper-2); border-radius: 10px; padding: 14px; margin-top: 12px; }

      /* Meeting */
      .cg-meeting-lobby { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 40px; text-align: center; color: var(--cg-green); }
      .cg-meeting-lobby h3 { font-family: 'Georgia', serif; margin: 4px 0; }
      .cg-meeting-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
      @media (max-width: 880px) { .cg-meeting-grid { grid-template-columns: 1fr; } }
      .cg-meeting-stage { background: var(--cg-green); color: var(--cg-paper); display: flex; flex-direction: column; gap: 16px; }
      .cg-meeting-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; }
      .cg-meeting-tile { background: rgba(247,243,232,0.06); border-radius: 10px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 8px; position: relative; border: 1px solid rgba(247,243,232,0.1); }
      .cg-meeting-tile.self { border-color: var(--cg-gold); }
      .cg-meeting-avatar { width: 48px; height: 48px; border-radius: 50%; background: var(--cg-gold); color: var(--cg-green); display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
      .cg-meeting-camoff { background: rgba(247,243,232,0.15); color: var(--cg-paper); }
      .cg-meeting-tile-name { font-size: 12px; text-align: center; }
      .cg-meeting-tag { position: absolute; top: 6px; right: 6px; background: var(--cg-gold); color: var(--cg-green); font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 999px; text-transform: capitalize; }
      .cg-meeting-controls { display: flex; gap: 10px; justify-content: center; }
      .cg-meeting-btn { width: 42px; height: 42px; border-radius: 50%; border: none; background: rgba(247,243,232,0.1); color: var(--cg-paper); display: flex; align-items: center; justify-content: center; cursor: pointer; }
      .cg-meeting-btn.off { background: var(--cg-red); }
      .cg-meeting-leave { background: var(--cg-red); }
      .cg-meeting-chat { display: flex; flex-direction: column; height: 480px; }
      .cg-chat-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
      .cg-chat-msg { background: var(--cg-paper-2); border-radius: 10px; padding: 8px 10px; max-width: 90%; }
      .cg-chat-msg.self { align-self: flex-end; background: rgba(212,165,55,0.16); }
      .cg-chat-author { font-size: 11px; font-weight: 700; color: var(--cg-green); }
      .cg-chat-text { font-size: 13px; margin: 2px 0; }
      .cg-chat-time { font-size: 10px; color: #b0a68c; }
      .cg-chat-input { display: flex; gap: 8px; }
      .cg-chat-input input { flex: 1; border: 1px solid var(--cg-line); border-radius: 8px; padding: 9px 11px; font-size: 13px; font-family: inherit; }

      /* Loan officer desk */
      .cg-officer-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 8px; }
      @media (max-width: 880px) { .cg-officer-grid { grid-template-columns: 1fr; } }

      /* AI feed */
      .cg-ai-feed { display: flex; flex-direction: column; gap: 10px; }
      .cg-ai-row { display: flex; align-items: flex-start; gap: 12px; padding: 12px; border-radius: 10px; border: 1px solid var(--cg-line); }
      .cg-ai-clear { border-left: 4px solid #2f7d4f; }
      .cg-ai-watch { border-left: 4px solid var(--cg-gold); }
      .cg-ai-high_risk { border-left: 4px solid var(--cg-red); }
      .cg-ai-icon { margin-top: 2px; }
      .cg-ai-clear .cg-ai-icon { color: #2f7d4f; }
      .cg-ai-watch .cg-ai-icon { color: var(--cg-gold); }
      .cg-ai-high_risk .cg-ai-icon { color: var(--cg-red); }
      .cg-ai-body { flex: 1; }
      .cg-ai-title { font-weight: 700; font-size: 13.5px; }
      .cg-ai-reasons { margin: 6px 0 0 18px; font-size: 12px; color: #6b6250; }

      /* Sign out */
      .cg-signout { margin-top: 12px; width: 100%; background: none; border: 1px solid rgba(247,243,232,0.2); color: var(--cg-paper); border-radius: 8px; padding: 8px; font-size: 12.5px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; font-family: inherit; }
      .cg-signout:hover { background: rgba(247,243,232,0.08); }
    `}</style>
  );
}
