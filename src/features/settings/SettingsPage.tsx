import { useMemo, useState } from "react";
import { Settings } from "lucide-react";
import { Button, Card, FieldLabel } from "../../components/ui";
import { useAppStore } from "../../store/db";
import { OurCompanyInfo, OurEntity } from "../../store/types";
import { UiPageHeader } from "../../ui/UiPageHeader";

function normalizeHexColor(input: string): string | null {
  const value = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  return null;
}

const ourEntities: OurEntity[] = ["USA", "UK", "TR"];

function emptyCompanyInfo(ourEntity: OurEntity): OurCompanyInfo {
  return {
    ourEntity,
    legalName: "",
    address: {
      street: "",
      city: "",
      state: "",
      zip: "",
      country: "",
    },
    taxIdOrVat: "",
    signatory: {
      name: "",
      title: "",
    },
    emails: {
      billing: "",
      finance: "",
      invoice: "",
      rate: "",
      technical: "",
    },
    bankDetails: {
      bankName: "",
      iban: "",
      swift: "",
      accountNumber: "",
      currency: "",
    },
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function SettingsPage() {
  const state = useAppStore();
  const [importText, setImportText] = useState("");
  const [message, setMessage] = useState("");
  const [colorDrafts, setColorDrafts] = useState<Record<string, string>>({});
  const [entityTab, setEntityTab] = useState<OurEntity>("UK");

  const ourInfo = useMemo(
    () => state.ourCompanyInfo.find((row) => row.ourEntity === entityTab) ?? emptyCompanyInfo(entityTab),
    [entityTab, state.ourCompanyInfo],
  );

  return (
    <div className="space-y-5">
      <UiPageHeader title="Settings" subtitle="System configuration, users, and company info" />

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">User Preferences</h3>
        <div className="space-y-2">
          {state.users.map((user) => {
            const draft = colorDrafts[user.id] ?? user.color;
            return (
              <div
                key={user.id}
                className="grid gap-2 rounded-lg border border-slate-200 p-2 md:grid-cols-[1fr_88px_120px_130px]"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-3 w-3 rounded-full" style={{ backgroundColor: user.color }} />
                  <div>
                    <p className="text-xs font-semibold text-slate-800">{user.name}</p>
                    <p className="text-[11px] text-slate-500">{user.role}</p>
                  </div>
                </div>
                <input
                  type="color"
                  value={normalizeHexColor(draft) ?? user.color}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();
                    setColorDrafts((prev) => ({ ...prev, [user.id]: value }));
                    state.updateUserColor(user.id, value);
                  }}
                />
                <input
                  value={draft}
                  onChange={(e) =>
                    setColorDrafts((prev) => ({
                      ...prev,
                      [user.id]: e.target.value,
                    }))
                  }
                  onBlur={() => {
                    const normalized = normalizeHexColor(colorDrafts[user.id] ?? user.color);
                    if (!normalized) {
                      setColorDrafts((prev) => ({ ...prev, [user.id]: user.color }));
                      return;
                    }
                    state.updateUserColor(user.id, normalized);
                    setColorDrafts((prev) => ({ ...prev, [user.id]: normalized }));
                  }}
                  placeholder="#3b82f6"
                />
                <div>
                  <FieldLabel>Default our entity</FieldLabel>
                  <select
                    value={user.defaultOurEntity}
                    onChange={(e) => state.updateUserDefaultOurEntity(user.id, e.target.value as OurEntity)}
                  >
                    <option value="USA">USA</option>
                    <option value="UK">UK</option>
                    <option value="TR">TR</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Our Company Info</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {ourEntities.map((item) => (
            <Button key={item} size="sm" variant={entityTab === item ? "primary" : "secondary"} onClick={() => setEntityTab(item)}>
              {item}
            </Button>
          ))}
        </div>
        <div className="space-y-3">
          <div className="grid gap-2 md:grid-cols-3">
            <div className="md:col-span-2">
              <FieldLabel>Legal name</FieldLabel>
              <input
                value={ourInfo.legalName}
                onChange={(e) =>
                  state.updateOurCompanyInfo({
                    ...ourInfo,
                    legalName: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <FieldLabel>Tax ID / VAT</FieldLabel>
              <input
                value={ourInfo.taxIdOrVat}
                onChange={(e) =>
                  state.updateOurCompanyInfo({
                    ...ourInfo,
                    taxIdOrVat: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <section className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
            <div className="grid gap-2 md:grid-cols-3">
              <div className="md:col-span-2">
                <FieldLabel>Street</FieldLabel>
                <input
                  value={ourInfo.address.street}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      address: { ...ourInfo.address, street: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>City</FieldLabel>
                <input
                  value={ourInfo.address.city}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      address: { ...ourInfo.address, city: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>State</FieldLabel>
                <input
                  value={ourInfo.address.state ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      address: { ...ourInfo.address, state: e.target.value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Zip</FieldLabel>
                <input
                  value={ourInfo.address.zip ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      address: { ...ourInfo.address, zip: e.target.value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Country</FieldLabel>
                <input
                  value={ourInfo.address.country}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      address: { ...ourInfo.address, country: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Signatory & Emails</p>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <FieldLabel>Signatory name</FieldLabel>
                <input
                  value={ourInfo.signatory.name}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      signatory: { ...ourInfo.signatory, name: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Signatory title</FieldLabel>
                <input
                  value={ourInfo.signatory.title}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      signatory: { ...ourInfo.signatory, title: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Billing email</FieldLabel>
                <input
                  value={ourInfo.emails.billing}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      emails: { ...ourInfo.emails, billing: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Finance email</FieldLabel>
                <input
                  value={ourInfo.emails.finance}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      emails: { ...ourInfo.emails, finance: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Invoice email</FieldLabel>
                <input
                  value={ourInfo.emails.invoice ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      emails: { ...ourInfo.emails, invoice: e.target.value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Rate email</FieldLabel>
                <input
                  value={ourInfo.emails.rate ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      emails: { ...ourInfo.emails, rate: e.target.value || undefined },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Technical email</FieldLabel>
                <input
                  value={ourInfo.emails.technical ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      emails: { ...ourInfo.emails, technical: e.target.value || undefined },
                    })
                  }
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-slate-200 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Bank details (optional)</p>
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <FieldLabel>Bank name</FieldLabel>
                <input
                  value={ourInfo.bankDetails?.bankName ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      bankDetails: { ...(ourInfo.bankDetails ?? {}), bankName: e.target.value },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>IBAN</FieldLabel>
                <input
                  value={ourInfo.bankDetails?.iban ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      bankDetails: {
                        bankName: ourInfo.bankDetails?.bankName ?? "",
                        iban: e.target.value || undefined,
                        swift: ourInfo.bankDetails?.swift,
                        accountNumber: ourInfo.bankDetails?.accountNumber,
                        currency: ourInfo.bankDetails?.currency,
                      },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>SWIFT</FieldLabel>
                <input
                  value={ourInfo.bankDetails?.swift ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      bankDetails: {
                        bankName: ourInfo.bankDetails?.bankName ?? "",
                        iban: ourInfo.bankDetails?.iban,
                        swift: e.target.value || undefined,
                        accountNumber: ourInfo.bankDetails?.accountNumber,
                        currency: ourInfo.bankDetails?.currency,
                      },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Account number</FieldLabel>
                <input
                  value={ourInfo.bankDetails?.accountNumber ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      bankDetails: {
                        bankName: ourInfo.bankDetails?.bankName ?? "",
                        iban: ourInfo.bankDetails?.iban,
                        swift: ourInfo.bankDetails?.swift,
                        accountNumber: e.target.value || undefined,
                        currency: ourInfo.bankDetails?.currency,
                      },
                    })
                  }
                />
              </div>
              <div>
                <FieldLabel>Bank currency</FieldLabel>
                <input
                  value={ourInfo.bankDetails?.currency ?? ""}
                  onChange={(e) =>
                    state.updateOurCompanyInfo({
                      ...ourInfo,
                      bankDetails: {
                        bankName: ourInfo.bankDetails?.bankName ?? "",
                        iban: ourInfo.bankDetails?.iban,
                        swift: ourInfo.bankDetails?.swift,
                        accountNumber: ourInfo.bankDetails?.accountNumber,
                        currency: e.target.value || undefined,
                      },
                    })
                  }
                />
              </div>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Last updated: {new Date(ourInfo.lastUpdatedAt).toLocaleString()}
            </p>
          </section>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Demo Data Controls</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const data = state.exportData();
              navigator.clipboard.writeText(data);
              setMessage("Exported data copied to clipboard.");
            }}
          >
            Export JSON (copy)
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              state.resetDemoData();
              setMessage("Demo data reset.");
            }}
          >
            Reset demo data
          </Button>
        </div>
        <div className="mt-3">
          <FieldLabel>Import JSON</FieldLabel>
          <textarea value={importText} onChange={(e) => setImportText(e.target.value)} rows={8} />
          <div className="mt-2">
            <Button
              onClick={() => {
                const result = state.importData(importText);
                setMessage(result.message);
              }}
            >
              Import
            </Button>
          </div>
        </div>
        {message && <p className="mt-2 text-xs text-gray-600">{message}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-800 mb-3">Notification Outbox</h3>
        <p className="text-xs text-gray-500 mb-3">Simulated email notifications — requires backend mail service for real delivery</p>
        {state.outbox.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No simulated emails yet.</p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-xs text-gray-700">
            {state.outbox.slice().reverse().map((line, idx) => (
              <li key={`${line}-${idx}`}>{line}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
