"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, PieChart, PlusCircle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/",          label: "總覽",  icon: LayoutDashboard },
  { href: "/holdings",  label: "持股",  icon: PieChart        },
  { href: "/add",       label: "新增",  icon: PlusCircle      },
  { href: "/settings",  label: "設定",  icon: Settings        },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-t border-gray-100">
      {/* safe area for iPhone home indicator */}
      <div className="flex items-center justify-around px-2 pt-2 pb-safe-bottom">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-1 rounded-2xl transition-colors min-w-[60px]",
                active ? "text-red-500" : "text-gray-400"
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className={cn("text-[10px] font-medium", active ? "text-red-500" : "text-gray-400")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
