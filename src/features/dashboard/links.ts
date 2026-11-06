import { DEFAULT_REQUEST_QUERY, serializeRequestQuery } from "@/features/requests/filters";
import type { RequestQuery } from "@/features/requests/filters";

/** A link to the requests list with the given filters, in the same canonical form the list uses. */
export function requestsHref(changes: Partial<RequestQuery> = {}): string {
  const text = serializeRequestQuery({ ...DEFAULT_REQUEST_QUERY, ...changes });
  return text ? `/app/requests?${text}` : "/app/requests";
}
