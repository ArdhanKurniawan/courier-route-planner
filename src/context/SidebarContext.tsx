"use client";

import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  useSyncExternalStore,
} from "react";

type SidebarContextType = {
  isDesktop: boolean;
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  closeMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

function subscribeDesktop(onChange: () => void) {
  const query = window.matchMedia("(min-width: 1280px)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readDesktop() {
  return window.matchMedia("(min-width: 1280px)").matches;
}

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context)
    throw new Error("useSidebar must be used within a SidebarProvider");
  return context;
};

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    readDesktop,
    () => false,
  );
  const [isExpanded, setIsExpanded] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState({ pathname, open: false });
  const [isHovered, setIsHovered] = useState(false);
  const [activeItem, setActiveItem] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);

  // Reset on route changes, including browser history, before rendering children.
  if (
    mobileSidebar.pathname !== pathname ||
    (isDesktop && mobileSidebar.open)
  ) {
    setMobileSidebar({ pathname, open: false });
  }
  const isMobileOpen =
    !isDesktop && mobileSidebar.pathname === pathname && mobileSidebar.open;

  const closeMobileSidebar = () => setMobileSidebar({ pathname, open: false });

  return (
    <SidebarContext.Provider
      value={{
        isDesktop,
        isExpanded,
        isMobileOpen,
        isHovered,
        activeItem,
        openSubmenu,
        toggleSidebar: () => setIsExpanded((current) => !current),
        toggleMobileSidebar: () =>
          setMobileSidebar((current) => ({ pathname, open: !current.open })),
        closeMobileSidebar,
        setIsHovered,
        setActiveItem,
        toggleSubmenu: (item) =>
          setOpenSubmenu((current) => (current === item ? null : item)),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}
