import { useEffect, useState } from "react";
import { Badge, Button, FieldLabel } from "../../../components/ui";
import { NocCase, NocCaseAction, NocPortalType, NocSeverity } from "../../../store/types";

const SEVERITY_BORDER: Record<NocSeverity, string> = {
  URGENT: "border-l-4 border-l-red-500",
  HIGH: "border-l-4 border-l-amber-500",
  MEDIUM: "border-l-4 border-l-emerald-500",
  DECREASE: "border-l-4 border-l-red-500",
  INCREASE: "border-l-4 border-l-amber-500",
};

const SEVERITY_BADGE: Record<NocSeverity, string> = {
  URGENT: "bg-red-100 text-red-700",
  HIGH: "bg-amber-100 text-amber-700",
  MEDIUM: "bg-emerald-100 text-emerald-700",
  DECREASE: "bg-red-100 text-red-700",
  INCREASE: "bg-amber-100 text-amber-700",
};

const ACTION_LABELS: Record<NocCaseAction, string> = {
  TT_RAISED: "TT Raised",
  IGNORED: "Ignored",
  CHECKED_NOISSUE: "Checked / No Issue",
  ROUTING_CHANGED: "Routing Changed",
  AC_MNG_INFORMED: "AC Mng Informed",
  ROUTING_INFORMED: "Routing Informed",
};

const ACTION_BUTTON_STYLE: Record<NocCaseAction, string> = {
  TT_RAISED: "bg-blue-600 text-white hover:opacity-90",
  IGNORED: "bg-slate-500 text-white hover:opacity-90",
  CHECKED_NOISSUE: "bg-emerald-600 text-white hover:opacity-90",
  ROUTING_CHANGED: "bg-violet-600 text-white hover:opacity-90",
  ROUTING_INFORMED: "bg-violet-500 text-white hover:opacity-90",
  AC_MNG_INFORMED: "bg-orange-500 text-white hover:opacity-90",
};

