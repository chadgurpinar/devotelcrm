export interface SeedTimeAnchor {
  baseNowIso: string;
  primaryEventStartDate: string;
  primaryEventEndDate: string;
}

export const DEFAULT_TIME_ANCHOR: SeedTimeAnchor = {
  baseNowIso: "2026-03-20T12:00:00.000Z",
  primaryEventStartDate: "2026-03-02",
  primaryEventEndDate: "2026-03-05",
};

export function dateToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isoDateAtHour(isoDate: string, hour: number, minute = 0): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function shiftIsoDate(isoDate: string, dayDelta: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return dateToIsoDate(date);
}

export function shiftIsoTime(isoTime: string, minuteDelta: number): string {
  const date = new Date(isoTime);
  date.setUTCMinutes(date.getUTCMinutes() + minuteDelta);
  return date.toISOString();
}

export function addDaysToIso(isoDateOrDateTime: string, dayDelta: number): string {
  const date = new Date(isoDateOrDateTime);
  date.setUTCDate(date.getUTCDate() + dayDelta);
  return date.toISOString();
}

export function weekStartMonday(isoDateOrDateTime: string): string {
  const date = new Date(isoDateOrDateTime);
  const day = date.getUTCDay();
  const delta = day === 0 ? -6 : 1 - day;
  date.setUTCDate(date.getUTCDate() + delta);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function createTimelineDates(startIsoDate: string, count: number, dayStep: number): string[] {
  const values: string[] = [];
  for (let idx = 0; idx < count; idx += 1) {
    values.push(shiftIsoDate(startIsoDate, idx * dayStep));
  }
  return values;
}
