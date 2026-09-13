import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Loader2, Wand2 } from "lucide-react";

interface RosterRow {
  employeeId: number;
  employeeName: string;
  weekdayTypes: Record<string, string> | null;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPE_LABELS: Record<string, string> = { wfo: "WFO", wfh: "WFH", off: "Off" };

export default function AttendanceRoster() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<RosterRow | null>(null);
  const [form, setForm] = useState<string[]>(Array(7).fill("wfo"));

  const { data: rows, isLoading } = useQuery<RosterRow[]>({ queryKey: ["/api/accounting/attendance/roster"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const assignments = form.map((dayType, weekday) => ({ weekday, dayType }));
      const res = await apiRequest("PUT", `/api/accounting/attendance/roster/${editing.employeeId}`, { assignments });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/attendance/roster"] });
      setEditing(null);
      toast({ title: "Roster updated" });
    },
    onError: (err: Error) => toast({ title: "Could not save roster", description: err.message, variant: "destructive" }),
  });

  const applyDefaultMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/accounting/attendance/roster/apply-default-template", {})).json(),
    onSuccess: (data: { applied: number }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/attendance/roster"] });
      toast({ title: "Default template applied", description: `${data.applied} employee(s) with no roster were set up` });
    },
    onError: (err: Error) => toast({ title: "Could not apply template", description: err.message, variant: "destructive" }),
  });

  const openEdit = (row: RosterRow) => {
    setEditing(row);
    setForm(Array.from({ length: 7 }, (_, i) => row.weekdayTypes?.[i] || "wfo"));
  };

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Attendance Roster</h1>
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              Per-employee weekly WFO/WFH pattern — fully editable, not a fixed company-wide rule.
            </p>
          </div>
          <Button variant="outline" onClick={() => applyDefaultMutation.mutate()} disabled={applyDefaultMutation.isPending} data-testid="button-apply-default-template">
            {applyDefaultMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Apply Default Template (unconfigured only)
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
            ) : (
              <Table data-testid="table-attendance-roster">
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    {WEEKDAY_LABELS.map(w => <TableHead key={w}>{w}</TableHead>)}
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows?.map(row => (
                    <TableRow key={row.employeeId} data-testid={`row-roster-${row.employeeId}`}>
                      <TableCell className="font-medium">{row.employeeName}</TableCell>
                      {WEEKDAY_LABELS.map((_, weekday) => (
                        <TableCell key={weekday} className="text-xs">
                          {row.weekdayTypes?.[weekday] ? TYPE_LABELS[row.weekdayTypes[weekday]] : "—"}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => openEdit(row)} data-testid={`button-edit-roster-${row.employeeId}`}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent data-testid="dialog-edit-roster">
            <DialogHeader>
              <DialogTitle>Edit Roster — {editing?.employeeName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {WEEKDAY_LABELS.map((label, weekday) => (
                <div key={weekday} className="flex items-center justify-between gap-4">
                  <Label className="w-16">{label}</Label>
                  <Select value={form[weekday]} onValueChange={(v) => setForm(f => f.map((x, i) => i === weekday ? v : x))}>
                    <SelectTrigger data-testid={`select-weekday-${weekday}`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wfo">Work From Office</SelectItem>
                      <SelectItem value="wfh">Work From Home</SelectItem>
                      <SelectItem value="off">Off</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)} data-testid="button-cancel-roster-edit">Cancel</Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} data-testid="button-save-roster">
                {saveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
