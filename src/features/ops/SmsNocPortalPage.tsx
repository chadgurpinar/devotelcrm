import { NocPortalPage } from "./OpsPortalPage";
import { SMS_NOC_PORTAL_CONFIG } from "./portalConfigs";

export function SmsNocPortalPage() {
  return <NocPortalPage config={SMS_NOC_PORTAL_CONFIG} />;
}
