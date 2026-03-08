"use client";

import dynamic from "next/dynamic";

const AtomCursor = dynamic(
  () => import("@/components/dashboard/atom-cursor"),
  { ssr: false }
);

export default function GlobalCursor() {
  return <AtomCursor />;
}
