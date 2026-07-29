import { canAccess, homeRouteFor } from "../auth/permissions.js";
import { findRoute } from "./routes.js";

export class Router {
  #profile;
  #onRoute;
  #started = false;

  constructor({ profile, onRoute }) {
    this.#profile = profile;
    this.#onRoute = onRoute;
    this.onPopState = this.onPopState.bind(this);
  }

  setProfile(profile) {
    this.#profile = profile;
  }

  resolve(pathname = window.location.pathname) {
    const route = findRoute(pathname) || findRoute(homeRouteFor(this.#profile));
    return canAccess(this.#profile, route.access)
      ? route
      : findRoute(homeRouteFor(this.#profile));
  }

  navigate(pathname, { replace = false } = {}) {
    const route = this.resolve(pathname);
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({ path: route.path }, "", route.path);
    this.#onRoute(route);
    return route;
  }

  onPopState() {
    this.#onRoute(this.resolve());
  }

  start() {
    if (this.#started) return;
    this.#started = true;
    window.addEventListener("popstate", this.onPopState);
    const route = this.resolve();
    if (route.path !== window.location.pathname) {
      window.history.replaceState({ path: route.path }, "", route.path);
    }
    this.#onRoute(route);
  }

  destroy() {
    window.removeEventListener("popstate", this.onPopState);
    this.#started = false;
  }
}
