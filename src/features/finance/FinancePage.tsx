import { Landmark } from "lucide-react";
import { UiPageHeader } from "../../ui/UiPageHeader";

export function FinancePage() {
  return (
    <div className="space-y-5">
      <UiPageHeader title="Finance" subtitle="Reconciliation and accounting overview" />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-3.5">
          <h3 className="text-sm font-semibold text-gray-800">Finance Reconciliation</h3>
          <p className="text-xs text-gray-500 mt-0.5">Compare portal figures and accounting software records</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="border-b border-gray-100 bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Company</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Invoice Total</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Collected</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Payable</th>
                <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Difference</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">OG</div>
                    <span className="text-sm font-medium text-gray-900">Orange Global 12</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$110,000</td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$89,000</td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$10,000</td>
                <td className="px-5 py-3 text-sm font-semibold text-amber-600 text-right">$11,000</td>
              </tr>
              <tr className="border-b border-gray-50 hover:bg-gray-50/80 transition">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-600">UM</div>
                    <span className="text-sm font-medium text-gray-900">Unitel Mobile 44</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$72,500</td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$72,500</td>
                <td className="px-5 py-3 text-sm text-gray-700 text-right">$6,400</td>
                <td className="px-5 py-3 text-sm font-semibold text-emerald-600 text-right">$0</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="border-t border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Landmark className="h-3.5 w-3.5" />
            <span>This module will connect to accounting software in a future phase</span>
          </div>
        </div>
      </div>
    </div>
  );
}
