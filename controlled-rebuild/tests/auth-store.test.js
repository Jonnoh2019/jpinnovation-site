import test from "node:test";
import assert from "node:assert/strict";
import { AuthStore } from "../src/auth/auth-store.js";
import { ROLES } from "../src/auth/permissions.js";

function backendWithSession(session) {
  let authCallback = null;
  return {
    auth: {
      async getSession() {
        return { data: { session }, error: null };
      },
      onAuthStateChange(callback) {
        authCallback = callback;
        return { data: { subscription: { unsubscribe() {} } } };
      },
      async signOut() {
        authCallback?.("SIGNED_OUT", null);
        return { error: null };
      }
    }
  };
}

test("loads the database profile as the only role source", async () => {
  const session = { user: { id: "user-1", email: "member@example.com", user_metadata: {} } };
  const profiles = {
    async findByUserId() {
      return {
        user_id: "user-1",
        email: "member@example.com",
        full_name: "Hub Member",
        account_type: "member",
        membership_status: "active",
        status: "active"
      };
    }
  };
  const store = new AuthStore({ backend: backendWithSession(session), profiles });

  await store.initialize();

  assert.equal(store.state.status, "ready");
  assert.equal(store.state.profile.role, "member");
  assert.equal(store.state.profile.membership_status, "active");
});

test("missing profile rows fail closed as pending clients, never admins", async () => {
  const session = { user: { id: "user-2", email: "unknown@example.com", user_metadata: {} } };
  const profiles = { async findByUserId() { return null; } };
  const store = new AuthStore({ backend: backendWithSession(session), profiles });

  await store.initialize();

  assert.equal(store.state.profile.role, ROLES.CLIENT);
  assert.equal(store.state.profile.membership_status, "pending");
});

test("sign out clears the authenticated profile", async () => {
  const session = { user: { id: "user-3", email: "client@example.com", user_metadata: {} } };
  const profiles = {
    async findByUserId() {
      return { user_id: "user-3", account_type: "client", membership_status: "free" };
    }
  };
  const store = new AuthStore({ backend: backendWithSession(session), profiles });
  await store.initialize();

  await store.signOut();

  assert.equal(store.state.profile.role, ROLES.PUBLIC);
  assert.equal(store.state.session, null);
});
