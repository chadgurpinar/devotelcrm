import { InterconnectionProcess, InterconnectionStage, InterconnectionTrack } from "./types";

export function getInterconnectionByTrack(
  rows: InterconnectionProcess[],
  track: InterconnectionTrack,
): InterconnectionProcess | undefined {
  return rows.find((row) => row.track === track);
}

export function getInterconnectionSummary(rows: InterconnectionProcess[]): "None" | "SMS Started" | "Voice Started" | "Both" {
  const hasSms = Boolean(getInterconnectionByTrack(rows, "SMS"));
  const hasVoice = Boolean(getInterconnectionByTrack(rows, "Voice"));
  if (hasSms && hasVoice) return "Both";
  if (hasSms) return "SMS Started";
  if (hasVoice) return "Voice Started";
  return "None";
}

export function getTrackStage(rows: InterconnectionProcess[], track: InterconnectionTrack): InterconnectionStage | "None" {
  return getInterconnectionByTrack(rows, track)?.stage ?? "None";
}
