import { AppStore } from "./db";

export const getUserName = (s: AppStore, userId?: string): string =>
  s.users.find((u) => u.id === userId)?.name ?? "-";

export const getCompanyName = (s: AppStore, companyId?: string): string =>
  s.companies.find((c) => c.id === companyId)?.name ?? "-";

export const getEventName = (s: AppStore, eventId?: string): string =>
  s.events.find((e) => e.id === eventId)?.name ?? "-";

export const getContactName = (s: AppStore, contactId?: string): string =>
  s.contacts.find((c) => c.id === contactId)?.name ?? "-";
