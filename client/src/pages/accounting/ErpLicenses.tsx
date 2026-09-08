import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ErpLicense, ErpLicenseActivation } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Plus, Search, Fingerprint, Loader2, X, Save, Ban, Copy, Check } from "lucide-react";

type LicenseDetail = ErpLicense & { activations: ErpLicenseActivation[] };

function statusColor(status: string) {
  if (status === "active") return "text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
  if (status === "revoked") return "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800";
  return "text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800";
}

export default function ErpLicenses() {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("erp_licenses.manage");
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    licenseFileContents: "", customerName: "", customerEmail: "", customerPhone: "", maxActivations: "1",
  });

  const { data: licenses, isLoading } = useQuery<ErpLicense[]>({
    queryKey: ["/api/accounting/erp-licenses"],
  });

  const { data: detail } = useQuery<LicenseDetail>({
    queryKey: ["/api/accounting/erp-licenses", detailId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/accounting/erp-licenses/${detailId}`);
      return res.json();
    },
    enabled: detailId !== null,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { licenseFileContents, ...rest } = formData;
      const res = await apiRequest("POST", "/api/accounting/erp-licenses", {
        ...rest,
        // Base64-encoded so the global sanitizeInputs middleware's HTML-entity
        // escaping of raw " and ' characters can't corrupt this embedded JSON.
        licenseFileContentsBase64: btoa(String.fromCharCode.apply(null, Array.from(new TextEncoder().encode(licenseFileContents)))),
        maxActivations: Number(formData.maxActivations) || 1,
      });
      return res.json();
    },
    onSuccess: (created: ErpLicense & { activationCode: string }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/erp-licenses"] });
      toast({ title: "License created" });
      setShowForm(false);
      setFormData({ licenseFileContents: "", customerName: "", customerEmail: "", customerPhone: "", maxActivations: "1" });
      setIssuedCode(created.activationCode);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const revokeLicenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PATCH", `/api/accounting/erp-licenses/${id}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/erp-licenses"] });
      toast({ title: "License revoked" });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const revokeActivationMutation = useMutation({
    mutationFn: async ({ licenseId, activationId }: { licenseId: number; activationId: number }) => {
      await apiRequest("PATCH", `/api/accounting/erp-licenses/${licenseId}/activations/${activationId}/revoke`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/erp-licenses", detailId] });
      toast({ title: "Machine activation revoked", description: "The customer can now re-activate their code on a new machine." });
    },
    onError: (err: Error) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const filtered = licenses?.filter(l =>
    l.customerName.toLowerCase().includes(search.toLowerCase()) ||
    l.licenseId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-erp-licenses-title">ERP Licenses</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Desktop-app activations for MHTS ERP customers</p>
          </div>
          {canManage && (
            <Button onClick={() => setShowForm(true)} className="bg-sky-600 hover:bg-sky-700 text-white" data-testid="button-add-erp-license">
              <Plus className="w-4 h-4 mr-2" />New License
            </Button>
          )}
        </div>

        {showForm && (
          <Card className="border-sky-200 dark:border-sky-800">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg text-slate-900 dark:text-white">New ERP License</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="w-4 h-4" /></Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Signed license.lic contents</label>
                <Textarea
                  value={formData.licenseFileContents}
                  onChange={e => setFormData({ ...formData, licenseFileContents: e.target.value })}
                  placeholder="Paste the exact JSON generated offline by scripts/generate-license.mjs"
                  rows={5}
                  className="font-mono text-xs"
                  data-testid="input-license-file-contents"
                />
                <p className="text-xs text-slate-400 mt-1">Generated offline only — this portal never signs licenses itself.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Customer Name</label>
                  <Input value={formData.customerName} onChange={e => setFormData({ ...formData, customerName: e.target.value })} placeholder="ABC Traders" data-testid="input-customer-name" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Customer Email</label>
                  <Input type="email" value={formData.customerEmail} onChange={e => setFormData({ ...formData, customerEmail: e.target.value })} placeholder="owner@example.com" data-testid="input-customer-email" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Customer Phone</label>
                  <Input value={formData.customerPhone} onChange={e => setFormData({ ...formData, customerPhone: e.target.value })} placeholder="98765 43210" data-testid="input-customer-phone" />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">Max Activations</label>
                  <Input type="number" min="1" value={formData.maxActivations} onChange={e => setFormData({ ...formData, maxActivations: e.target.value })} data-testid="input-max-activations" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!formData.licenseFileContents || !formData.customerName || createMutation.isPending}
                  className="bg-sky-600 hover:bg-sky-700 text-white"
                  data-testid="button-save-erp-license"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input placeholder="Search by customer or license id..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" data-testid="input-search-erp-licenses" />
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /></div>
        ) : !filtered?.length ? (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Fingerprint className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
              <p className="text-slate-500 dark:text-slate-400">No ERP licenses found</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-slate-200 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="table-erp-licenses">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">License ID</th>
                    <th className="text-left text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Customer</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Max Activations</th>
                    <th className="text-center text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Status</th>
                    <th className="text-right text-xs font-medium text-slate-500 dark:text-slate-400 px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l => (
                    <tr key={l.id} className="border-b border-slate-100 dark:border-slate-800 last:border-0" data-testid={`row-erp-license-${l.id}`}>
                      <td className="px-4 py-3 font-mono text-xs text-slate-900 dark:text-white">{l.licenseId}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-white">{l.customerName}</td>
                      <td className="px-4 py-3 text-center text-sm text-slate-600 dark:text-slate-300">{l.maxActivations}</td>
                      <td className="px-4 py-3 text-center"><Badge variant="outline" className={statusColor(l.status)}>{l.status}</Badge></td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setDetailId(l.id)} data-testid={`button-view-erp-license-${l.id}`}>View</Button>
                          {canManage && l.status !== "revoked" && (
                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300" onClick={() => { if (confirm(`Revoke the license for ${l.customerName}? All its machine activations will stop passing check-ins.`)) revokeLicenseMutation.mutate(l.id); }} disabled={revokeLicenseMutation.isPending} data-testid={`button-revoke-erp-license-${l.id}`}>
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      <Dialog open={issuedCode !== null} onOpenChange={() => setIssuedCode(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Activation code — shown once</DialogTitle></DialogHeader>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Copy this now and send it to the customer. It is not stored in plain text and cannot be shown again — revoke and recreate the license if it's lost.
          </p>
          <div className="flex items-center gap-2">
            <Input readOnly value={issuedCode ?? ""} className="font-mono" data-testid="text-issued-activation-code" />
            <Button
              size="icon"
              variant="outline"
              onClick={async () => {
                if (issuedCode) {
                  await navigator.clipboard.writeText(issuedCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              data-testid="button-copy-activation-code"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={detailId !== null} onOpenChange={() => setDetailId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{detail?.customerName ?? "License detail"}</DialogTitle></DialogHeader>
          {!detail ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-sky-500" /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-400">License ID:</span> <span className="font-mono">{detail.licenseId}</span></div>
                <div><span className="text-slate-400">Status:</span> <Badge variant="outline" className={statusColor(detail.status)}>{detail.status}</Badge></div>
                <div><span className="text-slate-400">Email:</span> {detail.customerEmail || "-"}</div>
                <div><span className="text-slate-400">Phone:</span> {detail.customerPhone || "-"}</div>
                <div><span className="text-slate-400">Max activations:</span> {detail.maxActivations}</div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Machine activations</h4>
                {!detail.activations.length ? (
                  <p className="text-sm text-slate-400">Not yet activated on any machine.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.activations.map(a => (
                      <div key={a.id} className="flex items-center justify-between border border-slate-200 dark:border-slate-700 rounded-md px-3 py-2 text-sm" data-testid={`row-activation-${a.id}`}>
                        <div>
                          <div className="font-mono text-xs text-slate-500">{a.machineId}{a.machineLabel ? ` — ${a.machineLabel}` : ""}</div>
                          <div className="text-xs text-slate-400">
                            Last check-in: {a.lastSeenAt ? new Date(a.lastSeenAt).toLocaleString() : "never"}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={statusColor(a.status)}>{a.status}</Badge>
                          {canManage && a.status === "active" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              onClick={() => { if (confirm("Revoke this machine's activation? The customer can re-activate the same code on a different machine afterward.")) revokeActivationMutation.mutate({ licenseId: detail.id, activationId: a.id }); }}
                              data-testid={`button-revoke-activation-${a.id}`}
                            >
                              Revoke
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AccountingLayout>
  );
}
