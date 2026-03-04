/// components/upload/DropzoneUploader.tsx
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type FileStatus = "pending" | "signing" | "uploading" | "done" | "error";

interface UploadFile {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

const ACCEPT: Record<string, string[]> = {
  "application/pdf": [".pdf"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "text/csv": [".csv"],
  "text/xml": [".xml"],
  "application/xml": [".xml"],
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`)));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.send(file);
  });
}

export function DropzoneUploader() {
  const router = useRouter();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFile = (id: string, patch: Partial<UploadFile>) =>
    setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));

  const onDrop = useCallback((accepted: File[], rejected: { file: File }[]) => {
    if (rejected.length > 0) {
      toast.error(`${rejected.length} file(s) rejected. Check size (max 15 MB) and type.`);
    }
    const next = accepted.slice(0, 10 - files.length).map((file) => ({
      id: Math.random().toString(36).slice(2),
      file,
      status: "pending" as FileStatus,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...next].slice(0, 10));
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPT,
    maxSize: 15 * 1024 * 1024,
    maxFiles: 10,
    disabled: files.length >= 10,
  });

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id));

  async function handleUpload() {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;
    setIsSubmitting(true);

    try {
      pending.forEach((f) => updateFile(f.id, { status: "signing" }));
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: pending.map((f) => ({ name: f.file.name, size: f.file.size, type: f.file.type })),
        }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload URLs");
      const { files: signed } = await signRes.json();

      await Promise.all(
        pending.map(async (f, i) => {
          updateFile(f.id, { status: "uploading", progress: 0 });
          try {
            await uploadWithProgress(signed[i].signedUrl, f.file, (pct) =>
              updateFile(f.id, { progress: pct })
            );
            updateFile(f.id, { status: "done", progress: 100 });
          } catch (err) {
            updateFile(f.id, { status: "error", error: (err as Error).message });
          }
        })
      );

      const commitRes = await fetch("/api/uploads/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: pending.map((f, i) => ({
            fileName: f.file.name,
            fileSize: f.file.size,
            mimeType: f.file.type,
            storagePath: signed[i].storagePath,
          })),
        }),
      });
      if (!commitRes.ok) {
        const err = await commitRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save upload metadata");
      }

      const errCount = files.filter((f) => f.status === "error").length;
      if (errCount > 0) {
        toast.warning(`${pending.length - errCount} file(s) uploaded. ${errCount} failed.`);
      } else {
        toast.success("Files uploaded successfully!");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDemoData() {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/protocols/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          selectedAge: 35,
          goals: ["energy", "sleep", "longevity"],
          budget: "medium",
          preferences: {},
          isDemo: true,
        }),
      });
      if (!res.ok) throw new Error("Failed to create demo protocol");
      const { protocolId } = await res.json();
      router.push(`/app/results/${protocolId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load demo data");
    } finally {
      setIsSubmitting(false);
    }
  }

  const hasPending = files.some((f) => f.status === "pending");
  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const canContinue = files.length > 0;

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className="rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all"
        style={{
          borderColor: isDragActive ? "var(--bz-blue)" : "rgba(0,138,255,0.25)",
          background: isDragActive ? "rgba(0,138,255,0.06)" : "var(--bz-navy)",
        }}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center transition-colors"
            style={{
              background: isDragActive ? "rgba(0,138,255,0.18)" : "rgba(0,138,255,0.08)",
            }}
          >
            <Upload
              className="w-6 h-6"
              style={{ color: isDragActive ? "var(--bz-blue)" : "var(--bz-muted)" }}
            />
          </div>
          <div>
            <p className="font-medium text-sm" style={{ color: "var(--bz-white)" }}>
              {isDragActive ? "Drop your files here" : "Drag & drop health files here"}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--bz-muted)" }}>
              PDF, JPG, PNG, CSV, XML · up to 15 MB each · max 10 files
            </p>
          </div>
          <button
            type="button"
            disabled={files.length >= 10}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40"
            style={{
              borderColor: "var(--bz-border)",
              color: "var(--bz-muted)",
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--bz-blue)";
              e.currentTarget.style.color = "var(--bz-blue)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--bz-border)";
              e.currentTarget.style.color = "var(--bz-muted)";
            }}
          >
            Browse files
          </button>
        </div>
      </div>

      {/* File list */}
      <AnimatePresence initial={false}>
        {files.map((f) => (
          <motion.div
            key={f.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3"
            style={{
              background: "var(--bz-navy)",
              border: "1px solid var(--bz-border)",
            }}
          >
            <FileText className="w-4 h-4 flex-shrink-0" style={{ color: "var(--bz-muted)" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium truncate" style={{ color: "var(--bz-white)" }}>
                  {f.file.name}
                </span>
                <span className="text-xs flex-shrink-0" style={{ color: "var(--bz-muted)" }}>
                  {formatBytes(f.file.size)}
                </span>
              </div>
              {f.status === "uploading" && (
                <div
                  className="mt-1.5 h-1 rounded-full overflow-hidden"
                  style={{ background: "var(--bz-navy-light)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "var(--bz-blue)" }}
                    animate={{ width: `${f.progress}%` }}
                    transition={{ duration: 0.2 }}
                  />
                </div>
              )}
              {f.error && (
                <p className="text-xs mt-1" style={{ color: "var(--bz-critical)" }}>
                  {f.error}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              {(f.status === "signing" || f.status === "uploading") && (
                <Loader2
                  className="w-4 h-4 animate-spin"
                  style={{ color: f.status === "uploading" ? "var(--bz-blue)" : "var(--bz-muted)" }}
                />
              )}
              {f.status === "done" && (
                <CheckCircle2 className="w-4 h-4" style={{ color: "var(--bz-optimal)" }} />
              )}
              {f.status === "error" && (
                <AlertCircle className="w-4 h-4" style={{ color: "var(--bz-critical)" }} />
              )}
              {f.status === "pending" && (
                <button
                  onClick={() => removeFile(f.id)}
                  className="p-0.5 rounded transition-colors"
                  style={{ color: "var(--bz-muted)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bz-critical)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--bz-muted)")}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {hasPending && (
          <Button onClick={handleUpload} disabled={isSubmitting} className="gap-2 flex-1">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Upload {files.filter((f) => f.status === "pending").length} file(s)
          </Button>
        )}
        {(allDone || canContinue) && (
          <Button
            onClick={() => router.push("/app/onboarding/dial")}
            disabled={isSubmitting}
            className="gap-2 flex-1"
            variant={hasPending ? "outline" : "default"}
          >
            Continue <ArrowRight className="w-4 h-4" />
          </Button>
        )}
        {files.length === 0 && (
          <Button
            variant="outline"
            onClick={handleDemoData}
            disabled={isSubmitting}
            className="gap-2 w-full"
          >
            <Sparkles className="w-4 h-4" />
            {isSubmitting ? "Loading demo…" : "Use demo data"}
          </Button>
        )}
      </div>

      {files.length > 0 && (
        <button
          onClick={handleDemoData}
          disabled={isSubmitting}
          className="w-full text-xs text-center underline underline-offset-2 transition-colors"
          style={{ color: "var(--bz-muted)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--bz-white)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--bz-muted)")}
        >
          Or skip upload and use demo data
        </button>
      )}
    </div>
  );
}
