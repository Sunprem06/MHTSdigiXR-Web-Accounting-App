import { useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Attachment, AttachmentEntityType, Permission } from "@shared/schema";
import { Paperclip, Download, Trash2, Upload, Loader2, FileText } from "lucide-react";

const ACCEPTED_EXTENSIONS = ".doc,.docx,.xls,.xlsx,.pdf,.csv,.png,.jpg,.jpeg";
const MAX_FILE_SIZE_MB = 10;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface AttachmentsPanelProps {
  entityType: AttachmentEntityType;
  entityId: number;
  uploadPermission: Permission;
  managePermission: Permission;
}

export function AttachmentsPanel({ entityType, entityId, uploadPermission, managePermission }: AttachmentsPanelProps) {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const listUrl = `/api/accounting/attachments/${entityType}/${entityId}`;
  const { data: attachmentList, isLoading } = useQuery<Attachment[]>({
    queryKey: [listUrl],
  });

  const canUpload = hasPermission(uploadPermission);

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/accounting/attachments/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.message || "Failed to delete attachment");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      toast({ title: "Attachment deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error deleting attachment", description: err.message, variant: "destructive" });
    },
  });

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Max size is ${MAX_FILE_SIZE_MB} MB`, variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/accounting/attachments/${entityType}/${entityId}`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: [listUrl] });
      toast({ title: "File uploaded" });
    } catch (err: any) {
      toast({ title: "Error uploading file", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="border-slate-200 dark:border-slate-700 print:hidden" data-testid="panel-attachments">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-4 h-4" /> Attachments
        </CardTitle>
        {canUpload && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="hidden"
              onChange={handleFileSelected}
              data-testid="input-attachment-file"
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="button-upload-attachment">
              {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Upload
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-sky-500" />
          </div>
        ) : !attachmentList?.length ? (
          <p className="text-sm text-slate-400 dark:text-slate-500" data-testid="text-no-attachments">No attachments yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {attachmentList.map((a) => {
              const canDelete = hasPermission(managePermission) || a.uploadedBy === user?.id;
              return (
                <li key={a.id} className="flex items-center justify-between py-2 gap-3" data-testid={`row-attachment-${a.id}`}>
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-900 dark:text-white truncate" data-testid={`text-attachment-name-${a.id}`}>
                        {a.originalFileName}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {formatFileSize(a.fileSizeBytes)} · {new Date(a.createdAt).toLocaleDateString("en-IN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" asChild data-testid={`button-download-attachment-${a.id}`}>
                      <a href={`/api/accounting/attachments/file/${a.id}/download`} target="_blank" rel="noreferrer">
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-red-500 dark:text-red-400"
                        onClick={() => {
                          if (confirm(`Delete "${a.originalFileName}"?`)) deleteMutation.mutate(a.id);
                        }}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-attachment-${a.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
