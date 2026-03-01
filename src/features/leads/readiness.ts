import { Company, Contact, InterconnectionTrack } from "../../store/types";

export interface StartReadiness {
  ready: boolean;
  missing: string[];
}

function hasTechnicalChannel(company: Company, contacts: Contact[]): boolean {
  if (company.emails.technical?.trim()) {
    return true;
  }
  return contacts.some(
    (contact) => contact.roleTags?.includes("Technical") && Boolean(contact.email?.trim()),
  );
}

export function getInterconnectionStartReadiness(
  company: Company,
  contacts: Contact[],
  track: InterconnectionTrack,
): StartReadiness {
  const missing: string[] = [];
  if (!company.name.trim()) missing.push("Company name");
  if (!company.ownerUserId) missing.push("Owner");
  if (!company.ourEntity) missing.push("Our entity");
  if (!company.type) missing.push("Company type");
  if (!company.interconnectionType) missing.push("Interconnection type");
  if (!company.workscope.includes(track)) missing.push(`Workscope includes ${track}`);
  if (!hasTechnicalChannel(company, contacts)) {
    missing.push("Technical email or technical contact email");
  }
  return {
    ready: missing.length === 0,
    missing,
  };
}
