/**
 * Instant navigation feedback for every admin route.
 *
 * The shell (sidebar + top bar) stays mounted during a route change; this
 * skeleton replaces only the <main> content the moment a link is clicked, so
 * navigation feels instant even while the next page renders. In `next dev` the
 * first visit to a route also compiles on demand — production has no such wait.
 */
export default function AdminLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      {/* header */}
      <div className="space-y-2">
        <div className="skel h-6 w-52 rounded-md" />
        <div className="skel h-3.5 w-96 rounded" />
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-card border border-line bg-white p-3.5 shadow-card">
            <div className="flex items-center gap-2">
              <div className="skel h-9 w-9 rounded-lg" />
              <div className="skel h-3 w-16 rounded" />
            </div>
            <div className="skel mt-3 h-6 w-14 rounded" />
            <div className="skel mt-2 h-2.5 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* body: table block + rail */}
      <div className="flex items-start gap-5">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skel h-6 w-24 rounded" />
            ))}
          </div>
          <div className="rounded-card border border-line bg-white p-4 shadow-card">
            <div className="flex gap-2">
              <div className="skel h-9 flex-1 rounded-lg" />
              <div className="skel h-9 w-28 rounded-lg" />
              <div className="skel h-9 w-28 rounded-lg" />
            </div>
            <div className="mt-4 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skel h-8 w-8 rounded-full" />
                  <div className="skel h-3.5 flex-1 rounded" />
                  <div className="skel h-3.5 w-20 rounded" />
                  <div className="skel h-3.5 w-16 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="w-[290px] shrink-0 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-card border border-line bg-white p-4 shadow-card">
              <div className="skel h-4 w-32 rounded" />
              <div className="skel mt-4 h-28 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
