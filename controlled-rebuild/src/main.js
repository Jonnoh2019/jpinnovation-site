import { Router } from "./app/router.js";
import { OverlayManager } from "./app/overlay-manager.js";
import { AuthStore } from "./auth/auth-store.js";
import { homeRouteFor, ROLES } from "./auth/permissions.js";
import { headerMarkup } from "./components/app-header.js";
import { openProfileMenu } from "./components/profile-menu.js";
import { createBackend } from "./config.js";
import { ProfileRepository } from "./data/profile-repository.js";
import { pageMarkup } from "./features/pages.js";

const root = document.querySelector("#app");
const overlays = new OverlayManager();
const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const requestedRole = localPreview ? new URLSearchParams(window.location.search).get("demoRole") : null;
const previewRole = localPreview && Object.values(ROLES).includes(requestedRole) ? requestedRole : null;

let profile = null;
let router = null;
let authStore = null;
let authError = null;

if (previewRole) {
  startApp(previewProfile(previewRole));
} else {
  root.innerHTML = loadingMarkup("Checking your secure session…");
  const backend = createBackend();
  authStore = new AuthStore({
    backend,
    profiles: backend ? new ProfileRepository(backend) : null
  });
  authStore.subscribe((state) => {
    if (state.status === "loading") {
      if (!router) root.innerHTML = loadingMarkup("Checking your secure session…");
      return;
    }

    authError = state.error;
    if (!router) startApp(state.profile);
    else updateProfile(state.profile);
  });
  void authStore.initialize();
}

function startApp(initialProfile) {
  profile = initialProfile;
  router = new Router({ profile, onRoute: render });
  router.start();
}

function updateProfile(nextProfile) {
  const previousSignature = profileSignature(profile);
  profile = nextProfile;
  router.setProfile(profile);
  if (profileSignature(profile) !== previousSignature) router.refresh();
}

function render(route) {
  overlays.close({ restoreFocus: false });
  document.title = `${route.title} | JP Innovation`;
  const homeRoute = homeRouteFor(profile);
  const role = profile.role;
  const areaLabel = role === ROLES.CLIENT ? "Client Portal" : role === ROLES.PUBLIC ? "JP Innovation" : "Innovation Hub";
  root.innerHTML = `
    <div class="app-shell">
      ${headerMarkup({ profile, title: route.title, homeRoute, areaLabel })}
      ${authError ? `<div class="status-banner status-banner--error" role="status">Your account details could not be refreshed. Existing access has been kept safely.</div>` : ""}
      <main class="page-content" id="main">${pageMarkup(route, profile)}</main>
    </div>`;
  bindShell();
}

function bindShell() {
  root.querySelectorAll("[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      router.navigate(link.getAttribute("href"));
    }, { once: true });
  });

  const profileButton = root.querySelector("[data-profile-toggle]");
  profileButton?.addEventListener("click", () => {
    openProfileMenu({
      profile,
      opener: profileButton,
      overlays,
      navigate: (path) => router.navigate(path),
      signOut: async () => {
        if (authStore) await authStore.signOut();
        else router.navigate("/");
      }
    });
  });
}

function previewProfile(role) {
  return {
    id: "preview-user",
    full_name: role === ROLES.ADMIN ? "Jonathan Hotard" : role === ROLES.HUB_MEMBER ? "Hub Member" : role === ROLES.CLIENT ? "Client User" : "Visitor",
    role,
    account_type: role,
    membership_status: role === ROLES.HUB_MEMBER || role === ROLES.ADMIN ? "active" : role === ROLES.CLIENT ? "free" : "",
    account_status: "active",
    profile_photo_url: ""
  };
}

function profileSignature(value) {
  return [value?.id, value?.role, value?.membership_status, value?.account_status, value?.profile_photo_url].join("|");
}

function loadingMarkup(message) {
  return `<main class="route-loading" role="status"><span class="loading-spinner" aria-hidden="true"></span><p>${message}</p></main>`;
}
