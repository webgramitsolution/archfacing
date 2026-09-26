'use client'

/**
 * The Artistry phone "Sort By" select — a plain GET form that submits the
 * moment the choice changes, so there is no separate Apply button.
 */
export function ArtistrySortSelect({
  sort,
  hidden,
}: {
  sort: 'latest' | 'popular'
  /** the other params to carry through (q, category, sub, view) */
  hidden: Record<string, string | undefined>
}) {
  return (
    <form method="get" action="/artistry" className="flex items-center gap-1">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <label htmlFor="artistry-phone-sort" className="whitespace-nowrap text-[11px] text-ink-2">
        Sort By:
      </label>
      <select
        id="artistry-phone-sort"
        name="sort"
        defaultValue={sort}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="h-9 w-[90px] rounded-lg border border-line bg-white pl-2 pr-5 text-[11.5px] font-medium text-ink"
      >
        <option value="latest">Latest</option>
        <option value="popular">Popular</option>
      </select>
      <noscript>
        <button type="submit" className="h-9 rounded-lg border border-line px-2 text-[12px]">Go</button>
      </noscript>
    </form>
  )
}
