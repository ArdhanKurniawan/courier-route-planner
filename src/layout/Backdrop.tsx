"use client";

import { useSidebar } from "@/context/SidebarContext";

export default function Backdrop() {
  const { isMobileOpen, closeMobileSidebar } = useSidebar();
  if (!isMobileOpen) return null;
  return (
    <button
      type="button"
      aria-label="Tutup latar navigasi"
      onClick={closeMobileSidebar}
      className="fixed inset-0 z-40 bg-gray-900/50 xl:hidden"
    />
  );
}
