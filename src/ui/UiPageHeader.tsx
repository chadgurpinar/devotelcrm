import { ReactNode } from "react";

interface UiPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function UiPageHeader({ title, subtitle, actions }: UiPageHeaderProps) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
