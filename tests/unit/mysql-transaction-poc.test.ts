// @vitest-environment node
import { once } from "node:events";
import {
  createConnection as openSocket,
  createServer,
  type Socket,
} from "node:net";
import { createConnection } from "mysql2/promise";
import { describe, expect, it, vi } from "vitest";
import { replaceFixture } from "../fixtures/mysql-transaction-poc";

const begin = "START TRANSACTION";
const remove = "DELETE FROM synthetic_orders";
const insert = "INSERT INTO synthetic_orders VALUES (2)";
const commit = "COMMIT";
const rollback = "ROLLBACK";
type Fault =
  | "insert"
  | "delete-response"
  | "delete-disconnect"
  | "commit-response"
  | "rollback";

function packet(socket: Socket, sequence: number, payload: Buffer) {
  const header = Buffer.alloc(4);
  header.writeUIntLE(payload.length, 0, 3);
  header[3] = sequence;
  socket.write(Buffer.concat([header, payload]));
}

function handshake(id: number) {
  const connectionId = Buffer.alloc(4);
  connectionId.writeUInt32LE(id);
  return Buffer.concat([
    Buffer.from("\x0a8.0.0-fixture\0"),
    connectionId,
    Buffer.from("12345678\0"),
    Buffer.from([1, 0xa2, 45, 2, 0, 8, 0, 21]),
    Buffer.alloc(10),
    Buffer.from("123456789012\0mysql_native_password\0"),
  ]);
}

function sqlError(code: number, state: string) {
  const header = Buffer.alloc(3);
  header[0] = 0xff;
  header.writeUInt16LE(code, 1);
  return Buffer.concat([header, Buffer.from(`#${state}synthetic rejection`)]);
}

// A loopback MySQL protocol peer with exactly one synthetic row and one
// transaction buffer. It exercises mysql2's real command/error handling.
async function withPeer(
  fault: Fault | undefined,
  run: (peer: {
    connect: () => ReturnType<typeof connect>;
    commands: Array<[number, string]>;
    observe: () => number[];
    isDisconnected: () => boolean;
  }) => Promise<void>,
) {
  let committed = [1];
  let connectionCount = 0;
  const commands: Array<[number, string]> = [];
  const sockets: Socket[] = [];
  const server = createServer((socket) => {
    sockets.push(socket);
    const id = ++connectionCount;
    let staged: number[] | undefined;
    let authenticated = false;
    let buffer = Buffer.alloc(0);
    const ok = Buffer.from([0, 0, 0, 2, 0, 0, 0]);
    socket.on("error", () => {});

    function reply(sequence: number, body: Buffer) {
      if (!authenticated) {
        authenticated = true;
        packet(socket, sequence, ok);
        return;
      }
      if (body[0] !== 3) {
        packet(socket, sequence, sqlError(1105, "HY000"));
        return;
      }
      const command = body.toString("utf8", 1);
      commands.push([id, command]);
      switch (command) {
        case begin:
          staged = [...committed];
          break;
        case remove:
          staged = [];
          if (fault === "delete-response") return;
          if (fault === "delete-disconnect") {
            socket.destroy();
            return;
          }
          break;
        case insert:
          if (fault === "insert" || fault === "rollback") {
            packet(socket, sequence, sqlError(1062, "23000"));
            return;
          }
          staged?.push(2);
          break;
        case commit:
          if (staged) committed = staged;
          staged = undefined;
          if (fault === "commit-response") return;
          break;
        case rollback:
          if (fault === "rollback") {
            packet(socket, sequence, sqlError(1105, "HY000"));
            return;
          }
          staged = undefined;
          break;
        default:
          packet(socket, sequence, sqlError(1105, "HY000"));
          return;
      }
      packet(socket, sequence, ok);
    }
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      while (buffer.length >= 4) {
        const end = 4 + buffer.readUIntLE(0, 3);
        if (buffer.length < end) return;
        reply(buffer[3] + 1, buffer.subarray(4, end));
        buffer = buffer.subarray(end);
      }
    });
    packet(socket, 0, handshake(id));
  });
  const listening = once(server, "listening");
  server.listen(0, "127.0.0.1");
  await listening;
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No fixture port");
  const port = address.port;

  let disconnected = false;
  async function connect() {
    const socket = openSocket(port, "127.0.0.1");
    sockets.push(socket);
    socket.once("close", () => {
      disconnected = true;
    });
    try {
      const connection = await createConnection({
        stream: socket,
        user: "fixture",
        connectTimeout: 2_000,
      });
      return { connection, socket };
    } catch (error) {
      socket.destroy();
      throw error;
    }
  }
  try {
    await run({
      connect,
      commands,
      observe: () => [...committed],
      isDisconnected: () => disconnected,
    });
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

describe("mysql2 transaction proof on a synthetic MySQL peer", () => {
  it.each([
    { fault: undefined, commands: [begin, remove, insert, commit], row: 2 },
    {
      fault: "insert" as const,
      commands: [begin, remove, insert, rollback],
      row: 1,
      status: "rolled-back",
      code: "duplicate-key",
    },
    {
      fault: "delete-response" as const,
      commands: [begin, remove],
      row: 1,
      status: "rollback-unconfirmed",
      code: "deadline",
    },
    {
      fault: "delete-disconnect" as const,
      commands: [begin, remove],
      row: 1,
      status: "rollback-unconfirmed",
      code: "transport",
    },
    {
      fault: "commit-response" as const,
      commands: [begin, remove, insert, commit],
      row: 2,
      status: "commit-unknown",
      code: "deadline",
    },
    {
      fault: "rollback" as const,
      commands: [begin, remove, insert, rollback],
      row: 1,
      status: "rollback-unconfirmed",
      code: "duplicate-key",
      cleanupCode: "server-rejected",
    },
  ])(
    "sends the expected sequence for $fault and closes its one socket",
    async (expected) => {
      await withPeer(
        expected.fault,
        async ({ connect, commands, observe, isDisconnected }) => {
          const acquire = vi.fn(connect);
          const outcome = await replaceFixture(acquire, 500);
          expect(outcome).toEqual(
            expected.status
              ? {
                  status: expected.status,
                  code: expected.code,
                  ...("cleanupCode" in expected
                    ? { cleanupCode: expected.cleanupCode }
                    : {}),
                }
              : { status: "committed" },
          );
          expect(isDisconnected()).toBe(true);
          expect(acquire).toHaveBeenCalledTimes(1);
          expect(commands).toEqual(
            expected.commands.map((command) => [1, command]),
          );
          expect(observe()).toEqual([expected.row]);
        },
      );
    },
  );
});
