"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { navigationGroups } from "@/config/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  GridIcon,
  BoxIcon,
  ListIcon,
  BoltIcon,
  DocsIcon,
  InfoIcon,
  CloseIcon,
} from "@/icons";

const groupIcons = [GridIcon, BoxIcon, ListIcon, BoltIcon, DocsIcon, InfoIcon];

export default function AppSidebar() {
  const pathname = usePathname();
  const {
    isDesktop,
    isExpanded,
    isHovered,
    isMobileOpen,
    setIsHovered,
    closeMobileSidebar,
  } = useSidebar();
  const showLabels = isExpanded || isHovered || isMobileOpen;
  const sidebarRef = useRef<HTMLElement>(null);
  const wasMobileOpen = useRef(false);

  useEffect(() => {
    if (isMobileOpen) {
      document.getElementById("mobile-navigation-close")?.focus();
    } else if (wasMobileOpen.current) {
      document
        .getElementById(
          isDesktop ? "desktop-navigation-toggle" : "mobile-navigation-toggle",
        )
        ?.focus();
    }
    wasMobileOpen.current = isMobileOpen;
  }, [isMobileOpen, isDesktop]);

  return (
    <aside
      ref={sidebarRef}
      id="app-sidebar"
      inert={!isDesktop && !isMobileOpen}
      role={isMobileOpen ? "dialog" : undefined}
      aria-modal={isMobileOpen ? true : undefined}
      aria-label="Navigasi utama"
      onMouseEnter={() => {
        if (isDesktop && !isExpanded) setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") closeMobileSidebar();
        if (event.key === "Tab" && isMobileOpen) {
          const controls =
            sidebarRef.current?.querySelectorAll<HTMLElement>(
              "a[href], button",
            );
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }}
      className={`fixed top-0 left-0 z-50 flex h-dvh w-[290px] flex-col border-r border-gray-200 bg-white px-5 transition-[width,transform] duration-300 xl:visible xl:translate-x-0 dark:border-gray-800 dark:bg-gray-900 ${showLabels ? "xl:w-[290px]" : "xl:w-[90px]"} ${isMobileOpen ? "visible translate-x-0" : "invisible -translate-x-full"}`}
    >
      <div className="flex h-20 shrink-0 items-center justify-between gap-2">
        <Link
          href="/"
          onClick={closeMobileSidebar}
          aria-label="Courier Route Planner - Dashboard"
          className="flex items-center gap-3 text-gray-800 dark:text-white/90"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500 text-sm font-semibold text-white">
            CR
          </span>
          {showLabels && (
            <span className="text-sm font-semibold leading-5">
              Courier Route
              <br />
              Planner
            </span>
          )}
        </Link>
        <button
          id="mobile-navigation-close"
          type="button"
          onClick={closeMobileSidebar}
          aria-label="Tutup navigasi"
          className="rounded-lg p-2 text-gray-500 xl:hidden dark:text-gray-400"
        >
          <CloseIcon className="size-5" aria-hidden="true" />
        </button>
      </div>
      <nav className="custom-scrollbar flex-1 overflow-y-auto pb-6">
        {navigationGroups.map((group, index) => {
          const Icon = groupIcons[index];
          return (
            <div key={group.title} className="mb-5">
              {group.title && (
                <h2
                  className={`mb-2 px-3 text-xs font-medium text-gray-500 uppercase dark:text-gray-400 ${showLabels ? "" : "sr-only"}`}
                >
                  {group.title}
                </h2>
              )}
              <ul className="space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={closeMobileSidebar}
                      title={item.title}
                      aria-current={pathname === item.href ? "page" : undefined}
                      className={`menu-item group ${pathname === item.href ? "menu-item-active" : "menu-item-inactive"} ${showLabels ? "" : "justify-center"}`}
                    >
                      <Icon className="size-5 shrink-0" aria-hidden="true" />
                      <span className={showLabels ? "" : "sr-only"}>
                        {item.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
