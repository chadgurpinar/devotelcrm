# PROJECT_MEMORY.md

> **Single source of truth** for the entire project. Any AI tool or developer should be able to fully understand and continue this project using only this file.

**Last Updated:** 2026-02-26

---

## 1. Project Overview

**Product:** Devotel CRM — A full-stack telecom CRM prototype for managing wholesale telecom operations, HR, and business processes.

**Target Users:** Internal team at Devotel Group — Sales, Interconnection, NOC operators, Account Managers, HR, Finance, Management.

**Core Problem:** Unified platform for managing the entire telecom wholesale business lifecycle: lead tracking → interconnection → contracts → operations monitoring → HR management → financial oversight.

**Architecture:** Fully client-side SPA with no backend. All state managed via Zustand store persisted to localStorage. Deterministic seed data system generates realistic demo data on first load.

**Deployment:** Vercel (auto-deploy on push to `main`). Repository: `github.com/chadgurpinar/devotelcrm`.

**Tech Stack:**
- React 18 + TypeScript 5.7 + Vite 6
- Tailwind CSS 3.4 (utility-first styling)
- Zustand 5 (state management with localStorage persistence)
- React Router v6 (client-side routing)
- ReactFlow (org chart visualization)
- React Hook Form + Zod (form handling + validation)
- date-fns (date utilities)

---

## 2. Product Vision & Goals

**Long-term Vision:** Production-ready telecom CRM with real backend, authentication, role-based access, and email integrations.

**Short-term Goals:**
- Complete all UI modules with realistic demo data
- Stakeholder demos (Kübra & Sevim feedback cycle)
- Establish UX patterns and component library

**Success Criteria:**
- All pages render without errors
- `npx tsc --noEmit` and `tsc -b` produce zero errors
- Vercel deploy succeeds on every push
- Realistic seed data covers all business scenarios

---

## 3. Features (Full List)

### Implemented Features

| Module | Feature | Status |
|--------|---------|--------|
| **CRM** | Company management (LEAD → INTERCONNECTION → CLIENT pipeline) | ✅ |
| **CRM** | Contact management with role tags | ✅ |
| **CRM** | Event management + staff travel + meeting scheduler | ✅ |
| **CRM** | Leads pipeline page | ✅ |
| **CRM** | Company detail page with tabs | ✅ |
| **Tasks** | Task management with Kanban board | ✅ |
| **Tasks** | Task comments, labels, attachments, watchers | ✅ |
| **Tasks** | Note → Task conversion | ✅ |
| **Notes** | Notes with reminders | ✅ |
| **Interconnection** | Process tracking (NDA → Contract → Technical → AM → Completed) | ✅ |
| **Contracts** | Contract lifecycle (Draft → Signature → Signed/Expired) | ✅ |
| **Projects** | Project management with weekly role-based reports | ✅ |
| **Projects** | Project timeline + governance views | ✅ |
| **Management** | Weekly staff reports + manager comments + AI summaries | ✅ |
| **Ops/NOC** | SMS NOC Portal (provider issues, losses, traffic comparison) | ✅ |
| **Ops/NOC** | Voice NOC Portal | ✅ |
| **Ops/NOC** | Routing & NOC Portal (routing requests, TT requests, tests, loss accepted) | ✅ |
| **Ops/NOC** | Account Managers Portal (route/traffic requests, targets, deal offers, 48h expiry, comments) | ✅ |
| **Ops/NOC** | NOC Performance Audit (member scoring, weekly case actions, monthly summaries, detail drill-down) | ✅ |
| **Ops/NOC** | A2P Analytics Dashboard | ✅ |
| **Ops/NOC** | SLA countdown, case history drawer, monitoring signals | ✅ |
| **HR** | Dashboard (action required panel, KPI deltas, payroll trend, dept cost, turnover) | ✅ |
| **HR** | People directory (employee drawer, photo upload, CSV export, deactivate modal, duplicate email guard, project tags) | ✅ |
| **HR** | Organization (dept table with vacancy display, dept head, CSS org chart, ReactFlow org chart, analytics) | ✅ |
| **HR** | Payroll & Compensation (edit confirmation, change log, FX transparency, approval flow UI) | ✅ |
| **HR** | My Payslip (employee self-service payslip view) | ✅ |
| **HR** | Leave Management (8 leave types, half-day, doctor note, clash warning, filters, seniority entitlement) | ✅ |
| **HR** | Assets & Software (asset drawer, lost/stolen, return condition, provision requests, digital signature) | ✅ |
| **HR** | Expenses (role-based views, payment method, duplicate detection, cost center, reconciliation) | ✅ |
| **HR** | Settings (public holidays, working days, seniority tiers editor, audit log) | ✅ |
| **Finance** | Finance overview page | ✅ |
| **Settings** | App settings page | ✅ |

