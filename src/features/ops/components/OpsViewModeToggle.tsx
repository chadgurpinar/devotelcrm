import { Button } from "../../../components/ui";
import { OpsViewMode } from "../../../store/uiOps";

export function OpsViewModeToggle(props: { value: OpsViewMode; onChange: (mode: OpsViewMode) => void }) {
  const { value, onChange } = props;
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
      <Button size="sm" variant={value === "COMPACT" ? "primary" : "secondary"} onClick={() => onChange("COMPACT")}>
        Compact view
      </Button>
      <Button size="sm" variant={value === "LARGE" ? "primary" : "secondary"} onClick={() => onChange("LARGE")}>
        Large view
      </Button>
    </div>
  );
}
