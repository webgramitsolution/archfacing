/**
 * Instant navigation feedback for every public page.
 *
 * Public pages are `force-dynamic` and fetch from the database on the server,
 * so a click used to sit on the old page until the whole response came back.
 * This route-level loading UI is shown the moment a navigation starts — a
 * header placeholder so the layout does not jump, then a light skeleton of a
 * hero and a content grid — and Next swaps in the real page as soon as it is
 * ready.
 */
export default function Loading() {
  return (
    <div className="min-h-screen animate-pulse bg-paper">
      {/* header placeholder — matches the two-bar site header height */}
      <div className="border-b border-line bg-white">
        <div className="container-af flex items-center gap-4 py-3">
          <div className="h-8 w-28 rounded bg-paper-3" />
          <div className="h-9 flex-1 rounded-lg bg-paper-2" />
          <div className="hidden gap-3 sm:flex">
            <div className="h-8 w-8 rounded-full bg-paper-3" />
            <div className="h-8 w-8 rounded-full bg-paper-3" />
            <div className="h-8 w-8 rounded-full bg-paper-3" />
          </div>
        </div>
      </div>
      <div className="border-b border-line bg-white">
        <div className="container-af flex gap-6 py-3.5">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-4 w-20 rounded bg-paper-2" />
          ))}
        </div>
      </div>

      {/* content skeleton */}
      <div className="container-af py-6">
        <div className="h-[220px] w-full rounded-card bg-paper-2" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-card bg-paper-2 p-3">
              <div className="aspect-square w-full rounded-card bg-paper-3" />
              <div className="mt-3 h-4 w-3/4 rounded bg-paper-3" />
              <div className="mt-2 h-4 w-1/2 rounded bg-paper-3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
