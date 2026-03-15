import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Save, Plus, Globe } from "lucide-react";

interface CompanySettings {
  id?: number;
  companyName: string;
  address: string | null;
  gstin: string | null;
  phone: string | null;
  email: string | null;
  brandName: string | null;
  tagline: string | null;
  whatsappNumber: string | null;
  careersEmail: string | null;
  websiteUrl: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  copyrightText: string | null;
}

interface FinancialYear {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

export default function Settings() {
  const { canManageSettings, user } = useAuth();
  const { toast } = useToast();
  const isSuperAdmin = user?.role === "super_admin";

  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const [brandName, setBrandName] = useState("");
  const [tagline, setTagline] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [careersEmail, setCareersEmail] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [copyrightText, setCopyrightText] = useState("");

  const [fyOpen, setFyOpen] = useState(false);
  const [fyName, setFyName] = useState("");
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");

  const { data: settings, isLoading: settingsLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/accounting/company-settings"],
  });

  const { data: financialYears, isLoading: fyLoading } = useQuery<FinancialYear[]>({
    queryKey: ["/api/accounting/financial-years"],
  });

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.companyName || "");
      setAddress(settings.address || "");
      setGstin(settings.gstin || "");
      setPhone(settings.phone || "");
      setEmail(settings.email || "");
      setBrandName(settings.brandName || "");
      setTagline(settings.tagline || "");
      setWhatsappNumber(settings.whatsappNumber || "");
      setCareersEmail(settings.careersEmail || "");
      setWebsiteUrl(settings.websiteUrl || "");
      setLinkedinUrl(settings.linkedinUrl || "");
      setTwitterUrl(settings.twitterUrl || "");
      setInstagramUrl(settings.instagramUrl || "");
      setFacebookUrl(settings.facebookUrl || "");
      setCopyrightText(settings.copyrightText || "");
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Omit<CompanySettings, "id">>) => {
      const res = await apiRequest("PUT", "/api/accounting/company-settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Settings saved successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const createFyMutation = useMutation({
    mutationFn: async (data: { name: string; startDate: string; endDate: string }) => {
      const res = await apiRequest("POST", "/api/accounting/financial-years", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/financial-years"] });
      setFyOpen(false);
      setFyName("");
      setFyStart("");
      setFyEnd("");
      toast({ title: "Financial year created successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({ companyName, address, gstin, phone, email });
  };

  const handleSaveWebsite = () => {
    saveMutation.mutate({
      companyName,
      address,
      gstin,
      phone,
      email,
      brandName,
      tagline,
      whatsappNumber,
      careersEmail,
      websiteUrl,
      linkedinUrl,
      twitterUrl,
      instagramUrl,
      facebookUrl,
      copyrightText,
    });
  };

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          Settings
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>Company Information</CardTitle>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-settings">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="space-y-4 max-w-lg">
                <div>
                  <Label>Company Name</Label>
                  <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!canManageSettings} data-testid="input-company-name" />
                </div>
                <div>
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} disabled={!canManageSettings} data-testid="input-address" />
                </div>
                <div>
                  <Label>GSTIN</Label>
                  <Input value={gstin} onChange={(e) => setGstin(e.target.value)} disabled={!canManageSettings} data-testid="input-gstin" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!canManageSettings} data-testid="input-phone" />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={!canManageSettings} data-testid="input-email" />
                </div>
                {canManageSettings && (
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending || !companyName}
                    data-testid="button-save-settings"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Settings
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-500" />
              <CardTitle>Website & Contact Settings</CardTitle>
            </div>
            <CardDescription>
              {isSuperAdmin
                ? "Manage the details shown on the public website. Changes appear immediately."
                : "These settings are read-only. Only Super Admin can edit website settings."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <Label>Brand Name</Label>
                    <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} disabled={!isSuperAdmin} placeholder="MHTSdigiXR" data-testid="input-brand-name" />
                  </div>
                  <div>
                    <Label>Website URL</Label>
                    <Input value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} disabled={!isSuperAdmin} placeholder="www.mhtsdigixr.com" data-testid="input-website-url" />
                  </div>
                </div>
                <div className="max-w-2xl">
                  <Label>Tagline</Label>
                  <Input value={tagline} onChange={(e) => setTagline(e.target.value)} disabled={!isSuperAdmin} placeholder="Empowering businesses with cutting-edge digital solutions." data-testid="input-tagline" />
                </div>
                <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
                  <div>
                    <Label>WhatsApp Number</Label>
                    <Input value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} disabled={!isSuperAdmin} placeholder="917358105995" data-testid="input-whatsapp" />
                    <p className="text-xs text-slate-500 mt-1">Country code + number, no spaces (e.g., 917358105995)</p>
                  </div>
                  <div>
                    <Label>Careers Email</Label>
                    <Input type="email" value={careersEmail} onChange={(e) => setCareersEmail(e.target.value)} disabled={!isSuperAdmin} placeholder="careers@mhtsdigixr.com" data-testid="input-careers-email" />
                  </div>
                </div>
                <div className="max-w-2xl">
                  <Label>Copyright Text</Label>
                  <Input value={copyrightText} onChange={(e) => setCopyrightText(e.target.value)} disabled={!isSuperAdmin} placeholder="@2026 All rights reserved by Maanagarram Hi Tech Solutions" data-testid="input-copyright" />
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Social Media Links</p>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl">
                    <div>
                      <Label>LinkedIn URL</Label>
                      <Input value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={!isSuperAdmin} placeholder="https://linkedin.com/company/..." data-testid="input-linkedin" />
                    </div>
                    <div>
                      <Label>Twitter / X URL</Label>
                      <Input value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} disabled={!isSuperAdmin} placeholder="https://twitter.com/..." data-testid="input-twitter" />
                    </div>
                    <div>
                      <Label>Instagram URL</Label>
                      <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} disabled={!isSuperAdmin} placeholder="https://instagram.com/..." data-testid="input-instagram" />
                    </div>
                    <div>
                      <Label>Facebook URL</Label>
                      <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} disabled={!isSuperAdmin} placeholder="https://facebook.com/..." data-testid="input-facebook" />
                    </div>
                  </div>
                </div>
                {isSuperAdmin && (
                  <Button
                    onClick={handleSaveWebsite}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-website-settings"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Website Settings
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle>Financial Years</CardTitle>
            {canManageSettings && (
              <Button onClick={() => setFyOpen(true)} data-testid="button-add-financial-year">
                <Plus className="w-4 h-4 mr-2" />
                Add Year
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {fyLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-financial-years">
                <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
              </div>
            ) : !financialYears || financialYears.length === 0 ? (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400" data-testid="text-no-financial-years">
                No financial years configured.
              </div>
            ) : (
              <Table data-testid="table-financial-years">
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {financialYears.map((fy) => (
                    <TableRow key={fy.id} data-testid={`row-financial-year-${fy.id}`}>
                      <TableCell className="font-medium">{fy.name}</TableCell>
                      <TableCell>{fy.startDate}</TableCell>
                      <TableCell>{fy.endDate}</TableCell>
                      <TableCell>
                        <Badge variant={fy.isActive ? "default" : "outline"} data-testid={`badge-fy-status-${fy.id}`}>
                          {fy.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Dialog open={fyOpen} onOpenChange={setFyOpen}>
          <DialogContent data-testid="dialog-add-financial-year">
            <DialogHeader>
              <DialogTitle>Add Financial Year</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={fyName}
                  onChange={(e) => setFyName(e.target.value)}
                  placeholder="e.g., FY 2024-25"
                  data-testid="input-fy-name"
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input type="date" value={fyStart} onChange={(e) => setFyStart(e.target.value)} data-testid="input-fy-start" />
              </div>
              <div>
                <Label>End Date</Label>
                <Input type="date" value={fyEnd} onChange={(e) => setFyEnd(e.target.value)} data-testid="input-fy-end" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setFyOpen(false)} data-testid="button-cancel-fy">
                Cancel
              </Button>
              <Button
                onClick={() => createFyMutation.mutate({ name: fyName, startDate: fyStart, endDate: fyEnd })}
                disabled={createFyMutation.isPending || !fyName || !fyStart || !fyEnd}
                data-testid="button-submit-fy"
              >
                {createFyMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
