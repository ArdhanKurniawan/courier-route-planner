"use client";

import Link from "next/link";
import { useSidebar } from "@/context/SidebarContext";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";

export default function AppHeader() {
  const { isExpanded, isMobileOpen, toggleSidebar, toggleMobileSidebar } =
    useSidebar();

  return (
    <header className="sticky top-0 z-30 flex w-full items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 md:px-6 dark:border-gray-800 dark:bg-gray-900">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3 focus:text-brand-600"
      >
        Lewati ke konten
      </a>
      <button
        id="desktop-navigation-toggle"
        type="button"
        aria-label="Ubah lebar sidebar"
        aria-expanded={isExpanded}
        aria-controls="app-sidebar"
        onClick={toggleSidebar}
        className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 xl:flex dark:border-gray-800 dark:text-gray-400"
      >
        <MenuIcon />
      </button>
      <button
        id="mobile-navigation-toggle"
        type="button"
        aria-label={isMobileOpen ? "Tutup menu navigasi" : "Buka menu navigasi"}
        aria-expanded={isMobileOpen}
        aria-controls="app-sidebar"
        onClick={toggleMobileSidebar}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-600 xl:hidden dark:border-gray-800 dark:text-gray-400"
      >
        <MenuIcon />
      </button>
      <Link
        href="/"
        className="min-w-0 flex-1 text-gray-800 dark:text-white/90"
      >
        <span className="block text-sm font-semibold sm:text-base">
          Courier Route Planner
        </span>
        <span className="hidden text-xs text-gray-500 sm:block dark:text-gray-400">
          Web Admin Route Optimization
        </span>
      </Link>
      <ThemeToggleButton />
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 5h14M3 10h14M3 15h14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
