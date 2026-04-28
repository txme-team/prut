"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Clock,
  Clapperboard,
  LayoutGrid,
  ListVideo,
  Calendar,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    group: "콘텐츠",
    items: [
      { href: "/pending", label: "업로드 대기", icon: Clock, badge: null },
      { href: "/reels", label: "릴스 생성", icon: Clapperboard, badge: null },
      { href: "/carousel", label: "캐러셀 생성", icon: LayoutGrid, badge: null },
    ],
  },
  {
    group: "시스템",
    items: [
      { href: "/queue", label: "YouTube 큐", icon: ListVideo, badge: null },
      { href: "/calendar", label: "캘린더", icon: Calendar, badge: null },
      { href: "/sources", label: "소스 관리", icon: Database, badge: null },
    ],
  },
];

const BOTTOM_ITEMS = [
  { href: "/settings", label: "설정", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col w-[200px] min-w-[200px] h-screen sticky top-0"
      style={{
        background: "var(--surface2)",
        borderRight: "1px solid var(--border)",
        padding: "16px 12px",
      }}
    >
      {/* 로고 */}
      <Link
        href="/queue"
        className="block text-[13px] font-bold px-2 pb-4 mb-3"
        style={{
          color: "var(--accent)",
          borderBottom: "1px solid var(--border)",
          letterSpacing: "-0.3px",
        }}
      >
        🌅 dawn.town
      </Link>

      {/* 내비게이션 */}
      <nav className="flex flex-col gap-4 flex-1">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            <p
              className="text-[10px] uppercase tracking-wide px-2 mb-1"
              style={{ color: "var(--text-dim)" }}
            >
              {group.group}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-2 py-[7px] rounded-[7px] text-[12px] mb-[2px] transition-colors",
                    active
                      ? "font-semibold"
                      : "hover:bg-white/5"
                  )}
                  style={
                    active
                      ? { background: "var(--accent-dim)", color: "var(--accent)" }
                      : { color: "var(--text-muted)" }
                  }
                >
                  <Icon size={14} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== null && (
                    <span
                      className="text-[10px] font-bold rounded-full px-[6px] py-[1px]"
                      style={{ background: "var(--accent)", color: "#1a1400" }}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* 하단 고정 */}
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
        {BOTTOM_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-2 py-[7px] rounded-[7px] text-[12px] transition-colors",
                active ? "font-semibold" : "hover:bg-white/5"
              )}
              style={
                active
                  ? { background: "var(--accent-dim)", color: "var(--accent)" }
                  : { color: "var(--text-muted)" }
              }
            >
              <Icon size={14} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
