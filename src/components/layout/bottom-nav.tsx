"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ASSISTANT_NAV } from "./nav-config";

export function BottomNav() {
  const pathname = usePathname();
  const items = [...NAV_ITEMS.filter((i) => i.bottomBar), ASSISTANT_NAV];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 backdrop-blur pb-safe lg:hidden">
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <item.icon className={cn("h-5 w-5", active && "scale-110")} />
              {item.label === "Badger AI" ? "AI" : item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
