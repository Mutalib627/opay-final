/* ============================================================
   COOPGUARD — Credit Intelligence
   ------------------------------------------------------------
   Replaces the old standalone "Reputation Passport" with a single,
   clearly financial Credit Intelligence profile.

   Deliberately EXCLUDED from the score (per spec): voting frequency,
   meeting attendance, general participation, complaint history, and
   other governance/audit activity. Those remain available as
   separate "cooperative activity" information (see member Profile),
   never folded into this financial score.
   ============================================================ */

function band(v) {
  if (v >= 75) return "Excellent";
  if (v >= 55) return "Strong";
  if (v >= 35) return "Fair";
  return "Weak";
}

export function computeContributionConsistency(member, tx) {
  const deposits = tx.filter((t) => t.userId === member.id && t.type === "deposit");
  if (!deposits.length) return 0;
  const joined = new Date(member.joined || Date.now()).getTime();
  const monthsSinceJoined = Math.max(1, Math.round((Date.now() - joined) / (1000 * 60 * 60 * 24 * 30)));
  const monthsWithDeposit = new Set(deposits.map((d) => new Date(d.ts).toISOString().slice(0, 7))).size;
  return Math.max(0, Math.min(100, Math.round((monthsWithDeposit / monthsSinceJoined) * 100)));
}

export function computeLoanExposure(member, loans) {
  const active = loans.filter((l) => l.userId === member.id && ["disbursed", "repaying"].includes(l.status));
  const outstanding = active.reduce((sum, l) => sum + (l.amount * (1 + (l.rate || 0) / 100) - (l.paid || 0)), 0);
  const ratio = member.balance > 0 ? outstanding / member.balance : (outstanding > 0 ? 2 : 0);
  const label = ratio > 1.5 ? "High" : ratio > 0.6 ? "Moderate" : "Low";
  return { outstanding: Math.max(0, Math.round(outstanding)), ratio, label };
}

export function computeCreditIntelligence(member, tx, loans) {
  const repayment = member.reputation?.loanRepayment ?? 0;
  const savings = member.reputation?.savingsConsistency ?? 0;
  const contribution = computeContributionConsistency(member, tx);
  const exposure = computeLoanExposure(member, loans);
  const exposurePenalty = exposure.label === "High" ? 30 : exposure.label === "Moderate" ? 12 : 0;

  const rawScore = 0.4 * repayment + 0.3 * savings + 0.2 * contribution + 10 - exposurePenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  const overallRisk = score >= 70 ? "Low" : score >= 45 ? "Moderate" : "High";
  const recommendation = score >= 70 ? "Suitable for consideration" : score >= 45 ? "Consider with conditions" : "Not recommended at this time";

  return {
    score,
    repaymentHistory: repayment, repaymentLabel: band(repayment),
    savingsConsistency: savings, savingsLabel: band(savings),
    contributionConsistency: contribution, contributionLabel: band(contribution),
    loanExposure: exposure,
    overallRisk,
    recommendation,
    finalDecision: "Pending Authorized Officer Approval",
  };
}
