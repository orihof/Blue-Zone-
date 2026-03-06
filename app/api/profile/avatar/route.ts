/// app/api/profile/avatar/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabase/admin";
import { TABLES } from "@/lib/db/schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  const supabase    = getAdminClient();
  const userId      = session.user.id;
  const buffer      = Buffer.from(await file.arrayBuffer());
  // One deterministic path per user — upsert overwrites previous avatar
  const storagePath = userId;

  const { error: uploadError } = await supabase.storage
    .from("user-avatars")
    .upload(storagePath, buffer, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: { publicUrl } } = supabase.storage
    .from("user-avatars")
    .getPublicUrl(storagePath);

  // Persist URL to profiles row
  await supabase
    .from(TABLES.PROFILES)
    .upsert({ id: userId, avatar_url: publicUrl, updated_at: new Date().toISOString() });

  return NextResponse.json({ avatarUrl: publicUrl });
}
