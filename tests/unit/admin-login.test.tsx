import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminLoginForm from "@/components/auth/admin-login-form";
const router = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => router.replace.mockClear());
afterEach(() => vi.unstubAllGlobals());
describe("single-admin login form", () => {
  it("submits credentials once, clears password and uses a fixed destination", async () => {
    let finish!: (r: Response) => void;
    const network = vi.fn<typeof fetch>(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    );
    vi.stubGlobal("fetch", network);
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "fixture_admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Synthetic-only-password-2026!" },
    });
    const form = screen.getByRole("form", { name: "Login admin" });
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(network).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Password")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Masuk" })).toBeDisabled();
    finish(Response.json({ ok: true }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/depots"));
    expect(JSON.parse(network.mock.calls[0][1]!.body as string)).toEqual({
      username: "fixture_admin",
      password: "Synthetic-only-password-2026!",
    });
  });
  it("shows generic failures rather than server details or credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { error: { message: "synthetic private provider trace" } },
          { status: 401 },
        ),
      ),
    );
    render(<AdminLoginForm />);
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "fixture_admin" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Synthetic-only-password-2026!" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Login admin" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Username atau password tidak sesuai.",
    );
    expect(
      screen.queryByText(/synthetic private provider trace/),
    ).not.toBeInTheDocument();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
