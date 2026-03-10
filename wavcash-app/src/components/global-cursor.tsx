"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AtomCursor = dynamic(
  () => import("@/components/dashboard/atom-cursor"),
  { ssr: false }
);

export default function GlobalCursor() {
  const pathname = usePathname();
  if (pathname?.startsWith("/dashboard/admin")) return null;
  return <AtomCursor />;
}
