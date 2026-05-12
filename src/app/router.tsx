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
import { TrafficIntelligencePage } from "../features/ops/traffic-intelligence/TrafficIntelligencePage";
import { HrDashboardPage } from "../features/hr/HrDashboardPage";
import { HrPeoplePage } from "../features/hr/HrPeoplePage";
import { HrOrganizationPageV2 as HrOrganizationPage } from "../features/hr/HrOrganizationPageV2";
import { HrPayrollPage } from "../features/hr/HrPayrollPage";
import { HrPayslipPage } from "../features/hr/HrPayslipPage";
import { HrLeavePage } from "../features/hr/HrLeavePage";
import { HrAssetsPage } from "../features/hr/HrAssetsPage";
import { HrExpensesPage } from "../features/hr/HrExpensesPage";
import { HrSettingsPage } from "../features/hr/HrSettingsPage";
import {
  Hr2Hello,
  Hr2CompPackageListPage,
  Hr2CompPackageDetailPage,
  Hr2CompPackageWizardPage,
  Hr2StartChangePage,
  Hr2SalaryChangePage,
  Hr2VariableBonusPage,
  Hr2SettlementChangePage,
  Hr2TerminatePackagePage,
  Hr2RequestSubmittedPage,
  Hr2CompAuditLogPage,
  Hr2PayrollOverviewPage,
  Hr2PayrollCyclePage,
  Hr2PayrollExceptionsPage,
  Hr2PayrollFinalReviewPage,
  Hr2EmployeePayrollDetailPage,
  Hr2PayslipPage,
  Hr2FinanceInstructionRegisterPage,
  Hr2FinanceEntityInstructionsPage,
  Hr2FinanceFundingWorkspacePage,
  Hr2PeoplePage,
  Hr2EmployeeProfilePage,
  Hr2LeavePage,
  Hr2AssetsPage,
} from "../features/hr2";
import { ManagementReportsPage } from "../features/management-reports/ManagementReportsPage";
import { ProjectsAndTasksPage } from "../features/projects/ProjectsAndTasksPage";
import { ProjectDetailPage } from "../features/projects/ProjectDetailPage";
import { AllTasksPage } from "../features/tasks/AllTasksPage";
import { FinanceArApPage } from "../features/finance/FinanceArApPage";
import { FinanceArApDetailPage } from "../features/finance/FinanceArApDetailPage";
import { FinanceCreditCardsPage } from "../features/finance/FinanceCreditCardsPage";
import { FinanceCreditCardDetailPage } from "../features/finance/FinanceCreditCardDetailPage";
import { FinanceDirectDebitsPage } from "../features/finance/FinanceDirectDebitsPage";
import { FinanceIntercompanyPage } from "../features/finance/FinanceIntercompanyPage";
import { FinanceInvoicesPage } from "../features/finance/FinanceInvoicesPage";
import { FinanceLiquidityPage } from "../features/finance/FinanceLiquidityPage";
import { FinanceSalariesPage } from "../features/finance/FinanceSalariesPage";
import { FinanceOverviewPage } from "../features/finance/FinanceOverviewPage";

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
      { path: "/finance/liquidity", element: <FinanceLiquidityPage /> },
      { path: "/finance/overview", element: <FinanceOverviewPage /> },
      { path: "/finance/ar-ap", element: <FinanceArApPage /> },
      { path: "/finance/ar-ap/:counterpartyId", element: <FinanceArApDetailPage /> },
      { path: "/finance/credit-cards", element: <FinanceCreditCardsPage /> },
      { path: "/finance/credit-cards/:cardId", element: <FinanceCreditCardDetailPage /> },
      { path: "/finance/direct-debits", element: <FinanceDirectDebitsPage /> },
      { path: "/finance/invoices", element: <FinanceInvoicesPage /> },
      { path: "/finance/salaries", element: <FinanceSalariesPage /> },
      { path: "/finance/intercompany", element: <FinanceIntercompanyPage /> },
      { path: "/settings", element: <SettingsPage /> },
      { path: "/ops/sms-noc", element: <SmsNocPortalPage /> },
      { path: "/ops/voice-noc", element: <VoiceNocPortalPage /> },
      { path: "/ops/routing-noc", element: <RoutingNocPortalPage /> },
      { path: "/ops/am-noc-routing", element: <AmNocRoutingPortalPage /> },
      { path: "/ops/account-managers", element: <AccountManagersPortalPage /> },
      { path: "/ops/noc-performance-audit", element: <NocPerformanceAuditPage /> },
      { path: "/ops/performance-audit", element: <NocPerformanceAuditPage /> },
      { path: "/ops/analytics", element: <A2pAnalyticsDashboard /> },
      { path: "/ops/traffic-intelligence", element: <TrafficIntelligencePage /> },
      { path: "/hr/dashboard", element: <HrDashboardPage /> },
      { path: "/hr/people", element: <HrPeoplePage /> },
      { path: "/hr/organization", element: <HrOrganizationPage /> },
      { path: "/hr/payroll", element: <HrPayrollPage /> },
      { path: "/hr/payslip", element: <HrPayslipPage /> },
      { path: "/hr/leave", element: <HrLeavePage /> },
      { path: "/hr/assets", element: <HrAssetsPage /> },
      { path: "/hr/expenses", element: <HrExpensesPage /> },
      { path: "/hr/settings", element: <HrSettingsPage /> },
      { path: "/hr2", element: <Hr2Hello /> },
      { path: "/hr2/compensation", element: <Hr2CompPackageListPage /> },
      { path: "/hr2/compensation/audit", element: <Hr2CompAuditLogPage /> },
      { path: "/hr2/compensation/new", element: <Hr2CompPackageWizardPage /> },
      { path: "/hr2/compensation/:packageId", element: <Hr2CompPackageDetailPage /> },
      { path: "/hr2/compensation/:packageId/change", element: <Hr2StartChangePage /> },
      { path: "/hr2/compensation/:packageId/change/salary", element: <Hr2SalaryChangePage /> },
      { path: "/hr2/compensation/:packageId/change/bonus", element: <Hr2VariableBonusPage /> },
      { path: "/hr2/compensation/:packageId/change/settlement", element: <Hr2SettlementChangePage /> },
      { path: "/hr2/compensation/:packageId/change/terminate", element: <Hr2TerminatePackagePage /> },
      { path: "/hr2/compensation/:packageId/change/submitted/:requestId", element: <Hr2RequestSubmittedPage /> },
      { path: "/hr2/payroll", element: <Hr2PayrollOverviewPage /> },
      { path: "/hr2/payroll/:cycleId", element: <Hr2PayrollCyclePage /> },
      { path: "/hr2/payroll/:cycleId/exceptions", element: <Hr2PayrollExceptionsPage /> },
      { path: "/hr2/payroll/:cycleId/review", element: <Hr2PayrollFinalReviewPage /> },
      { path: "/hr2/payroll/:cycleId/employee/:employeeId", element: <Hr2EmployeePayrollDetailPage /> },
      { path: "/hr2/payroll/payslip/:cycleLineId", element: <Hr2PayslipPage /> },
      { path: "/hr2/finance", element: <Hr2FinanceInstructionRegisterPage /> },
      { path: "/hr2/finance/funding", element: <Hr2FinanceFundingWorkspacePage /> },
      { path: "/hr2/finance/batch/:batchId", element: <Hr2FinanceEntityInstructionsPage /> },
      { path: "/hr2/people", element: <Hr2PeoplePage /> },
      { path: "/hr2/people/:employeeId", element: <Hr2EmployeeProfilePage /> },
      { path: "/hr2/leave", element: <Hr2LeavePage /> },
      { path: "/hr2/assets", element: <Hr2AssetsPage /> },
    ],
  },
]);
