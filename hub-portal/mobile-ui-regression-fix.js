/* JP Innovation mobile UI regression fix: compact directory cards, safe avatar badge and tidy actions. */
(function () {
  function addStyles() {
    if (document.getElementById("jpMobileUiRegressionFixStyles")) return;
    const style = document.createElement("style");
    style.id = "jpMobileUiRegressionFixStyles";
    style.textContent = `
      :root{--jp-fix-blue:#1687ff;--jp-fix-green:#33df86;--jp-fix-gold:#f6c945}
      #memberProfileButton.member-chip{box-sizing:border-box!important;position:relative!important;display:grid!important;place-items:center!important;width:50px!important;height:50px!important;min-width:50px!important;max-width:50px!important;min-height:50px!important;max-height:50px!important;aspect-ratio:1/1!important;padding:4px!important;border-radius:999px!important;overflow:visible!important;flex:0 0 50px!important}
      #memberInitials{display:grid!important;place-items:center!important;width:42px!important;height:42px!important;min-width:42px!important;border-radius:999px!important;line-height:1!important;font-size:15px!important;font-weight:950!important;overflow:hidden!important;background:linear-gradient(135deg,#0058bc,#1687ff)!important;color:#fff!important}
      #memberInitials img{width:100%!important;height:100%!important;object-fit:cover!important;border-radius:999px!important}
      #reputationStatusButton.member-status-star{display:none!important}
      .avatar-role-badge{position:absolute!important;right:1px!important;bottom:1px!important;z-index:5!important;width:16px!important;height:16px!important;display:grid!important;place-items:center!important;border-radius:999px!important;font-size:9px!important;font-weight:950!important;line-height:1!important;pointer-events:none!important}
      .avatar-role-badge.admin{color:var(--jp-fix-gold)!important;background:radial-gradient(circle at 50% 50%,#1687ff 0 55%,#07101a 56% 100%)!important;border:1.4px solid var(--jp-fix-gold)!important;box-shadow:0 0 8px rgba(246,201,69,.35)!important}
      .avatar-role-badge.hub{color:#221600!important;background:linear-gradient(135deg,#ffe78d,#f6bd22)!important;border:1px solid #ffe78d!important}
      .avatar-role-badge.client{color:#fff!important;background:linear-gradient(135deg,#4bb0ff,#0969df)!important;border:1px solid #82c8ff!important}
      .member-card.member-compact-card{padding:11px!important;gap:7px!important;min-height:0!important;border-radius:18px!important}
      .member-card.member-compact-card .compact-member-top{grid-template-columns:46px minmax(0,1fr)!important;gap:8px!important;align-items:center!important}
      .member-card.member-compact-card .compact-avatar-wrap,.member-card.member-compact-card .compact-avatar-wrap .profile-avatar{width:46px!important;height:46px!important;min-width:46px!important;border-radius:14px!important;font-size:18px!important}
      .member-card.member-compact-card .compact-member-copy{display:grid!important;gap:2px!important;min-width:0!important}
      .member-card.member-compact-card .compact-member-kickers{display:flex!important;align-items:center!important;gap:5px!important;margin:0!important;max-width:100%!important;overflow:hidden!important}
      .member-card.member-compact-card .member-role-pill,.member-card.member-compact-card .compact-status-pill{min-height:19px!important;padding:3px 7px!important;font-size:8.5px!important;line-height:1!important}
      .member-card.member-compact-card .compact-member-title-line{display:flex!important;align-items:center!important;gap:5px!important;min-width:0!important}
      .member-card.member-compact-card .compact-member-name{font-size:17px!important;line-height:1.08!important;margin:0!important;min-width:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .member-card.member-compact-card .member-role-star{width:16px!important;height:16px!important;font-size:9px!important;flex:0 0 16px!important}
      .member-card.member-compact-card .compact-member-business,.member-card.member-compact-card .compact-member-location{font-size:12px!important;line-height:1.18!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .member-card.member-compact-card .compact-member-category{font-size:12.5px!important;line-height:1.15!important;margin:0!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .member-card.member-compact-card .compact-member-bio{display:-webkit-box!important;-webkit-line-clamp:2!important;-webkit-box-orient:vertical!important;overflow:hidden!important;margin:0!important;font-size:12px!important;line-height:1.28!important}
      .member-card.member-compact-card .compact-chip-row{display:flex!important;flex-wrap:wrap!important;gap:5px!important;max-height:27px!important;overflow:hidden!important}
      .member-card.member-compact-card .compact-chip-row .pill{font-size:10px!important;min-height:22px!important;padding:5px 8px!important;line-height:1!important}
      .member-card.member-compact-card .compact-member-stats{display:flex!important;align-items:center!important;gap:8px!important;margin:0!important;font-size:11.5px!important;line-height:1.1!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important}
      .member-card.member-compact-card .compact-member-actions{display:grid!important;grid-template-columns:1fr 1fr!important;gap:8px!important;margin-top:1px!important}
      .member-card.member-compact-card .compact-member-actions button{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:7px!important;min-height:48px!important;height:48px!important;max-height:54px!important;padding:0 10px!important;border-radius:14px!important;font-size:13px!important;line-height:1!important;white-space:nowrap!important}
      .member-card.member-compact-card .compact-member-actions svg{width:15px!important;height:15px!important;min-width:15px!important;max-width:15px!important;fill:none!important;stroke:currentColor!important;stroke-width:2.2!important;display:block!important}
      .member-card.member-compact-card .view-profile-button svg{width:14px!important;height:14px!important}
      .member-card.member-compact-card .member-review-history,.member-card.member-compact-card .member-review-panel{display:none!important}
      @media(max-width:390px){#memberProfileButton.member-chip{width:48px!important;height:48px!important;min-width:48px!important;max-width:48px!important;min-height:48px!important;max-height:48px!important}#memberInitials{width:40px!important;height:40px!important;min-width:40px!important}.member-card.member-compact-card{padding:10px!important;gap:6px!important}.member-card.member-compact-card .compact-member-actions button{height:46px!important;min-height:46px!important;font-size:12.5px!important}}
      @media(max-width:340px){.member-card.member-compact-card .compact-member-actions{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  function getRole(user) {
    const role = String(user?.role || user?.account_type || "").toLowerCase();
    const status = String(user?.membershipStatus || user?.membership_status || "").toLowerCase();
    const level = String(user?.level || "").toLowerCase();
    if (role === "admin" || level.includes("admin")) return "admin";
    if (role === "member" || ["active", "approved", "paid"].includes(status)) return "hub";
    return "client";
  }

  function updateAvatarBadge() {
    const button = document.querySelector("#memberProfileButton");
    const initials = document.querySelector("#memberInitials");
    if (!button || !initials) return;
    const user = typeof currentUser === "function" ? currentUser() : null;
    const role = getRole(user);
    let badge = button.querySelector("#memberAvatarRoleBadge");
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "memberAvatarRoleBadge";
      button.appendChild(badge);
    }
    badge.className = `avatar-role-badge ${role}`;
    badge.textContent = "★";
    badge.setAttribute("aria-hidden", "true");
    button.classList.add("member-chip");
    const oldTopStar = document.querySelector("#reputationStatusButton");
    if (oldTopStar) oldTopStar.classList.add("hidden");
  }

  function tidyDirectoryButtons() {
    document.querySelectorAll(".member-card.member-compact-card .view-profile-button").forEach((button) => {
      const text = button.textContent.trim() || "View profile";
      if (!button.querySelector("svg")) {
        button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M5 20c.8-4.2 3.2-6 7-6s6.2 1.8 7 6"></path></svg><span>' + text + '</span>';
      }
    });
  }

  function run() {
    addStyles();
    updateAvatarBadge();
    tidyDirectoryButtons();
  }

  run();
  window.addEventListener("load", run);
  window.addEventListener("jp:view-rendered", () => setTimeout(run, 0));
  setInterval(run, 1200);
})();
