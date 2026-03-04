"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";


type UploadSource = "blood_test" | "apple_health";

interface FileUploadProps {
  onUploadComplete: (snapshotId: string) => void;
}

type UploadState = "idle" | "uploading" | "analyzing" | "done" | "error";

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const [source, setSource] = useState<UploadSource>("blood_test");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [consent, setConsent] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      if (!consent) {
        setErrorMessage("Please accept the data processing consent before uploading.");
        return;
      }

      setUploadState("uploading");
      setErrorMessage("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("source", source);
        formData.append("consent", "true");

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadJson.error ?? "Upload failed");
        }

        const { snapshot_id } = uploadJson.data;

        // Trigger AI analysis
        setUploadState("analyzing");

        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ snapshot_id }),
        });

        const analyzeJson = await analyzeRes.json();
        if (!analyzeRes.ok) {
          throw new Error(analyzeJson.error ?? "Analysis failed");
        }

        setUploadState("done");
        onUploadComplete(snapshot_id);
      } catch (err) {
        setUploadState("error");
        setErrorMessage(err instanceof Error ? err.message : "Something went wrong");
      }
    },
    [source, consent, onUploadComplete]
  );

  const acceptConfig: Record<string, string[]> =
    source === "apple_health"
      ? { "text/xml": [".xml"], "application/xml": [".xml"] }
      : {
          "application/pdf": [".pdf"],
          "image/jpeg": [".jpg", ".jpeg"],
          "image/png": [".png"],
        };

  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    onDrop,
    accept: acceptConfig,
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled: uploadState === "uploading" || uploadState === "analyzing",
  });

  return (
    <div className="space-y-4">
      {/* Source selector */}
      <div className="flex gap-2">
        {(["blood_test", "apple_health"] as UploadSource[]).map((s) => (
          <button
            key={s}
            onClick={() => setSource(s)}
            className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
              source === s
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
            }`}
          >
            {s === "blood_test" ? "Blood Test (PDF/Image)" : "Apple Health (.xml)"}
          </button>
        ))}
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-gray-200 hover:border-gray-300 bg-gray-50"
        } ${
          uploadState === "uploading" || uploadState === "analyzing"
            ? "opacity-60 cursor-not-allowed"
            : ""
        }`}
      >
        <input {...getInputProps()} />

        {uploadState === "idle" || uploadState === "error" ? (
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              {acceptedFiles[0] ? (
                <FileText className="w-6 h-6 text-primary" />
              ) : (
                <Upload className="w-6 h-6 text-primary" />
              )}
            </div>
            {acceptedFiles[0] ? (
              <p className="text-sm font-medium text-gray-900">
                {acceptedFiles[0].name}
              </p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900">
                  {isDragActive ? "Drop your file here" : "Drag & drop or click to browse"}
                </p>
                <p className="text-xs text-gray-500">
                  {source === "blood_test"
                    ? "PDF, JPG, or PNG up to 20MB"
                    : "Apple Health export.xml up to 20MB"}
                </p>
              </>
            )}
          </div>
        ) : uploadState === "uploading" ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-gray-600">Uploading and parsing…</p>
          </div>
        ) : uploadState === "analyzing" ? (
          <div className="space-y-2">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-sm text-gray-600">AI is analyzing your health data…</p>
            <p className="text-xs text-gray-400">This can take up to 30 seconds</p>
          </div>
        ) : (
          <div className="space-y-2">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-green-700">Analysis complete!</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {uploadState === "error" && errorMessage && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* Consent checkbox — required by Israeli Privacy Law */}
      <label className="flex items-start gap-2.5 cursor-pointer group">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-primary"
        />
        <span className="text-xs text-gray-600 leading-relaxed">
          I consent to Blue Zone processing my health data to generate personalized insights.
          My data is stored securely and will not be sold or shared with third parties.
          See our{" "}
          <a href="/privacy" className="underline text-primary">
            Privacy Policy
          </a>
          .
        </span>
      </label>

      {uploadState === "done" && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setUploadState("idle")}
          className="w-full"
        >
          Upload another file
        </Button>
      )}
    </div>
  );
}
