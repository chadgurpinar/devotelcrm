import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { DashboardPage } from "../features/dashboard/DashboardPage";
import { EventsListPage } from "../features/events/EventsListPage";
import { EventDetailPage } from "../features/events/EventDetailPage";
import { CompaniesPage } from "../features/crm/CompaniesPage";
import { CompanyDetailPage } from "../features/crm/CompanyDetailPage";
import { LeadsPage } from "../features/leads/LeadsPage";
import { InterconnectionPage } from "../features/interconnection/InterconnectionPage";
import { TasksPage } from "../features/tasks/TasksPage";
import { NotesPage } from "../features/notes/NotesPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { FinancePage } from "../features/finance/FinancePage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { ContractsPage } from "../features/contracts/ContractsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "/events", element: <EventsListPage /> },
      { path: "/events/:eventId", element: <EventDetailPage /> },
      { path: "/leads", element: <LeadsPage /> },
      { path: "/interconnection", element: <InterconnectionPage /> },
      { path: "/accounts", element: <CompaniesPage companyStatus="CLIENT" title="Clients" /> },
      { path: "/contracts", element: <ContractsPage /> },
      { path: "/companies/:companyId", element: <CompanyDetailPage /> },
      { path: "/tasks", element: <TasksPage /> },
      { path: "/notes", element: <NotesPage /> },
      { path: "/reports", element: <ReportsPage /> },
      { path: "/finance", element: <FinancePage /> },
      { path: "/settings", element: <SettingsPage /> },
    ],
  },
]);
