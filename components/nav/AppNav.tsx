/// components/nav/AppNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronDown, LayoutDashboard, FlaskConical, Upload, Settings } from "lucide-react";
import { useState } from "react";

interface AppNavProps {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

const NAV_LINKS = [
  { href: "/app/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/app/protocols", label: "Protocols", Icon: FlaskConical },
  { href: "/app/uploads", label: "Uploads", Icon: Upload },
  { href: "/app/settings", label: "Settings", Icon: Settings },
];

export function AppNav({ user }: AppNavProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-16 border-b border-slate-200 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-white text-xs font-bold">
              BZ
            </div>
            <span className="font-semibold text-slate-900 hidden sm:block">Blue Zone</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/app/onboarding/dial" className="hidden sm:block">
            <Button variant="ghost" size="sm" className="text-muted-foreground text-xs">
              New protocol
            </Button>
          </Link>

          <div className="relative">
            <button
              onClick={() => setOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 hover:bg-slate-100 transition-colors"
            >
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt={user.name ?? ""}
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  {(user.name ?? user.email ?? "?")[0].toUpperCase()}
                </div>
              )}
              <span className="text-sm text-slate-700 hidden sm:block max-w-[120px] truncate">
                {user.name ?? user.email}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>

            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 w-52 rounded-xl border border-slate-200 bg-white shadow-xl py-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="text-xs font-medium text-slate-700 truncate">{user.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                  </div>
                  {/* Mobile-only nav links */}
                  <div className="md:hidden border-b border-slate-100 py-1">
                    {NAV_LINKS.map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                      >
                        <Icon className="w-3.5 h-3.5" /> {label}
                      </Link>
                    ))}
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
