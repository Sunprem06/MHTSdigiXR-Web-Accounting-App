import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FixedAssetDepreciationEntry } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";

interface ScheduleResponse {
  entries: FixedAssetDepreciationEntry[];
  summary: { accumulatedDepreciation: number; currentBookValue: number | null };
}

interface FixedAssetDepreciationScheduleProps {
  fixedAssetId: number;
}

export function FixedAssetDepreciationSchedule({ fixedAssetId }: FixedAssetDepreciationScheduleProps) {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const canRecalculate = hasPermission("fixed_assets.edit");

  const { data, isLoading } = useQuery<ScheduleResponse>({
    queryKey: [`/api/accounting/fixed-assets/${fixedAssetId}/depreciation-schedule`],
  });

  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/accounting/fixed-assets/${fixedAssetId}/recalculate-depreciation`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/accounting/fixed-assets/${fixedAssetId}/depreciation-schedule`] });
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/fixed-assets"] });
      toast({ title: "Depreciation schedule recalculated" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3" data-testid="banner-depreciation-ca-review">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-amber-800 dark:text-amber-300">
          Calculated using this app's best-effort implementation of Companies Act 2013 Schedule II (SLM/WDV, day-based
          pro-rata). Not reviewed by a Chartered Accountant — do not rely on these figures for statutory filings,
          audited financial statements, or tax computations.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-sky-500" /></div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-slate-500 dark:text-slate-400">Accumulated Depreciation: </span>
              <span className="font-medium">₹{(data?.summary.accumulatedDepreciation ?? 0).toLocaleString("en-IN")}</span>
              <span className="mx-2 text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">Book Value: </span>
              <span className="font-medium">{data?.summary.currentBookValue !== null && data?.summary.currentBookValue !== undefined ? `₹${data.summary.currentBookValue.toLocaleString("en-IN")}` : "-"}</span>
            </div>
            {canRecalculate && (
              <Button size="sm" variant="outline" onClick={() => recalculateMutation.mutate()} disabled={recalculateMutation.isPending} data-testid="button-recalculate-depreciation">
                {recalculateMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                Recalculate
              </Button>
            )}
          </div>

          {!data?.entries.length ? (
            <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400">No depreciation entries yet.</div>
          ) : (
            <Table data-testid="table-depreciation-schedule">
              <TableHeader>
                <TableRow>
                  <TableHead>Financial Year</TableHead>
                  <TableHead>Opening WDV</TableHead>
                  <TableHead>Depreciation</TableHead>
                  <TableHead>Closing WDV</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Prorated?</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.entries.map(e => (
                  <TableRow key={e.id} data-testid={`row-depreciation-entry-${e.id}`}>
                    <TableCell>{e.financialYearLabel}</TableCell>
                    <TableCell>₹{parseFloat(e.openingWdv).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{parseFloat(e.depreciationAmount).toLocaleString("en-IN")}</TableCell>
                    <TableCell>₹{parseFloat(e.closingWdv).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="uppercase text-xs">{e.method}</TableCell>
                    <TableCell>{e.isProrated ? <Badge variant="outline">Yes</Badge> : <span className="text-slate-400">-</span>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}
