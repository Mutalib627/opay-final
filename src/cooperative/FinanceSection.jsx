import React, { useMemo } from "react";
import { PiggyBank, HandCoins, CheckCircle2, XCircle } from "lucide-react";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
const fmtDate = (ts) => new Date(ts).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function FinanceSection({ members, tx, fraudFlags, onReviewFraud }) {
  const coopMembers = useMemo(() => members.filter((m) => m.userType === "member"), [members]);
  const totalSavings = coopMembers.reduce((s, m) => s + (m.balance || 0), 0);
  const totalContributions = tx.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const recentTx = tx.slice(0, 15);
  const pendingApprovals = fraudFlags.filter((f) => !f.reviewed);

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">Cooperative Administration</div>
        <h2>Finance</h2>
        <p className="cg-page-desc">Savings, contributions, and the transaction ledger for this cooperative.</p>
      </div>

      <div className="cg-overview-grid cg-overview-grid-2">
        <div className="cg-ov-stat"><PiggyBank size={17} /><div className="cg-ov-stat-value">{naira(totalSavings)}</div><div className="cg-ov-stat-label">Total savings</div></div>
        <div className="cg-ov-stat"><HandCoins size={17} /><div className="cg-ov-stat-value">{naira(totalContributions)}</div><div className="cg-ov-stat-label">Total contributions</div></div>
      </div>

      {pendingApprovals.length > 0 && (
        <div className="cg-card">
          <div className="cg-card-head"><h3>Pending financial approvals</h3><span className="cg-muted">{pendingApprovals.length}</span></div>
          <ul className="cg-approval-list">
            {pendingApprovals.map((f) => {
              const m = members.find((x) => x.id === f.userId);
              return (
                <li key={f.id}>
                  <div>
                    <strong>{m?.name || "Member"}</strong> — {f.tx.type} of {naira(f.tx.amount)}
                    <div className="cg-muted">{f.flags.map((x) => x.detail).join(" ")}</div>
                  </div>
                  <div className="cg-approval-actions">
                    <button className="cg-btn cg-btn-sm" onClick={() => onReviewFraud(f.id, "dismissed")}><CheckCircle2 size={13} /> Clear</button>
                    <button className="cg-btn cg-btn-sm cg-btn-danger" onClick={() => onReviewFraud(f.id, "escalated")}><XCircle size={13} /> Escalate</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="cg-card">
        <div className="cg-card-head"><h3>Transaction ledger</h3></div>
        <div className="cg-table-wrap">
          <table className="cg-table">
            <thead><tr><th>Member</th><th>Type</th><th>Amount</th><th>When</th></tr></thead>
            <tbody>
              {recentTx.length === 0 && <tr><td colSpan={4} className="cg-empty">No transactions yet.</td></tr>}
              {recentTx.map((t) => {
                const m = members.find((x) => x.id === t.userId);
                return (
                  <tr key={t.id}>
                    <td>{m?.name || "—"}</td>
                    <td className="cg-cap">{t.type.replace("_", " ")}</td>
                    <td>{naira(t.amount)}</td>
                    <td>{fmtDate(t.ts)}</td>
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
