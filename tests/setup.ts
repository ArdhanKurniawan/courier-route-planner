import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest APIs are imported explicitly, so RTL has no global afterEach to use.
afterEach(cleanup);
