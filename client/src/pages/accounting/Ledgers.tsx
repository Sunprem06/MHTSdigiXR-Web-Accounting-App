import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { LedgerAccount, AccountGroup } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Pencil, Trash2, Search, BookOpen } from "lucide-react";

const GROUP_TYPE_ORDER = ["Assets", "Liabilities", "Income", "Expenses", "Capital"];

interface LedgerFormData {
  name: string;
  groupId: string;
  openingBalance: string;
  balanceType: string;
  description: string;
}

const emptyForm: LedgerFormData = {
  name: "",
  groupId: "",
  openingBalance: "0",
  balanceType: "debit",
  description: "",
};

export default function Ledgers() {
  const { canManageLedgers, canDelete } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingLedger, setEditingLedger] = useState<LedgerAccount | null>(null);
  const [deletingLedger, setDeletingLedger] = useState<LedgerAccount | null>(null);
  const [form, setForm] = useState<LedgerFormData>(emptyForm);

  const { data: ledgers = [], isLoading: ledgersLoading } = useQuery<LedgerAccount[]>({
    queryKey: ["/api/accounting/ledgers"],
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery<AccountGroup[]>({
    queryKey: ["/api/accounting/account-groups"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/accounting/ledgers", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/ledgers"] });
      toast({ title: "Ledger account created successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error creating ledger", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/accounting/ledgers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/ledgers"] });
      toast({ title: "Ledger account updated successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error updating ledger", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/ledgers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/ledgers"] });
      toast({ title: "Ledger account deleted successfully" });
      setDeleteDialogOpen(false);
      setDeletingLedger(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting ledger", description: err.message, variant: "destructive" });
    },
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingLedger(null);
    setForm(emptyForm);
  };

  const openCreateDialog = () => {
    setEditingLedger(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (ledger: LedgerAccount) => {
    setEditingLedger(ledger);
    setForm({
      name: ledger.name,
      groupId: String(ledger.groupId),
      openingBalance: ledger.openingBalance,
      balanceType: ledger.balanceType,
      description: ledger.description || "",
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (ledger: LedgerAccount) => {
    setDeletingLedger(ledger);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.groupId) {
      toast({ title: "Please fill in required fields", variant: "destructive" });
      return;
    }
    const payload = {
      name: form.name.trim(),
      groupId: Number(form.groupId),
      openingBalance: form.openingBalance || "0",
      balanceType: form.balanceType,
      description: form.description.trim() || null,
    };
    if (editingLedger) {
      updateMutation.mutate({ id: editingLedger.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = () => {
    if (deletingLedger) {
      deleteMutation.mutate(deletingLedger.id);
    }
  };

  const groupMap = new Map(groups.map((g) => [g.id, g]));

  const filteredLedgers = ledgers.filter((l) =>
    l.name.toLowerCase().includes(search.toLowerCase()) ||
    (l.description && l.description.toLowerCase().includes(search.toLowerCase()))
  );

  const groupedByType = GROUP_TYPE_ORDER.reduce<Record<string, { group: AccountGroup; accounts: LedgerAccount[] }[]>>(
    (acc, type) => {
      const typeGroups = groups.filter((g) => g.type === type);
      const entries = typeGroups
        .map((g) => ({
          group: g,
          accounts: filteredLedgers.filter((l) => l.groupId === g.id),
        }))
        .filter((e) => e.accounts.length > 0);
      if (entries.length > 0) {
        acc[type] = entries;
      }
      return acc;
    },
    {}
  );

  const isLoading = ledgersLoading || groupsLoading;
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
              Ledger Accounts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400" data-testid="text-page-subtitle">
              Manage your chart of accounts
            </p>
          </div>
          {canManageLedgers && (
            <Button
              onClick={openCreateDialog}
              className="bg-sky-600 hover:bg-sky-700 text-white"
              data-testid="button-create-ledger"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Account
            </Button>
          )}
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search accounts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-ledger"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12" data-testid="loading-ledgers">
            <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
          </div>
        ) : filteredLedgers.length === 0 ? (
          <Card className="p-8">
            <div className="text-center text-slate-500 dark:text-slate-400" data-testid="text-no-ledgers">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No accounts found</p>
              <p className="text-sm mt-1">
                {search ? "Try a different search term" : "Create your first ledger account to get started"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {GROUP_TYPE_ORDER.map((type) => {
              const entries = groupedByType[type];
              if (!entries) return null;
              return (
                <div key={type} data-testid={`group-type-${type.toLowerCase()}`}>
                  <h2 className="text-lg font-semibold text-sky-700 dark:text-sky-400 mb-3" data-testid={`text-group-type-${type.toLowerCase()}`}>
                    {type}
                  </h2>
                  <div className="space-y-3">
                    {entries.map(({ group, accounts }) => (
                      <Card key={group.id} className="overflow-visible" data-testid={`card-group-${group.id}`}>
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300" data-testid={`text-group-name-${group.id}`}>
                            {group.name}
                          </h3>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {accounts.map((account) => (
                            <div
                              key={account.id}
                              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                              data-testid={`row-ledger-${account.id}`}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 dark:text-white truncate" data-testid={`text-ledger-name-${account.id}`}>
                                  {account.name}
                                </p>
                                {account.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate" data-testid={`text-ledger-desc-${account.id}`}>
                                    {account.description}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="text-right" data-testid={`text-ledger-balance-${account.id}`}>
                                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                                    {parseFloat(account.openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                  </span>
                                  <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${
                                    account.balanceType === "debit"
                                      ? "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300"
                                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                                  }`} data-testid={`text-ledger-type-${account.id}`}>
                                    {account.balanceType === "debit" ? "Dr" : "Cr"}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1" style={{ visibility: (canManageLedgers || canDelete) ? "visible" : "hidden" }}>
                                  {canManageLedgers && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openEditDialog(account)}
                                      data-testid={`button-edit-ledger-${account.id}`}
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                  )}
                                  {canDelete && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => openDeleteDialog(account)}
                                      className="text-red-500 dark:text-red-400"
                                      data-testid={`button-delete-ledger-${account.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
          <DialogContent data-testid="dialog-ledger-form">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">
                {editingLedger ? "Edit Ledger Account" : "Create Ledger Account"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="ledger-name">Account Name *</Label>
                <Input
                  id="ledger-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Cash, Bank Account"
                  data-testid="input-ledger-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ledger-group">Account Group *</Label>
                <Select value={form.groupId} onValueChange={(val) => setForm({ ...form, groupId: val })}>
                  <SelectTrigger data-testid="select-ledger-group">
                    <SelectValue placeholder="Select a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((g) => (
                      <SelectItem key={g.id} value={String(g.id)} data-testid={`option-group-${g.id}`}>
                        {g.name} ({g.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ledger-balance">Opening Balance</Label>
                  <Input
                    id="ledger-balance"
                    type="number"
                    step="0.01"
                    value={form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                    data-testid="input-ledger-balance"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ledger-balance-type">Balance Type</Label>
                  <Select value={form.balanceType} onValueChange={(val) => setForm({ ...form, balanceType: val })}>
                    <SelectTrigger data-testid="select-ledger-balance-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">Debit</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ledger-description">Description</Label>
                <Input
                  id="ledger-description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description"
                  data-testid="input-ledger-description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-ledger">
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isMutating}
                className="bg-sky-600 hover:bg-sky-700 text-white"
                data-testid="button-save-ledger"
              >
                {isMutating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingLedger ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeletingLedger(null); } }}>
          <DialogContent data-testid="dialog-delete-ledger">
            <DialogHeader>
              <DialogTitle>Delete Ledger Account</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-600 dark:text-slate-400" data-testid="text-delete-confirm">
              Are you sure you want to delete <strong>{deletingLedger?.name}</strong>? This action cannot be undone.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeletingLedger(null); }} data-testid="button-cancel-delete">
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                data-testid="button-confirm-delete"
              >
                {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
