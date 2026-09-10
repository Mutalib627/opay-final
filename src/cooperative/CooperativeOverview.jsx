import React, { useMemo } from "react";
import { Users, PiggyBank, HandCoins, FileText, AlertTriangle, ClipboardCheck, Activity, ChevronRight } from "lucide-react";
import AlertCard from "./AlertCard";
import { buildAlerts, summarizeIntelligence } from "./alerts";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });

export default function CooperativeOverview({ members, tx, loans, fraudFlags, aiScans, onApproveAlert, onRejectAlert, onRequestVerification, setSection }) {
  const coopMembers = useMemo(() => members.filter((m) => m.userType === "member"), [members]);

  const stats = useMemo(() => {
    const totalMembers = coopMembers.length;
    const totalSavings = coopMembers.reduce((s, m) => s + (m.balance || 0), 0);
    const totalContributions = tx.filter((t) => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
    const activeLoans = loans.filter((l) => ["disbursed", "repaying"].includes(l.status));
    const outstandingRepayments = activeLoans.reduce((s, l) => s + Math.max(0, l.amount * (1 + (l.rate || 0) / 100) - (l.paid || 0)), 0);
    const pendingApprovals = loans.filter((l) => ["under_review", "pending_guarantors"].includes(l.status)).length
      + fraudFlags.filter((f) => !f.reviewed).length;
    return { totalMembers, totalSavings, totalContributions, activeLoansCount: activeLoans.length, outstandingRepayments, pendingApprovals };
  }, [coopMembers, tx, loans, fraudFlags]);

  const intel = useMemo(() => summarizeIntelligence(aiScans), [aiScans]);
  const alerts = useMemo(() => buildAlerts({ fraudFlags, loans, members }), [fraudFlags, loans, members]);
  const priorityAlerts = alerts.filter((a) => !a.reviewed).slice(0, 4);

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">Cooperative Administration</div>
        <h2>What's happening in the cooperative</h2>
        <p className="cg-page-desc">A quick read on the cooperative's numbers, and what needs your attention right now.</p>
      </div>

      <div className="cg-overview-grid">
        <OverviewStat icon={Users} label="Total Members" value={stats.totalMembers} />
        <OverviewStat icon={PiggyBank} label="Total Savings" value={naira(stats.totalSavings)} />
        <OverviewStat icon={HandCoins} label="Total Contributions" value={naira(stats.totalContributions)} />
        <OverviewStat icon={FileText} label="Active Loans" value={stats.activeLoansCount} />
        <OverviewStat icon={ClipboardCheck} label="Outstanding Repayments" value={naira(stats.outstandingRepayments)} />
        <OverviewStat icon={AlertTriangle} label="Pending Approvals" value={stats.pendingApprovals} tone={stats.pendingApprovals ? "warn" : "ok"} />
      </div>

      <div className="cg-card">
        <div className="cg-card-head">
          <h3><Activity size={15} /> Coop Guard Intelligence</h3>
          <span className="cg-muted">AI-assisted operational monitoring</span>
        </div>
        <div className="cg-intel-row">
          <div className="cg-intel-total"><strong>{intel.total}</strong><span>activities monitored</span></div>
          <div className="cg-intel-split">
            <span className="cg-intel-chip cg-intel-ok">{intel.normal} Normal</span>
            <span className="cg-intel-chip cg-intel-warn">{intel.attention} Require Attention</span>
            <span className="cg-intel-chip cg-intel-bad">{intel.highPriority} High Priority</span>
          </div>
        </div>
        <p className="cg-muted cg-intel-note">These figures update automatically as members transact — they reflect deterministic rule-based scans, not human judgement, and every flag still routes through human review below.</p>
      </div>

      <div className="cg-card">
        <div className="cg-card-head">
          <h3>Priority Alerts</h3>
          <button className="cg-link" onClick={() => setSection("operations")}>View all in Operations <ChevronRight size={13} /></button>
        </div>
        <div className="cg-alert-list">
          {priorityAlerts.length === 0 && <div className="cg-empty">Nothing needs your attention right now.</div>}
          {priorityAlerts.map((a) => (
            <AlertCard key={a.id} alert={a} onApprove={onApproveAlert} onReject={onRejectAlert} onRequestVerification={onRequestVerification} />
          ))}
        </div>
      </div>
    </div>
  );
}

function OverviewStat({ icon: Icon, label, value, tone }) {
  return (
    <div className={`cg-ov-stat ${tone ? `cg-ov-stat-${tone}` : ""}`}>
      <Icon size={17} />
      <div className="cg-ov-stat-value">{value}</div>
      <div className="cg-ov-stat-label">{label}</div>
    </div>
  );
}
