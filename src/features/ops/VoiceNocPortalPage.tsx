import { NocPortalPage } from "./OpsPortalPage";

export function VoiceNocPortalPage() {
  return (
    <NocPortalPage
      config={{
        portalId: "voice-noc",
        title: "Voice NOC Portal",
        subtitle: "Operational monitoring and case/request workflow for Voice traffic.",
        defaultTrack: "VOICE",
        includedCategories: [
          "PROVIDER_ISSUE",
          "LOSSES",
          "NEW_LOST_TRAFFIC",
          "TRAFFIC_COMPARISON",
          "SCHEDULE_TEST_RESULT",
          "FAILED_SMS_CALL",
        ],
        showSignals: true,
      }}
    />
  );
}
