import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const mainSource = await readFile(new URL("../src/main.js", import.meta.url), "utf8");

test("profile trigger is not registered as a one-shot listener", () => {
  const profileBinding = mainSource.match(
    /profileButton\?\.addEventListener\("click",[\s\S]*?\n  \}\);/
  );

  assert.ok(profileBinding, "profile trigger binding should exist");
  assert.doesNotMatch(profileBinding[0], /once\s*:\s*true/);
});

test("non-local environments never default to an admin role", () => {
  assert.match(
    mainSource,
    /const previewRole = localPreview && Object\.values\(ROLES\)\.includes\(requestedRole\)/
  );
  assert.doesNotMatch(mainSource, /:\s*ROLES\.ADMIN;/);
  assert.match(mainSource, /new AuthStore/);
});
