import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { ApiResponse, ClinicsResponse, NearbyClinic } from "@/types";

export const runtime = "nodejs";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

interface PlacesResult {
  name: string;
  vicinity: string;
  rating?: number;
  place_id: string;
}

async function findNearbyClinics(
  lat: number,
  lng: number,
  clinicTypes: string[]
): Promise<NearbyClinic[]> {
  const results: NearbyClinic[] = [];

  for (const type of clinicTypes) {
    const url = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", "10000");
    url.searchParams.set("keyword", type);
    url.searchParams.set("key", GOOGLE_API_KEY!);

    const res = await fetch(url.toString());
    const data = await res.json();

    if (data.results) {
      const mapped = (data.results as PlacesResult[])
        .slice(0, 3)
        .map((place) => ({
          name: place.name,
          address: place.vicinity,
          rating: place.rating ?? null,
          place_id: place.place_id,
          maps_url: `https://maps.google.com/?place_id=${place.place_id}`,
          clinic_type: type,
        }));
      results.push(...mapped);
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "Google Places API key not configured" },
      { status: 503 }
    );
  }

  const body = await req.json();
  const {
    lat,
    lng,
    clinic_types,
  }: { lat: number; lng: number; clinic_types: string[] } = body;

  if (!lat || !lng || !clinic_types?.length) {
    return NextResponse.json<ApiResponse<never>>(
      { error: "lat, lng, and clinic_types are required" },
      { status: 400 }
    );
  }

  try {
    const clinics = await findNearbyClinics(lat, lng, clinic_types);
    return NextResponse.json<ApiResponse<ClinicsResponse>>({
      data: { clinics },
    });
  } catch (err) {
    console.error("Google Places error:", err);
    return NextResponse.json<ApiResponse<never>>(
      { error: "Failed to fetch nearby clinics" },
      { status: 500 }
    );
  }
}
