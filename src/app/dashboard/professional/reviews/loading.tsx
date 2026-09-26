export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="mb-6 h-6 w-48 rounded bg-paper-3" />
      <div className="grid gap-4 sm:grid-cols-[minmax(0,220px)_1fr]">
        <div className="h-40 rounded-card bg-paper-3" />
        <div className="h-40 rounded-card bg-paper-3" />
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-card bg-paper-3" />
        ))}
      </div>
    </div>
  )
}
