'use client'

/**
 * The fixed Print / Download controls for the standalone certificate route.
 * Both call the browser's print pipeline — "Download PDF" is Save as PDF — so
 * there is no PDF library to ship. Hidden in the printout via `print:hidden`.
 */
export function PrintButtons() {
  return (
    <div className="print:hidden fixed right-4 top-4 z-50 flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-ink shadow-lift transition-colors hover:bg-paper-3"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z" /></svg>
        Print
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-[13px] font-semibold text-white shadow-lift transition-colors hover:bg-brand-hover"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>
        Download PDF
      </button>
    </div>
  )
}
