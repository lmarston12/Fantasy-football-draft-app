import { ConnectForm } from "@/components/ConnectForm";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-6 py-16">
      <div className="mb-10 max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Fantasy Draft Assistant
        </h1>
        <p className="mt-3 text-lg text-zinc-600 dark:text-zinc-400">
          Connect your Sleeper league and get scarcity-aware, roster-need-aware
          recommendations for the best available player — live, as your draft
          unfolds.
        </p>
      </div>

      <ConnectForm />

      <section className="mt-12 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            title: "Reads your league",
            body: "Teams, scoring, roster slots, and every pick — pulled live from Sleeper.",
          },
          {
            title: "Knows your needs",
            body: "Value over replacement adjusted for your open starting slots and depth.",
          },
          {
            title: "100% free",
            body: "Public Sleeper API, no login, no paid tiers. Bring your own rankings too.",
          },
        ].map((f) => (
          <div
            key={f.title}
            className="rounded-xl border border-black/10 bg-white p-4 text-sm dark:border-white/10 dark:bg-zinc-900"
          >
            <h3 className="mb-1 font-semibold text-zinc-900 dark:text-zinc-100">
              {f.title}
            </h3>
            <p className="text-zinc-600 dark:text-zinc-400">{f.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
