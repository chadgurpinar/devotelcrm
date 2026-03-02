import { OpsPortalPage } from "./OpsPortalPage";

export function AmNocRoutingPortalPage() {
  return (
    <OpsPortalPage
      config={{
        portalId: "am-noc-routing",
        title: "AM & NOC & Routing Portal",
        subtitle: "Cross-functional operational collaboration between AM, NOC, and Routing.",
        defaultTrack: "Any",
        requestRoleFocus: ["NOC", "Routing"],
        includeCreatedByMe: true,
        caseScope: "mine",
      }}
    />
  );
}
