/// components/settings/SettingsActions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Download, Trash2, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";

export function SettingsActions() {
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bluezone-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Export downloaded");
    } catch {
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Account deleted. Signing out…");
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Could not delete account. Please try again.");
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Export */}
      <Card className="border border-slate-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Download className="w-4 h-4 text-primary" /> Export your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Download all your data — uploads, protocols, bookmarks, and check-in responses — as a JSON file.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={handleExport}
            disabled={exporting}
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Download my data"}
          </Button>
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border border-red-200 bg-red-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-red-700">
            <Trash2 className="w-4 h-4" /> Delete account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Permanently delete your account and all associated data. This action cannot be undone.
          </p>

          {!deleteConfirm ? (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete my account
            </Button>
          ) : (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700 font-medium">
                  Are you sure? This will permanently delete all your data and cannot be undone.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5 text-xs h-8"
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                >
                  <Trash2 className="w-3 h-3" />
                  {deleting ? "Deleting…" : "Yes, delete everything"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-8"
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
