import React from "react";
import { UserCircle2, ScanFace, Fingerprint, Vote, Users2, ShieldCheck } from "lucide-react";
import { CreditIntelligenceCard } from "../cooperative/CreditIntelligencePanel";

export default function MemberProfile({ currentUser, myTx, myLoans, onEnrollBiometric }) {
  const rep = currentUser.reputation || {};
  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">My Profile</div>
        <h2><UserCircle2 size={20} /> {currentUser.name}</h2>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Account details</h3></div>
        <div className="cg-credit-rows" style={{ padding: "10px 18px 16px" }}>
          <div><span>Member ID</span><strong>{currentUser.memberNo}</strong></div>
          <div><span>Phone</span><strong>{currentUser.phone || "—"}</strong></div>
          <div><span>Email</span><strong>{currentUser.email || "—"}</strong></div>
          <div><span>Joined</span><strong>{currentUser.joined || "—"}</strong></div>
        </div>
        <div className="cg-bio-status">
          <div className="cg-bio-row"><ScanFace size={16} /> Facial recognition <span className={`cg-pill cg-pill-${currentUser.biometricEnrolled ? "ok" : "warn"}`}>{currentUser.biometricEnrolled ? "Enrolled" : "Not enrolled"}</span></div>
          <div className="cg-bio-row"><Fingerprint size={16} /> Fingerprint <span className={`cg-pill cg-pill-${currentUser.biometricEnrolled ? "ok" : "warn"}`}>{currentUser.biometricEnrolled ? "Enrolled" : "Not enrolled"}</span></div>
          {!currentUser.biometricEnrolled && <button className="cg-btn cg-btn-primary cg-btn-sm" onClick={onEnrollBiometric}>Enroll now</button>}
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3><ShieldCheck size={15} /> My Credit Intelligence</h3></div>
        <div style={{ padding: "0 18px 18px" }}>
          <CreditIntelligenceCard member={currentUser} tx={myTx} loans={myLoans} />
        </div>
      </div>

      <div className="cg-card">
        <div className="cg-card-head"><h3>Cooperative activity</h3><span className="cg-muted">Separate from your credit score</span></div>
        <div className="cg-activity-stats">
          <ActivityStat icon={Vote} label="Governance compliance" value={rep.governanceCompliance ?? 0} />
          <ActivityStat icon={Users2} label="Participation" value={rep.participation ?? 0} />
          <ActivityStat icon={ShieldCheck} label="Audit performance" value={rep.auditPerformance ?? 0} />
        </div>
        <p className="cg-muted" style={{ padding: "0 18px 16px" }}>Voting, meeting attendance, and audit history inform your standing in the cooperative, but are never mixed into your financial credit score.</p>
      </div>
    </div>
  );
}

function ActivityStat({ icon: Icon, label, value }) {
  return (
    <div className="cg-activity-stat">
      <Icon size={15} />
      <div className="cg-activity-bar"><div className="cg-activity-bar-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>
      <div className="cg-activity-stat-label">{label} <strong>{value}</strong></div>
    </div>
  );
}
