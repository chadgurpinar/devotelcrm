function parseDateValue(value: string | Date | null | undefined): Date {
  if (value instanceof Date) {
    return new Date(value);
  }
  if (typeof value !== "string") {
    return new Date(NaN);
  }
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = value.match(dateOnly);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  return new Date(value);
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

export function localDateKey(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!isValidDate(date)) {
    return "";
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDay(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!isValidDate(date)) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!isValidDate(date)) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function combineDateTimeLocal(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hours, minutes] = timeStr.split(":").map(Number);
  return new Date(year, (month || 1) - 1, day || 1, hours || 0, minutes || 0, 0, 0);
}

export function addMinutes(date: Date, minutes: number): Date {
  const out = new Date(date);
  out.setMinutes(out.getMinutes() + minutes);
  return out;
}

export function toInputDate(value: string | Date | null | undefined): string {
  return localDateKey(value);
}

export function toInputTime(value: string | Date | null | undefined): string {
  const date = parseDateValue(value);
  if (!isValidDate(date)) {
    return "";
  }
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export function startOfDay(value: string | Date | null | undefined): Date {
  const date = parseDateValue(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const date = parseDateValue(iso);
  if (!isValidDate(date)) return iso ?? "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | undefined | null): string {
  if (!iso) return "—";
  const date = parseDateValue(iso);
  if (!isValidDate(date)) return iso ?? "—";
  return date.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
