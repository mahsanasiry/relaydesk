import type { ComponentPropsWithRef } from "react";

export type ButtonVariant = "primary" | "secondary" | "danger";

const base =
  "inline-flex min-h-11 items-center justify-center rounded-md px-4 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-surface hover:bg-muted",
  danger: "bg-danger text-background hover:bg-danger/90",
};

export function buttonClassName(variant: ButtonVariant = "primary", extra = ""): string {
  return `${base} ${variants[variant]} ${extra}`.trim();
}

interface ButtonProps extends ComponentPropsWithRef<"button"> {
  variant?: ButtonVariant;
  /** Disables the button and tells assistive technology the action is in progress. */
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClassName(variant, className)}
      {...props}
    />
  );
}
