import { OpsPortalPage } from "./OpsPortalPage";

export function AccountManagersPortalPage() {
  return (
    <OpsPortalPage
      config={{
        portalId: "account-managers",
        title: "Account Managers Portal",
        subtitle: "AM-focused request and operational case visibility for owned accounts.",
        defaultTrack: "Any",
        requestScope: "mine",
        caseScope: "mine",
      }}
    />
  );
}
