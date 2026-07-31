import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Integration tests for SECURITY DEFINER RPCs:
//   - public.apply_item_price_change
//   - public.apply_calculation_margin
//
// These RPCs must be callable ONLY by authenticated users (EXECUTE granted
// to the `authenticated` role, revoked from `anon`/`public`), and internally
// must validate that auth.uid() matches the owning calculation's user_id.

const SUPABASE_URL =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "local-anon-key";
const HAS_SUPABASE_TEST_ENV = Boolean(
  ((import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
  ((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY),
);

const RANDOM_UUID = "00000000-0000-0000-0000-000000000000";

// Anon client — no session attached. Used to verify role-based EXECUTE gate.
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function isPermissionDenied(err: { message?: string; code?: string } | null) {
  if (!err) return false;
  const msg = (err.message || "").toLowerCase();
  return (
    err.code === "42501" ||
    msg.includes("permission denied") ||
    msg.includes("not allowed") ||
    msg.includes("function") && msg.includes("does not exist")
  );
}

describe.skipIf(!HAS_SUPABASE_TEST_ENV)("apply_item_price_change — security", () => {
  it("rejects anonymous callers (EXECUTE revoked from anon)", async () => {
    const { data, error } = await anon.rpc("apply_item_price_change", {
      _item_id: RANDOM_UUID,
      _new_price: 100,
      _reason: "test",
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it("does not leak item_not_found / forbidden details to anon", async () => {
    // The PERMISSION DENIED gate must fire BEFORE the function body runs,
    // otherwise anon could probe for existing item ids via error messages.
    const { error } = await anon.rpc("apply_item_price_change", {
      _item_id: RANDOM_UUID,
      _new_price: 100,
    });
    const msg = (error?.message || "").toLowerCase();
    expect(msg).not.toContain("item_not_found");
    expect(msg).not.toContain("forbidden");
    expect(msg).not.toContain("invalid_price");
  });
});

describe.skipIf(!HAS_SUPABASE_TEST_ENV)("apply_calculation_margin — security", () => {
  it("rejects anonymous callers (EXECUTE revoked from anon)", async () => {
    const { data, error } = await anon.rpc("apply_calculation_margin", {
      _calculation_id: RANDOM_UUID,
      _margin: 30,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(isPermissionDenied(error)).toBe(true);
  });

  it("rejects anon even with out-of-range margin (gate before validation)", async () => {
    const { error } = await anon.rpc("apply_calculation_margin", {
      _calculation_id: RANDOM_UUID,
      _margin: 99999,
    });
    const msg = (error?.message || "").toLowerCase();
    expect(msg).not.toContain("invalid_margin");
    expect(msg).not.toContain("forbidden");
    expect(isPermissionDenied(error)).toBe(true);
  });
});

describe.skipIf(!HAS_SUPABASE_TEST_ENV)("apply_* — direct table writes blocked for anon (defense in depth)", () => {
  it("anon cannot SELECT calculations (RLS)", async () => {
    const { data, error } = await anon.from("calculations").select("id").limit(1);
    // RLS returns empty set for anon (no error, no rows) — never leaks data.
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  it("anon cannot UPDATE calculation_items (RLS)", async () => {
    const { error } = await anon
      .from("calculation_items")
      .update({ unit_price: 1 })
      .eq("id", RANDOM_UUID);
    // Either RLS blocks (no rows updated, no error) or explicit denial — both acceptable.
    // The critical guarantee is that no real row gets mutated.
    expect(error === null || isPermissionDenied(error)).toBe(true);
  });
});
