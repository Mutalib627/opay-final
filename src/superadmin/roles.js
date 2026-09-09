/* ============================================================
   COOPGUARD — Role & Permission Architecture
   ------------------------------------------------------------
   Stage 1 of the Super Admin restructuring. This file defines
   the professional cooperative role architecture that replaces
   the old flat Admin / Member / Loan Officer model.

   IMPORTANT (backward compatibility):
   Existing seed accounts keep their original `role` values
   ("admin", "loan_officer", "member") so nothing in the already
   shipped Cooperative Control panel, Loan Officer Desk, Fraud
   Watch, AI Operations Center, or Member dashboard breaks. Those
   legacy values are mapped into this new catalog via
   LEGACY_ROLE_ALIASES purely for *display* and for populating the
   Roles & Permissions reference screen. Newly added users (via
   the Super Admin "Add user" workflow) are assigned roles
   directly from ROLE_CATALOG.
   ============================================================ */

// ---------- Role categories ----------
export const ROLE_CATEGORIES = {
  platform: { id: "platform", label: "Super Admin (Platform)" },
  cooperative: { id: "cooperative", label: "Cooperative Administration" },
  member: { id: "member", label: "Member" },
};

// ---------- Permission catalog ----------
// Grouped by domain. This is the reference matrix shown on the
// Roles & Permissions screen — it establishes permission
// *boundaries* for the next build stage rather than wiring every
// check throughout the app today.
export const PERMISSIONS = [
  { id: "platform.manage_cooperatives", label: "Manage cooperatives on the platform", domain: "Platform" },
  { id: "platform.manage_users", label: "Add, edit, deactivate, or archive any user", domain: "Platform" },
  { id: "platform.manage_roles", label: "Define roles & permission boundaries", domain: "Platform" },
  { id: "platform.manage_resources", label: "Manage shared platform resources", domain: "Platform" },
  { id: "platform.view_system_health", label: "View system monitoring & platform audit trail", domain: "Platform" },
  { id: "platform.manage_settings", label: "Configure platform-wide settings", domain: "Platform" },

  { id: "coop.manage_members", label: "Manage cooperative membership", domain: "Cooperative" },
  { id: "coop.manage_governance", label: "Convene meetings & manage proposals/voting", domain: "Cooperative" },
  { id: "coop.manage_finance", label: "Oversee savings, dividends & financial records", domain: "Cooperative" },
  { id: "coop.manage_loans", label: "Review, approve, or reject loan applications", domain: "Cooperative" },
  { id: "coop.audit_oversight", label: "Independent audit & supervisory oversight", domain: "Cooperative" },

  { id: "self.manage_profile", label: "Manage own profile, wallet & loan applications", domain: "Member" },
];

const P = PERMISSIONS.reduce((acc, p) => { acc[p.id] = p.id; return acc; }, {});

// ---------- Role catalog ----------
export const ROLE_CATALOG = [
  {
    id: "super_admin",
    label: "Super Admin",
    category: "platform",
    description: "Platform-level administrator. Manages cooperatives, all user & staff accounts, roles, and platform resources. Does not act as a cooperative officer.",
    permissions: [
      P["platform.manage_cooperatives"], P["platform.manage_users"], P["platform.manage_roles"],
      P["platform.manage_resources"], P["platform.view_system_health"], P["platform.manage_settings"],
    ],
  },
  {
    id: "president",
    label: "President / Chairperson",
    category: "cooperative",
    description: "Leads the cooperative's administration and governance; oversees the cooperative's officers and strategic decisions.",
    permissions: [P["coop.manage_members"], P["coop.manage_governance"], P["coop.manage_finance"], P["coop.manage_loans"]],
  },
  {
    id: "secretary",
    label: "Secretary",
    category: "cooperative",
    description: "Maintains cooperative records, meeting minutes, and membership documentation.",
    permissions: [P["coop.manage_members"], P["coop.manage_governance"]],
  },
  {
    id: "treasurer",
    label: "Treasurer / Finance Officer",
    category: "cooperative",
    description: "Oversees the cooperative's savings book, dividends, and financial reporting.",
    permissions: [P["coop.manage_finance"]],
  },
  {
    id: "loan_officer",
    label: "Credit / Loan Officer",
    category: "cooperative",
    description: "Reviews loan applications, assesses risk, and manages disbursement and repayment.",
    permissions: [P["coop.manage_loans"]],
  },
  {
    id: "audit_officer",
    label: "Supervisory / Audit Officer",
    category: "cooperative",
    description: "Independent oversight of cooperative operations, the audit ledger, and fraud reviews.",
    permissions: [P["coop.audit_oversight"]],
  },
  {
    id: "member",
    label: "Member",
    category: "member",
    description: "Ordinary cooperative member. Manages their own savings, loans, voting and reputation passport.",
    permissions: [P["self.manage_profile"]],
  },
];

const CATALOG_BY_ID = ROLE_CATALOG.reduce((acc, r) => { acc[r.id] = r; return acc; }, {});

// Legacy seed roles ("admin", "loan_officer", "member") map onto this
// catalog for display purposes only — their underlying `role` string is
// left untouched so existing staff/member views keep working exactly
// as before.
const LEGACY_ROLE_ALIASES = {
  admin: "president",
  loan_officer: "loan_officer",
  member: "member",
};

export function getRoleMeta(roleId) {
  if (CATALOG_BY_ID[roleId]) return CATALOG_BY_ID[roleId];
  const aliased = LEGACY_ROLE_ALIASES[roleId];
  if (aliased && CATALOG_BY_ID[aliased]) {
    return { ...CATALOG_BY_ID[aliased], legacyRoleId: roleId };
  }
  return { id: roleId, label: (roleId || "unknown").replace(/_/g, " "), category: "member", description: "", permissions: [] };
}

export function getRoleLabel(roleId) {
  return getRoleMeta(roleId).label;
}

export function getCategoryForRole(roleId) {
  return getRoleMeta(roleId).category;
}

// Roles selectable per user type in the "Add user" workflow.
export const ROLES_BY_USER_TYPE = {
  platform: ROLE_CATALOG.filter((r) => r.category === "platform").map((r) => r.id),
  staff: ROLE_CATALOG.filter((r) => r.category === "cooperative").map((r) => r.id),
  member: ROLE_CATALOG.filter((r) => r.category === "member").map((r) => r.id),
};

export const USER_TYPES = [
  { id: "platform", label: "Platform Staff (Super Admin)" },
  { id: "staff", label: "Cooperative Officer" },
  { id: "member", label: "Member" },
];

// ---------- Account status ----------
// NOTE: "active" / "suspended" reuse the exact same values already
// written by the existing Cooperative Control panel, so a status
// change made there or here is always consistent. "archived" is a
// new, Super-Admin-only, restricted state for permanent removal.
export const STATUS_META = {
  active: { label: "Active", cls: "ok" },
  suspended: { label: "Inactive", cls: "warn" },
  archived: { label: "Archived", cls: "bad" },
};

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || "unknown", cls: "muted" };
}
