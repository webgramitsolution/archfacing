/** Instant feedback while the sign-in / register screen loads. */
export default function Loading() {
  return (
    <div className="flex min-h-screen animate-pulse items-center justify-center bg-paper-2 px-4">
      <div className="w-full max-w-md rounded-card border border-line bg-paper p-6 shadow-card">
        <div className="mx-auto h-8 w-28 rounded bg-paper-3" />
        <div className="mx-auto mt-5 h-5 w-48 rounded bg-paper-3" />
        <div className="mt-6 flex flex-col gap-3">
          <div className="h-10 rounded-lg bg-paper-2" />
          <div className="h-10 rounded-lg bg-paper-2" />
          <div className="h-10 rounded-lg bg-brand/20" />
        </div>
      </div>
    </div>
  )
}
