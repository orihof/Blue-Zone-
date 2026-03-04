/// app/(app)/uploads/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES, COLS } from "@/lib/db/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Upload, FileText, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

interface UploadRow {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  parse_status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function monthsAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  return diff / (1000 * 60 * 60 * 24 * 30);
}

function ParseStatusBadge({ status }: { status: UploadRow["parse_status"] }) {
  if (status === "done")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-emerald-700 border-emerald-200">
        <CheckCircle2 className="w-2.5 h-2.5" /> Parsed
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-red-600 border-red-200">
        <AlertCircle className="w-2.5 h-2.5" /> Failed
      </Badge>
    );
  if (status === "processing")
    return (
      <Badge variant="outline" className="text-[10px] gap-1 text-blue-600 border-blue-200">
        <Clock className="w-2.5 h-2.5" /> Processing
      </Badge>
    );
  return (
    <Badge variant="outline" className="text-[10px] gap-1 text-slate-500">
      <Clock className="w-2.5 h-2.5" /> Pending
    </Badge>
  );
}

export default async function UploadsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/signin");

  const supabase = getAdminClient();
  const { data: uploads } = await supabase
    .from(TABLES.UPLOADS)
    .select(`${COLS.ID},${COLS.FILE_NAME},${COLS.FILE_SIZE},${COLS.MIME_TYPE},${COLS.PARSE_STATUS},${COLS.CREATED_AT}`)
    .eq(COLS.USER_ID, session.user.id)
    .order(COLS.CREATED_AT, { ascending: false });

  const rows = (uploads ?? []) as UploadRow[];
  const staleUploads = rows.filter((u) => monthsAgo(u.created_at) >= 12);
  const hasStale = staleUploads.length > 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Uploads</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {rows.length} file{rows.length !== 1 ? "s" : ""} uploaded
          </p>
        </div>
        <Link href="/app/onboarding/upload">
          <Button size="sm" className="gap-1.5">
            <Upload className="w-3.5 h-3.5" /> Add files
          </Button>
        </Link>
      </div>

      {/* Data freshness warning */}
      {hasStale && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-800">Some uploads are over 12 months old</p>
            <p className="text-amber-700 text-xs mt-0.5">
              {staleUploads.length} file{staleUploads.length !== 1 ? "s are" : " is"} older than one year. Consider uploading fresh data for a more accurate protocol.
            </p>
          </div>
        </div>
      )}

      {rows.length === 0 && (
        <Card className="border-2 border-dashed border-primary/30 bg-primary/5">
          <CardContent className="py-10 text-center space-y-3">
            <Upload className="w-10 h-10 text-primary mx-auto" />
            <p className="font-semibold text-slate-800">No uploads yet</p>
            <p className="text-sm text-muted-foreground">
              Upload blood tests, Apple Health exports, or Whoop data.
            </p>
            <Link href="/app/onboarding/upload">
              <Button size="sm" className="gap-1.5 mt-1">
                <Upload className="w-3.5 h-3.5" /> Upload files
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((upload) => {
            const isStale = monthsAgo(upload.created_at) >= 12;
            return (
              <Card key={upload.id} className={`border ${isStale ? "border-amber-200 bg-amber-50/30" : "border-slate-200"}`}>
                <CardContent className="pt-3 pb-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-800 truncate max-w-[200px]">
                          {upload.file_name}
                        </span>
                        <ParseStatusBadge status={upload.parse_status} />
                        {isStale && (
                          <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200">
                            Stale
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatBytes(upload.file_size)} ·{" "}
                        {new Date(upload.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        {isStale && (
                          <span className="text-amber-600 ml-1">
                            ({Math.floor(monthsAgo(upload.created_at))} months ago)
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {upload.parse_status === "failed" && (
                        <Link href="/app/onboarding/upload">
                          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 text-red-600 hover:text-red-700">
                            Retry
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {rows.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          <p className="font-medium text-slate-700 mb-1">About your data</p>
          <p className="text-xs">
            Your health files are stored securely and used only to personalise your longevity protocol. You can delete your account and all data at any time from{" "}
            <Link href="/app/settings" className="text-primary underline underline-offset-2">
              Settings
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
