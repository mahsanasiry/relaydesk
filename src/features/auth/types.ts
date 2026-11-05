export type AuthField = "displayName" | "email" | "password";

export type AuthActionResult =
  | { status: "success"; redirectTo: string }
  | { status: "confirm_email" }
  | { status: "error"; message: string; field?: AuthField };
