/// app/api/products/route.ts
import { NextRequest, NextResponse } from "next/server";
import { searchMockCatalog } from "@/lib/products/mockCatalog";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ products: [] });

  const products = searchMockCatalog(q);
  return NextResponse.json({ products });
}
