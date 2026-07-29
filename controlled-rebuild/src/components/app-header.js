import { avatarMarkup } from "./avatar.js";
import { icon } from "./icons.js";

export function headerMarkup({ profile, title, homeRoute, areaLabel }) {
  return `
    <header class="app-header">
      <a class="brand" href="/" data-route="/">
        <img src="/assets/jp-innovation-logo.webp" alt="JP Innovation Ltd">
      </a>
      <div class="app-header__controls">
        <button class="control-button" type="button" data-nav-toggle aria-label="Open navigation">${icon("menu")}<span>Menu</span></button>
        <a class="control-button control-button--icon" href="${homeRoute}" data-route="${homeRoute}" aria-label="Dashboard">${icon("home")}</a>
        <div class="account-control">
          <button class="control-button control-button--icon" type="button" data-notification-toggle aria-label="Notifications">${icon("bell")}</button>
          <button class="profile-trigger" type="button" data-profile-toggle aria-label="Open account menu">${avatarMarkup(profile, { size: "sm" })}</button>
        </div>
      </div>
      <div class="page-heading">
        <span>${areaLabel}</span>
        <h1>${title}</h1>
      </div>
    </header>`;
}
