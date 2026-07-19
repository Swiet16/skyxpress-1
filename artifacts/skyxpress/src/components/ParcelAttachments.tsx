// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Paperclip,
  Upload,
  Download,
  Eye,
  Trash2,
  FileText,
  FileImage,
  FileSpreadsheet,
  Loader2,
  X,
} from "lucide-react";

const BUCKET = "parcel-attachments";

interface ParcelAttachment {
  id: string;
  parcel_id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface ParcelAttachmentsDialogProps {
  parcel: { id: string; tracking_id: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formatFileSize = (bytes: number | null) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (fileType: string | null) => !!fileType && fileType.startsWith("image/");
const isPdf = (fileType: string | null) => fileType === "application/pdf";
const isSpreadsheet = (fileType: string | null) =>
  !!fileType &&
  (fileType.includes("spreadsheet") || fileType.includes("excel") || fileType === "text/csv");

const FileTypeIcon = ({ fileType }: { fileType: string | null }) => {
  if (isSpreadsheet(fileType)) return <FileSpreadsheet className="h-5 w-5 text-emerald-600" />;
  if (isPdf(fileType)) return <FileText className="h-5 w-5 text-red-600" />;
  if (isImage(fileType)) return <FileImage className="h-5 w-5 text-blue-600" />;
  return <FileText className="h-5 w-5 text-muted-foreground" />;
};

export const ParcelAttachmentsDialog = ({ parcel, open, onOpenChange }: ParcelAttachmentsDialogProps) => {
  const [attachments, setAttachments] = useState<ParcelAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewAttachment, setPreviewAttachment] = useState<ParcelAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && parcel) {
      fetchAttachments(parcel.id);
    } else {
      setAttachments([]);
    }
  }, [open, parcel?.id]);

  const fetchAttachments = async (parcelId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parcel_attachments")
        .select("*")
        .eq("parcel_id", parcelId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      console.error("Error fetching attachments:", error);
      toast({
        title: "Error",
        description: "Failed to load attachments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPublicUrl = (path: string) =>
    supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !parcel) return;

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (const file of Array.from(files)) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${parcel.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { error: insertError } = await supabase.from("parcel_attachments").insert({
          parcel_id: parcel.id,
          file_name: file.name,
          file_path: path,
          file_type: file.type || null,
          file_size: file.size,
        });

        if (insertError) throw insertError;
        successCount++;
      } catch (error: any) {
        console.error("Error uploading file:", file.name, error);
        failCount++;
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (successCount > 0) {
      toast({
        title: "Uploaded",
        description: `${successCount} file${successCount === 1 ? "" : "s"} added${
          failCount ? `, ${failCount} failed` : ""
        }`,
        variant: failCount ? "destructive" : undefined,
      });
      fetchAttachments(parcel.id);
    } else if (failCount > 0) {
      toast({
        title: "Upload failed",
        description: "None of the selected files could be uploaded",
        variant: "destructive",
      });
    }
  };

  const handleAttachmentClick = (attachment: ParcelAttachment) => {
    if (isImage(attachment.file_type)) {
      setPreviewAttachment(attachment);
    } else {
      // Open in a new tab; browser will preview PDFs inline or trigger a download
      window.open(getPublicUrl(attachment.file_path), "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = (attachment: ParcelAttachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const link = document.createElement("a");
    link.href = getPublicUrl(attachment.file_path);
    link.download = attachment.file_name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (attachment: ParcelAttachment, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!window.confirm(`Delete "${attachment.file_name}"? This can't be undone.`)) return;

    setDeletingId(attachment.id);
    try {
      const { error: storageError } = await supabase.storage
        .from(BUCKET)
        .remove([attachment.file_path]);
      if (storageError) throw storageError;

      const { error: dbError } = await supabase
        .from("parcel_attachments")
        .delete()
        .eq("id", attachment.id);
      if (dbError) throw dbError;

      setAttachments((prev) => prev.filter((a) => a.id !== attachment.id));
      toast({ title: "Deleted", description: `${attachment.file_name} removed` });
    } catch (error: any) {
      console.error("Error deleting attachment:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete attachment",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-5 w-5" />
              Attachments {parcel ? `— ${parcel.tracking_id}` : ""}
            </DialogTitle>
            <DialogDescription>
              Upload photos, receipts, or documents for this parcel. Images preview in a popup;
              other files open or download when clicked.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full border-dashed"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !parcel}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Click to upload files (images, PDFs, docs...)
                  </>
                )}
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading attachments...
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No attachments yet
              </div>
            ) : (
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-2 rounded-lg border hover:bg-accent cursor-pointer group"
                    onClick={() => handleAttachmentClick(attachment)}
                  >
                    {isImage(attachment.file_type) ? (
                      <img
                        src={getPublicUrl(attachment.file_path)}
                        alt={attachment.file_name}
                        className="h-10 w-10 rounded object-cover shrink-0 border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileTypeIcon fileType={attachment.file_type} />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{attachment.file_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatFileSize(attachment.file_size)}
                        {attachment.file_size ? " • " : ""}
                        {new Date(attachment.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {isImage(attachment.file_type) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewAttachment(attachment);
                          }}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDownload(attachment, e)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDelete(attachment, e)}
                        disabled={deletingId === attachment.id}
                        title="Delete"
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-red-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview popup */}
      <Dialog open={!!previewAttachment} onOpenChange={(o) => !o && setPreviewAttachment(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 pr-6">
              <span className="truncate">{previewAttachment?.file_name}</span>
            </DialogTitle>
          </DialogHeader>
          {previewAttachment && (
            <div className="space-y-3">
              <img
                src={getPublicUrl(previewAttachment.file_path)}
                alt={previewAttachment.file_name}
                className="w-full max-h-[70vh] object-contain rounded-md border bg-muted"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewAttachment(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Close
                </Button>
                <Button size="sm" onClick={() => handleDownload(previewAttachment)}>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
