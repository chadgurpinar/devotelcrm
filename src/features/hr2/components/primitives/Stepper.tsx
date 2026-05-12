import { ReactNode } from "react";
import { Check, AlertTriangle } from "lucide-react";

export type StepStatus = "pending" | "active" | "completed" | "blocked";

export interface StepperStep {
  id: string;
  label: string;
  description?: string;
  status?: StepStatus;
  optional?: boolean;
}

interface StepperProps {
  steps: StepperStep[];
  currentStepId?: string;
  onStepClick?: (stepId: string) => void;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

function resolveStatus(step: StepperStep, idx: number, currentIdx: number): StepStatus {
  if (step.status) return step.status;
  if (currentIdx < 0) return "pending";
  if (idx < currentIdx) return "completed";
  if (idx === currentIdx) return "active";
  return "pending";
}

function dotClasses(status: StepStatus): { circle: string; label: string; sub: string } {
  switch (status) {
    case "completed":
      return {
        circle: "border-emerald-500 bg-emerald-500 text-white",
        label: "text-slate-700",
        sub: "text-slate-400",
      };
    case "active":
      return {
        circle: "border-brand-600 bg-brand-600 text-white ring-4 ring-brand-100",
        label: "text-slate-900 font-semibold",
        sub: "text-slate-500",
      };
    case "blocked":
      return {
        circle: "border-rose-500 bg-rose-50 text-rose-600",
        label: "text-rose-700 font-semibold",
        sub: "text-rose-400",
      };
    case "pending":
    default:
      return {
        circle: "border-slate-300 bg-white text-slate-400",
        label: "text-slate-500",
        sub: "text-slate-400",
      };
  }
}

function connectorClass(status: StepStatus): string {
  if (status === "completed") return "bg-emerald-300";
  if (status === "blocked") return "bg-rose-300";
  return "bg-slate-200";
}

function renderIcon(status: StepStatus, idx: number): ReactNode {
  if (status === "completed") return <Check size={14} strokeWidth={3} />;
  if (status === "blocked") return <AlertTriangle size={14} strokeWidth={2.5} />;
  return <span className="text-[11px] font-semibold">{idx + 1}</span>;
}

export function Stepper({
  steps,
  currentStepId,
  onStepClick,
  orientation = "horizontal",
  className = "",
}: StepperProps) {
  const currentIdx = steps.findIndex((s) => s.id === currentStepId);

  if (orientation === "vertical") {
    return (
      <ol className={`space-y-1 ${className}`}>
        {steps.map((step, idx) => {
          const status = resolveStatus(step, idx, currentIdx);
          const styles = dotClasses(status);
          const clickable = Boolean(onStepClick) && status !== "blocked";
          return (
            <li key={step.id} className="relative flex gap-3 pb-4">
              {idx < steps.length - 1 && (
                <span
                  className={`absolute left-[13px] top-7 h-[calc(100%-22px)] w-0.5 ${connectorClass(status)}`}
                  aria-hidden
                />
              )}
              <button
                type="button"
                onClick={clickable ? () => onStepClick?.(step.id) : undefined}
                className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${styles.circle} ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
                disabled={!clickable}
              >
                {renderIcon(status, idx)}
              </button>
              <div className="pt-0.5">
                <p className={`text-sm ${styles.label}`}>
                  {step.label}
                  {step.optional && <span className="ml-2 text-[10px] font-medium text-slate-400">(optional)</span>}
                </p>
                {step.description && (
                  <p className={`mt-0.5 text-xs ${styles.sub}`}>{step.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={`flex items-start gap-0 ${className}`}>
      {steps.map((step, idx) => {
        const status = resolveStatus(step, idx, currentIdx);
        const styles = dotClasses(status);
        const isLast = idx === steps.length - 1;
        const clickable = Boolean(onStepClick) && status !== "blocked";
        return (
          <li key={step.id} className={`flex items-start ${isLast ? "" : "flex-1"} min-w-0`}>
            <div className="flex flex-col items-center text-center min-w-0">
              <button
                type="button"
                onClick={clickable ? () => onStepClick?.(step.id) : undefined}
                disabled={!clickable}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition ${styles.circle} ${
                  clickable ? "cursor-pointer" : "cursor-default"
                }`}
              >
                {renderIcon(status, idx)}
              </button>
              <p className={`mt-1.5 max-w-[120px] truncate text-[11px] ${styles.label}`}>{step.label}</p>
              {step.optional && (
                <p className="text-[10px] font-medium text-slate-400">optional</p>
              )}
            </div>
            {!isLast && (
              <span className={`mt-3 mx-1 h-0.5 flex-1 ${connectorClass(status)}`} aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
