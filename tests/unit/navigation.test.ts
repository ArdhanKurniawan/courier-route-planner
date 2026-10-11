import { describe, expect, it } from "vitest";
import { navigationGroups, plannedModules } from "@/config/navigation";

const domainRoutes = [
  "/depots",
  "/orders",
  "/scenarios",
  "/dummy-generator",
  "/map",
  "/optimization",
  "/experiments",
  "/results",
  "/benchmark-batches",
  "/export-results",
];

describe("route planner navigation", () => {
  it("exposes the dashboard, system info, and every domain route", () => {
    const hrefs = navigationGroups.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    expect([...hrefs].sort()).toEqual(["/", "/about", ...domainRoutes].sort());
  });

  it("uses non-empty, root-absolute, unique hrefs", () => {
    const hrefs = navigationGroups.flatMap((group) =>
      group.items.map((item) => item.href),
    );

    for (const href of hrefs) {
      expect(href.trim()).not.toBe("");
      expect(href).toMatch(/^\//);
    }
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it("lists only domain placeholders in plannedModules", () => {
    const hrefs = plannedModules.map((item) => item.href);

    expect(hrefs).not.toContain("/");
    expect(hrefs).not.toContain("/about");
    expect([...hrefs].sort()).toEqual([...domainRoutes].sort());
  });
});
