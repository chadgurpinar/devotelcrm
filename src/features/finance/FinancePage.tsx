import { Card } from "../../components/ui";

export function FinancePage() {
  return (
    <div className="space-y-4">
      <Card title="Finance reconciliation (placeholder)">
        <p className="text-sm text-slate-600">
          This module will compare portal figures and accounting software records for invoice, payment, receivable, and
          payable tracking.
        </p>
        <table className="mt-3">
          <thead>
            <tr>
              <th>Company</th>
              <th>Invoice total</th>
              <th>Collected</th>
              <th>Payable</th>
              <th>Diff</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Orange Global 12</td>
              <td>$110,000</td>
              <td>$89,000</td>
              <td>$10,000</td>
              <td className="text-amber-600">$11,000</td>
            </tr>
            <tr>
              <td>Unitel Mobile 44</td>
              <td>$72,500</td>
              <td>$72,500</td>
              <td>$6,400</td>
              <td className="text-emerald-600">$0</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}
