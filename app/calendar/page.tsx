export const dynamic = "force-dynamic";

import { createServiceClient } from "@/lib/supabase";
import { Suspense } from "react";
import { CalendarView } from "@/components/calendar-view";

async function CalendarContent() {
  const sb = createServiceClient();
  const { data, error } = await sb
    .from("youtube_candidates")
    .select("*")
    .eq("status", "reserved")
    .order("collected_at", { ascending: false });

  if (error) {
    return (
      <div className="p-6 text-[13px]" style={{ color: "var(--red)" }}>
        Supabase 오류: {error.message}
      </div>
    );
  }

  return <CalendarView candidates={data ?? []} />;
}

export default function CalendarPage() {
  return (
    <div className="p-6">
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
              로딩 중...
            </span>
          </div>
        }
      >
        <CalendarContent />
      </Suspense>
    </div>
  );
}
