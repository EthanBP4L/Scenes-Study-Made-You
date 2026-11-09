
"use client";

import RequireAuth from "../../components/RequireAuth";
import ZimmerCanvas from "../../components/ZimmerCanvas";
import NavigationOrb from "../../components/NavigationOrb";

export default function ZimmerPage() {
  return (
    <RequireAuth>
      <main className="relative min-h-screen bg-[#080817]">
        <ZimmerCanvas />
        <NavigationOrb />
      </main>
    </RequireAuth>
  );
}
