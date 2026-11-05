export const LOGIN_PATH = "/login";
export const SIGNUP_PATH = "/signup";
export const APP_HOME = "/app/dashboard";

const APP_ROOT = "/app";

export function isProtectedPath(pathname: string): boolean {
  return pathname === APP_ROOT || pathname.startsWith(`${APP_ROOT}/`);
}

export function isGuestOnlyPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname === SIGNUP_PATH;
}

/**
 * The "next" parameter comes from the URL, so it is only followed when it points inside the
 * app. Anything else (another site, a protocol-relative URL, a backslash trick) falls back home.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw) return APP_HOME;
  const insideApp = raw === APP_ROOT || /^\/app[/?#]/.test(raw);
  const hasUnsafeCharacters = raw.includes("\\") || /[\u0000-\u001f]/.test(raw);
  return insideApp && !hasUnsafeCharacters ? raw : APP_HOME;
}

export interface AuthRedirectInput {
  pathname: string;
  search: string;
  isSignedIn: boolean;
}

/** Where a request should be sent instead, or null when it may proceed. */
export function resolveAuthRedirect({ pathname, search, isSignedIn }: AuthRedirectInput) {
  if (isProtectedPath(pathname) && !isSignedIn) {
    const destination = `${pathname}${search}`;
    const isDefaultDestination = destination === APP_ROOT || destination === APP_HOME;
    return isDefaultDestination
      ? LOGIN_PATH
      : `${LOGIN_PATH}?next=${encodeURIComponent(destination)}`;
  }

  if (isGuestOnlyPath(pathname) && isSignedIn) {
    return safeNextPath(new URLSearchParams(search).get("next"));
  }

  return null;
}
