/**
 * Month-over-month, measured.
 *
 * The admin KPI cards used to carry hand-typed trends ("↑ 12.4% vs last
 * month", "↑ 31.7%") that no query produced. Every trend now comes from two
 * real counts over two calendar windows via this file.
 *
 * `momPct` returns null when there is no base month to compare against — a
 * rise from 0 is not "↑ 100%", it is "no comparison", and the cards print
 * nothing rather than invent one.
 */

export type MonthWindows = {
  /** First instant of the current calendar month. */
  thisStart: Date
  /** First instant of the previous calendar month. */
  lastStart: Date
}

export function monthWindows(now = new Date()): MonthWindows {
  return {
    thisStart: new Date(now.getFullYear(), now.getMonth(), 1),
    lastStart: new Date(now.getFullYear(), now.getMonth() - 1, 1),
  }
}

/** Prisma `where` fragments for "this month" and "last month" on a date column. */
export function inThisMonth(w: MonthWindows) {
  return { gte: w.thisStart }
}
export function inLastMonth(w: MonthWindows) {
  return { gte: w.lastStart, lt: w.thisStart }
}

/** Percentage change, one decimal, or null when last month had nothing. */
export function momPct(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}
