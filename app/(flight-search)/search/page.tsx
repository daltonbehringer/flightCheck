import FlightSearchShell from '@/components/FlightSearchShell';

export default function SearchPage() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 py-16">
        <header className="text-center">
          <p className="mb-3 inline-flex rounded-full bg-white/60 px-4 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-slate-600 shadow-sm ring-1 ring-slate-200">
            Cost-first prototype
          </p>
          <h1 className="text-4xl font-semibold text-ink sm:text-5xl">
            Multi-airport flight search that stays simple.
          </h1>
          <p className="mt-4 text-lg text-slate-600 sm:text-xl">
            Compare flights across nearby airports with a single query - sorted by fare, not just route.
          </p>
        </header>

        <FlightSearchShell />
      </div>
    </main>
  );
}
