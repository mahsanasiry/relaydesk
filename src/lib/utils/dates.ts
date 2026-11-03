const MS_PER_DAY = 24 * 60 * 60 * 1000;

function utcDayNumber(date: Date): number {
  return Math.floor(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / MS_PER_DAY,
  );
}

/**
 * Whole calendar days from `earlier` to `later`, negative when `later` comes first.
 * Due dates are stored as date-only values, so the comparison is done in UTC to keep
 * the result independent of the viewer's time zone.
 */
export function differenceInCalendarDays(later: Date, earlier: Date): number {
  return utcDayNumber(later) - utcDayNumber(earlier);
}
