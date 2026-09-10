import React, { useMemo } from "react";
import { PiggyBank, HandCoins, FileText, Bell, MessageSquare, ChevronRight } from "lucide-react";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
const fmtDate = (ts) => new Date(ts).toLocaleString("en-NG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

export default function MemberHome({ currentUser, myTx, myLoans, myNotifs, setTab }) {
  const thisMonthContributions = useMemo(() => {
    const now = new Date();
    return myTx
      .filter((t) => t.type === "deposit" && new Date(t.ts).getMonth() === now.getMonth() && new Date(t.ts).getFullYear() === now.getFullYear())
      .reduce((s, t) => s + t.amount, 0);
  }, [myTx]);

  const activeLoan = myLoans.find((l) => ["disbursed", "repaying"].includes(l.status));
  const unread = myNotifs.filter((n) => !n.read).length;
  const recentTx = myTx.slice(0, 4);

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">Welcome back</div>
        <h2>{currentUser.name.split(" ")[0]}'s cooperative account</h2>
      </div>

      <div className="cg-overview-grid cg-overview-grid-2">
        <div className="cg-ov-stat"><PiggyBank size={17} /><div className="cg-ov-stat-value">{naira(currentUser.balance)}</div><div className="cg-ov-stat-label">My savings</div></div>
        <div className="cg-ov-stat"><HandCoins size={17} /><div className="cg-ov-stat-value">{naira(thisMonthContributions)}</div><div className="cg-ov-stat-label">This month's contributions</div></div>
      </div>

      {activeLoan && (
        <div className="cg-card">
          <div className="cg-card-head"><h3><FileText size={15} /> My loan</h3></div>
          <div className="cg-loan-summary">
            <div><span>Outstanding</span><strong>{naira(activeLoan.amount * (1 + activeLoan.rate / 100) - (activeLoan.paid || 0))}</strong></div>
            <div><span>Monthly repayment</span><strong>{naira(activeLoan.monthlyPayment)}</strong></div>
            <div><span>Status</span><strong className="cg-cap">{activeLoan.status}</strong></div>
          </div>
          <button className="cg-link" onClick={() => setTab("loans")}>View & repay <ChevronRight size={13} /></button>
        </div>
      )}

      <div className="cg-card">
        <div className="cg-card-head"><h3>Recent transactions</h3><button className="cg-link" onClick={() => setTab("wallet")}>View all <ChevronRight size={13} /></button></div>
        <ul className="cg-tx-list">
          {recentTx.length === 0 && <li className="cg-empty">No transactions yet.</li>}
          {recentTx.map((t) => (
            <li key={t.id}>
              <span className="cg-cap">{t.type}</span>
              <span>{naira(t.amount)}</span>
              <span className="cg-muted">{fmtDate(t.ts)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="cg-quicklinks">
        <button className="cg-quicklink" onClick={() => setTab("notifications")}>
          <Bell size={16} /> Notifications {unread > 0 && <span className="cg-badge">{unread}</span>}
        </button>
        <button className="cg-quicklink" onClick={() => setTab("ask")}>
          <MessageSquare size={16} /> Ask Coop Guard
        </button>
      </div>
    </div>
  );
}
