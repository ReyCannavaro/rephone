import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  icon?: ReactNode;
};

const variants: Record<ButtonVariant, string> = {
  primary: "border-stone-900 bg-stone-900 text-white hover:bg-stone-700",
  secondary: "border-stone-300 bg-white text-stone-900 hover:bg-stone-100",
  danger: "border-red-700 bg-red-700 text-white hover:bg-red-600",
  ghost: "border-transparent bg-transparent text-stone-700 hover:bg-stone-100",
};

export function Button({
  children,
  className = "",
  icon,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {icon ? <span className="flex size-4 items-center justify-center">{icon}</span> : null}
      {children}
    </button>
  );
}
