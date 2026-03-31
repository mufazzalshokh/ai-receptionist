import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          AI Receptionist
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          Your business never misses a lead again.
        </p>
      </div>

      <div className="flex gap-4">
        <Link
          href="/dashboard"
          className="rounded-lg bg-accent px-6 py-3 font-medium text-accent-foreground transition-colors hover:bg-accent/90"
        >
          Open Dashboard
        </Link>
        <Link
          href="/demo"
          className="rounded-lg border border-border px-6 py-3 font-medium text-slate-700 transition-colors hover:bg-slate-100"
        >
          Try Demo Chat
        </Link>
      </div>
    </div>
  );
}