### Planned Features
- Backend API integration (currently all client-side)
- Authentication & role-based access control
- Real email notifications (currently simulated)
- Payroll deduction automation for unpaid leave
- Certified e-signature integration (DocuSign)
- Working days affecting leave calculation
- Real audit log (currently dummy data in settings)

### Deprecated Features
- `HrPeoplePage.tsx` (original) — replaced by `HrPeoplePageV2.tsx` (reason: complete rewrite with drawer, photo upload, CSV export)
- `HrOrganizationPage.tsx` (original) — replaced by `HrOrganizationPageV2.tsx` (reason: added vacancy display, CSS org chart, filters)
- `HrExpensesPage.tsx` legacy view — still exists but exports `HrExpensesPageRoleBased` (reason: role-based view is more comprehensive)

---

## 4. Functional Breakdown

### 4.1 CRM Module
**Description:** Manages company lifecycle from lead to client.
**User Flow:** Create lead → Qualify → Start interconnection → Sign contracts → Become client
**Edge Cases:** Company can have multiple interconnection processes (SMS + Voice), contacts can have multiple role tags
**Dependencies:** Companies, Contacts, Events, Meetings, Notes, Tasks, InterconnectionProcesses, Contracts

### 4.2 Operations / NOC Module
**Description:** Real-time monitoring and case management for telecom operations.
**User Flow:** Monitoring signals → Auto-create cases → NOC operators triage → Actions (TT raised, routing changed, etc.) → Resolution
**Edge Cases:** SLA countdown, severity escalation, cross-portal case references
**Dependencies:** OpsRequests, OpsCases, OpsMonitoringSignals, OpsShifts, OpsSlaProfiles, NocCases, RoutingNocRequests, AmEntries, NocMembers, NocPerfWeekEntries, NocPerfMonthSummaries

### 4.3 HR Module
**Description:** Complete HR management system.
**User Flow:** Varies by sub-module (see individual features)
**Key Design Decision:** All HR data is in-memory with seed generation. No real payroll integration — UI prototypes with simulation disclaimers.
**Dependencies:** HrEmployees, HrDepartments, HrCompensations, HrLeaveRequests, HrAssets, HrExpenses, HrPayrollSnapshots, etc.

### 4.4 NOC Performance Audit
**Description:** Monthly performance scoring for NOC team members.
**Scoring Formula:** `finalScore = (technicalScore × 0.60) + (disciplineScore × 0.20) + (managerOpinionScore × 0.20)`
**Point System:**
- Monitoring: Urgent SLA+50/-75, High +20/-30, Medium +10/-15, TrafficComparison +40/-50, Urgent bonus +10
- Routing: LossAccepted +50/-60, RoutingRequest +40/-50, TTRequest +30/-40, TestRequest +20/-20, LossAccepted bonus +15
**Tiers:** Platinum (≥98), Gold (≥90), Standard (≥80), Needs Improvement (≥60), At Risk (<60)

---

## 5. Technical Architecture

### Tech Stack
| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 |
| Language | TypeScript 5.7 (strict mode) |
| Build Tool | Vite 6 |
| Styling | Tailwind CSS 3.4 |
| State Management | Zustand 5 |
| Routing | React Router v6 |
| Visualization | ReactFlow |
| Forms | React Hook Form + Zod |
| Date Utils | date-fns + custom `src/utils/datetime.ts` |

### Key Architecture Decisions
1. **No backend** — All state is client-side in Zustand with localStorage persistence. Enables rapid prototyping without server setup.
2. **Deterministic seed data** — Custom PRNG + ID factory ensures identical data on every generation. Supports scenario presets (FULL, HR_ORG_DEEP, etc.).
3. **Single store** — One monolithic Zustand store (`DbState + DbActions`) with 54 state fields and 82+ action methods. Simple but effective for a prototype.
4. **Flat file routing** — All routes are children of `AppShell` layout. No nested routing complexity.
5. **Build command:** `tsc -b && vite build` — TypeScript is checked in build mode (`-b`), which is stricter than `--noEmit` for closure narrowing.

### Database Structure (High-Level)
All data is stored in the Zustand store as arrays of typed objects. 54 top-level collections covering:
- Core CRM: users, events, companies, contacts, meetings, notes, tasks
- Business: interconnectionProcesses, contracts, projects, projectWeeklyReports
- HR: 22 collections (employees, departments, compensations, leave, assets, expenses, etc.)
- Ops: 6 collections (cases, requests, signals, shifts, SLA profiles, audit logs)
- NOC: 6 collections (cases, routing requests, AM entries, members, performance data)
- Management: 3 collections (weekly reports, manager comments, AI summaries)

