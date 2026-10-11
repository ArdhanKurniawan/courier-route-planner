"use client";

import { useSidebar } from "@/context/SidebarContext";
import AppHeader from "@/layout/AppHeader";
import AppSidebar from "@/layout/AppSidebar";
import Backdrop from "@/layout/Backdrop";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();

  return (
    <div className="min-h-screen xl:flex">
      <AppSidebar />
      <Backdrop />
      <div
        inert={isMobileOpen}
        className={`min-w-0 flex-1 transition-[margin] duration-300 ${isExpanded || isHovered ? "xl:ml-[290px]" : "xl:ml-[90px]"}`}
      >
        <AppHeader />
        <main
          id="main-content"
          className="mx-auto max-w-(--breakpoint-2xl) p-4 md:p-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
