/// app/(app)/onboarding/upload/page.tsx
import { StepProgress } from "@/components/common/StepProgress";
import { DropzoneUploader } from "@/components/upload/DropzoneUploader";
import { Disclaimer } from "@/components/common/Disclaimer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Smartphone } from "lucide-react";

export default function UploadPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-10 space-y-8">
      <StepProgress step={1} />

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">Upload your health data</h1>
        <p className="text-muted-foreground text-sm">
          Blood tests, Apple Health exports, or wearable data — we extract every biomarker automatically.
        </p>
      </div>

      <DropzoneUploader />

      {/* Connect sources */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Connect sources</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {/* Apple Health */}
          <Card className="border border-slate-200">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">Apple Health</CardTitle>
                  <CardDescription className="text-xs">Export XML from Health app</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Open Health app → Profile → Export All Health Data → share the zip here.
              </p>
              <Badge variant="secondary" className="text-xs">Upload via dropzone above</Badge>
            </CardContent>
          </Card>

          {/* WHOOP */}
          <Card className="border border-slate-200 opacity-60">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Activity className="w-4 h-4 text-slate-500" />
                </div>
                <div>
                  <CardTitle className="text-sm">WHOOP</CardTitle>
                  <CardDescription className="text-xs">OAuth integration</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground mb-3">
                Sync recovery, strain, and sleep data directly from your WHOOP account.
              </p>
              <Badge variant="outline" className="text-xs text-muted-foreground">Coming soon</Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      <Disclaimer />
    </div>
  );
}
