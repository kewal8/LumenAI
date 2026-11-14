// Shown inside the app shell while a screen's data is being fetched.
export default function Loading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading"
      className="mx-auto flex w-full max-w-6xl flex-1 animate-pulse flex-col gap-7 px-5 py-8 sm:px-8 lg:py-10"
    >
      <div className="flex flex-col gap-3">
        <div className="h-8 w-48 rounded-full bg-ink/[0.08]" />
        <div className="h-4 w-80 max-w-full rounded-full bg-ink/[0.06]" />
      </div>
      <div className="h-24 rounded-3xl bg-ink/[0.05]" />
      <div className="h-56 rounded-3xl bg-ink/[0.05]" />
    </main>
  );
}