### Integrations
- **Vercel** — CI/CD, auto-deploy on push to `main`
- **GitHub** — `chadgurpinar/devotelcrm`
- No external APIs — all data is local

---

## 6. API & Data Contracts

No backend API exists. All data mutations go through Zustand store actions (82+ methods). See Section 5 for the full list.

**Key Patterns:**
- Create actions return `string` (the new ID)
- Update actions take the full object
- Action results return `{ ok: boolean; message?: string }`
- IDs are generated via `crypto.randomUUID()` or deterministic `SeedIdFactory`

---

## 7. UX & UI Decisions

### Key UX Patterns
- **Sidebar navigation** with 5 groups (Daily Management, CRM, Operations, HR, Other)
- **Badge counts** on sidebar items for actionable items
- **Card-based layouts** with `<Card>` component for content sections
- **Right-side drawers** (w-[480px]) for detail views (employee profile, asset detail)
- **Centered modals** for forms and confirmations
- **Inline forms** for quick creation (holidays, expenses, assets)
- **Role-based views** — Leave page has Employee/Manager/HR views; Expenses has Employee/Manager/Finance views
- **Color system:**
  - Emerald: success, approved, active, good condition
  - Rose: error, rejected, at risk, lost/stolen
  - Amber: warning, pending, needs improvement
  - Blue/Brand: primary actions, information
  - Slate: neutral, secondary

### Page Structures
- Each page uses `<Card>` wrappers with title + optional actions
- Filter bars use grid layouts with `<FieldLabel>` + input/select combos
- Tables use standard `<table>` with thead/tbody, no external table library
- KPI cards: rounded-md border with stat label + value + optional delta

### Important Design Decisions
- **Date format:** DD MMM YYYY (e.g., "05 Mar 2026") via `formatDate()` in `src/utils/datetime.ts`
- **Currency:** EUR is the reporting currency; FX rates convert other currencies
- **Leave calculation:** Simple date diff (`(end - start) / 86400000 + 1`), not working-days-based (working days feature is seeded but not yet used in calculation)
- **Seniority entitlement:** Turkey uses tiered annual leave based on years of service (0-1yr: 14d, 1-5yr: 14d, 5-15yr: 20d, 15+yr: 26d)

---

## 8. Development Log

### 2026-02-26 — HR Module Complete Overhaul (Kübra & Sevim Feedback)

**Summary:** Implemented comprehensive HR module improvements across all sub-pages based on stakeholder feedback.

**Changes (in order):**

1. **NOC Performance Audit types + seed data** — Added `NocMember`, `NocPerfWeekEntry`, `NocPerfMonthSummary` types with store actions. Seeded 6 NOC members, 24 week entries with case actions, 6 monthly summaries with scoring.

2. **NOC Performance Audit Page** — Rewrote `NocPerformanceAuditPage.tsx` with member cards, team filter, month selector. Created `NocMemberDetailView.tsx` with opinion breakdown, weekly tabs, case action table, manager notes.

3. **HR Type Extensions** — Added `profilePhotoBase64`, `projectIds` to HrEmployee. Added `serialNumber`, `imei`, `purchaseDate`, `warrantyEndsAt` to HrAsset. Changed `HrAssetAssignment.returnCondition` to union type. Added `HrDigitalSignature` interface. Added `legalEntityId` to `HrDepartment`.

4. **Bug Fixes:**
   - Leave 0-day calculation: changed to simple date diff + 1
   - Approval order anomaly: proper Date comparison instead of string
   - Expense sort: explicit `new Date().getTime()` DESC sort

5. **HR Dashboard** — Action required panel with emojis, KPI deltas, payroll trend table, department cost with head display + totals, turnover dummy table.

6. **HR People** — Employee drawer (right-side, 5 tabs), avatar with initials/photo, CSV export (`people-export-YYYY-MM-DD.csv`), deactivate modal with reason, email duplicate guard on blur + submit, project tags in drawer + edit form.

7. **HR Organization** — Vacancy display (🔴 X open / ✓ Full), department head select with job title, `legalEntityId` filter on departments, CSS org chart toggle.

8. **HR Leave** — Half-day toggle for Annual + Other, ½ badge in lists, clash warning modal on approve (≥2 same-dept overlaps), month filter, seniority-based entitlement helper.

