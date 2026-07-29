import test from "node:test";
import assert from "node:assert/strict";
import { findRoute, ROUTES } from "../src/app/routes.js";

test("all routes are unique", () => {
  const paths = ROUTES.map((route) => route.path);
  assert.equal(new Set(paths).size, paths.length);
});

test("Admin is a separate route area", () => {
  assert.equal(findRoute("/app/admin").area, "admin");
  assert.equal(findRoute("/app/hub/dashboard").area, "hub");
  assert.equal(findRoute("/app/client/dashboard").area, "client");
});
