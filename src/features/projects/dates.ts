/** "2026-11-01 to 2026-12-01", "From 2026-11-01", "Until 2026-12-01" or "No dates". */
export function describeDateRange(startDate: string | null, endDate: string | null): string {
  if (startDate && endDate) return `${startDate} to ${endDate}`;
  if (startDate) return `From ${startDate}`;
  if (endDate) return `Until ${endDate}`;
  return "No dates";
}
