import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AccountingLayout } from "@/components/accounting/AccountingLayout";
import { Mail, MailOpen, Trash2, Eye, ArrowLeft, Clock, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import type { ContactMessage } from "@shared/schema";

export default function ContactInbox() {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission("contacts.manage");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [readFilter, setReadFilter] = useState<string>("all");

  const { data: messages = [], isLoading } = useQuery<ContactMessage[]>({
    queryKey: ["/api/accounting/contact-messages"],
  });

  const filteredMessages = useMemo(() => {
    let filtered = messages;
    if (dateFrom) {
      const from = new Date(dateFrom);
      filtered = filtered.filter(m => m.createdAt && new Date(m.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(m => m.createdAt && new Date(m.createdAt) <= to);
    }
    if (readFilter === "unread") {
      filtered = filtered.filter(m => !m.isRead);
    } else if (readFilter === "read") {
      filtered = filtered.filter(m => m.isRead);
    }
    return filtered;
  }, [messages, dateFrom, dateTo, readFilter]);

  const markReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: number; isRead: boolean }) => {
      await apiRequest("PATCH", `/api/accounting/contact-messages/${id}`, { isRead });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/contact-messages"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/accounting/contact-messages/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/accounting/contact-messages"] });
      setSelectedMessage(null);
      toast({ title: "Message deleted" });
    },
  });

  const handleView = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    if (!msg.isRead && canManage) {
      markReadMutation.mutate({ id: msg.id, isRead: true });
    }
  };

  const unreadCount = messages.filter(m => !m.isRead).length;
  const hasFilters = dateFrom || dateTo || readFilter !== "all";

  if (selectedMessage) {
    return (
      <AccountingLayout>
        <div className="max-w-3xl">
          <Button variant="ghost" onClick={() => setSelectedMessage(null)} className="mb-4 gap-2" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" /> Back to Inbox
          </Button>
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white" data-testid="text-message-name">{selectedMessage.name}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{selectedMessage.email}</p>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      markReadMutation.mutate({ id: selectedMessage.id, isRead: !selectedMessage.isRead });
                      setSelectedMessage({ ...selectedMessage, isRead: !selectedMessage.isRead });
                    }}
                    data-testid="button-toggle-read"
                  >
                    {selectedMessage.isRead ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(selectedMessage.id)}
                    data-testid="button-delete-message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mb-6">
              <Clock className="w-3 h-3" />
              {new Date(selectedMessage.createdAt!).toLocaleString()}
            </div>
            {selectedMessage.phone && (
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Phone: {selectedMessage.phone}</p>
            )}
            <div className="prose dark:prose-invert max-w-none">
              <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap" data-testid="text-message-content">{selectedMessage.message}</p>
            </div>
          </div>
        </div>
      </AccountingLayout>
    );
  }

  return (
    <AccountingLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white" data-testid="text-page-title">Contact Inbox</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{unreadCount} unread message{unreadCount !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-4 mb-6 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 font-medium">
          <Filter className="w-4 h-4" /> Filters
        </div>
        <div>
          <Label className="text-xs">From Date</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-40" data-testid="input-date-from" />
        </div>
        <div>
          <Label className="text-xs">To Date</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-40" data-testid="input-date-to" />
        </div>
        <div>
          <Label className="text-xs">Status</Label>
          <Select value={readFilter} onValueChange={setReadFilter}>
            <SelectTrigger className="w-32" data-testid="select-read-filter"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="unread">Unread</SelectItem>
              <SelectItem value="read">Read</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setDateFrom(""); setDateTo(""); setReadFilter("all"); }} data-testid="button-clear-filters">
            Clear
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-slate-500">Loading...</div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-12 text-slate-500">{hasFilters ? "No messages match your filters" : "No messages yet"}</div>
      ) : (
        <div className="space-y-2">
          {filteredMessages.map(msg => (
            <div
              key={msg.id}
              onClick={() => handleView(msg)}
              className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                msg.isRead
                  ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700"
                  : "bg-sky-50 dark:bg-sky-900/10 border-sky-200 dark:border-sky-800"
              } hover:bg-slate-50 dark:hover:bg-slate-800`}
              data-testid={`row-message-${msg.id}`}
            >
              <div className="flex-shrink-0">
                {msg.isRead ? (
                  <MailOpen className="w-5 h-5 text-slate-400" />
                ) : (
                  <Mail className="w-5 h-5 text-sky-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-medium text-sm ${msg.isRead ? "text-slate-600 dark:text-slate-300" : "text-slate-900 dark:text-white font-semibold"}`}>
                    {msg.name}
                  </span>
                  {!msg.isRead && <Badge className="bg-sky-500 text-white text-[10px] px-1.5">New</Badge>}
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{msg.message}</p>
              </div>
              <div className="flex-shrink-0 text-xs text-slate-400">
                {new Date(msg.createdAt!).toLocaleDateString()}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleView(msg); }} data-testid={`button-view-${msg.id}`}>
                  <Eye className="w-4 h-4" />
                </Button>
                {canManage && (
                  <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(msg.id); }} data-testid={`button-delete-${msg.id}`}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </AccountingLayout>
  );
}
