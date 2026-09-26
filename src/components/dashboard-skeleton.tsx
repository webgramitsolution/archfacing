/**
 * What the reader sees the instant they tap a dashboard link.
 *
 * Without a loading boundary the App Router holds the old page on screen
 * until the new one's data has arrived — measured at over three seconds on
 * this dashboard, during which nothing at all moves and the tap looks
 * ignored. This paints in the same frame as the click.
 *
 * Deliberately dumb: a heading bar and a few blocks in the shape most of
 * these pages take. It is a placeholder, not a preview, so it must never
 * cost more than the page it stands in for.
 */
export function DashboardSkeleton() {
  return (
    <div className="animate-pulse" aria-hidden>
      {/* heading */}
      <div className="mb-7">
        <div className="h-[26px] w-56 rounded bg-line" />
        <div className="mt-3 h-4 w-full max-w-xl rounded bg-line-soft" />
        <div className="mt-2 h-4 w-2/3 rounded bg-line-soft" />
      </div>

      {/* body blocks */}
      <div className="flex flex-col gap-4">
        {[0, 1].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-paper-2 p-5">
            <div className="h-3 w-24 rounded bg-line-soft" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((j) => (
                <div key={j}>
                  <div className="h-3 w-20 rounded bg-line-soft" />
                  <div className="mt-2 h-[38px] rounded-lg bg-paper-3" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Loading</span>
    </div>
  )
}
