import { useState } from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";

export default function Layout({ children }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isQRMode = searchParams.get("mode") === "qr" || searchParams.get("qr") === "true";

  if (isQRMode) {
    return (
      <div className="admin-soft-grid flex min-h-screen bg-[#eff1ea]">
        <main className="min-w-0 flex-1 overflow-auto px-5 py-4 transition-all duration-300">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="admin-soft-grid flex min-h-screen bg-[#eff1ea]">
      <Sidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />
      <main className="min-w-0 flex-1 overflow-auto px-5 py-4 transition-all duration-300">
        {children}
      </main>
    </div>
  );
}
