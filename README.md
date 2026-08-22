# CoopGuard — Simulation Prototype

A self-contained, interactive demo of the CoopGuard concept: a transparent
digital cooperative management system. **No real backend, no real money** —
every wallet, loan, vote, and notification is simulated in-memory so you can
demo the full experience instantly (great for project defense / pitch demos).

---

## What's in this prototype

| Feature (from your proposal)       | How it's simulated |
|-------------------------------------|---------------------|
| **Sign-in & Identity**               | Landing sign-in screen with member number + PIN, followed by a simulated facial recognition + fingerprint check before entering the dashboard. |
| **Digital Wallets**                 | Each member has a virtual balance. Deposit / withdraw buttons update it instantly and log a transaction. |
| **Automated Loan Assessment**       | Applying for a loan auto-calculates the monthly repayment (12% APR amortization). Before submission, applicants pass through **facial recognition + fingerprint verification**, then an **automated BVN credit check** against a simulated cross-institution bureau. |
| **Security: Facial Recognition & Biometrics** | A dedicated verification step (used at sign-in and before loan submission) simulates a live face scan (with liveness check) and fingerprint match against the member's enrolled profile. Unenrolled members can enroll instantly in the demo. |
| **Credit & BVN ("Credit & BVN" tab)** | Each member has a simulated BVN linked to a shared credit bureau record: credit score (0–850), score band (Poor/Fair/Good/Excellent), and any active loans/defaults at *other* institutions — used to flag risky applicants fairly and consistently. |
| **Real-Time Financial Dashboard**   | Live stats: total cooperative savings, member count, pending/active loans, total disbursed — all recompute instantly as you act. |
| **Transaction Audit Trail**         | The **Audit Ledger** tab is the signature feature — every action (deposit, loan decision, biometric scan, credit check, vote, suspension) is written as a hash-chained entry, where each entry's hash depends on the previous one. |
| **AI Fraud Detection**              | Two layers: (1) "Fraud Watch" — a heuristic rules engine flags transactions that are oversized, part of rapid bursts, mirror a recent deposit (layering), or exceed ₦300,000. (2) **"AI Insights"** — a live scanning feed shows every transaction scored in real time with a Clear / Watchlist / High-risk verdict. |
| **Bad Credit Score Flagging**       | The BVN credit check automatically flags applicants with scores below 580, or with an active default/overdue facility at another institution, marking the loan "not eligible" and alerting loan officers. |
| **Voting & Decision Portal**        | Members vote yes/no/abstain on proposals; results update live with a stacked progress bar. Staff can create new proposals with a deadline. |
| **Live Meeting & Chat**             | A virtual meeting room with participant tiles, mic/camera toggle controls, and a live group chat panel for general meetings and board sessions. |
| **Loan Officer Desk**               | A dedicated staff view showing, per applicant: biometric verification result, BVN credit score & band, external loan facilities at other institutions, and the automated risk assessment reasons — before approve/reject. |
| **Notification System**             | Every meaningful action (deposit, loan approval, guarantor request, suspension, new proposal, biometric enrollment) pushes a notification to the relevant member's inbox, with an unread badge in the sidebar. |
| **AI Operations Center**            | Coop Guard Intelligence — an operational-intelligence layer, not a chatbot. Shows the agent's live workflow (Observe → Analyze → Reason → Act → Escalate → Human approval → Audit), a hub view connecting it to Loans/Transactions/Repayments/Administration/Governance, real-time priority alerts and an operations summary pulled from the actual simulation state, the three-tier autonomy model (Automatic / Review / Human control), and a before/after view of the administrator's role. Staff-only tab, sidebar → "AI Operations Center". |

## Demo sign-in

On launch you'll see a sign-in screen. Click any of the demo account chips
(auto-fills member number + a valid PIN), then continue through the
simulated facial recognition + fingerprint check to enter the dashboard.

## Roles (switch via the sidebar dropdown)

- **Mutalib Adebayo** — admin (full control center + fraud watch)
- **Funke Oyelaran** — member (has a loan under review)
- **Chidi Okafor** — member (has an active repaying loan)
- **Aisha Bello** — loan officer (staff view, can approve/disburse)
- **Tunde Salako** — member

Switching roles lets you demo the experience from every angle — member,
loan officer, and admin — without logging in and out.

## Suggested demo flow

1. **Sign in** — pick a demo account, complete the biometric verification step.
2. **Dashboard** — show the live financial overview.
3. **Virtual Wallet** — make a deposit as Tunde, then a large withdrawal
   (e.g. ₦35,000+) to trigger the fraud engine.
4. **AI Insights** (switch to admin) — show the live scan feed with the
   "high risk" verdict and reasons.
5. **Fraud Watch** — show the flagged transaction, dismiss or escalate it.
6. **Loans** — as Funke, apply for a new loan: walk through the biometric
   check, then the BVN credit check (Funke is "Good" band, eligible).
   Try the same flow as Tunde (Poor band + active default elsewhere) to
   see "not eligible" with reasons.
7. **Loan Officer Desk** (switch to Aisha) — review a pending application
   with its identity verification, credit score, and external facilities,
   then approve/reject.
8. **Credit & BVN** — show a member's own credit profile, then the staff
   "all members" overview.
9. **Decisions & Voting** — cast a vote on the open dividend proposal.
10. **Live Meeting** — join the meeting room, send a chat message.
11. **Audit Ledger** — scroll through and show how every action above
    (including biometric scans and BVN checks) is permanently chained
    together with hashes.
12. **Notifications** — check each member's inbox for alerts generated by
    the above actions.

## Design notes

- Palette is aligned to the CoopGuard logo: deep navy (`#0E1A30`) and
  teal (`#569192`) as the two brand colors, on a clean cool-neutral
  background (`#F7F9FA`) — replacing the earlier ledger-green/gold/cream
  "cooperative ledger book" theme.
- Typography is a single clean sans face (Inter) throughout, matching
  the logo's sans-serif wordmark — the previous serif "ledger" display
  face has been retired for brand consistency.
- The **Audit Ledger** is the intentional centerpiece — it makes the
  abstract idea of "immutable records" visually concrete via a
  hash-chain feed.
- The **AI Operations Center** is designed to feel like a real product
  surface (live stats, priority alerts, an operations summary) rather
  than a decorative marketing section — its headline numbers are
  computed from the actual simulation state, not hardcoded.

## Files

- `CoopGuardSim.jsx` — the full single-file React component (also
  rendered as an interactive artifact in the chat).

## From prototype to production

This simulation maps directly onto the real schema already built in your
`co-op-connect-main` Supabase project (savings_accounts, loans,
notifications, etc.). To go from this prototype to production:

1. Replace in-memory `useState` with Supabase queries/mutations.
2. Replace the hash-chain demo with a real append-only audit table +
   row-level security (already partially scaffolded).
3. Replace the heuristic fraud rules with the same logic, but running as
   a Supabase Edge Function triggered on transaction insert.
4. Add a `proposals` / `votes` table for the voting module (not yet in
   your current schema).
