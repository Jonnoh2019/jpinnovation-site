import { authenticatedFallback, mapProfile } from "../data/profile-repository.js";
import { ACCOUNT_STATUS, ROLES } from "./permissions.js";

const PUBLIC_PROFILE = Object.freeze({
  id: "",
  email: "",
  full_name: "Visitor",
  role: ROLES.PUBLIC,
  membership_status: "",
  account_status: ACCOUNT_STATUS.ACTIVE,
  profile_photo_url: ""
});

export class AuthStore {
  #backend;
  #profiles;
  #listeners = new Set();
  #subscription = null;
  #version = 0;

  constructor({ backend, profiles }) {
    this.#backend = backend;
    this.#profiles = profiles;
    this.state = Object.freeze({ status: "loading", session: null, profile: PUBLIC_PROFILE, error: null });
  }

  async initialize() {
    if (!this.#backend) {
      this.#setState({ status: "ready", session: null, profile: PUBLIC_PROFILE, error: null });
      return this.state;
    }

    const { data, error } = await this.#backend.auth.getSession();
    if (error) {
      this.#setState({ status: "error", session: null, profile: PUBLIC_PROFILE, error });
      return this.state;
    }

    await this.#applySession(data.session || null);
    const { data: listener } = this.#backend.auth.onAuthStateChange((_event, session) => {
      void this.#applySession(session || null);
    });
    this.#subscription = listener?.subscription || null;
    return this.state;
  }

  subscribe(listener) {
    this.#listeners.add(listener);
    listener(this.state);
    return () => this.#listeners.delete(listener);
  }

  async signOut() {
    if (!this.#backend) return;
    const { error } = await this.#backend.auth.signOut();
    if (error) throw error;
    await this.#applySession(null);
  }

  destroy() {
    this.#version += 1;
    this.#subscription?.unsubscribe?.();
    this.#subscription = null;
    this.#listeners.clear();
  }

  async #applySession(session) {
    const version = ++this.#version;
    if (!session?.user) {
      this.#setState({ status: "ready", session: null, profile: PUBLIC_PROFILE, error: null });
      return;
    }

    this.#setState({ ...this.state, status: "loading", session, error: null });
    try {
      const row = await this.#profiles.findByUserId(session.user.id);
      if (version !== this.#version) return;
      const profile = row ? mapProfile(row, session.user) : authenticatedFallback(session.user);
      this.#setState({ status: "ready", session, profile, error: null });
    } catch (error) {
      if (version !== this.#version) return;
      this.#setState({
        status: "error",
        session,
        profile: authenticatedFallback(session.user),
        error
      });
    }
  }

  #setState(nextState) {
    this.state = Object.freeze(nextState);
    this.#listeners.forEach((listener) => listener(this.state));
  }
}
