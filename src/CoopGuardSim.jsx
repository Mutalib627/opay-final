import React, { useMemo, useState } from "react";
import {
  LayoutGrid, Building2, Users, UserPlus, ShieldCheck, KeyRound, Server,
  Activity, Settings, Search, X, Plus, ChevronRight, CheckCircle2, XCircle,
  AlertTriangle, Clock, Hash, ArrowLeft, Eye, Archive, UserCog, Pencil, Filter,
} from "lucide-react";
import {
  ROLE_CATALOG, ROLES_BY_USER_TYPE, USER_TYPES, ROLE_CATEGORIES,
  PERMISSIONS, getRoleMeta, getRoleLabel, getStatusMeta,
} from "./roles";
import { SEED_COOPERATIVES, getCooperativeName } from "./data";

const naira = (n) => "₦" + Number(n || 0).toLocaleString("en-NG", { maximumFractionDigits: 2 });
const fmtDate = (d) => d ? new Date(d).toLocaleString("en-NG", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const SECTIONS = [
  { id: "overview", label: "Dashboard / Platform Overview", icon: LayoutGrid },
  { id: "cooperatives", label: "Cooperatives", icon: Building2 },
  { id: "users", label: "Users & Members", icon: Users },
  { id: "staff", label: "Staff Management", icon: UserCog },
  { id: "roles", label: "Roles & Permissions", icon: KeyRound },
  { id: "resources", label: "Platform Resources", icon: Server },
  { id: "monitoring", label: "System Monitoring", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
];

function nextMemberNo(members, prefix) {
  const nums = members
    .map((m) => m.memberNo)
    .filter((no) => typeof no === "string" && no.startsWith(prefix))
    .map((no) => parseInt(no.replace(prefix, ""), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export default function SuperAdminWorkspace({ members, setMembers, pushAudit, pushNotification, currentUser, audit, showToast }) {
  const [section, setSection] = useState("overview");
  const [showAddUser, setShowAddUser] = useState(false);
  const [detailsUser, setDetailsUser] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'deactivate'|'activate'|'archive', user }

  const notify = (msg, kind) => { if (showToast) showToast(msg, kind); };

  const addUser = (form) => {
    const prefix = form.userType === "platform" ? "SA-" : form.userType === "staff" ? "STF-" : "CG-";
    const memberNo = form.memberNo?.trim() || nextMemberNo(members, prefix);
    const newUser = {
      id: `u-${Date.now()}`,
      name: form.name.trim(),
      memberNo,
      phone: form.phone?.trim() || "",
      email: form.email?.trim() || "",
      role: form.role,
      userType: form.userType,
      cooperativeId: form.userType === "platform" ? null : form.cooperativeId,
      status: form.status || "active",
      balance: 0,
      joined: new Date().toISOString().slice(0, 10),
      bvn: "",
      creditScore: 0,
      biometricEnrolled: false,
      reputation: { loanRepayment: 0, savingsConsistency: 0, governanceCompliance: 0, participation: 0, auditPerformance: 0 },
    };
    setMembers((prev) => [...prev, newUser]);
    pushAudit("USER_CREATED", currentUser.name, {
      newUser: newUser.name, memberNo: newUser.memberNo, role: getRoleLabel(newUser.role),
      cooperative: getCooperativeName(newUser.cooperativeId),
    });
    if (form.userType !== "platform") {
      pushNotification(newUser.id, "Account created", `Welcome to CoopGuard. Your account (${newUser.memberNo}) has been created by the platform administrator.`);
    }
    notify(`${newUser.name} added as ${getRoleLabel(newUser.role)}`, "success");
    setShowAddUser(false);
  };

  const runConfirmedAction = () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    if (type === "deactivate") {
      setMembers((prev) => prev.map((m) => m.id === user.id ? { ...m, status: "suspended" } : m));
      pushAudit("USER_DEACTIVATED", currentUser.name, { user: user.name, memberNo: user.memberNo });
      pushNotification(user.id, "Account deactivated", "Your account has been deactivated by the platform administrator. You will no longer be able to sign in.");
      notify(`${user.name}'s account deactivated`, "info");
    } else if (type === "activate") {
      setMembers((prev) => prev.map((m) => m.id === user.id ? { ...m, status: "active" } : m));
      pushAudit("USER_ACTIVATED", currentUser.name, { user: user.name, memberNo: user.memberNo });
      pushNotification(user.id, "Account reactivated", "Your account has been reactivated. You can sign in again.");
      notify(`${user.name}'s account reactivated`, "success");
    } else if (type === "archive") {
      setMembers((prev) => prev.map((m) => m.id === user.id ? { ...m, status: "archived" } : m));
      pushAudit("USER_ARCHIVED", currentUser.name, { user: user.name, memberNo: user.memberNo, note: "Financial and audit records preserved" });
      notify(`${user.name}'s account archived`, "info");
    }
    setConfirmAction(null);
  };

  const changeRole = (user, roleId) => {
    setMembers((prev) => prev.map((m) => m.id === user.id ? { ...m, role: roleId } : m));
    pushAudit("ROLE_ASSIGNED", currentUser.name, { user: user.name, role: getRoleLabel(roleId) });
    notify(`${user.name} assigned ${getRoleLabel(roleId)}`, "success");
  };

  const stats = useMemo(() => {
    const totalUsers = members.length;
    const active = members.filter((m) => m.status === "active").length;
    const inactive = members.filter((m) => m.status === "suspended").length;
    const archived = members.filter((m) => m.status === "archived").length;
    const staff = members.filter((m) => m.userType === "staff" || m.userType === "platform" || ["admin", "loan_officer"].includes(m.role)).length;
    return { totalUsers, active, inactive, archived, staff, cooperatives: SEED_COOPERATIVES.length };
  }, [members]);

  return (
    <div className="cg-sa">
      <SuperAdminStyle />
      <div className="cg-sa-shell">
        <nav className="cg-sa-subnav">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <button key={s.id} className={`cg-sa-subnav-item ${section === s.id ? "active" : ""}`} onClick={() => setSection(s.id)}>
                <Icon size={16} /><span>{s.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="cg-sa-body">
          {section === "overview" && <OverviewView stats={stats} members={members} audit={audit} setSection={setSection} />}
          {section === "cooperatives" && <CooperativesView members={members} />}
          {section === "users" && (
            <UsersMembersView
              title="Users & Members" desc="Every account on the CoopGuard platform — members and cooperative officers alike."
              members={members} filterFn={() => true}
              onAdd={() => setShowAddUser(true)} onViewDetails={setDetailsUser}
              onDeactivate={(u) => setConfirmAction({ type: "deactivate", user: u })}
              onActivate={(u) => setConfirmAction({ type: "activate", user: u })}
              onArchive={(u) => setConfirmAction({ type: "archive", user: u })}
              onChangeRole={changeRole}
            />
          )}
          {section === "staff" && (
            <UsersMembersView
              title="Staff Management" desc="Platform staff and cooperative officers — presidents, secretaries, treasurers, loan and audit officers."
              members={members}
              filterFn={(m) => m.userType === "staff" || m.userType === "platform" || ["admin", "loan_officer"].includes(m.role)}
              onAdd={() => setShowAddUser(true)} onViewDetails={setDetailsUser}
              onDeactivate={(u) => setConfirmAction({ type: "deactivate", user: u })}
              onActivate={(u) => setConfirmAction({ type: "activate", user: u })}
              onArchive={(u) => setConfirmAction({ type: "archive", user: u })}
              onChangeRole={changeRole}
            />
          )}
          {section === "roles" && <RolesPermissionsView />}
          {section === "resources" && <ResourcesView />}
          {section === "monitoring" && <MonitoringView audit={audit} stats={stats} />}
          {section === "settings" && <SettingsView currentUser={currentUser} />}
        </div>
      </div>

      {showAddUser && (
        <AddUserModal members={members} onClose={() => setShowAddUser(false)} onSubmit={addUser} />
      )}
      {detailsUser && (
        <UserDetailsDrawer user={detailsUser} audit={audit} onClose={() => setDetailsUser(null)} />
      )}
      {confirmAction && (
        <ConfirmDialog action={confirmAction} onCancel={() => setConfirmAction(null)} onConfirm={runConfirmedAction} />
      )}
    </div>
  );
}

// ============================================================
// OVERVIEW
// ============================================================
function OverviewView({ stats, members, audit, setSection }) {
  const recentAudit = audit.slice(-6).reverse();
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Platform Overview</div>
        <h2>Super Admin dashboard</h2>
        <p>A platform-level view across every cooperative, user, and staff account on CoopGuard.</p>
      </div>

      <div className="cg-sa-stat-grid">
        <StatCard label="Cooperatives" value={stats.cooperatives} icon={Building2} onClick={() => setSection("cooperatives")} />
        <StatCard label="Total users" value={stats.totalUsers} icon={Users} onClick={() => setSection("users")} />
        <StatCard label="Active accounts" value={stats.active} icon={CheckCircle2} tone="ok" />
        <StatCard label="Inactive accounts" value={stats.inactive} icon={AlertTriangle} tone="warn" />
        <StatCard label="Archived accounts" value={stats.archived} icon={Archive} tone="muted" />
        <StatCard label="Staff & officers" value={stats.staff} icon={UserCog} onClick={() => setSection("staff")} />
      </div>

      <div className="cg-sa-card">
        <div className="cg-sa-card-head"><h3>Recent platform activity</h3><button className="cg-sa-link" onClick={() => setSection("monitoring")}>View all <ChevronRight size={13} /></button></div>
        <ul className="cg-sa-activity-list">
          {recentAudit.map((a) => (
            <li key={a.hash}>
              <Hash size={13} />
              <div>
                <div className="cg-sa-activity-action">{a.action.replace(/_/g, " ")}</div>
                <div className="cg-sa-activity-meta">{a.actor} · {fmtDate(a.ts)}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, tone, onClick }) {
  return (
    <button type="button" className={`cg-sa-stat cg-sa-stat-${tone || "default"} ${onClick ? "is-clickable" : ""}`} onClick={onClick} disabled={!onClick}>
      <Icon size={18} />
      <div className="cg-sa-stat-value">{value}</div>
      <div className="cg-sa-stat-label">{label}</div>
    </button>
  );
}

// ============================================================
// COOPERATIVES
// ============================================================
function CooperativesView({ members }) {
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Platform</div>
        <h2>Cooperatives</h2>
        <p>Cooperatives registered on the CoopGuard platform. Onboarding and per-cooperative configuration are handled in a later stage.</p>
      </div>
      <div className="cg-sa-card">
        <div className="cg-sa-table-wrap">
          <table className="cg-sa-table">
            <thead><tr><th>Cooperative</th><th>Location</th><th>Established</th><th>Members</th><th>Status</th></tr></thead>
            <tbody>
              {SEED_COOPERATIVES.map((c) => {
                const count = members.filter((m) => m.cooperativeId === c.id).length;
                return (
                  <tr key={c.id}>
                    <td><strong>{c.name}</strong><div className="cg-sa-muted">{c.shortCode}</div></td>
                    <td>{c.location}</td>
                    <td>{c.establishedYear}</td>
                    <td>{count}</td>
                    <td><StatusPill status={c.status === "active" ? "active" : "suspended"} label={c.status === "active" ? "Active" : "Pending review"} /></td>
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

// ============================================================
// USERS & MEMBERS / STAFF MANAGEMENT (shared)
// ============================================================
function UsersMembersView({ title, desc, members, filterFn, onAdd, onViewDetails, onDeactivate, onActivate, onArchive, onChangeRole }) {
  const [q, setQ] = useState("");
  const [coopFilter, setCoopFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  const rows = useMemo(() => {
    return members
      .filter(filterFn)
      .filter((m) => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.memberNo.toLowerCase().includes(q.toLowerCase()))
      .filter((m) => coopFilter === "all" || m.cooperativeId === coopFilter)
      .filter((m) => statusFilter === "all" || m.status === statusFilter)
      .filter((m) => roleFilter === "all" || m.role === roleFilter);
  }, [members, filterFn, q, coopFilter, statusFilter, roleFilter]);

  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head cg-sa-head-row">
        <div>
          <div className="cg-sa-eyebrow">User & Member Management</div>
          <h2>{title}</h2>
          <p>{desc}</p>
        </div>
        <button className="cg-sa-btn cg-sa-btn-primary" onClick={onAdd}><Plus size={15} /> Add user</button>
      </div>

      <div className="cg-sa-filters">
        <div className="cg-sa-search">
          <Search size={14} />
          <input placeholder="Search by name or ID…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="cg-sa-filter">
          <Filter size={13} />
          <select value={coopFilter} onChange={(e) => setCoopFilter(e.target.value)}>
            <option value="all">All cooperatives</option>
            {SEED_COOPERATIVES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <select className="cg-sa-select-plain" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <select className="cg-sa-select-plain" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          {ROLE_CATALOG.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>

      <div className="cg-sa-card">
        <div className="cg-sa-table-wrap">
          <table className="cg-sa-table">
            <thead><tr><th>Name</th><th>ID</th><th>Cooperative</th><th>Role</th><th>Status</th><th>Created</th><th></th></tr></thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={7} className="cg-sa-empty">No accounts match these filters.</td></tr>
              )}
              {rows.map((m) => (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong></td>
                  <td>{m.memberNo}</td>
                  <td>{getCooperativeName(m.cooperativeId)}</td>
                  <td>
                    <select className="cg-sa-role-select" value={m.role} onChange={(e) => onChangeRole(m, e.target.value)}>
                      {ROLE_CATALOG.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                      {!ROLE_CATALOG.find((r) => r.id === m.role) && <option value={m.role}>{getRoleLabel(m.role)} (legacy)</option>}
                    </select>
                  </td>
                  <td><StatusPill status={m.status} /></td>
                  <td>{m.joined || "—"}</td>
                  <td className="cg-sa-row-actions">
                    <button className="cg-sa-icon-btn" title="View details" onClick={() => onViewDetails(m)}><Eye size={15} /></button>
                    {m.status === "active" && <button className="cg-sa-icon-btn" title="Deactivate" onClick={() => onDeactivate(m)}><XCircle size={15} /></button>}
                    {m.status === "suspended" && <button className="cg-sa-icon-btn" title="Reactivate" onClick={() => onActivate(m)}><CheckCircle2 size={15} /></button>}
                    {m.status !== "archived" && <button className="cg-sa-icon-btn cg-sa-icon-btn-danger" title="Archive" onClick={() => onArchive(m)}><Archive size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status, label }) {
  const meta = getStatusMeta(status);
  return <span className={`cg-sa-pill cg-sa-pill-${meta.cls}`}>{label || meta.label}</span>;
}

// ============================================================
// ADD USER MODAL
// ============================================================
function AddUserModal({ members, onClose, onSubmit }) {
  const [userType, setUserType] = useState("member");
  const [name, setName] = useState("");
  const [memberNo, setMemberNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [cooperativeId, setCooperativeId] = useState(SEED_COOPERATIVES[0].id);
  const [role, setRole] = useState(ROLES_BY_USER_TYPE.member[0]);
  const [status, setStatus] = useState("active");
  const [error, setError] = useState("");

  const availableRoles = ROLES_BY_USER_TYPE[userType].map((id) => getRoleMeta(id));

  const handleUserType = (val) => {
    setUserType(val);
    setRole(ROLES_BY_USER_TYPE[val][0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) { setError("Full name is required."); return; }
    if (userType !== "platform" && !cooperativeId) { setError("Select a cooperative."); return; }
    setError("");
    onSubmit({ userType, name, memberNo, phone, email, cooperativeId, role, status });
  };

  return (
    <div className="cg-sa-modal-overlay" onClick={onClose}>
      <div className="cg-sa-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cg-sa-modal-head">
          <h3><UserPlus size={17} /> Add user</h3>
          <button className="cg-sa-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="cg-sa-form" onSubmit={handleSubmit}>
          <label>User type</label>
          <div className="cg-sa-segmented">
            {USER_TYPES.map((t) => (
              <button type="button" key={t.id} className={userType === t.id ? "active" : ""} onClick={() => handleUserType(t.id)}>{t.label}</button>
            ))}
          </div>

          <label>Full name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kemi Adewale" autoFocus />

          <div className="cg-sa-form-row">
            <div>
              <label>Member / User ID (optional)</label>
              <input value={memberNo} onChange={(e) => setMemberNo(e.target.value)} placeholder="Auto-generated if left blank" />
            </div>
            <div>
              <label>Phone number</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0803 000 0000" />
            </div>
          </div>

          {userType !== "member" && (
            <>
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. name@coopguard.ng" />
            </>
          )}

          {userType !== "platform" && (
            <>
              <label>Cooperative</label>
              <select value={cooperativeId} onChange={(e) => setCooperativeId(e.target.value)}>
                {SEED_COOPERATIVES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </>
          )}

          <label>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            {availableRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>

          <label>Account status</label>
          <div className="cg-sa-segmented">
            <button type="button" className={status === "active" ? "active" : ""} onClick={() => setStatus("active")}>Active</button>
            <button type="button" className={status === "suspended" ? "active" : ""} onClick={() => setStatus("suspended")}>Inactive</button>
          </div>

          {error && <div className="cg-sa-form-error">{error}</div>}

          <div className="cg-sa-modal-actions">
            <button type="button" className="cg-sa-btn cg-sa-btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="cg-sa-btn cg-sa-btn-primary">Add user</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================
// USER DETAILS DRAWER
// ============================================================
function UserDetailsDrawer({ user, audit, onClose }) {
  const related = audit.filter((a) => a.actor === user.name || JSON.stringify(a.details || {}).includes(user.name)).slice(-8).reverse();
  const roleMeta = getRoleMeta(user.role);
  return (
    <div className="cg-sa-modal-overlay" onClick={onClose}>
      <div className="cg-sa-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="cg-sa-modal-head">
          <button className="cg-sa-icon-btn" onClick={onClose}><ArrowLeft size={16} /></button>
          <h3>{user.name}</h3>
          <button className="cg-sa-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="cg-sa-drawer-body">
          <div className="cg-sa-drawer-row"><span>ID</span><strong>{user.memberNo}</strong></div>
          <div className="cg-sa-drawer-row"><span>Cooperative</span><strong>{getCooperativeName(user.cooperativeId)}</strong></div>
          <div className="cg-sa-drawer-row"><span>Role</span><strong>{roleMeta.label}</strong></div>
          <div className="cg-sa-drawer-row"><span>Status</span><StatusPill status={user.status} /></div>
          <div className="cg-sa-drawer-row"><span>Created</span><strong>{user.joined || "—"}</strong></div>
          {user.phone && <div className="cg-sa-drawer-row"><span>Phone</span><strong>{user.phone}</strong></div>}
          {user.email && <div className="cg-sa-drawer-row"><span>Email</span><strong>{user.email}</strong></div>}
          {roleMeta.description && <p className="cg-sa-muted">{roleMeta.description}</p>}

          <h4>Recent audit activity</h4>
          {related.length === 0 && <p className="cg-sa-muted">No recorded activity yet.</p>}
          <ul className="cg-sa-activity-list">
            {related.map((a) => (
              <li key={a.hash}>
                <Clock size={13} />
                <div>
                  <div className="cg-sa-activity-action">{a.action.replace(/_/g, " ")}</div>
                  <div className="cg-sa-activity-meta">{fmtDate(a.ts)}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// CONFIRM DIALOG (deactivate / reactivate / archive)
// ============================================================
function ConfirmDialog({ action, onCancel, onConfirm }) {
  const { type, user } = action;
  const copy = {
    deactivate: {
      title: "Deactivate this account?",
      body: `Are you sure you want to deactivate ${user.name}'s account? They will no longer be able to sign in or access CoopGuard until reactivated.`,
      confirmLabel: "Deactivate", tone: "warn",
    },
    activate: {
      title: "Reactivate this account?",
      body: `${user.name} will regain access to their CoopGuard account immediately.`,
      confirmLabel: "Reactivate", tone: "ok",
    },
    archive: {
      title: "Archive this account?",
      body: `This is a restricted action. ${user.name}'s account will be archived and hidden from active use. Financial and audit records are preserved and are not deleted, in line with cooperative record-keeping requirements.`,
      confirmLabel: "Archive account", tone: "bad",
    },
  }[type];

  return (
    <div className="cg-sa-modal-overlay" onClick={onCancel}>
      <div className="cg-sa-confirm" onClick={(e) => e.stopPropagation()}>
        <AlertTriangle size={22} className={`cg-sa-confirm-icon cg-sa-confirm-icon-${copy.tone}`} />
        <h3>{copy.title}</h3>
        <p>{copy.body}</p>
        <div className="cg-sa-modal-actions">
          <button className="cg-sa-btn cg-sa-btn-secondary" onClick={onCancel}>Cancel</button>
          <button className={`cg-sa-btn cg-sa-btn-${copy.tone === "bad" ? "danger" : "primary"}`} onClick={onConfirm}>{copy.confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ROLES & PERMISSIONS (reference architecture)
// ============================================================
function RolesPermissionsView() {
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Architecture</div>
        <h2>Roles & permissions</h2>
        <p>The permission boundaries below establish the architecture for cooperative dashboards to be built in the next stage. The Super Admin manages the platform; cooperative officers manage cooperative operations within their permissions; members manage their own information only.</p>
      </div>

      {Object.values(ROLE_CATEGORIES).map((cat) => (
        <div className="cg-sa-card" key={cat.id}>
          <div className="cg-sa-card-head"><h3>{cat.label}</h3></div>
          <div className="cg-sa-role-grid">
            {ROLE_CATALOG.filter((r) => r.category === cat.id).map((r) => (
              <div className="cg-sa-role-card" key={r.id}>
                <div className="cg-sa-role-card-title">{r.label}</div>
                <p>{r.description}</p>
                <div className="cg-sa-role-perms">
                  {r.permissions.map((pid) => {
                    const p = PERMISSIONS.find((x) => x.id === pid);
                    return <span key={pid} className="cg-sa-perm-chip"><ShieldCheck size={11} /> {p ? p.label : pid}</span>;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PLATFORM RESOURCES
// ============================================================
function ResourcesView() {
  const resources = [
    { name: "Cooperative onboarding checklist", type: "Document", updated: "2026-08-02" },
    { name: "KYC / BVN verification guideline", type: "Document", updated: "2026-07-18" },
    { name: "Loan risk policy template", type: "Template", updated: "2026-06-30" },
    { name: "Cooperative bylaws template", type: "Template", updated: "2026-05-11" },
  ];
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Platform</div>
        <h2>Platform resources</h2>
        <p>Shared documents and templates the Super Admin makes available to cooperatives. Upload and versioning are handled in a later stage.</p>
      </div>
      <div className="cg-sa-card">
        <div className="cg-sa-table-wrap">
          <table className="cg-sa-table">
            <thead><tr><th>Resource</th><th>Type</th><th>Last updated</th></tr></thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.name}><td>{r.name}</td><td>{r.type}</td><td>{r.updated}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SYSTEM MONITORING
// ============================================================
function MonitoringView({ audit, stats }) {
  const recent = audit.slice(-25).reverse();
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Platform</div>
        <h2>System monitoring</h2>
        <p>A live view of platform activity, drawn from the same tamper-evident audit ledger used across CoopGuard.</p>
      </div>
      <div className="cg-sa-stat-grid">
        <StatCard label="Active accounts" value={stats.active} icon={CheckCircle2} tone="ok" />
        <StatCard label="Inactive accounts" value={stats.inactive} icon={AlertTriangle} tone="warn" />
        <StatCard label="Ledger entries" value={audit.length} icon={Hash} />
      </div>
      <div className="cg-sa-card">
        <div className="cg-sa-card-head"><h3>Platform audit trail</h3></div>
        <div className="cg-sa-table-wrap">
          <table className="cg-sa-table">
            <thead><tr><th>Action</th><th>Actor</th><th>When</th><th>Hash</th></tr></thead>
            <tbody>
              {recent.map((a) => (
                <tr key={a.hash}>
                  <td>{a.action.replace(/_/g, " ")}</td>
                  <td>{a.actor}</td>
                  <td>{fmtDate(a.ts)}</td>
                  <td className="cg-sa-muted">{a.hash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS
// ============================================================
function SettingsView({ currentUser }) {
  return (
    <div className="cg-sa-page">
      <div className="cg-sa-head">
        <div className="cg-sa-eyebrow">Platform</div>
        <h2>Settings</h2>
        <p>Platform-wide configuration. Signed in as <strong>{currentUser.name}</strong> ({getRoleLabel(currentUser.role)}).</p>
      </div>
      <div className="cg-sa-card">
        <div className="cg-sa-card-head"><h3>Session</h3></div>
        <p className="cg-sa-muted" style={{ padding: "0 18px 18px" }}>
          Deeper platform settings — branding, notification policy, and integration keys — will be added when the platform resources and monitoring stages are built out.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// STYLES (scoped to the Super Admin workspace; reuses the
// CSS custom properties already defined by the app shell)
// ============================================================
function SuperAdminStyle() {
  return (
    <style>{`
      .cg-sa-shell { display: flex; gap: 20px; align-items: flex-start; }
      .cg-sa-subnav { display: flex; flex-direction: column; gap: 2px; min-width: 230px; background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 8px; position: sticky; top: 0; }
      .cg-sa-subnav-item { display: flex; align-items: center; gap: 9px; padding: 9px 10px; border-radius: 8px; border: none; background: none; text-align: left; font-size: 13px; color: var(--cg-ink); cursor: pointer; }
      .cg-sa-subnav-item:hover { background: var(--cg-paper-2); }
      .cg-sa-subnav-item.active { background: var(--cg-navy); color: #fff; }
      .cg-sa-body { flex: 1; min-width: 0; }
      .cg-sa-page { display: flex; flex-direction: column; gap: 16px; }
      .cg-sa-head h2 { margin: 4px 0 4px; font-size: 21px; }
      .cg-sa-head p { margin: 0; color: #5B6B7A; font-size: 13.5px; max-width: 640px; }
      .cg-sa-head-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
      .cg-sa-eyebrow { text-transform: uppercase; letter-spacing: .06em; font-size: 11px; font-weight: 700; color: var(--cg-teal); }

      .cg-sa-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; }
      .cg-sa-stat { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; padding: 14px; text-align: left; }
      .cg-sa-stat.is-clickable { cursor: pointer; }
      .cg-sa-stat.is-clickable:hover { border-color: var(--cg-teal); }
      .cg-sa-stat:disabled { cursor: default; }
      .cg-sa-stat-value { font-size: 22px; font-weight: 700; }
      .cg-sa-stat-label { font-size: 12px; color: #5B6B7A; }
      .cg-sa-stat-ok svg { color: #2F9E63; }
      .cg-sa-stat-warn svg { color: #C08A1E; }
      .cg-sa-stat-muted svg { color: #8A97A3; }

      .cg-sa-card { background: #fff; border: 1px solid var(--cg-line); border-radius: 12px; overflow: hidden; }
      .cg-sa-card-head { display: flex; justify-content: space-between; align-items: center; padding: 14px 18px; border-bottom: 1px solid var(--cg-line); }
      .cg-sa-card-head h3 { margin: 0; font-size: 14.5px; }
      .cg-sa-link { display: inline-flex; align-items: center; gap: 4px; background: none; border: none; color: var(--cg-blue); font-size: 12.5px; cursor: pointer; }

      .cg-sa-table-wrap { overflow-x: auto; }
      .cg-sa-table { width: 100%; border-collapse: collapse; font-size: 13px; }
      .cg-sa-table th { text-align: left; padding: 10px 18px; background: var(--cg-paper-2); font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #5B6B7A; }
      .cg-sa-table td { padding: 10px 18px; border-top: 1px solid var(--cg-line); vertical-align: middle; }
      .cg-sa-empty { text-align: center; color: #8A97A3; padding: 24px; }
      .cg-sa-muted { color: #8A97A3; font-size: 11.5px; }

      .cg-sa-head-row .cg-sa-btn { margin-top: 4px; }
      .cg-sa-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; border: 1px solid var(--cg-line); background: #fff; cursor: pointer; }
      .cg-sa-btn-primary { background: var(--cg-navy); border-color: var(--cg-navy); color: #fff; }
      .cg-sa-btn-secondary { background: #fff; }
      .cg-sa-btn-danger { background: var(--cg-red); border-color: var(--cg-red); color: #fff; }

      .cg-sa-filters { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
      .cg-sa-search { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--cg-line); border-radius: 8px; padding: 8px 10px; flex: 1; min-width: 180px; }
      .cg-sa-search input { border: none; outline: none; font-size: 13px; flex: 1; }
      .cg-sa-filter { display: flex; align-items: center; gap: 6px; background: #fff; border: 1px solid var(--cg-line); border-radius: 8px; padding: 6px 10px; }
      .cg-sa-filter select, .cg-sa-select-plain { border: none; outline: none; font-size: 12.5px; background: #fff; }
      .cg-sa-select-plain { border: 1px solid var(--cg-line); border-radius: 8px; padding: 8px 10px; }
      .cg-sa-role-select { border: 1px solid var(--cg-line); border-radius: 6px; padding: 4px 6px; font-size: 12.5px; background: #fff; }

      .cg-sa-row-actions { display: flex; gap: 4px; }
      .cg-sa-icon-btn { border: 1px solid var(--cg-line); background: #fff; border-radius: 7px; width: 30px; height: 30px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; color: var(--cg-ink); }
      .cg-sa-icon-btn-danger { color: var(--cg-red); }

      .cg-sa-pill { display: inline-block; padding: 3px 9px; border-radius: 999px; font-size: 11.5px; font-weight: 600; }
      .cg-sa-pill-ok { background: #E4F5EB; color: #1C7A46; }
      .cg-sa-pill-warn { background: #FBF0DA; color: #92650F; }
      .cg-sa-pill-bad { background: #FBE4E1; color: #A32E20; }
      .cg-sa-pill-muted { background: var(--cg-paper-2); color: #5B6B7A; }

      .cg-sa-activity-list { list-style: none; margin: 0; padding: 6px 18px 16px; display: flex; flex-direction: column; gap: 10px; }
      .cg-sa-activity-list li { display: flex; gap: 10px; align-items: flex-start; color: var(--cg-teal); }
      .cg-sa-activity-action { font-size: 13px; color: var(--cg-ink); text-transform: capitalize; }
      .cg-sa-activity-meta { font-size: 11.5px; color: #8A97A3; }

      .cg-sa-modal-overlay { position: fixed; inset: 0; background: rgba(14,26,48,0.45); display: flex; align-items: center; justify-content: center; z-index: 60; padding: 16px; }
      .cg-sa-modal { background: #fff; border-radius: 14px; width: 100%; max-width: 460px; max-height: 90vh; overflow-y: auto; }
      .cg-sa-drawer { background: #fff; border-radius: 14px; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto; }
      .cg-sa-confirm { background: #fff; border-radius: 14px; width: 100%; max-width: 380px; padding: 22px; text-align: center; }
      .cg-sa-confirm-icon-warn { color: #C08A1E; }
      .cg-sa-confirm-icon-ok { color: #2F9E63; }
      .cg-sa-confirm-icon-bad { color: var(--cg-red); }
      .cg-sa-confirm h3 { margin: 10px 0 6px; font-size: 16px; }
      .cg-sa-confirm p { color: #5B6B7A; font-size: 13px; margin: 0 0 16px; }
      .cg-sa-confirm .cg-sa-modal-actions { justify-content: center; }

      .cg-sa-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; border-bottom: 1px solid var(--cg-line); gap: 10px; }
      .cg-sa-modal-head h3 { margin: 0; font-size: 15px; display: flex; align-items: center; gap: 8px; flex: 1; }

      .cg-sa-form { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 4px; }
      .cg-sa-form label { font-size: 11.5px; font-weight: 600; color: #5B6B7A; margin-top: 10px; }
      .cg-sa-form input, .cg-sa-form select { border: 1px solid var(--cg-line); border-radius: 8px; padding: 9px 11px; font-size: 13.5px; outline: none; }
      .cg-sa-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      .cg-sa-form-error { color: var(--cg-red); font-size: 12.5px; margin-top: 8px; }
      .cg-sa-segmented { display: flex; gap: 6px; flex-wrap: wrap; }
      .cg-sa-segmented button { border: 1px solid var(--cg-line); background: #fff; border-radius: 999px; padding: 6px 12px; font-size: 12px; cursor: pointer; }
      .cg-sa-segmented button.active { background: var(--cg-navy); border-color: var(--cg-navy); color: #fff; }
      .cg-sa-modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }

      .cg-sa-drawer-body { padding: 16px 18px 20px; }
      .cg-sa-drawer-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed var(--cg-line); font-size: 13px; }
      .cg-sa-drawer-row span { color: #8A97A3; }
      .cg-sa-drawer-body h4 { margin: 16px 0 4px; font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; color: #5B6B7A; }

      .cg-sa-role-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px; padding: 14px 18px 18px; }
      .cg-sa-role-card { border: 1px solid var(--cg-line); border-radius: 10px; padding: 12px; }
      .cg-sa-role-card-title { font-weight: 700; font-size: 13.5px; margin-bottom: 4px; }
      .cg-sa-role-card p { font-size: 12px; color: #5B6B7A; margin: 0 0 8px; }
      .cg-sa-role-perms { display: flex; flex-wrap: wrap; gap: 6px; }
      .cg-sa-perm-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--cg-paper-2); border-radius: 999px; padding: 3px 9px; font-size: 10.5px; color: var(--cg-navy-2); }

      @media (max-width: 880px) {
        .cg-sa-shell { flex-direction: column; }
        .cg-sa-subnav { flex-direction: row; overflow-x: auto; width: 100%; position: static; }
        .cg-sa-subnav-item span { white-space: nowrap; }
      }
    `}</style>
  );
}
