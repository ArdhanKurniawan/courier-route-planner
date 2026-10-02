// Presentation-only navigation. These modules do not implement domain behavior.
type NavigationItem = { title: string; href: string };
type NavigationGroup = { title: string; items: NavigationItem[] };

export const navigationGroups: NavigationGroup[] = [
  { title: "", items: [{ title: "Dashboard", href: "/" }] },
  {
    title: "Master Data",
    items: [
      { title: "Depot", href: "/depots" },
      { title: "Orders", href: "/orders" },
    ],
  },
  {
    title: "Simulation",
    items: [
      { title: "Scenarios", href: "/scenarios" },
      { title: "Dummy Generator", href: "/dummy-generator" },
      { title: "Map", href: "/map" },
    ],
  },
  {
    title: "Optimization",
    items: [
      { title: "Run Optimization", href: "/optimization" },
      { title: "Experiments", href: "/experiments" },
      { title: "Results", href: "/results" },
    ],
  },
  {
    title: "Research",
    items: [
      { title: "Benchmark Batches", href: "/benchmark-batches" },
      { title: "Export Results", href: "/export-results" },
    ],
  },
  {
    title: "System",
    items: [{ title: "About / Environment Info", href: "/about" }],
  },
];

export const plannedModules = navigationGroups
  .flatMap((group) => group.items)
  .filter((item) => item.href !== "/" && item.href !== "/about");
