import { OpsPortalPage } from "./OpsPortalPage";

export function RoutingNocPortalPage() {
  return (
    <OpsPortalPage
      config={{
        portalId: "routing-noc",
        title: "Routing & NOC Portal",
        subtitle: "Routing and NOC collaboration workspace with shared request queue.",
        defaultTrack: "Any",
        moduleFocus: ["TrafficComparison", "NewAndLostTraffics", "Losses", "ProviderIssues"],
        requestRoleFocus: ["Routing", "NOC"],
      }}
    />
  );
}
