import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

test("compiled CLI rejects a missing FATHOM_API_KEY", () => {
  const result = spawnSync(process.execPath, ["dist/index.js"], {
    encoding: "utf8",
    env: { ...process.env, FATHOM_API_KEY: "" },
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /FATHOM_API_KEY env var is required/);
});
