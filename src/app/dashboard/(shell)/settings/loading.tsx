/**
 * Shown the instant a settings link is tapped. The settings layout (the gear
 * header and the left rail) is already on screen, so this only stands in for
 * the panel on the right — in the shape the notification grid and the info
 * panels take — instead of freezing on the previous page while the next one's
 * data arrives.
 */
export default function Loading() {
  return (
    <div className="card animate-pulse overflow-hidden" aria-hidden>
      <div className="flex items-center gap-3 border-b border-line-soft px-5 py-4 md:px-6">
        <div className="h-10 w-10 shrink-0 rounded-card bg-line-soft" />
        <div className="flex-1">
          <div className="h-4 w-44 rounded bg-line" />
          <div className="mt-2 h-3 w-60 max-w-full rounded bg-line-soft" />
        </div>
      </div>
      <div className="space-y-5 px-5 py-5 md:px-6">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="h-3.5 w-40 max-w-full rounded bg-line-soft" />
              <div className="mt-2 h-3 w-64 max-w-full rounded bg-line-soft" />
            </div>
            <div className="flex shrink-0 gap-2">
              {[0, 1, 2, 3].map((j) => (
                <div key={j} className="h-[22px] w-[40px] rounded-full bg-line-soft" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading</span>
    </div>
  )
}
