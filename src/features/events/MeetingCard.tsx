import { CSSProperties, MouseEvent } from "react";
import { Button } from "../../components/ui";
import { Meeting } from "../../store/types";
import { formatTime } from "../../utils/datetime";

interface MeetingCardProps {
  meeting: Meeting;
  companyName: string;
  ownerName: string;
  ownerColor: string;
  companyMeta: {
    companyStatus: "LEAD" | "INTERCONNECTION" | "CLIENT";
    type: string;
    workscope: string[];
  };
  contactName?: string;
  conflict?: boolean;
  compact?: boolean;
  className?: string;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStart?: () => void;
  dense?: boolean;
}

function stopEvent(e: MouseEvent<HTMLButtonElement>) {
  e.stopPropagation();
}

export function MeetingCard({
  meeting,
  companyName,
  ownerName,
  ownerColor,
  companyMeta,
  contactName,
  conflict,
  compact,
  className,
  onClick,
  onEdit,
  onDelete,
  onStart,
  dense,
}: MeetingCardProps) {
  const statusLabel =
    companyMeta.companyStatus === "LEAD"
      ? "Lead"
      : companyMeta.companyStatus === "INTERCONNECTION"
        ? "Interconnection"
        : "Client";
  const showStatusControl = Boolean(onStart) || meeting.status === "Completed";
  return (
    <div
      className={`relative rounded-lg border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 ${
        dense ? "p-1.5" : "p-2"
      } ${compact ? "flex h-[112px] w-full min-w-0 flex-col" : ""} ${className ?? ""}`}
      onClick={(e) => {
        if (!onClick) return;
        // Prevent container slot click handlers from also opening create modal.
        e.stopPropagation();
        onClick();
      }}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{ "--owner-color": ownerColor } as CSSProperties}
    >
      {meeting.status === "Completed" ? (
        <span
          className="absolute right-1.5 top-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-semibold text-emerald-700"
          title="Meeting completed"
        >
          Done
        </span>
      ) : (
        onStart && (
          <button
            type="button"
            className="absolute right-1.5 top-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold leading-none text-white shadow-sm hover:bg-emerald-600"
            aria-label="Start meeting"
            title="Start meeting"
            onClick={(e) => {
              stopEvent(e);
              onStart();
            }}
          >
            {">"}
          </button>
        )
      )}
      <div className={`flex items-start justify-between gap-1.5 ${dense ? "" : "mb-1"}`}>
        <div className={`min-w-0 flex-1 ${showStatusControl ? "pr-7" : ""}`}>
          <div className={`min-w-0 ${dense ? "flex flex-wrap items-center gap-x-2 gap-y-0.5" : ""}`}>
            <div className="flex items-center gap-1">
              <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-[color:var(--owner-color)]">
                {ownerName}
              </p>
              {conflict && (
                <span className="rounded-full bg-rose-100 px-1 py-0.5 text-[9px] font-semibold text-rose-700" title="Same owner time overlap">
                  Conflict
                </span>
              )}
            </div>
            <p className={`${dense ? "text-[12px]" : "text-xs"} truncate font-semibold text-slate-800`}>{companyName}</p>
            {dense && (
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-[10px] text-slate-500">
                  {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)} | {meeting.place}
                </p>
                <div className="flex items-center gap-1 whitespace-nowrap">
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                    {statusLabel}
                  </span>
                  {companyMeta.workscope[0] && (
                    <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                      {companyMeta.workscope[0]}
                    </span>
                  )}
                  <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                    {companyMeta.type}
                  </span>
                </div>
              </div>
            )}
          </div>
          {!dense && (
            <p className="truncate text-[10px] text-slate-500">
              {formatTime(meeting.startAt)} - {formatTime(meeting.endAt)} | {meeting.place}
            </p>
          )}
          {contactName && <p className="truncate text-[10px] text-slate-500">{contactName}</p>}
          {!dense && (
            <div className="mt-1 flex items-center gap-1 overflow-hidden whitespace-nowrap">
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                {statusLabel}
              </span>
              {companyMeta.workscope[0] && (
                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[10px] font-medium text-sky-700">
                  {companyMeta.workscope[0]}
                </span>
              )}
              <span
                title={companyMeta.type}
                className="max-w-[56px] truncate rounded-full bg-slate-200 px-1 py-0.5 text-[9px] font-medium text-slate-700"
              >
                {companyMeta.type}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 self-start">
          {onEdit && (
            <Button
              size="sm"
              variant="outline"
              className="px-1.5 py-0.5 text-[9px] leading-none"
              onClick={(e) => {
                stopEvent(e);
                onEdit();
              }}
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button
              size="sm"
              variant="danger"
              className="px-1.5 py-0.5 text-[9px] leading-none"
              onClick={(e) => {
                stopEvent(e);
                onDelete();
              }}
            >
              Delete
            </Button>
          )}
        </div>
      </div>
      <div className={`${dense ? "mt-1" : "mt-auto"} h-0.5 rounded bg-[color:var(--owner-color)]`} />
    </div>
  );
}