9. **HR Payroll** — Edit comp confirmation modal (title, character counter, "Continue to Edit"), change history table (user name + delta), FX rate format "Rate: X (as of date)", approval flow stepper (3-step), My Payslip page.

10. **HR Assets** — Asset detail drawer (header, details, assignment history with condition badges, current assignee), 🔴 badge for Lost/Stolen, replacement button, digital signature flow (canvas drawing + store).

11. **HR Expenses** — Payment method field + badges in legacy page, reconciliation button in finance view with confirmation modal.

12. **HR Settings** — Holiday date formatting DD MMM YYYY, seniority tiers editable inline, audit log updated with spec entries + subtitle.

13. **Final extras** — FX rate last updated display, asset warning on deactivate, unpaid leave payroll flag, global `formatDate`/`formatDateTime` in utils.

**Problems Encountered:**
- `as const` on variables fails in `tsc -b` (stricter than `--noEmit`) — fixed by removing unnecessary `as const` on typed parameters
- `employee` possibly undefined in closure (photo upload handler) — fixed by capturing ID in local variable before closure
- Both issues were caught by Vercel build (`tsc -b`) but not local `tsc --noEmit`

**Decision:** Always run `tsc -b` locally before pushing to catch Vercel build failures early.

---

## 9. Known Issues & Technical Debt

### Bugs
- None known (all caught and fixed during development)

### Limitations
- **No backend** — All data is client-side. Refreshing browser resets to seed data (localStorage persistence exists but may not survive all scenarios).
- **No authentication** — Any user can switch to any role view.
- **No real email** — Reconciliation, notifications, etc. are simulated with toasts.
- **No real file upload** — Doctor notes store only filename, photos store base64 (no size limit).
- **Working days** — Seeded on leave profiles but not yet used in leave day calculation.
- **Payroll deduction** — Unpaid leave shows warning but no automatic deduction.

### Workarounds
- Digital signature uses canvas `toDataURL()` — prototype only, not legally binding.
- Approval flow in payroll is simulated client-side with local state.
- Audit log in settings uses hardcoded dummy entries.

### Technical Debt
- Some duplicate `formatDate` / `employeeName` / `displayEmployee` helper functions across files (partially consolidated to utils).
- `HrAssetsPage.tsx` is 1800+ lines — should be split into sub-components.
- `HrLeavePage.tsx` is 1400+ lines — should be split into sub-components.
- Legacy pages (`HrPeoplePage.tsx`, `HrOrganizationPage.tsx`, `HrExpensesPage.tsx`) still exist but re-export V2 versions.
- `tsc --noEmit` vs `tsc -b` behaves differently for closure narrowing — should always test with `tsc -b`.

---

## 10. Pending Tasks / Roadmap

### High Priority
- [ ] Backend API integration (Express/Fastify + PostgreSQL)
- [ ] Authentication & RBAC
- [ ] Real file upload service (S3 or similar)
- [ ] Working days calculation in leave module
- [ ] Split large page files into sub-components

### Medium Priority
- [ ] Real audit log (hook into store mutations)
- [ ] Email notification service
- [ ] Payroll deduction for unpaid leave
- [ ] Certified e-signature (DocuSign integration)
- [ ] Data export (Excel format, not just CSV)

### Low Priority
- [ ] Dark mode
- [ ] Mobile responsive optimization
- [ ] Performance optimization (virtualized lists for large datasets)
- [ ] E2E testing (Playwright)
- [ ] Unit tests for store actions

---

## 11. Assumptions & Constraints

### Business Assumptions
- EUR is the primary reporting currency for all financial calculations
- Leave entitlement follows country-specific profiles (Turkey has seniority tiers)
- NOC performance is measured monthly with weekly case action tracking
- Asset management includes digital acceptance (signature) workflow
- Expense approval follows Manager → Finance two-step flow

### Technical Constraints
- **No backend** — Must work entirely client-side
- **No external APIs** — All data is generated and stored locally
- **Build:** `tsc -b && vite build` — must pass stricter TypeScript checking
- **Deployment:** Vercel free tier, auto-deploy from `main` branch
- **Browser support:** Modern browsers only (uses `crypto.randomUUID()`)
- **State persistence:** localStorage only — no IndexedDB or server sync
- **Seed determinism:** All seed data must be reproducible given the same seed key and scenario config

---

## Appendix: File Structure

