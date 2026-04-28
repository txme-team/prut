"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SourceForm } from "@/components/source-form";

export function SourceAddButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-[5px] px-4 py-[7px] rounded-[8px] text-[12px] font-semibold"
        style={{ background: "var(--accent)", color: "#1a1400" }}
      >
        <Plus size={13} />
        소스 추가
      </button>
      {open && <SourceForm onClose={() => setOpen(false)} />}
    </>
  );
}
