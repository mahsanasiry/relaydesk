function causeOf(error: unknown): unknown {
  return error instanceof Error && error.cause !== undefined ? error.cause : error;
}

function readString(value: unknown, key: string): string {
  if (typeof value === "object" && value !== null && key in value) {
    const field = (value as Record<string, unknown>)[key];
    return typeof field === "string" ? field : "";
  }
  return "";
}

/**
 * Turns a failed database call into one sentence a person can act on. The raw message is never
 * shown: it names tables and constraints, which helps nobody who is just trying to save.
 */
export function describeDataError(error: unknown): string {
  const cause = causeOf(error);
  const code = readString(cause, "code");
  const message = readString(cause, "message");

  if (code === "42501") {
    return "You do not have permission to do that.";
  }
  if (code === "PGRST301" || code === "PGRST303" || /jwt/i.test(message)) {
    return "Your session has expired. Log in again.";
  }
  if (code === "23503") {
    return "A linked project or person no longer exists. Reload the page and try again.";
  }
  if (code === "23514" || code === "22001") {
    return "One of the values is not allowed. Check the form and try again.";
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Try again in a moment.";
}
