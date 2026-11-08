import { OrderError } from "@/lib/validation/order";

const safeCodes: ReadonlySet<string> = new Set([
  "NOT_FOUND",
  "ORDER_CODE_CONFLICT",
  "UNAVAILABLE",
  "MUTATION_OUTCOME_UNKNOWN",
]);

type ReadObservation = {
  httpStatus: number | "unknown";
  hasTypes: boolean | "unknown";
  hasRows: boolean | "unknown";
  transportFailed: boolean;
};

export class OrderReadDiagnosticError extends Error {}

export function createOrderReadDiagnostics() {
  let active: ReadObservation | undefined;

  return {
    async observe(fetchResponse: () => Promise<Response>) {
      const observation = active;
      if (!observation) return fetchResponse();

      try {
        const response = await fetchResponse();
        observation.httpStatus = response.status;
        observation.transportFailed = !response.ok;
        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers: response.headers,
          text: () => response.text(),
          async json() {
            try {
              const payload: unknown = await response.json();
              const metadata =
                payload && typeof payload === "object"
                  ? (payload as { types?: unknown; rows?: unknown })
                  : {};
              observation.hasTypes = Object.hasOwn(metadata, "types");
              observation.hasRows = Object.hasOwn(metadata, "rows");
              observation.transportFailed ||=
                !Array.isArray(metadata.types) ||
                metadata.types.length === 0 ||
                (metadata.rows !== null && !Array.isArray(metadata.rows));
              return payload;
            } catch (error) {
              observation.transportFailed = true;
              throw error;
            }
          },
        };
      } catch (error) {
        observation.transportFailed = true;
        throw error;
      }
    },
    async expectNotFound(read: () => Promise<unknown>) {
      const observation: ReadObservation = {
        httpStatus: "unknown",
        hasTypes: "unknown",
        hasRows: "unknown",
        transportFailed: false,
      };
      active = observation;
      let actual = "resolved";
      try {
        await read();
      } catch (error) {
        actual =
          error instanceof OrderError && safeCodes.has(error.code)
            ? error.code
            : "unknown";
      } finally {
        active = undefined;
      }
      if (actual === "NOT_FOUND" && !observation.transportFailed) return;

      const origin = observation.transportFailed
        ? "transport"
        : actual === "resolved"
          ? "assertion"
          : "api";
      throw new OrderReadDiagnosticError(
        `step=cross-scenario-order-read expected=NOT_FOUND actual=${actual} origin=${origin} ` +
          `httpStatus=${observation.httpStatus} hasTypes=${observation.hasTypes} hasRows=${observation.hasRows}`,
      );
    },
  };
}
