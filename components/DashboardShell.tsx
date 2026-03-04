"use client";

import { useState, useCallback } from "react";
import { FileUpload } from "@/components/FileUpload";
import { BiomarkerCard } from "@/components/BiomarkerCard";
import { ClinicCard } from "@/components/ClinicCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  Zap,
  ShoppingBag,
  MapPin,
  Upload,
  Watch,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import type { HealthSnapshot, Biomarker, Recommendation, NearbyClinic } from "@/types";

interface DashboardShellProps {
  user: { name?: string | null; email?: string | null };
  latestSnapshot: HealthSnapshot | undefined;
  allSnapshots: HealthSnapshot[];
  biomarkers: Biomarker[];
  recommendations: Recommendation[];
}

export function DashboardShell({
  user,
  latestSnapshot,
  allSnapshots,
  biomarkers: initialBiomarkers,
  recommendations: initialRecs,
}: DashboardShellProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "upload" | "clinics"
  >("overview");
  const [biomarkers, setBiomarkers] = useState(initialBiomarkers);
  const [recommendations, setRecommendations] = useState(initialRecs);
  const [summary, setSummary] = useState(latestSnapshot?.ai_summary ?? "");
  const [clinics, setClinics] = useState<NearbyClinic[]>([]);
  const [clinicsLoading, setClinicsLoading] = useState(false);
  const [whoopConnecting, setWhoopConnecting] = useState(false);

  const productRecs = recommendations.filter((r) => r.type === "product");
  const clinicRecs = recommendations.filter(
    (r) => r.type === "clinic" && r.source === "google_places"
  );

  const handleUploadComplete = useCallback(async (snapshotId: string) => {
    // Re-fetch the analysis results from the API
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshot_id: snapshotId }),
    });
    const json = await res.json();
    if (json.data) {
      setBiomarkers(json.data.biomarkers ?? []);
      setRecommendations(json.data.recommendations ?? []);
      setSummary(json.data.summary ?? "");
      setActiveTab("overview");
    }
  }, []);

  const handleFindClinics = useCallback(async () => {
    if (!clinicRecs.length) return;

    setClinicsLoading(true);

    // Get user geolocation
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
        });
      });

      const clinicTypes = Array.from(new Set(clinicRecs.map((r) => r.title)));

      const res = await fetch("/api/clinics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          clinic_types: clinicTypes,
        }),
      });

      const json = await res.json();
      if (json.data?.clinics) {
        setClinics(json.data.clinics);
        setActiveTab("clinics");
      }
    } catch (err) {
      console.error("Geolocation or clinics error:", err);
      alert("Unable to get your location. Please enable location access and try again.");
    } finally {
      setClinicsLoading(false);
    }
  }, [clinicRecs]);

  const handleConnectWhoop = useCallback(async () => {
    setWhoopConnecting(true);
    const res = await fetch("/api/whoop/callback", { method: "POST" });
    const json = await res.json();
    if (json.redirect_url) {
      window.location.href = json.redirect_url;
    } else {
      setWhoopConnecting(false);
    }
  }, []);

  const hasData = biomarkers.length > 0 || !!summary;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user.name ? `Hello, ${user.name.split(" ")[0]}` : "Your Dashboard"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {latestSnapshot
              ? `Last updated ${format(new Date(latestSnapshot.created_at), "MMM d, yyyy")}`
              : "Upload your first health file to get started"}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnectWhoop}
            disabled={whoopConnecting}
            className="gap-1.5"
          >
            <Watch className="w-4 h-4" />
            {whoopConnecting ? "Connecting…" : "Connect WHOOP"}
          </Button>
          <Button
            size="sm"
            onClick={() => setActiveTab("upload")}
            className="gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Upload Data
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { key: "overview", label: "Overview", icon: Activity },
          { key: "upload", label: "Upload", icon: Upload },
          { key: "clinics", label: "Find Clinics", icon: MapPin },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as typeof activeTab)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload Health Data</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </CardContent>
        </Card>
      )}

      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Empty state */}
          {!hasData && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Activity className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    No health data yet
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Upload a blood test PDF, Apple Health export, or connect
                    WHOOP to see your personalized insights.
                  </p>
                </div>
                <Button onClick={() => setActiveTab("upload")} className="gap-2">
                  <Upload className="w-4 h-4" />
                  Upload your first file
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Summary */}
          {summary && (
            <Card className="bg-gradient-to-br from-sky-50 to-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  AI Health Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 leading-relaxed">{summary}</p>
                <p className="text-xs text-gray-400 mt-3 border-t border-blue-200 pt-3">
                  This summary is for informational purposes only. It does not
                  constitute medical advice. Always consult a qualified physician
                  before making health decisions.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Biomarkers Grid */}
          {biomarkers.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Biomarkers
                  <Badge variant="secondary" className="ml-1">
                    {biomarkers.length}
                  </Badge>
                </h2>
                <div className="flex gap-2 text-xs text-gray-400">
                  {(["normal", "low", "high", "critical"] as const).map((s) => {
                    const count = biomarkers.filter((b) => b.status === s).length;
                    if (!count) return null;
                    return (
                      <span key={s}>
                        {count} {s}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {biomarkers.map((b) => (
                  <BiomarkerCard key={b.id} biomarker={b} />
                ))}
              </div>
            </section>
          )}

          {/* Product Recommendations */}
          {productRecs.length > 0 && (
            <section>
              <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <ShoppingBag className="w-4 h-4 text-primary" />
                Product Recommendations
                <Badge variant="secondary" className="ml-1">
                  {productRecs.length}
                </Badge>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {productRecs.map((r) => (
                  <div key={r.id} className="rounded-lg border border-slate-200 p-4 space-y-1">
                    <p className="text-sm font-medium text-slate-900">{r.title}</p>
                    {r.description && <p className="text-xs text-slate-500">{r.description}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Suggested clinic types */}
          {clinicRecs.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4 pb-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-sm text-gray-900">
                    Recommended clinic types based on your data
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {clinicRecs
                      .map((r) => r.title)
                      .slice(0, 3)
                      .join(", ")}
                    {clinicRecs.length > 3 && " and more"}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={handleFindClinics}
                  disabled={clinicsLoading}
                  className="gap-1.5 shrink-0"
                >
                  {clinicsLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <MapPin className="w-4 h-4" />
                  )}
                  Find Nearby
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "clinics" && (
        <div className="space-y-4">
          {clinics.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center space-y-4">
                <MapPin className="w-10 h-10 text-gray-300 mx-auto" />
                <div>
                  <p className="font-medium text-gray-700">
                    No clinics loaded yet
                  </p>
                  <p className="text-sm text-gray-500">
                    Run your AI analysis first, then click &ldquo;Find Nearby&rdquo; to
                    discover relevant clinics in your area.
                  </p>
                </div>
                {clinicRecs.length > 0 && (
                  <Button
                    onClick={handleFindClinics}
                    disabled={clinicsLoading}
                    className="gap-2"
                  >
                    {clinicsLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <MapPin className="w-4 h-4" />
                    )}
                    Find Nearby Clinics
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <p className="text-sm text-gray-500">
                Showing {clinics.length} clinics near your location
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clinics.map((clinic) => (
                  <ClinicCard key={clinic.place_id} clinic={clinic} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Data sources summary */}
      {allSnapshots.length > 0 && (
        <Card className="border-gray-100">
          <CardContent className="py-3 px-4">
            <p className="text-xs text-gray-500">
              <strong>{allSnapshots.length}</strong> health snapshot
              {allSnapshots.length !== 1 ? "s" : ""} stored &middot; Sources:{" "}
              {Array.from(new Set(allSnapshots.map((s) => s.source))).join(", ")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
