
"use client";

import ZimmerCanvas from "../../components/ZimmerCanvas";
import NavigationOrb from "../../components/NavigationOrb";

export default function ZimmerPage() {
  return (
    <main className="relative min-h-screen bg-[#080817]">
      <ZimmerCanvas />
      <NavigationOrb />
    </main>
  );
}
