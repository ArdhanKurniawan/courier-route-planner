import { ZodError } from "zod";
import { DepotError } from "@/lib/validation/depot";
import { ScenarioError } from "@/lib/validation/scenario";

export type FixtureKind = "scenario" | "depot";
export type FixtureAccess = {
  read: (id: bigint) => Promise<{ id: bigint; name: string } | null>;
  remove: (id: bigint) => Promise<unknown>;
};
class FixtureRunStopped extends Error {}

// Test-only ownership and failure boundary; never imports a DB client or private env.
export class ScenarioIntegrationFixtures {
  private readonly pending: Record<FixtureKind, Set<bigint>> = {
    scenario: new Set(),
    depot: new Set(),
  };
  private readonly created: Record<FixtureKind, Set<bigint>> = {
    scenario: new Set(),
    depot: new Set(),
  };
  private readonly unrecordedInserts = new Set<FixtureKind>();
  private stopped = false;
  private cleanupStarted = false;
  private cleanupComplete = false;
  constructor(readonly tag: string) {}
  private failure(reason: string) {
    this.stopped = true;
    return new FixtureRunStopped(
      "Manual reconciliation required: " +
        reason +
        "; " +
        JSON.stringify(this.snapshot()),
    );
  }
  private assertOpen() {
    if (this.stopped || this.cleanupComplete) throw this.failure("RUN_STOPPED");
  }
  async mutate<T>(operation: () => Promise<T>): Promise<T> {
    this.assertOpen();
    try {
      return await operation();
    } catch (error) {
      if (error instanceof FixtureRunStopped) throw error;
      if (
        error instanceof ZodError ||
        ((error instanceof DepotError || error instanceof ScenarioError) &&
          error.code !== "MUTATION_OUTCOME_UNKNOWN")
      )
        throw error;
      // Never expose the original provider message or try another SQL mutation.
      throw this.failure("MUTATION_OUTCOME_UNKNOWN");
    }
  }
  async insert(kind: FixtureKind, operation: () => Promise<bigint>) {
    this.assertOpen();
    try {
      const id = await this.mutate(operation);
      if (
        typeof id !== "bigint" ||
        id < BigInt(1) ||
        id > BigInt("9223372036854775807") ||
        this.created[kind].has(id)
      )
        throw this.failure("INSERT_IDENTITY_UNCERTAIN");
      // Record before application create/readback returns to the caller.
      this.created[kind].add(id);
      this.pending[kind].add(id);
      return id;
    } catch (error) {
      if (this.stopped) this.unrecordedInserts.add(kind);
      if (error instanceof FixtureRunStopped)
        throw this.failure("INSERT_OUTCOME_UNCERTAIN");
      throw error;
    }
  }
  async change<T>(kind: FixtureKind, id: bigint, operation: () => Promise<T>) {
    this.assertOpen();
    if (!this.pending[kind].has(id)) throw this.failure("UNOWNED_ID");
    return this.mutate(operation);
  }
  async cleanup(adapters: Record<FixtureKind, FixtureAccess>) {
    if (this.stopped || this.cleanupStarted)
      throw this.failure("CLEANUP_BLOCKED");
    this.cleanupStarted = true;
    try {
      for (const kind of ["scenario", "depot"] as const) {
        for (const id of [...this.pending[kind]]) {
          const row = await adapters[kind].read(id);
          if (row !== null) {
            if (row.id !== id || !row.name.startsWith(this.tag + "-"))
              throw this.failure("OWNERSHIP_READBACK_MISMATCH");
            await adapters[kind].remove(id);
            if ((await adapters[kind].read(id)) !== null)
              throw this.failure("DELETE_NOT_CONFIRMED");
          }
          // A successful delete receipt alone never forgets an owned fixture.
          this.pending[kind].delete(id);
        }
      }
      this.cleanupComplete = true;
    } catch {
      throw this.failure("CLEANUP_UNCONFIRMED");
    }
  }
  snapshot() {
    const strings = (ids: Set<bigint>) => [...ids].map((id) => id.toString());
    return {
      tag: this.tag,
      stopped: this.stopped,
      cleanupComplete: this.cleanupComplete,
      created: {
        scenario: strings(this.created.scenario),
        depot: strings(this.created.depot),
      },
      pending: {
        scenario: strings(this.pending.scenario),
        depot: strings(this.pending.depot),
      },
      unrecordedInserts: [...this.unrecordedInserts],
    };
  }
}
