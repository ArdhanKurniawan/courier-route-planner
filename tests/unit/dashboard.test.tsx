import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Dashboard from "@/app/(admin)/page";

describe("route planner dashboard", () => {
  it("shows the application identity", () => {
    render(<Dashboard />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Courier Route Planner" }),
    ).toBeVisible();
    expect(screen.getByText("Web Admin Route Optimization")).toBeVisible();
  });

  it("explains that operational features are still unavailable", () => {
    render(<Dashboard />);

    expect(
      screen.getByText(
        /Aplikasi saat ini berupa shell UI; data operasional belum tersedia\./,
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Pengelolaan data, peta, optimasi rute, dan eksperimen penelitian belum diimplementasikan\./,
      ),
    ).toBeVisible();
  });

  it("associates Depot with its unconfigured status", () => {
    render(<Dashboard />);

    const status = screen.getByText("Depot", { selector: "dt" }).parentElement;
    expect(status).not.toBeNull();
    expect(
      within(status!).getByText("Belum dikonfigurasi", { selector: "dd" }),
    ).toBeVisible();
  });

  it("associates Route Optimization with its not-run status", () => {
    render(<Dashboard />);

    const status = screen.getByText("Route Optimization", {
      selector: "dt",
    }).parentElement;
    expect(status).not.toBeNull();
    expect(
      within(status!).getByText("Belum dijalankan", { selector: "dd" }),
    ).toBeVisible();
  });

  it("links application information to /about", () => {
    render(<Dashboard />);

    expect(
      screen.getByRole("link", { name: "Lihat informasi aplikasi" }),
    ).toHaveAttribute("href", "/about");
  });

  it.each(["Revenue", "Monthly Sales", "Monthly Target"])(
    "keeps the e-commerce demo text %s absent",
    (text) => {
      render(<Dashboard />);

      expect(screen.queryByText(new RegExp(text, "i"))).not.toBeInTheDocument();
    },
  );
});
