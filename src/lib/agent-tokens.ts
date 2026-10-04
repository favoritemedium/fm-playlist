import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { AppUser } from "@/lib/auth";
import { isAllowedEmailDomain } from "@/lib/constants";
import { ensureSchema, getPool } from "./db";
import { EngagementError } from "./engagement-db";

export const AGENT_TOKEN_PREFIX = "fmp_";
export const MAX_ACTIVE_AGENT_TOKENS = 10;

// "fmp_" + 32 random bytes as base64url (43 chars).
const TOKEN_PATTERN = /^fmp_[A-Za-z0-9_-]{43}$/;

export interface AgentTokenSummary {
  id: number;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface AuthenticatedAgent {
  user: AppUser;
  agentName: string;
  tokenId: number;
}

interface AgentTokenRow {
  id: number;
  name: string;
  token_prefix: string;
  created_at: Date | string;
  last_used_at: Date | string | null;
}

export function hashAgentToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateAgentToken(): string {
  return AGENT_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** Extracts a well-formed agent token from an Authorization header value. */
export function parseAgentBearerToken(header: string | null): string | null {
  const match = header?.match(/^Bearer\s+(\S+)$/i);
  return match && TOKEN_PATTERN.test(match[1]) ? match[1] : null;
}

function toIso(value: Date | string): string {
  return new Date(value).toISOString();
}

function rowToSummary(row: AgentTokenRow): AgentTokenSummary {
  return {
    id: row.id,
    name: row.name,
    prefix: row.token_prefix,
    createdAt: toIso(row.created_at),
    lastUsedAt: row.last_used_at ? toIso(row.last_used_at) : null,
  };
}

export async function listAgentTokens(
  userId: string
): Promise<AgentTokenSummary[]> {
  await ensureSchema();
  const result = await getPool().query<AgentTokenRow>(
    `SELECT id, name, token_prefix, created_at, last_used_at
     FROM agent_tokens
     WHERE user_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC, id DESC`,
    [userId]
  );
  return result.rows.map(rowToSummary);
}

/** Creates a token. The plaintext is returned once and never stored. */
export async function createAgentToken(
  userId: string,
  name: string
): Promise<{ token: string; summary: AgentTokenSummary }> {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED");
    // Lock the owner even when they have no tokens yet. Keep the count and
    // insert on this connection so concurrent creations cannot exceed the cap.
    const owner = await client.query<{ email: string }>(
      `SELECT email FROM app_users WHERE clerk_user_id = $1 FOR UPDATE`,
      [userId]
    );
    if (!owner.rows[0] || !isAllowedEmailDomain(owner.rows[0].email)) {
      throw new EngagementError(
        "An allowed account is required to create agent tokens",
        "AGENT_TOKEN_FORBIDDEN",
        403
      );
    }

    const active = await client.query<{ count: number }>(
      `SELECT count(*)::int AS count FROM agent_tokens
       WHERE user_id = $1 AND revoked_at IS NULL`,
      [userId]
    );
    if (active.rows[0].count >= MAX_ACTIVE_AGENT_TOKENS) {
      throw new EngagementError(
        `You can have at most ${MAX_ACTIVE_AGENT_TOKENS} active agent tokens`,
        "AGENT_TOKEN_LIMIT",
        409
      );
    }

    const token = generateAgentToken();
    const result = await client.query<AgentTokenRow>(
      `INSERT INTO agent_tokens (user_id, name, token_hash, token_prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, token_prefix, created_at, last_used_at`,
      [userId, name, hashAgentToken(token), token.slice(0, 8)]
    );
    const summary = rowToSummary(result.rows[0]);
    await client.query("COMMIT");
    return { token, summary };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function revokeAgentToken(
  userId: string,
  tokenId: number
): Promise<void> {
  await ensureSchema();
  const result = await getPool().query(
    `UPDATE agent_tokens SET revoked_at = now()
     WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
     RETURNING id`,
    [tokenId, userId]
  );
  if (result.rows.length === 0) {
    throw new EngagementError("Agent token not found", "AGENT_TOKEN_NOT_FOUND", 404);
  }
}

/**
 * Resolves a raw token to its owner. Returns null for unknown or revoked
 * tokens and for owners who are no longer in the allowed email domain.
 */
export async function authenticateAgentToken(
  rawToken: string
): Promise<AuthenticatedAgent | null> {
  if (!TOKEN_PATTERN.test(rawToken)) return null;
  await ensureSchema();
  const pool = getPool();

  const result = await pool.query<{
    token_id: number;
    agent_name: string;
    clerk_user_id: string;
    user_name: string;
    email: string;
    picture: string | null;
  }>(
    `SELECT t.id AS token_id, t.name AS agent_name,
            u.clerk_user_id, u.name AS user_name, u.email, u.picture
     FROM agent_tokens t
     JOIN app_users u ON u.clerk_user_id = t.user_id
     WHERE t.token_hash = $1 AND t.revoked_at IS NULL`,
    [hashAgentToken(rawToken)]
  );
  const row = result.rows[0];
  if (!row || !isAllowedEmailDomain(row.email)) return null;

  // Keep "last used" fresh without writing on every request.
  await pool.query(
    `UPDATE agent_tokens SET last_used_at = now()
     WHERE id = $1 AND revoked_at IS NULL
       AND (last_used_at IS NULL OR last_used_at < now() - interval '1 minute')`,
    [row.token_id]
  );

  return {
    tokenId: row.token_id,
    agentName: row.agent_name,
    user: {
      id: row.clerk_user_id,
      name: row.user_name,
      email: row.email,
      picture: row.picture ?? undefined,
    },
  };
}
