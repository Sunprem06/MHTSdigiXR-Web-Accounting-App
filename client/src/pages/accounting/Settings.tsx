import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, Plus, Globe, BookOpen, FileText, Pencil, Mail, Send, ChevronDown, ChevronRight, CheckCircle } from "lucide-react";

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
  aboutStory: string | null;
  aboutVision: string | null;
  aboutMission: string | null;
  foundedYear: string | null;
  aboutLocation: string | null;
}

interface LegalPageData {
  id: number;
  slug: string;
  title: string;
  content: string;
  effectiveDate: string | null;
  updatedAt: string | null;
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

  const [aboutStory, setAboutStory] = useState("");
  const [aboutVision, setAboutVision] = useState("");
  const [aboutMission, setAboutMission] = useState("");
  const [foundedYear, setFoundedYear] = useState("");
  const [aboutLocation, setAboutLocation] = useState("");

  const [legalDialogOpen, setLegalDialogOpen] = useState(false);
  const [editingLegal, setEditingLegal] = useState<LegalPageData | null>(null);
  const [legalTitle, setLegalTitle] = useState("");
  const [legalContent, setLegalContent] = useState("");
  const [legalEffectiveDate, setLegalEffectiveDate] = useState("");

  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpSecure, setSmtpSecure] = useState(true);
  const [smtpUsername, setSmtpUsername] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpFromEmail, setSmtpFromEmail] = useState("");
  const [smtpTestEmail, setSmtpTestEmail] = useState("");

  const [fyOpen, setFyOpen] = useState(false);
  const [fyName, setFyName] = useState("");
  const [fyStart, setFyStart] = useState("");
  const [fyEnd, setFyEnd] = useState("");
  const [editingFyId, setEditingFyId] = useState<number | null>(null);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["company", "website", "about", "legal", "smtp", "financial"]));
  const toggleSection = (key: string) => setCollapsed(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const { data: settings, isLoading: settingsLoading } = useQuery<CompanySettings>({
    queryKey: ["/api/accounting/company-settings"],
  });

  const { data: financialYears, isLoading: fyLoading } = useQuery<FinancialYear[]>({
    queryKey: ["/api/accounting/financial-years"],
  });

  const { data: legalPagesData, isLoading: legalLoading } = useQuery<LegalPageData[]>({
    queryKey: ["/api/accounting/legal-pages"],
    enabled: isSuperAdmin,
  });

  interface SmtpSettingsData {
    id?: number;
    host: string;
    port: number;
    username: string;
    password: string;
    fromName: string;
    fromEmail: string;
    secure: boolean;
  }

  const { data: smtpData, isLoading: smtpLoading } = useQuery<SmtpSettingsData | null>({
    queryKey: ["/api/accounting/smtp-settings"],
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (smtpData) {
      setSmtpHost(smtpData.host || "");
      setSmtpPort(String(smtpData.port || 587));
      setSmtpUsername(smtpData.username || "");
      setSmtpFromName(smtpData.fromName || "");
      setSmtpFromEmail(smtpData.fromEmail || "");
      setSmtpSecure(smtpData.secure || false);
    }
  }, [smtpData]);

  const saveSmtpMutation = useMutation({
    mutationFn: async (data: { host: string; port: number; username: string; password: string; fromName: string; fromEmail: string; secure: boolean }) => {
      const res = await apiRequest("PUT", "/api/accounting/smtp-settings", data);
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/smtp-settings"] });
      setSmtpPassword("");
      toast({ title: "Email settings saved", description: "SMTP settings saved successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const testSmtpMutation = useMutation({
    mutationFn: async (testEmail: string) => {
      const res = await apiRequest("POST", "/api/accounting/smtp-settings/test", { testEmail });
      if (!res.ok) { const e = await res.json(); throw new Error(e.message); }
      return res.json();
    },
    onSuccess: (data: any) => toast({ title: "Test email sent", description: data.message }),
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const handleSmtpSave = () => {
    saveSmtpMutation.mutate({
      host: smtpHost,
      port: parseInt(smtpPort) || 587,
      username: smtpUsername,
      password: smtpPassword,
      fromName: smtpFromName,
      fromEmail: smtpFromEmail,
      secure: smtpSecure,
    });
  };
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
      setAboutStory(settings.aboutStory || "");
      setAboutVision(settings.aboutVision || "");
      setAboutMission(settings.aboutMission || "");
      setFoundedYear(settings.foundedYear || "");
      setAboutLocation(settings.aboutLocation || "");
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

  const updateFyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; startDate: string; endDate: string } }) => {
      const res = await apiRequest("PATCH", `/api/accounting/financial-years/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/financial-years"] });
      setFyOpen(false);
      setEditingFyId(null);
      setFyName("");
      setFyStart("");
      setFyEnd("");
      toast({ title: "Financial year updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const activateFyMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/accounting/financial-years/${id}/activate`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/financial-years"] });
      toast({ title: "Financial year activated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveLegalMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: { title: string; content: string; effectiveDate: string } }) => {
      const res = await apiRequest("PATCH", `/api/accounting/legal-pages/${slug}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/legal-pages"] });
      setLegalDialogOpen(false);
      setEditingLegal(null);
      toast({ title: "Legal page updated successfully" });
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

  const handleSaveAbout = () => {
    saveMutation.mutate({
      companyName: companyName || "Maanagarram Hi Tech Solutions",
      aboutStory,
      aboutVision,
      aboutMission,
      foundedYear,
      aboutLocation,
    });
  };

  const openLegalEditor = (page: LegalPageData) => {
    setEditingLegal(page);
    setLegalTitle(page.title);
    setLegalContent(page.content);
    setLegalEffectiveDate(page.effectiveDate || "");
    setLegalDialogOpen(true);
  };

  const handleSaveLegal = () => {
    if (!editingLegal) return;
    saveLegalMutation.mutate({
      slug: editingLegal.slug,
      data: { title: legalTitle, content: legalContent, effectiveDate: legalEffectiveDate },
    });
  };

  useEffect(() => {
    if (smtpData) {
      setSmtpHost(smtpData.host || "");
      setSmtpPort(String(smtpData.port || 465));
      setSmtpSecure(smtpData.secure ?? true);
      setSmtpUsername(smtpData.username || "");
      setSmtpFromName(smtpData.fromName || "");
      setSmtpFromEmail(smtpData.fromEmail || "");
    }
  }, [smtpData]);

  return (
    <AccountingLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">
          Settings
        </h1>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 cursor-pointer" onClick={() => toggleSection("company")}>
            <CardTitle>Company Information</CardTitle>
            {collapsed.has("company") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </CardHeader>
          {!collapsed.has("company") && <CardContent>
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
          </CardContent>}
        </Card>

        <Card>
          <CardHeader className="cursor-pointer" onClick={() => toggleSection("website")}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-500" />
                <CardTitle>Website & Contact Settings</CardTitle>
              </div>
              {collapsed.has("website") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
            <CardDescription>
              {isSuperAdmin
                ? "Manage the details shown on the public website. Changes appear immediately."
                : "These settings are read-only. Only Super Admin can edit website settings."}
            </CardDescription>
          </CardHeader>
          {!collapsed.has("website") && <CardContent>
            {settingsLoading ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-website-settings">
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
          </CardContent>}
        </Card>

        {isSuperAdmin && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection("about")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-sky-500" />
                  <CardTitle>About Page Content</CardTitle>
                </div>
                {collapsed.has("about") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
              <CardDescription>
                Manage the text displayed on the public About page. Changes appear immediately.
              </CardDescription>
            </CardHeader>
            {!collapsed.has("about") && <CardContent>
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8" data-testid="loading-about-settings">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                </div>
              ) : (
                <div className="space-y-4 max-w-2xl">
                  <div>
                    <Label>Company Story</Label>
                    <Textarea value={aboutStory} onChange={(e) => setAboutStory(e.target.value)} rows={4} placeholder="Our founding story and what we do..." data-testid="input-about-story" />
                  </div>
                  <div>
                    <Label>Location Description</Label>
                    <Textarea value={aboutLocation} onChange={(e) => setAboutLocation(e.target.value)} rows={3} placeholder="Where we are based and who we serve..." data-testid="input-about-location" />
                  </div>
                  <div>
                    <Label>Vision</Label>
                    <Textarea value={aboutVision} onChange={(e) => setAboutVision(e.target.value)} rows={3} placeholder="Our vision statement..." data-testid="input-about-vision" />
                  </div>
                  <div>
                    <Label>Mission</Label>
                    <Textarea value={aboutMission} onChange={(e) => setAboutMission(e.target.value)} rows={3} placeholder="Our mission statement..." data-testid="input-about-mission" />
                  </div>
                  <div className="max-w-xs">
                    <Label>Founded Year</Label>
                    <Input value={foundedYear} onChange={(e) => setFoundedYear(e.target.value)} placeholder="e.g., 2022" data-testid="input-founded-year" />
                  </div>
                  <Button onClick={handleSaveAbout} disabled={saveMutation.isPending} data-testid="button-save-about">
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save About Content
                  </Button>
                </div>
              )}
            </CardContent>}
          </Card>
        )}

        {isSuperAdmin && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection("legal")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-sky-500" />
                  <CardTitle>Legal Pages</CardTitle>
                </div>
                {collapsed.has("legal") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
              <CardDescription>
                Edit the Privacy Policy, Terms of Service, and Refund Policy displayed on the public website.
              </CardDescription>
            </CardHeader>
            {!collapsed.has("legal") && <CardContent className="p-0">
              {legalLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
                </div>
              ) : !legalPagesData || legalPagesData.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400" data-testid="text-no-legal-pages">
                  No legal pages found. They will be created automatically on next server restart.
                </div>
              ) : (
                <Table data-testid="table-legal-pages">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Page</TableHead>
                      <TableHead>Effective Date</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {legalPagesData.map((page) => (
                      <TableRow key={page.id} data-testid={`row-legal-${page.slug}`}>
                        <TableCell className="font-medium">{page.title}</TableCell>
                        <TableCell>{page.effectiveDate || "—"}</TableCell>
                        <TableCell>
                          {page.updatedAt
                            ? new Date(page.updatedAt).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openLegalEditor(page)} data-testid={`button-edit-legal-${page.slug}`}>
                            <Pencil className="w-4 h-4 mr-1" /> Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>}
          </Card>
        )}

        {isSuperAdmin && (
          <Card>
            <CardHeader className="cursor-pointer" onClick={() => toggleSection("smtp")}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-sky-500" />
                  <CardTitle>Email / SMTP Settings</CardTitle>
                </div>
                {collapsed.has("smtp") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
              <CardDescription>Configure outgoing email for password resets and welcome emails. Used with Hostinger Mail or any SMTP provider.</CardDescription>
            </CardHeader>
            {!collapsed.has("smtp") && <CardContent>
              <div className="space-y-4 max-w-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 sm:col-span-1">
                    <Label>SMTP Host</Label>
                    <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.hostinger.com" data-testid="input-smtp-host" />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label>Port</Label>
                    <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="465" data-testid="input-smtp-port" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={smtpSecure} onCheckedChange={setSmtpSecure} id="smtp-secure" data-testid="switch-smtp-secure" />
                  <Label htmlFor="smtp-secure" className="cursor-pointer">Use SSL/TLS (recommended for port 465)</Label>
                </div>
                <div>
                  <Label>Email Username (full email address)</Label>
                  <Input type="email" value={smtpUsername} onChange={(e) => setSmtpUsername(e.target.value)} placeholder="info@mhtsdigixr.com" data-testid="input-smtp-username" />
                </div>
                <div>
                  <Label>Email Password</Label>
                  <PasswordInput value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder={smtpData ? "Enter new password to update" : "Your email account password"} data-testid="input-smtp-password" />
                </div>
                <div>
                  <Label>Sender Name</Label>
                  <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="MHTSdigiXR" data-testid="input-smtp-from-name" />
                </div>
                <div>
                  <Label>Sender Email</Label>
                  <Input type="email" value={smtpFromEmail} onChange={(e) => setSmtpFromEmail(e.target.value)} placeholder="info@mhtsdigixr.com" data-testid="input-smtp-from-email" />
                </div>
                <Button
                  onClick={() => saveSmtpMutation.mutate({ host: smtpHost, port: smtpPort, secure: smtpSecure, username: smtpUsername, password: smtpPassword, fromName: smtpFromName, fromEmail: smtpFromEmail })}
                  disabled={saveSmtpMutation.isPending || !smtpHost || !smtpPort || !smtpUsername || !smtpPassword || !smtpFromName || !smtpFromEmail}
                  data-testid="button-save-smtp"
                >
                  {saveSmtpMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save Email Settings
                </Button>
                {smtpData && (
                  <div className="border-t pt-4 space-y-2">
                    <Label>Send Test Email</Label>
                    <div className="flex gap-2">
                      <Input type="email" value={smtpTestEmail} onChange={(e) => setSmtpTestEmail(e.target.value)} placeholder="your@email.com" className="flex-1" data-testid="input-smtp-test-email" />
                      <Button
                        variant="outline"
                        onClick={() => testSmtpMutation.mutate(smtpTestEmail)}
                        disabled={testSmtpMutation.isPending || !smtpTestEmail}
                        data-testid="button-test-smtp"
                      >
                        {testSmtpMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">Enter any email address and click Send to verify your SMTP configuration is working.</p>
                  </div>
                )}
              </div>
            </CardContent>}
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 cursor-pointer" onClick={() => toggleSection("financial")}>
            <CardTitle>Financial Years</CardTitle>
            <div className="flex items-center gap-2">
              {canManageSettings && (
                <Button onClick={(e) => { e.stopPropagation(); setEditingFyId(null); setFyName(""); setFyStart(""); setFyEnd(""); setFyOpen(true); }} data-testid="button-add-financial-year">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Year
                </Button>
              )}
              {collapsed.has("financial") ? <ChevronRight className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
            </div>
          </CardHeader>
          {!collapsed.has("financial") && <CardContent className="p-0">
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
                    {canManageSettings && <TableHead>Actions</TableHead>}
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
                      {canManageSettings && (
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon" variant="ghost"
                              onClick={() => { setEditingFyId(fy.id); setFyName(fy.name); setFyStart(fy.startDate); setFyEnd(fy.endDate); setFyOpen(true); }}
                              data-testid={`button-edit-fy-${fy.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            {!fy.isActive && (
                              <Button
                                size="sm" variant="ghost" className="text-green-700 dark:text-green-400 text-xs"
                                onClick={() => { if (confirm(`Activate ${fy.name}? This deactivates the currently active year.`)) activateFyMutation.mutate(fy.id); }}
                                disabled={activateFyMutation.isPending}
                                data-testid={`button-activate-fy-${fy.id}`}
                              >
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>}
        </Card>

        <Dialog open={legalDialogOpen} onOpenChange={setLegalDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-legal">
            <DialogHeader>
              <DialogTitle>Edit {editingLegal?.title || "Legal Page"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Page Title</Label>
                  <Input value={legalTitle} onChange={(e) => setLegalTitle(e.target.value)} data-testid="input-legal-title" />
                </div>
                <div>
                  <Label>Effective Date</Label>
                  <Input type="date" value={legalEffectiveDate} onChange={(e) => setLegalEffectiveDate(e.target.value)} data-testid="input-legal-effective-date" />
                </div>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={legalContent}
                  onChange={(e) => setLegalContent(e.target.value)}
                  rows={20}
                  className="font-mono text-sm"
                  placeholder="Full policy content..."
                  data-testid="input-legal-content"
                />
                <p className="text-xs text-slate-500 mt-1">Use plain text with blank lines between paragraphs. Numbered headings (e.g. "1. Section") will be formatted automatically.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLegalDialogOpen(false)} data-testid="button-cancel-legal">
                Cancel
              </Button>
              <Button
                onClick={handleSaveLegal}
                disabled={saveLegalMutation.isPending || !legalTitle || !legalContent}
                data-testid="button-save-legal"
              >
                {saveLegalMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={fyOpen} onOpenChange={setFyOpen}>
          <DialogContent data-testid="dialog-add-financial-year">
            <DialogHeader>
              <DialogTitle>{editingFyId ? "Edit Financial Year" : "Add Financial Year"}</DialogTitle>
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
                onClick={() => {
                  const data = { name: fyName, startDate: fyStart, endDate: fyEnd };
                  if (editingFyId) updateFyMutation.mutate({ id: editingFyId, data });
                  else createFyMutation.mutate(data);
                }}
                disabled={createFyMutation.isPending || updateFyMutation.isPending || !fyName || !fyStart || !fyEnd}
                data-testid="button-submit-fy"
              >
                {(createFyMutation.isPending || updateFyMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingFyId ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AccountingLayout>
  );
}
