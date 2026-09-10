import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, XCircle, ShieldQuestion, Clock } from "lucide-react";

const RISK_CLASS = { High: "bad", Medium: "warn", Low: "ok" };

export default function AlertCard({ alert, onApprove, onReject, onRequestVerification, showWorkflow }) {
  const [open, setOpen] = useState(false);
  const decided = alert.reviewed;

  return (
    <div className={`cg-alert ${decided ? "cg-alert-decided" : ""}`}>
      <button className="cg-alert-head" onClick={() => setOpen((o) => !o)}>
        <AlertTriangle size={16} className={`cg-alert-icon cg-alert-icon-${RISK_CLASS[alert.riskLevel] || "warn"}`} />
        <div className="cg-alert-head-text">
          <div className="cg-alert-title">{alert.title}</div>
          <div className="cg-alert-meta">
            {alert.member?.name || "Unknown member"} · <span className={`cg-pill cg-pill-${RISK_CLASS[alert.riskLevel] || "warn"}`}>{alert.riskLevel} risk</span>
            {decided && <span className="cg-alert-decided-tag"> · Reviewed</span>}
          </div>
        </div>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="cg-alert-body">
          {showWorkflow && (
            <div className="cg-alert-workflow">
              {["Monitor", "Analyze", "Detect", "Explain", "Recommend", "Human Review", "Action", "Audit Trail"].map((step, i) => (
                <span key={step} className={`cg-workflow-step ${i <= 4 || decided ? "done" : ""}`}>{step}</span>
              ))}
            </div>
          )}
          <div className="cg-alert-row"><span>What happened</span><p>{alert.reason}</p></div>
          <div className="cg-alert-row"><span>Risk level</span><p>{alert.riskLevel}</p></div>
          <div className="cg-alert-row"><span>AI recommendation</span><p>{alert.recommendation}</p></div>
          {decided ? (
            <div className="cg-alert-row"><span>Human decision</span><p>Marked "{alert.decidedAction || "reviewed"}" — logged to the audit trail.</p></div>
          ) : (
            <div className="cg-alert-actions">
              <button className="cg-btn cg-btn-sm" onClick={() => onApprove?.(alert)}><CheckCircle2 size={14} /> Approve</button>
              <button className="cg-btn cg-btn-sm cg-btn-danger" onClick={() => onReject?.(alert)}><XCircle size={14} /> Reject</button>
              <button className="cg-btn cg-btn-sm cg-btn-ghost" onClick={() => onRequestVerification?.(alert)}><ShieldQuestion size={14} /> Request verification</button>
            </div>
          )}
          <div className="cg-alert-ts"><Clock size={11} /> {new Date(alert.ts || Date.now()).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
        </div>
      )}
    </div>
  );
}
