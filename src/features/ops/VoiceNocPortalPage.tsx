import { OpsPortalPage } from "./OpsPortalPage";

export function VoiceNocPortalPage() {
  return (
    <OpsPortalPage
      config={{
        portalId: "voice-noc",
        title: "Voice NOC Portal",
        subtitle: "Operational monitoring and case/request workflow for Voice traffic.",
        defaultTrack: "Voice",
        moduleFocus: ["Losses", "ProviderIssues", "FailedSmsOrCallAnalysis"],
      }}
    />
  );
}
