import test from "node:test";
import assert from "node:assert/strict";
import { canAccess, homeRouteFor, normalizeRole, profileMenuItems, ROLES } from "../src/auth/permissions.js";

test("normalizes legacy role labels into canonical roles", () => {
  assert.equal(normalizeRole({ account_type: "member" }), ROLES.HUB_MEMBER);
  assert.equal(normalizeRole({ role: "client" }), ROLES.CLIENT);
  assert.equal(normalizeRole({ role: "admin" }), ROLES.ADMIN);
});

test("keeps client, Hub and Admin access separate", () => {
  assert.equal(canAccess({ role: "client", account_status: "active" }, "hub"), false);
  assert.equal(canAccess({ role: "hub_member", account_status: "active" }, "hub"), true);
  assert.equal(canAccess({ role: "hub_member", account_status: "active" }, "admin"), false);
  assert.equal(canAccess({ role: "admin", account_status: "active" }, "admin"), true);
});

test("blocks suspended accounts", () => {
  assert.equal(canAccess({ role: "admin", account_status: "suspended" }, "admin"), false);
});

test("returns role-specific home routes and profile menu items", () => {
  assert.equal(homeRouteFor({ role: "client" }), "/app/client/dashboard");
  assert.equal(homeRouteFor({ role: "hub_member" }), "/app/hub/dashboard");
  assert.equal(homeRouteFor({ role: "admin" }), "/app/admin");
  assert.equal(profileMenuItems({ role: "client" }).some((item) => item.route.startsWith("/app/admin")), false);
  assert.equal(profileMenuItems({ role: "admin" })[0].route, "/app/admin");
});
