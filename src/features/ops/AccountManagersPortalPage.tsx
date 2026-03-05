import { NocPortalPage } from "./OpsPortalPage";
import { ACCOUNT_MANAGERS_PORTAL_CONFIG } from "./portalConfigs";

export function AccountManagersPortalPage() {
  return <NocPortalPage config={ACCOUNT_MANAGERS_PORTAL_CONFIG} />;
}
