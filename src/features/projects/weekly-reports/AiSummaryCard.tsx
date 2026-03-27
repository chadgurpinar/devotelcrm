import { Sparkles, AlertTriangle } from "lucide-react";

export function AiSummaryCard({ aiSummary, onRegenerate }: { aiSummary: { text: string; missingReports: string[]; generatedAt: string; coverage: Record<string, string | undefined> } | null; onRegenerate: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-1.5"><Sparkles className="h-4 w-4 text-indigo-500" /><p className="text-sm font-semibold text-gray-800">AI Summary</p></div>
        <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1 text-[10px] font-medium text-white hover:bg-indigo-700 transition focus:outline-none focus:ring-2 focus:ring-indigo-500/30"><Sparkles className="h-3 w-3" /> {aiSummary ? "Re-generate" : "Generate"}</button>
      </div>
      <div className="px-4 py-3">
        {aiSummary ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-800 leading-relaxed">{aiSummary.text}</p>
            {aiSummary.missingReports.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[10px] text-amber-600 font-medium">Missing:</span>
                {aiSummary.missingReports.map((r) => <span key={r} className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">{r}</span>)}
              </div>
            )}
            <div className="flex items-center gap-2">{(["technical", "sales", "product", "manager"] as const).map((key) => { const sub = aiSummary.coverage[key === "manager" ? "manager" : key]; return <span key={key} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sub ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>{sub ? "✓" : "✗"} {key}</span>; })}</div>
            <p className="text-[10px] text-gray-400">Generated {new Date(aiSummary.generatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-400 italic py-2">No AI summary generated yet. Click "Generate" to create one.</p>
        )}
      </div>
    </div>
  );
}
