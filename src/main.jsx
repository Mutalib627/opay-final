import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import CoopGuardSim from "./CoopGuardSim.jsx";
import Landing from "./landing/Landing.jsx";

// Minimal, dependency-free router: "/" is the public landing page,
// "/app" (and anything under it) is the existing simulation dashboard.
function Root() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to) => {
    if (to !== window.location.pathname) {
      window.history.pushState({}, "", to);
    }
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  if (path.startsWith("/app")) {
    return <CoopGuardSim />;
  }
  return <Landing onNavigate={navigate} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
