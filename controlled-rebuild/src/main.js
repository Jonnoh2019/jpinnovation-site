import { Router } from "./app/router.js";
import { OverlayManager } from "./app/overlay-manager.js";
import { headerMarkup } from "./components/app-header.js";
import { openProfileMenu } from "./components/profile-menu.js";
import { pageMarkup } from "./features/pages.js";
import { homeRouteFor, ROLES } from "./auth/permissions.js";

const root = document.querySelector("#app");
const overlays = new OverlayManager();
const localPreview = ["localhost", "127.0.0.1"].includes(window.location.hostname);
const requestedRole = localPreview ? new URLSearchParams(window.location.search).get("demoRole") : null;
const role = localPreview && Object.values(ROLES).includes(requestedRole)
  ? requestedRole
  : ROLES.PUBLIC;
const profile = {
  id: "preview-user",
  full_name: role === ROLES.ADMIN ? "Jonathan Hotard" : role === ROLES.HUB_MEMBER ? "Hub Member" : "Client User",
  role,
  account_status: "active",
  profile_photo_url: ""
};

const router = new Router({
  profile,
  onRoute: render
});

function render(route) {
  overlays.close({ restoreFocus: false });
  document.title = `${route.title} | JP Innovation`;
  const homeRoute = homeRouteFor(profile);
  const areaLabel = role === ROLES.CLIENT ? "Client Portal" : role === ROLES.PUBLIC ? "JP Innovation" : "Innovation Hub";
  root.innerHTML = `
    <div class="app-shell">
      ${headerMarkup({ profile, title: route.title, homeRoute, areaLabel })}
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
      signOut: async () => router.navigate("/")
    });
  });
}

router.start();
