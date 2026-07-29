import { ROLE_LABELS, normalizeRole, profileMenuItems } from "../auth/permissions.js";
import { avatarMarkup } from "./avatar.js";
import { icon } from "./icons.js";

export function openProfileMenu({ profile, opener, overlays, navigate, signOut }) {
  const layer = document.createElement("div");
  layer.className = "overlay-layer";
  layer.innerHTML = `
    <button class="overlay-backdrop" type="button" aria-label="Close account menu"></button>
    <section class="profile-menu" role="dialog" aria-modal="true" aria-label="Account menu">
      <header class="profile-menu__identity">
        ${avatarMarkup(profile, { size: "lg" })}
        <div>
          <strong>${escapeHtml(profile.full_name || profile.name || "Member")}</strong>
          <span>${ROLE_LABELS[normalizeRole(profile)]}</span>
        </div>
        <button class="icon-button profile-menu__close" type="button" aria-label="Close account menu">${icon("close")}</button>
      </header>
      <nav class="profile-menu__items" aria-label="Account navigation">
        ${profileMenuItems(profile).map((item) => `
          <button type="button" data-menu-route="${item.route}" class="profile-menu__item ${item.priority ? "profile-menu__item--priority" : ""}">
            ${icon(item.icon)}<span>${item.label}</span><span aria-hidden="true">›</span>
          </button>`).join("")}
        <button type="button" class="profile-menu__item profile-menu__item--danger" data-menu-action="sign-out">
          ${icon("close")}<span>Sign out</span><span aria-hidden="true">›</span>
        </button>
      </nav>
    </section>`;

  const controller = new AbortController();
  const close = () => {
    controller.abort();
    overlays.close();
  };

  layer.querySelector(".overlay-backdrop").addEventListener("click", close, { signal: controller.signal });
  layer.querySelector(".profile-menu__close").addEventListener("click", close, { signal: controller.signal });
  layer.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  }, { signal: controller.signal });
  layer.addEventListener("click", async (event) => {
    const routeButton = event.target.closest("[data-menu-route]");
    const actionButton = event.target.closest("[data-menu-action]");
    if (routeButton) {
      routeButton.disabled = true;
      const destination = routeButton.dataset.menuRoute;
      close();
      navigate(destination);
    } else if (actionButton?.dataset.menuAction === "sign-out") {
      actionButton.disabled = true;
      try {
        await signOut();
      } finally {
        close();
      }
    }
  }, { signal: controller.signal });

  document.body.append(layer);
  const menu = layer.querySelector(".profile-menu");
  menu.scrollTop = 0;
  overlays.open({ name: "profile", element: layer, opener });
  menu.querySelector("button")?.focus();
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}
