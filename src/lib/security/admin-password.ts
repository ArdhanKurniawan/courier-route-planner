import "server-only";
import { verify } from "@node-rs/argon2";
import { z } from "zod";
import { AuthConfigurationError, type AuthConfig } from "@/config/auth";

const loginInput = z.strictObject({
  username: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/u),
  password: z
    .string()
    .refine(
      (value) =>
        [...value].length >= 15 &&
        [...value].length <= 128 &&
        Buffer.byteLength(value, "utf8") <= 512,
    ),
});
export function parseLoginInput(input: unknown) {
  return loginInput.parse(input);
}
export async function verifyAdminPassword(
  input: { username: string; password: string },
  config: AuthConfig,
) {
  try {
    // Verify even for a syntactically valid but wrong username.
    const valid = await verify(
      config.passwordHash,
      input.password,
      undefined,
      AbortSignal.timeout(1000),
    );
    return valid && input.username === config.username;
  } catch {
    throw new AuthConfigurationError();
  }
}
