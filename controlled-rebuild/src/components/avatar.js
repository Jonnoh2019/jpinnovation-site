import { normalizeRole, ROLES } from "../auth/permissions.js";

export function initialsFor(profile = {}) {
  const words = String(profile.full_name || profile.name || profile.email || "JP")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words.at(-1)[0]}` : words[0]?.slice(0, 2) || "JP").toUpperCase();
}

export function avatarMarkup(profile, { size = "md", className = "" } = {}) {
  const role = normalizeRole(profile);
  const roleClass = role === ROLES.HUB_MEMBER ? "hub-member" : role;
  const photo = profile?.profile_photo_url;
  const content = photo
    ? `<img src="${escapeAttribute(photo)}" alt="" loading="lazy">`
    : `<span aria-hidden="true">${initialsFor(profile)}</span>`;
  return `<span class="role-avatar role-avatar--${roleClass} role-avatar--${size} ${className}" aria-label="${escapeAttribute(profile?.full_name || profile?.name || "User")}">${content}</span>`;
}

function escapeAttribute(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;");
}
