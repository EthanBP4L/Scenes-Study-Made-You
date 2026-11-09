
import Link from "next/link";
import ZimmerCanvas from "../../components/ZimmerCanvas";

export default function ZimmerTestPage() {
  return (
    <main className="min-h-screen bg-[#080817] text-white">
      <div className="relative z-30 flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
        <Link
          href="/zimmer"
          className="rounded-full border border-white/20 bg-white/10 px-5 py-2 text-sm transition hover:bg-white/20"
        >
          ← Back to Zimmer
        </Link>

        <span className="text-xs tracking-[0.2em] text-pink-200/70 uppercase">
          SCENES · Canvas Lab
        </span>
      </div>

      <ZimmerCanvas />
    </main>
  );
}
