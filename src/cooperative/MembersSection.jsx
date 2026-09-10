import React, { useMemo, useState } from "react";
import { Search, Pencil, X } from "lucide-react";

export default function MembersSection({ members, onUpdateMember }) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  const rows = useMemo(() => {
    const coopMembers = members.filter((m) => m.userType === "member");
    if (!q) return coopMembers;
    const needle = q.toLowerCase();
    return coopMembers.filter((m) => m.name.toLowerCase().includes(needle) || m.memberNo.toLowerCase().includes(needle));
  }, [members, q]);

  return (
    <div className="cg-page">
      <div className="cg-page-head">
        <div className="cg-eyebrow">Cooperative Administration</div>
        <h2>Members</h2>
        <p className="cg-page-desc">Member records for this cooperative. Activating, deactivating, or archiving an account is a platform-level action handled by the Super Admin.</p>
      </div>

      <div className="cg-search-bar">
        <Search size={14} />
        <input placeholder="Search members by name or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="cg-card">
        <div className="cg-table-wrap">
          <table className="cg-table">
            <thead><tr><th>Name</th><th>ID</th><th>Phone</th><th>Savings balance</th><th>Joined</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={6} className="cg-empty">No members match this search.</td></tr>}
              {rows.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.memberNo}</td>
                  <td>{m.phone || "—"}</td>
                  <td>₦{Number(m.balance || 0).toLocaleString("en-NG")}</td>
                  <td>{m.joined || "—"}</td>
                  <td><button className="cg-icon-btn" title="Edit record" onClick={() => setEditing(m)}><Pencil size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditMemberModal member={editing} onClose={() => setEditing(null)} onSave={(patch) => { onUpdateMember(editing.id, patch); setEditing(null); }} />
      )}
    </div>
  );
}

function EditMemberModal({ member, onClose, onSave }) {
  const [phone, setPhone] = useState(member.phone || "");
  const [email, setEmail] = useState(member.email || "");

  return (
    <div className="cg-modal-overlay" onClick={onClose}>
      <div className="cg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cg-modal-head">
          <h3>{member.name}</h3>
          <button className="cg-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cg-modal-body">
          <label>Phone number</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} />
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="cg-modal-actions">
          <button className="cg-btn" onClick={onClose}>Cancel</button>
          <button className="cg-btn cg-btn-primary" onClick={() => onSave({ phone, email })}>Save changes</button>
        </div>
      </div>
    </div>
  );
}
