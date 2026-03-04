import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, StickyNote } from "lucide-react";

interface AuditLogEntry {
  id: number;
  employeeId: number | null;
  action: string;
  entity: string;
  entityId: number | null;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
  employeeName?: string;
}

const ACTION_TYPES = ["all", "login", "logout", "create", "update", "delete", "approve"] as const;

export default function AuditLog() {
  const { user, canViewAudit } = useAuth();
  const { toast } = useToast();
  const [actionFilter, setActionFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteEntity, setNoteEntity] = useState("");
  const [noteEntityId, setNoteEntityId] = useState<number>(0);
  const [noteText, setNoteText] = useState("");

  const buildQuery = () => {
    const params = new URLSearchParams();
    if (actionFilter !== "all") params.set("action", actionFilter);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  const { data: logs, isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["/api/accounting/audit-logs", buildQuery()],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (data: { entity: string; entityId: number; note: string }) => {
      const res = await apiRequest("POST", "/api/accounting/audit-notes", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/audit-logs"] });
      setNoteOpen(false);
      setNoteText("");
      toast({ title: "Note added successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const openNoteDialog = (entity: string, entityId: number) => {
    setNoteEntity(entity);
    setNoteEntityId(entityId);
    setNoteText("");
    setNoteOpen(true);
  };

  const isAuditor = user?.role === "auditor";

  if (!canViewAudit) {
    return (
      <AccountingLayout>
        <div className="flex items-center justify-center py-20" data-testid="access-denied-audit">
          <p className="text-slate-500 dark:text-slate-400">You do not have permission to view audit logs.</p>
        </div>
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          Audit Log
        </h1>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <Label className="mb-1 block">Action Type</Label>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[180px]" data-testid="select-action-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_TYPES.map((type) => (
                      <SelectItem key={type} value={type} data-testid={`option-action-${type}`}>
                        {type === "all" ? "All Actions" : type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Start Date</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  data-testid="input-audit-start-date"
                />
              </div>
              <div>
                <Label className="mb-1 block">End Date</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  data-testid="input-audit-end-date"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12" data-testid="loading-audit-logs">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !logs || logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400" data-testid="text-no-logs">
                No audit log entries found.
              </div>
            ) : (
              <Table data-testid="table-audit-logs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    {isAuditor && <TableHead>Notes</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id} data-testid={`row-audit-${log.id}`}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(log.createdAt).toLocaleString("en-IN")}
                      </TableCell>
                      <TableCell>{log.employeeName || `User #${log.employeeId}`}</TableCell>
                      <TableCell className="capitalize">{log.action}</TableCell>
                      <TableCell className="capitalize">{log.entity}</TableCell>
                      <TableCell className="max-w-[250px] truncate text-sm text-slate-500 dark:text-slate-400">
                        {log.details || "—"}
                      </TableCell>
                      {isAuditor && (
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openNoteDialog(log.entity, log.entityId || log.id)}
                            data-testid={`button-add-note-${log.id}`}
                          >
                            <StickyNote className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogContent data-testid="dialog-add-note">
            <DialogHeader>
              <DialogTitle>Add Audit Note</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Adding note for <span className="font-medium capitalize">{noteEntity}</span> #{noteEntityId}
              </p>
              <div>
                <Label>Note</Label>
                <Textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  className="resize-none"
                  data-testid="textarea-note"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNoteOpen(false)} data-testid="button-cancel-note">
                Cancel
              </Button>
              <Button
                onClick={() => addNoteMutation.mutate({ entity: noteEntity, entityId: noteEntityId, note: noteText })}
                disabled={addNoteMutation.isPending || !noteText.trim()}
                data-testid="button-submit-note"
              >
                {addNoteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Note
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
