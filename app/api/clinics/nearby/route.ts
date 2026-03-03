/// app/api/clinics/nearby/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { ClinicItem } from "@/lib/db/payload";

const MOCK_CLINICS: ClinicItem[] = [
  { id: "c1", name: "Longevity & Performance Medical Center", city: "Your city", specialty: ["Preventive Medicine", "Hormone Optimization"], whyRelevant: ["Comprehensive longevity bloodwork", "Hormone panel interpretation"], website: null, bookingUrl: null, placeId: null },
  { id: "c2", name: "Advanced Diagnostics Lab", city: "Your city", specialty: ["Functional Blood Testing", "Biomarker Panels"], whyRelevant: ["Expanded biomarker panels beyond standard labs"], website: null, bookingUrl: null, placeId: null },
  { id: "c3", name: "Sports Medicine & Recovery Clinic", city: "Your city", specialty: ["Physical Therapy", "IV Therapy", "Cryotherapy"], whyRelevant: ["Recovery and performance optimization aligned with your goals"], website: null, bookingUrl: null, placeId: null },
  { id: "c4", name: "Integrative Health Center", city: "Your city", specialty: ["Naturopathic Medicine", "Nutrition Counseling"], whyRelevant: ["Holistic approach to wellness and longevity"], website: null, bookingUrl: null, placeId: null },
];

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  const key = process.env.GOOGLE_PLACES_KEY;
  if (key && lat && lng) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=5000&type=doctor&keyword=longevity+preventive+health&key=${key}`;
      const res = await fetch(url, { next: { revalidate: 3600 } });
      const json = await res.json();
      if (json.status === "OK") {
        const clinics: ClinicItem[] = (json.results ?? []).slice(0, 6).map((p: {
          place_id: string;
          name: string;
          types?: string[];
          vicinity?: string;
          geometry?: { location?: { lat?: number; lng?: number } };
        }) => ({
          id: p.place_id,
          name: p.name,
          city: p.vicinity ?? "Nearby",
          specialty: (p.types ?? [])
            .filter((t: string) => !["point_of_interest", "establishment"].includes(t))
            .slice(0, 3)
            .map((t: string) => t.replace(/_/g, " ")),
          whyRelevant: ["Matches your protocol goals"],
          website: null,
          bookingUrl: null,
          placeId: p.place_id,
        }));
        return NextResponse.json({ clinics });
      }
    } catch {
      // fall through to mock
    }
  }

  return NextResponse.json({ clinics: MOCK_CLINICS });
}