const ACTIONS_BY_CASE_TYPE: Record<string, NocCaseAction[]> = {
  ProviderIssue: ["TT_RAISED", "IGNORED"],
  Losses: ["CHECKED_NOISSUE", "ROUTING_CHANGED", "AC_MNG_INFORMED"],
  NewLostTraffic: ["AC_MNG_INFORMED", "ROUTING_INFORMED", "IGNORED"],
  TrafficComparison: ["CHECKED_NOISSUE", "ROUTING_INFORMED", "AC_MNG_INFORMED"],
  ScheduleTest: ["TT_RAISED", "ROUTING_INFORMED", "AC_MNG_INFORMED", "IGNORED"],
  FailedSmsCall: ["CHECKED_NOISSUE", "ROUTING_CHANGED", "AC_MNG_INFORMED"],
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function rateColor(rate: number, thresholds: [number, number]): string {
  if (rate < thresholds[0]) return "font-semibold text-rose-600";
  if (rate <= thresholds[1]) return "font-semibold text-amber-600";
  return "font-semibold text-emerald-600";
}

interface NocCaseCardProps {
  nocCase: NocCase;
  portalType: NocPortalType;
  activeUserName: string;
  onAction: (
    id: string,
    action: NocCaseAction,
    payload: { ttNumber?: string; comment?: string; actionedBy: string },
  ) => void;
}

export function NocCaseCard({ nocCase: c, portalType, activeUserName, onAction }: NocCaseCardProps) {
  const [selectedAction, setSelectedAction] = useState<NocCaseAction | null>(null);
  const [ttNumber, setTtNumber] = useState("");
  const [comment, setComment] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(c.createdAt).getTime());

  useEffect(() => {
    if (c.status !== "Open") return;
    const interval = setInterval(() => {
      setElapsed(Date.now() - new Date(c.createdAt).getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, [c.createdAt, c.status]);

  function handleSave() {
    if (!selectedAction) return;
    if (selectedAction === "TT_RAISED" && !ttNumber.trim()) return;
    onAction(c.id, selectedAction, {
      ttNumber: selectedAction === "TT_RAISED" ? ttNumber.trim() : undefined,
      comment: comment.trim() || undefined,
      actionedBy: activeUserName,
    });
    setSelectedAction(null);
    setTtNumber("");
    setComment("");
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  }

  const elapsedMins = elapsed / 60000;
  const timerColorClass =
    elapsedMins > 30 ? "text-rose-700 bg-rose-50" : elapsedMins > 15 ? "text-amber-700 bg-amber-50" : "text-slate-600";

  const isActioned = c.status === "Actioned";
  const availableActions = ACTIONS_BY_CASE_TYPE[c.caseType] ?? [];

  let responseTimeStr = "";
  if (isActioned && c.actionedAt) {
    const diff = new Date(c.actionedAt).getTime() - new Date(c.createdAt).getTime();
    responseTimeStr = formatElapsed(diff);
  }

  return (
    <article
      className={`relative rounded-xl border bg-white p-4 shadow-sm transition ${SEVERITY_BORDER[c.severity]} ${
        isActioned ? "opacity-70" : ""
      }`}
    >
      {isActioned && (
        <Badge className="absolute right-3 top-3 bg-emerald-100 text-emerald-700">✓ Actioned</Badge>
      )}

      {showSuccess && (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
          <div className="rounded-b-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white shadow">
            ✓ Case actioned successfully
          </div>
        </div>
      )}

      {/* C3 — Header / Info */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700">
            {c.providerName && (
              <span><span className="font-medium text-slate-500">Provider:</span> {c.providerName}</span>
            )}
            {c.customerName && (
              <span><span className="font-medium text-slate-500">Customer:</span> {c.customerName}</span>
            )}
            {c.destination && (
              <span><span className="font-medium text-slate-500">Destination:</span> {c.destination}</span>
            )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-700">
            {portalType === "SMS" && c.smsCount != null && (
              <span><span className="font-medium text-slate-500">SMS Count:</span> {c.smsCount.toLocaleString()}</span>
            )}
            {portalType === "SMS" && c.dlrRate != null && (
              <span>
                <span className="font-medium text-slate-500">DLR Rate:</span>{" "}
                <span className={rateColor(c.dlrRate, [70, 85])}>{c.dlrRate}%</span>
              </span>
            )}
            {portalType === "Voice" && c.callCount != null && (
              <span><span className="font-medium text-slate-500">Call Count:</span> {c.callCount.toLocaleString()}</span>
            )}
            {portalType === "Voice" && c.asrRate != null && (
              <span>
                <span className="font-medium text-slate-500">ASR:</span>{" "}
                <span className={rateColor(c.asrRate, [40, 60])}>{c.asrRate}%</span>
              </span>
            )}
            {c.lossAmount != null && (
              <span>
                <span className="font-medium text-slate-500">Loss:</span>{" "}
                <span className="font-semibold text-rose-600">{c.lossAmount.toLocaleString()} msgs</span>
              </span>
            )}
            {c.attemptCount != null && (
              <span><span className="font-medium text-slate-500">Attempts:</span> {c.attemptCount.toLocaleString()}</span>
            )}
            {c.testResult && (
              <span>
                <span className="font-medium text-slate-500">Test Result:</span>{" "}
                <span className={c.testResult === "FAILED" || c.testResult === "TIMEOUT" ? "font-semibold text-rose-600" : ""}>
                  {c.testResult}
                </span>
              </span>
            )}
            {c.trafficDirection && (
              <span>
                <span className="font-medium text-slate-500">Traffic:</span>{" "}
                <span className={c.trafficDirection === "DECREASE" ? "font-semibold text-rose-600" : "font-semibold text-amber-600"}>
                  {c.trafficDirection === "DECREASE" ? "↓" : "↑"}{" "}
                  {c.trafficChangePercent != null ? `${c.trafficChangePercent > 0 ? "+" : ""}${c.trafficChangePercent}%` : ""} vs last hour
                </span>
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0 text-right space-y-1">
          <Badge className={SEVERITY_BADGE[c.severity]}>{c.severity}</Badge>
          <p className="text-[11px] text-slate-500">⏰ {formatDateTime(c.createdAt)}</p>
        </div>
      </div>

      {/* C4 — Countdown / Response time */}
      <div className={`mt-3 rounded-md px-3 py-1.5 text-xs font-medium ${timerColorClass}`}>
        {isActioned ? (
          <>
            ✓ Actioned at {formatDateTime(c.actionedAt!)}
            {responseTimeStr && <span className="ml-2 text-slate-500">· Response time: {responseTimeStr}</span>}
          </>
        ) : (
          <>⏱ Open for: {formatElapsed(elapsed)}</>
        )}
      </div>

      {/* C5+C6 — Action buttons (Open only) */}
      {!isActioned && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1.5">
            {availableActions.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setSelectedAction(a)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${ACTION_BUTTON_STYLE[a]} ${
                  selectedAction === a ? "ring-2 ring-offset-1 ring-slate-900" : ""
                }`}
              >
                {ACTION_LABELS[a]}
              </button>
            ))}
          </div>

          {selectedAction && (
            <div className="mt-3 space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
              {selectedAction === "TT_RAISED" && (
                <div>
                  <FieldLabel>TT Number</FieldLabel>
                  <input
                    value={ttNumber}
                    onChange={(e) => setTtNumber(e.target.value)}
                    placeholder="Enter TT reference number"
                  />
                </div>
              )}
              <div>
                <FieldLabel>Comment (optional)</FieldLabel>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={2}
                  placeholder="Add note..."
                  className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                />
              </div>
              <p className="text-[11px] text-slate-500">
                NOC Member: <span className="font-semibold text-slate-700">{activeUserName}</span> ·{" "}
                {new Date().toLocaleString()}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={selectedAction === "TT_RAISED" && !ttNumber.trim()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedAction(null);
                    setTtNumber("");
                    setComment("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* C7 — Actioned state display */}
      {isActioned && c.action && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            ✓ Action: <span className="font-semibold">{ACTION_LABELS[c.action]}</span>
          </p>
          {c.ttNumber && <p>TT: {c.ttNumber}</p>}
          {c.comment && <p>Comment: &ldquo;{c.comment}&rdquo;</p>}
          <p className="mt-1 text-xs text-slate-500">
            By: {c.actionedBy ?? "-"}
            {c.actionedAt && <> | {formatDateTime(c.actionedAt)}</>}
          </p>
        </div>
      )}
    </article>
  );
}
