/* JP Innovation shared role avatar styling - safe lightweight pass. */
(() => {
  "use strict";
  const VERSION = "profile-menu-avatar-regression-fix-20260720k";
  let queued = false;

  function addStyles() {
    if (document.getElementById("jpSharedRoleAvatarStyles")) return;
    const style = document.createElement("style");
    style.id = "jpSharedRoleAvatarStyles";
    style.textContent = `
      :root{
        --jp-avatar-blue-edge:#041f5a;
        --jp-avatar-blue-mid:#0754c7;
        --jp-avatar-blue-hi:#168bff;
        --jp-avatar-gold-edge:#72510e;
        --jp-avatar-gold-mid:#b88a22;
        --jp-avatar-gold-hi:#f1d06a;
        --jp-avatar-ring-blue:#168bff;
        --jp-avatar-ring-gold:#c89b2c;
      }
      .jp-role-avatar,
      #memberInitials,
      #profileMenuAvatar,
      .profile-avatar{
        box-sizing:border-box!important;
        display:inline-grid!important;
        place-items:center!important;
        aspect-ratio:1/1!important;
        border-radius:999px!important;
        line-height:1!important;
        text-align:center!important;
        font-weight:950!important;
        letter-spacing:-.02em!important;
        overflow:hidden!important;
        flex:0 0 auto!important;
        color:#fff!important;
        text-shadow:0 1px 2px rgba(0,0,0,.35)!important;
      }
      #memberProfileButton.member-chip{
        box-sizing:border-box!important;
        display:grid!important;
        place-items:center!important;
        width:50px!important;
        height:50px!important;
        min-width:50px!important;
        max-width:50px!important;
        min-height:50px!important;
        max-height:50px!important;
        aspect-ratio:1/1!important;
        padding:4px!important;
        border-radius:999px!important;
        overflow:visible!important;
      }
      #memberInitials,
      #profileMenuAvatar{
        width:42px!important;
        height:42px!important;
        min-width:42px!important;
        font-size:15px!important;
      }
      .profile-avatar{width:44px;height:44px;min-width:44px;font-size:16px}
      .jp-role-avatar-admin,
      #memberInitials.jp-role-avatar-admin,
      #profileMenuAvatar.jp-role-avatar-admin,
      .profile-avatar.jp-role-avatar-admin{
        background:
          radial-gradient(circle at 34% 28%, var(--jp-avatar-gold-hi) 0 15%, var(--jp-avatar-gold-mid) 36%, var(--jp-avatar-gold-edge) 100%)!important;
        border:3px solid var(--jp-avatar-ring-blue)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.35), inset 0 -4px 8px rgba(67,42,3,.38), 0 0 0 1px rgba(255,255,255,.08), 0 6px 16px rgba(0,0,0,.34)!important;
      }
      .jp-role-avatar-hub,
      #memberInitials.jp-role-avatar-hub,
      #profileMenuAvatar.jp-role-avatar-hub,
      .profile-avatar.jp-role-avatar-hub{
        background:
          radial-gradient(circle at 34% 28%, var(--jp-avatar-blue-hi) 0 14%, var(--jp-avatar-blue-mid) 42%, var(--jp-avatar-blue-edge) 100%)!important;
        border:3px solid var(--jp-avatar-ring-gold)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.22), inset 0 -4px 8px rgba(0,14,48,.42), 0 0 0 1px rgba(255,255,255,.07), 0 6px 16px rgba(0,0,0,.32)!important;
      }
      .jp-role-avatar-client,
      #memberInitials.jp-role-avatar-client,
      #profileMenuAvatar.jp-role-avatar-client,
      .profile-avatar.jp-role-avatar-client{
        background:
          radial-gradient(circle at 34% 28%, var(--jp-avatar-blue-hi) 0 14%, var(--jp-avatar-blue-mid) 42%, var(--jp-avatar-blue-edge) 100%)!important;
        border:3px solid rgba(255,255,255,.92)!important;
        box-shadow:inset 0 1px 3px rgba(255,255,255,.2), inset 0 -4px 8px rgba(0,14,48,.42), 0 0 0 1px rgba(255,255,255,.05), 0 6px 16px rgba(0,0,0,.3)!important;
      }
      #memberInitials img,
      #profileMenuAvatar img,
      .profile-avatar img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:999px!important}
      #memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline{display:none!important}
      @media(max-width:390px){
        #memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}
        #memberInitials,#profileMenuAvatar{width:40px!important;height:40px!important;min-width:40px!important;font-size:14px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function currentUserSafe() {
    try { return typeof currentUser === "function" ? currentUser() : null; } catch { return null; }
  }

  function roleFor(user) {
    const role = String(user?.role || user?.account_type || "").toLowerCase();
    const level = String(user?.level || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || user?.status || "").toLowerCase();
    if (role === "admin" || level.includes("admin")) return "admin";
    if (role === "member" || role === "hub" || ["active", "approved", "paid"].includes(status)) return "hub";
    return "client";
  }

  function clearRoleClasses(node) {
    node.classList.remove("jp-role-avatar", "jp-role-avatar-admin", "jp-role-avatar-hub", "jp-role-avatar-client", "admin", "hub", "client");
  }

  function applyRole(node, role) {
    if (!node) return;
    clearRoleClasses(node);
    node.classList.add("jp-role-avatar", `jp-role-avatar-${role}`);
  }

  function inferCardRole(card) {
    if (!card) return null;
    if (card.classList.contains("role-admin") || card.querySelector(".member-role-pill.admin")) return "admin";
    if (card.classList.contains("role-hub") || card.querySelector(".member-role-pill.hub")) return "hub";
    if (card.classList.contains("role-client") || card.querySelector(".member-role-pill.client")) return "client";
    const text = (card.textContent || "").toLowerCase();
    if (text.includes("admin")) return "admin";
    if (text.includes("hub member") || text.includes("paid innovation hub")) return "hub";
    if (text.includes("client portal")) return "client";
    return null;
  }

  function cleanupLegacyBadges() {
    document.querySelectorAll("#memberAvatarRoleBadge,.avatar-role-badge,#reputationStatusButton,#memberStatusStarInline").forEach((node) => {
      node.classList.add("hidden");
      node.setAttribute("aria-hidden", "true");
    });
  }

  function apply() {
    queued = false;
    document.documentElement.dataset.jpProfileMenuRegressionFix = VERSION;
    addStyles();
    cleanupLegacyBadges();
    const userRole = roleFor(currentUserSafe());
    applyRole(document.getElementById("memberInitials"), userRole);
    applyRole(document.getElementById("profileMenuAvatar"), userRole);
    document.querySelectorAll(".member-chip #memberInitials").forEach((node) => applyRole(node, userRole));
    document.querySelectorAll(".member-card .profile-avatar,.profile-summary-card .profile-avatar,.member-profile-card .profile-avatar").forEach((node) => {
      const role = inferCardRole(node.closest(".member-card,.profile-summary-card,.member-profile-card,.directory-account-section")) || userRole;
      applyRole(node, role);
    });
  }

  function queueApply() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", apply, { once: true });
  else apply();
  window.addEventListener("load", queueApply, { once: true });
  window.addEventListener("jp:view-rendered", queueApply);
  window.addEventListener("pageshow", queueApply);
  window.addEventListener("click", (event) => {
    if (event.target.closest?.("#memberProfileButton,.nav-link,.profile-menu-link,.view-profile-button")) queueApply();
  }, true);
})();
