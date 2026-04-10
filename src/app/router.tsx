import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EventsListPage } from "../features/events/EventsListPage";
import { EventDetailPage } from "../features/events/EventDetailPage";
import { EventEvaluationPage } from "../features/events/EventEvaluationPage";
import { EventEvaluationDetailPage } from "../features/events/EventEvaluationDetailPage";
import { CompaniesPage } from "../features/crm/CompaniesPage";
import { CompanyDetailPage } from "../features/crm/CompanyDetailPage";
import { LeadsPage } from "../features/leads/LeadsPage";
import { InterconnectionPage } from "../features/interconnection/InterconnectionPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { NotesPage } from "../features/notes/NotesPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { ProjectTimelinePage } from "../features/reports/ProjectTimelinePage";
import { FinancePage } from "../features/finance/FinancePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ContractsPage } from "../features/contracts/ContractsPage";
import { SmsNocPortalPage } from "../features/ops/SmsNocPortalPage";
import { VoiceNocPortalPage } from "../features/ops/VoiceNocPortalPage";
import { RoutingNocPortalPage } from "../features/ops/RoutingNocPortalPage";
import { AmNocRoutingPortalPage } from "../features/ops/AmNocRoutingPortalPage";
import { AccountManagersPortalPage } from "../features/ops/AccountManagersPortalPage";
import { NocPerformanceAuditPage } from "../features/ops/NocPerformanceAuditPage";
import { A2pAnalyticsDashboard } from "../features/ops/A2pAnalyticsDashboard";
import { HrDashboardPage } from "../features/hr/HrDashboardPage";
import { HrPeoplePage } from "../features/hr/HrPeoplePage";
import { HrOrganizationPageV2 as HrOrganizationPage } from "../features/hr/HrOrganizationPageV2";
import { HrPayrollPage } from "../features/hr/HrPayrollPage";
import { HrPayslipPage } from "../features/hr/HrPayslipPage";
import { HrLeavePage } from "../features/hr/HrLeavePage";
import { HrAssetsPage } from "../features/hr/HrAssetsPage";
import { HrExpensesPage } from "../features/hr/HrExpensesPage";
import { HrSettingsPage } from "../features/hr/HrSettingsPage";
import { ManagementReportsPage } from "../features/management-reports/ManagementReportsPage";
import { ProjectsAndTasksPage } from "../features/projects/ProjectsAndTasksPage";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage";
import { AllTasksPage } from "../features/tasks/AllTasksPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "/events", element: <EventsListPage /> },
      { path: "/events/:eventId", element: <EventDetailPage /> },
      { path: "/event-evaluation", element: <EventEvaluationPage /> },
      { path: "/event-evaluation/:eventId", element: <EventEvaluationDetailPage /> },
      { path: "/leads", element: <LeadsPage /> },
      { path: "/interconnection", element: <InterconnectionPage /> },
      { path: "/accounts", element: <CompaniesPage companyStatus="CLIENT" title="Clients" /> },
      { path: "/contracts", element: <ContractsPage /> },
      { path: "/companies/:companyId", element: <CompanyDetailPage /> },
      { path: "/projects", element: <ProjectsAndTasksPage /> },
      { path: "/projects/:projectId", element: <ProjectDetailPage /> },
      { path: "/tasks/all", element: <AllTasksPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/notes", element: <NotesPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/reports/timeline", element: <ProjectTimelinePage /> },
      { path: "/management-reports", element: <ManagementReportsPage /> },
      { path: "/finance", element: <FinancePage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/ops/sms-noc", element: <SmsNocPortalPage /> },
      { path: "/ops/voice-noc", element: <VoiceNocPortalPage /> },
      { path: "/ops/routing-noc", element: <RoutingNocPortalPage /> },
      { path: "/ops/am-noc-routing", element: <AmNocRoutingPortalPage /> },
      { path: "/ops/account-managers", element: <AccountManagersPortalPage /> },
      { path: "/ops/noc-performance-audit", element: <NocPerformanceAuditPage /> },
      { path: "/ops/performance-audit", element: <NocPerformanceAuditPage /> },
      { path: "/ops/analytics", element: <A2pAnalyticsDashboard /> },
      { path: "/hr/dashboard", element: <HrDashboardPage /> },
      { path: "/hr/people", element: <HrPeoplePage /> },
      { path: "/hr/organization", element: <HrOrganizationPage /> },
      { path: "/hr/payroll", element: <HrPayrollPage /> },
      { path: "/hr/payslip", element: <HrPayslipPage /> },
      { path: "/hr/leave", element: <HrLeavePage /> },
      { path: "/hr/assets", element: <HrAssetsPage /> },
      { path: "/hr/expenses", element: <HrExpensesPage /> },
      { path: "/hr/settings", element: <HrSettingsPage /> },
    ],
  },
]);
