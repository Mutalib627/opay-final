import React from "react";
import { Gauge, ShieldCheck } from "lucide-react";
import { computeCreditIntelligence } from "../shared/creditIntelligence";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
const RISK_CLASS = { Low: "ok", Moderate: "warn", High: "bad" };

export function CreditIntelligenceCard({ member, tx, loans, compact }) {
  const ci = computeCreditIntelligence(member, tx, loans);
  return (
    <div className={`cg-credit-card ${compact ? "cg-credit-card-compact" : ""}`}>
      <div className="cg-credit-card-head">
        <div>
          <div className="cg-credit-card-name">{member.name}</div>
          <div className="cg-muted">{member.memberNo}</div>
        </div>
        <div className={`cg-credit-score cg-credit-score-${RISK_CLASS[ci.overallRisk]}`}>
          <Gauge size={14} /> {ci.score}<span>/100</span>
        </div>
      </div>
      <div className="cg-credit-rows">
        <div><span>Repayment history</span><strong>{ci.repaymentLabel}</strong></div>
        <div><span>Savings consistency</span><strong>{ci.savingsLabel}</strong></div>
        <div><span>Contribution consistency</span><strong>{ci.contributionLabel}</strong></div>
        <div><span>Current loan exposure</span><strong>{ci.loanExposure.label} ({naira(ci.loanExposure.outstanding)})</strong></div>
        <div><span>Overall credit risk</span><strong className={`cg-risk-${RISK_CLASS[ci.overallRisk]}`}>{ci.overallRisk}</strong></div>
      </div>
      <div className="cg-credit-recommendation">
        <ShieldCheck size={14} />
        <div>
          <div><strong>AI Recommendation:</strong> {ci.recommendation}</div>
          <div className="cg-muted"><strong>Final Decision:</strong> {ci.finalDecision}</div>
        </div>
      </div>
    </div>
  );
}

export default function CreditIntelligenceOverview({ members, tx, loans }) {
  const coopMembers = members.filter((m) => m.userType === "member");
  return (
    <div className="cg-card cg-credit-overview">
      <div className="cg-card-head"><h3>Credit Intelligence</h3><span className="cg-muted">Financial factors only — governance & participation are kept separate</span></div>
      <div className="cg-credit-grid">
        {coopMembers.length === 0 && <div className="cg-empty">No members to assess yet.</div>}
        {coopMembers.map((m) => <CreditIntelligenceCard key={m.id} member={m} tx={tx} loans={loans} compact />)}
      </div>
    </div>
  );
}
