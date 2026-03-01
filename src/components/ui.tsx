import { ButtonHTMLAttributes, ReactNode } from "react";

export function Card(props: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <section
      className={`rounded-xl border border-slate-200 bg-white shadow-sm ${props.padded === false ? "" : "p-4"} ${
        props.className ?? ""
      }`}
    >
      {(props.title || props.actions) && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-800">{props.title}</h3>
          {props.actions}
        </div>
      )}
      {props.children}
    </section>
  );
}

export function Badge(props: { children: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 ${
        props.className ?? ""
      }`}
    >
      {props.children}
    </span>
  );
}

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md";

export function Button(
  props: {
    children: ReactNode;
    className?: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
  } & ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const styles =
    props.variant === "secondary"
      ? "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
      : props.variant === "danger"
        ? "bg-rose-600 text-white hover:bg-rose-700"
        : props.variant === "outline"
          ? "bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50"
          : props.variant === "ghost"
            ? "bg-transparent text-slate-600 hover:bg-slate-100"
        : "bg-brand-600 text-white hover:bg-brand-700";
  const sizeStyles = props.size === "sm" ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs";
  return (
    <button
      type={props.type ?? "button"}
      onClick={props.onClick}
      disabled={props.disabled}
      className={`rounded-md font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizeStyles} ${styles} ${
        props.className ?? ""
      }`}
    >
      {props.children}
    </button>
  );
}

export function FieldLabel(props: { children: ReactNode }) {
  return <label className="mb-1 block text-xs font-semibold text-slate-600">{props.children}</label>;
}

export function StatCard(props: {
  label: string;
  value: ReactNode;
  accent?: "brand" | "success";
  className?: string;
  size?: "xs" | "sm" | "md";
}) {
  const color = props.accent === "success" ? "text-emerald-600" : "text-slate-900";
  const sizeStyles =
    props.size === "xs"
      ? {
          wrapper: "p-2",
          label: "text-[8px]",
          value: "text-[34px] leading-none",
        }
      : props.size === "sm"
      ? {
          wrapper: "p-2.5",
          label: "text-[9px]",
          value: "text-2xl",
        }
      : {
          wrapper: "p-4",
          label: "text-[10px]",
          value: "text-3xl",
        };
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${sizeStyles.wrapper} ${props.className ?? ""}`}>
      <p className={`${sizeStyles.label} font-semibold uppercase tracking-wide text-slate-400`}>{props.label}</p>
      <p className={`mt-0.5 ${sizeStyles.value} font-semibold ${color}`}>{props.value}</p>
    </div>
  );
}
