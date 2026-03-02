import { OpsPortalPage } from "./OpsPortalPage";

export function SmsNocPortalPage() {
  return (
    <OpsPortalPage
      config={{
        portalId: "sms-noc",
        title: "SMS NOC Portal",
        subtitle: "Operational monitoring and case/request workflow for SMS traffic.",
        defaultTrack: "SMS",
        moduleFocus: ["Losses", "ProviderIssues", "FailedSmsOrCallAnalysis"],
      }}
    />
  );
}
