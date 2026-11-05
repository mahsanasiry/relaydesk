import type { AuthField } from "./types";

export interface AuthErrorLike {
  code?: string | undefined;
  status?: number | undefined;
}

export interface FriendlyAuthError {
  message: string;
  field?: AuthField;
}

/** Turns an auth server error into text a person can act on. Raw server messages are never shown. */
export function describeAuthError(error: AuthErrorLike): FriendlyAuthError {
  switch (error.code) {
    case "invalid_credentials":
      return { message: "The email or password is incorrect." };
    case "email_not_confirmed":
      return { message: "Confirm your email address first. The link is in your inbox." };
    case "user_already_exists":
    case "email_exists":
      return {
        message: "An account with this email already exists. Log in instead.",
        field: "email",
      };
    case "weak_password":
      return {
        message: "That password is too easy to guess. Choose a longer or less common one.",
        field: "password",
      };
    case "signup_disabled":
      return { message: "New accounts cannot be created right now." };
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return { message: "Too many attempts. Wait a minute and try again." };
    default:
      break;
  }

  if (error.status === 429) {
    return { message: "Too many attempts. Wait a minute and try again." };
  }
  if (error.status === 0) {
    return { message: "Could not reach the server. Check your connection and try again." };
  }
  return { message: "Something went wrong on our side. Try again in a moment." };
}