```
event-crm-prototype/
├── src/
│   ├── app/
│   │   ├── router.tsx              # All routes (34 routes)
│   │   └── layout/
│   │       └── AppShell.tsx        # Sidebar + layout (5 nav groups)
│   ├── components/
│   │   └── ui.tsx                  # Shared primitives (Button, Card, Badge, FieldLabel, etc.)
│   ├── features/
│   │   ├── dashboard/              # DashboardPage
│   │   ├── events/                 # Events (list, detail, calendar, meetings)
│   │   ├── leads/                  # LeadsPage
│   │   ├── interconnection/        # InterconnectionPage
│   │   ├── crm/                    # Companies + CompanyDetail
│   │   ├── contracts/              # ContractsPage
│   │   ├── tasks/                  # Tasks (page, drawer, kanban)
│   │   ├── notes/                  # NotesPage
│   │   ├── reports/                # Project reports + timeline
│   │   ├── management-reports/     # Weekly staff reports
│   │   ├── finance/                # FinancePage
│   │   ├── settings/               # SettingsPage
│   │   ├── ops/                    # Operations (7 portal pages + components + domain)
│   │   └── hr/                     # HR (9 pages + components)
│   ├── store/
│   │   ├── types.ts                # All interfaces (60+) and types (39+)
│   │   ├── db.ts                   # Zustand store (DbState + DbActions, 82+ methods)
│   │   ├── hrUtils.ts              # HR calculation utilities
│   │   ├── hrOrgSelectors.ts       # Org chart computation
│   │   ├── selectors.ts            # General selectors
│   │   ├── uiOps.ts                # Ops UI state store
│   │   └── seedV2/                 # Deterministic seed data (14 files)
│   └── utils/
│       └── datetime.ts             # Shared date formatting (formatDate, formatDateTime)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── vite.config.ts
├── vercel.json
└── PROJECT_MEMORY.md               # This file
```

---

## Appendix: Route Map

| Path | Page | Module |
|------|------|--------|
| `/` | DashboardPage | Dashboard |
| `/events` | EventsListPage | CRM |
| `/events/:eventId` | EventDetailPage | CRM |
| `/leads` | LeadsPage | CRM |
| `/interconnection` | InterconnectionPage | CRM |
| `/accounts` | CompaniesPage | CRM |
| `/companies/:companyId` | CompanyDetailPage | CRM |
| `/contracts` | ContractsPage | CRM |
| `/tasks` | TasksPage | Tasks |
| `/notes` | NotesPage | Notes |
| `/reports` | ReportsPage | Projects |
| `/reports/timeline` | ProjectTimelinePage | Projects |
| `/management-reports` | ManagementReportsPage | Management |
| `/finance` | FinancePage | Finance |
| `/settings` | SettingsPage | Settings |
| `/ops/sms-noc` | SmsNocPortalPage | Operations |
| `/ops/voice-noc` | VoiceNocPortalPage | Operations |
| `/ops/routing-noc` | RoutingNocPortalPage | Operations |
| `/ops/am-noc-routing` | AmNocRoutingPortalPage | Operations |
| `/ops/account-managers` | AccountManagersPortalPage | Operations |
| `/ops/noc-performance-audit` | NocPerformanceAuditPage | Operations |
| `/ops/performance-audit` | NocPerformanceAuditPage | Operations |
| `/ops/analytics` | A2pAnalyticsDashboard | Operations |
| `/hr/dashboard` | HrDashboardPage | HR |
| `/hr/people` | HrPeoplePage (→ V2) | HR |
| `/hr/organization` | HrOrganizationPageV2 | HR |
| `/hr/payroll` | HrPayrollPage | HR |
| `/hr/payslip` | HrPayslipPage | HR |
| `/hr/leave` | HrLeavePage | HR |
| `/hr/assets` | HrAssetsPage | HR |
| `/hr/expenses` | HrExpensesPage (→ RoleBased) | HR |
| `/hr/settings` | HrSettingsPage | HR |

---

## Appendix: Seed Data Counts (Default FULL Scenario)

| Collection | Count |
|------------|-------|
| Users | 10 |
| Events | 30 |
| Companies | 60 |
| Contacts | 80 |
| Meetings | 140+ |
| Tasks | 54 |
| Projects | 5 |
| Contracts | ~20 |
| HR Departments | 8 |
| HR Employees | 72 |
| HR Compensations | 72 |
| HR Leave Requests | 54 |
| HR Assets | 96 |
| HR Software Licenses | 84 |
| HR Expenses | 70 |
| Ops Signals | 30 |
| Ops Cases | 22 |
| Ops Requests | 24 |
| NOC Cases | 16 |
| Routing NOC Requests | 12 |
| AM Entries | 8 |
| NOC Members | 6 |
| NOC Perf Week Entries | 24 |
| NOC Perf Month Summaries | 6 |
| Public Holidays | 18 |
| Weekly Staff Reports | ~50 |
