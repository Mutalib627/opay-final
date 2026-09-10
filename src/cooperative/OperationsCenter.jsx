import React, { useMemo } from "react";
import { CheckCircle2, ShieldQuestion, AlertTriangle } from "lucide-react";
import AlertCard from "./AlertCard";
import { buildAlerts, summarizeIntelligence } from "./alerts";

export default function OperationsCenter({ members, loans, fraudFlags, aiScans, onApproveAlert, onRejectAlert, onRequestVerification }) {
  const alerts = useMemo(() => buildAlerts({ fraudFlags, loans, members }), [fraudFlags, loans, members]);
  const intel = useMemo(() => summarizeIntelligence(aiScans), [aiScans]);
  const unreviewed = alerts.filter((a) => !a.reviewed);
  const reviewed = alerts.filter((a) => a.reviewed);
  const recentScans = aiScans.slice(0, 8);

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">AI-assisted operational monitoring</div>
        <h2>Operations</h2>
        <p className="cg-page-desc">
          Every transaction and loan application is monitored, analyzed, and — where something looks unusual —
          explained with a recommendation, before a human makes the final call. This is deterministic, rule-based
          monitoring — Coop Guard Intelligence — not autonomous decision-making.
        </p>
      </div>

      <div className="cg-workflow-banner">
        {["Monitor", "Analyze", "Detect", "Explain", "Recommend", "Human Review", "Action", "Audit Trail"].map((step, i) => (
          <React.Fragment key={step}>
            <span className="cg-workflow-banner-step">{step}</span>
            {i < 7 && <span className="cg-workflow-arrow">→</span>}
          </React.Fragment>
        ))}
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Needs human review</h3><span className="cg-muted">{unreviewed.length} open</span></div>
        <div className="cg-alert-list">
          {unreviewed.length === 0 && <div className="cg-empty">No open alerts. Coop Guard Intelligence is monitoring quietly.</div>}
          {unreviewed.map((a) => (
            <AlertCard key={a.id} alert={a} showWorkflow onApprove={onApproveAlert} onReject={onRejectAlert} onRequestVerification={onRequestVerification} />
          ))}
        </div>
      </div>

      {reviewed.length > 0 && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Recently reviewed</h3></div>
          <div className="cg-alert-list">
            {reviewed.slice(0, 6).map((a) => <AlertCard key={a.id} alert={a} />)}
          </div>
        </div>
      )}

      <div className="cg-card">
        <div className="cg-card-head"><h3>Live monitoring feed</h3><span className="cg-muted">{intel.total} scanned · {intel.highPriority} high priority</span></div>
        <ul className="cg-scan-feed">
          {recentScans.length === 0 && <li className="cg-empty">No activity scanned yet this session.</li>}
          {recentScans.map((s) => {
            const m = members.find((x) => x.id === s.userId);
            return (
              <li key={s.id} className={`cg-scan-row cg-scan-${s.verdict}`}>
                {s.verdict === "clear" && <CheckCircle2 size={15} />}
                {s.verdict === "watch" && <ShieldQuestion size={15} />}
                {s.verdict === "high_risk" && <AlertTriangle size={15} />}
                <span>{m?.name || "Member"} — {s.tx.type} of ₦{Number(s.tx.amount).toLocaleString("en-NG")}</span>
                <span className="cg-scan-verdict">{s.verdict === "clear" ? "Clear" : s.verdict === "watch" ? "Watchlist" : "High risk"}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
