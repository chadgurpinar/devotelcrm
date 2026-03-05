import { create } from "zustand";
import { persist } from "zustand/middleware";
import { OpsPortalId } from "./types";

export type OpsViewMode = "COMPACT" | "LARGE";

type OpsViewModeByPortal = Record<OpsPortalId, OpsViewMode>;

const DEFAULT_VIEW_MODE_BY_PORTAL: OpsViewModeByPortal = {
  "sms-noc": "LARGE",
  "voice-noc": "LARGE",
  "routing-noc": "LARGE",
  "am-noc-routing": "LARGE",
  "account-managers": "LARGE",
  "performance-audit": "LARGE",
};

type OpsUiStore = {
  viewModeByPortal: OpsViewModeByPortal;
  setPortalViewMode: (portalId: OpsPortalId, mode: OpsViewMode) => void;
};

export const useOpsUiStore = create<OpsUiStore>()(
  persist(
    (set) => ({
      viewModeByPortal: DEFAULT_VIEW_MODE_BY_PORTAL,
      setPortalViewMode: (portalId, mode) =>
        set((state) => ({
          viewModeByPortal: {
            ...state.viewModeByPortal,
            [portalId]: mode,
          },
        })),
    }),
    {
      name: "ops-ui-view-modes",
      partialize: (state) => ({ viewModeByPortal: state.viewModeByPortal }),
    },
  ),
);
