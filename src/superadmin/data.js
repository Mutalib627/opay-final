/* ============================================================
   COOPGUARD — Super Admin simulated platform data
   ------------------------------------------------------------
   Lightweight, in-memory seed list of cooperatives on the
   platform. Existing seed members (CG-0001..CG-0005) belong to
   "coop-1" so the current single-cooperative experience is
   unaffected; the extra cooperatives exist purely to demonstrate
   platform-level oversight (filtering, cooperative list, empty
   states) in this stage.
   ============================================================ */

export const SEED_COOPERATIVES = [
  {
    id: "coop-1",
    name: "CoopGuard Demo Cooperative",
    shortCode: "CGDC",
    location: "Ilorin, Kwara State",
    status: "active",
    establishedYear: 2021,
  },
  {
    id: "coop-2",
    name: "Unity Farmers Cooperative",
    shortCode: "UFC",
    location: "Lagos, Lagos State",
    status: "active",
    establishedYear: 2019,
  },
  {
    id: "coop-3",
    name: "Riverside Traders Cooperative",
    shortCode: "RTC",
    location: "Port Harcourt, Rivers State",
    status: "pending_review",
    establishedYear: 2024,
  },
];

export function getCooperativeName(cooperativeId) {
  if (!cooperativeId) return "Platform (no cooperative)";
  const c = SEED_COOPERATIVES.find((x) => x.id === cooperativeId);
  return c ? c.name : "Unknown cooperative";
}
