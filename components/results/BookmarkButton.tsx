/// components/results/BookmarkButton.tsx
"use client";

import { useState } from "react";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";

interface BookmarkButtonProps {
  itemId: string;
  itemType: string;
  protocolId: string;
  initialState?: boolean;
}

export function BookmarkButton({ itemId, itemType, protocolId, initialState = false }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(initialState);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookmarks/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId, itemType, protocolId }),
      });
      if (!res.ok) throw new Error("Failed to toggle bookmark");
      const { bookmarked: next } = await res.json();
      setBookmarked(next);
      toast.success(next ? "Bookmarked" : "Bookmark removed");
    } catch {
      toast.error("Could not update bookmark");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this item"}
      className={`p-1.5 rounded-lg transition-colors flex-shrink-0 ${
        bookmarked
          ? "text-primary bg-primary/10 hover:bg-primary/20"
          : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
      }`}
    >
      <Bookmark className={`w-4 h-4 ${bookmarked ? "fill-current" : ""}`} />
    </button>
  );
}
