/* ============================================================
   COOPGUARD — Priority Alerts / AI Operations alert builder
   ------------------------------------------------------------
   Pure helper: turns raw fraud flags + loan applications into a
   single unified alert feed used by the Cooperative Overview
   ("Priority Alerts"), Operations ("Monitor -> ... -> Audit
   Trail"), and Risk & Security sections. No detection logic lives
   here — it reuses the existing fraud-scan / credit-check engine
   already in CoopGuardSim.jsx and just presents it consistently.
   ============================================================ */

const TITLE_BY_RULE = {
  LARGE_WITHDRAWAL: "Unusual transaction detected",
  RAPID_ACTIVITY: "Unusual account activity detected",
  DEPOSIT_WITHDRAW_PATTERN: "Unusual transaction detected",
  THRESHOLD_BREACH: "Unusual transaction detected",
};

export function buildAlerts({ fraudFlags = [], loans = [], members = [] }) {
  const findMember = (id) => members.find((m) => m.id === id);
  const alerts = [];

  fraudFlags.forEach((f) => {
    const m = findMember(f.userId);
    const primaryRule = f.flags?.[0]?.rule;
    alerts.push({
      id: `fraud-${f.id}`,
      kind: "fraud",
      sourceId: f.id,
      title: TITLE_BY_RULE[primaryRule] || "Unusual activity detected",
      member: m,
      riskLevel: (f.flags?.length || 0) >= 2 ? "High" : "Medium",
      reason: (f.flags || []).map((x) => x.detail).join(" ") || "Flagged by Coop Guard Intelligence for review.",
      recommendation: (f.flags?.length || 0) >= 2
        ? "Escalate for manual review before approving further transactions."
        : "Review the transaction details and confirm with the member if needed.",
      ts: f.ts,
      reviewed: !!f.reviewed,
      decidedAction: f.action,
      raw: f,
    });
  });

  loans.filter((l) => l.status === "under_review" || l.status === "pending_guarantors").forEach((l) => {
    const m = findMember(l.userId);
    alerts.push({
      id: `loan-${l.id}`,
      kind: "loan",
      sourceId: l.id,
      title: "Loan application requires review",
      member: m,
      riskLevel: (l.risk?.decision === "not_eligible" || l.risk?.decision === "manual_review") ? "High" : "Medium",
      reason: `${m?.name || "A member"} applied for ${l.amount ? "₦" + Number(l.amount).toLocaleString("en-NG") : "a loan"}${l.purpose ? ` — ${l.purpose}` : ""}.`,
      recommendation: l.risk?.decision === "not_eligible"
        ? "Automated credit check failed — manual review is required before any approval."
        : "Review guarantors and the automated credit assessment, then approve or reject.",
      ts: l.createdAt,
      reviewed: false,
      raw: l,
    });

    const v = l.verification;
    if (v && (v.faceMatch === false || v.fingerprintMatch === false || v.livenessPassed === false)) {
      alerts.push({
        id: `verify-${l.id}`,
        kind: "verification",
        sourceId: l.id,
        title: "Member verification required",
        member: m,
        riskLevel: "High",
        reason: `Identity verification did not fully pass during ${m?.name || "the member"}'s loan application.`,
        recommendation: "Request the member complete additional identity verification before proceeding.",
        ts: l.createdAt,
        reviewed: false,
        raw: l,
      });
    }
  });

  return alerts.sort((a, b) => (b.ts || 0) - (a.ts || 0));
}

// Reactive "Coop Guard Intelligence" monitoring numbers — derived from real
// scan verdicts already produced by the existing AI-assisted scan engine, so
// they genuinely move as demo actions (deposits, withdrawals, loan checks)
// happen, rather than being randomly generated.
export function summarizeIntelligence(aiScans = []) {
  const total = aiScans.length;
  const normal = aiScans.filter((a) => a.verdict === "clear").length;
  const attention = aiScans.filter((a) => a.verdict === "watch").length;
  const highPriority = aiScans.filter((a) => a.verdict === "high_risk").length;
  return { total, normal, attention, highPriority };
}
