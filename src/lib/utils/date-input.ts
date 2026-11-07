/** True for a calendar date written as YYYY-MM-DD. 2026-02-31 is rejected, not rolled over. */
export function isRealDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // Date.UTC rolls an impossible day over to the next month, so comparing the parts back
  // is what proves the date exists. Years below 100 are shifted by Date.UTC and fail too.
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
