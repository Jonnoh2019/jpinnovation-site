/* JP Innovation compact profile menu override. Loaded after the final menu handler. */
(() => {
  "use strict";
  const VERSION = "profile-menu-compact-override-20260720d";
  const MENU = "#memberProfileMenu";

  function $(selector) { return document.querySelector(selector); }

  function orderImportantLinks() {
    const menu = $(MENU);
    const header = menu?.querySelector(".profile-menu-header");
    const admin = $("#profileAdminLink");
    const metrics = $("#profileMetricsLink");
    if (!menu || !header) return;
    [metrics, admin].reverse().forEach((node) => {
      if (node && node.previousElementSibling !== header) header.insertAdjacentElement("afterend", node);
    });
  }

  function addStyles() {
    if ($("#jpProfileMenuCompactOverrideStyles")) return;
    const style = document.createElement("style");
    style.id = "jpProfileMenuCompactOverrideStyles";
    style.textContent = `
      @media(max-width:760px){
        #memberProfileMenu.open{
          left:12px!important;right:12px!important;bottom:18px!important;padding:8px!important;border-radius:22px!important;
          display:grid!important;align-content:start!important;gap:4px!important;overflow-y:auto!important;overflow-x:hidden!important;
          max-height:calc(100dvh - var(--jp-profile-menu-top, 86px) - 18px)!important;
        }
        #memberProfileMenu .profile-menu-header{min-height:50px!important;padding:6px!important;margin:0 0 4px!important;}
        #memberProfileMenu .profile-menu-link{
          height:38px!important;min-height:38px!important;max-height:38px!important;padding:4px 8px!important;margin:0!important;border-radius:12px!important;
          display:grid!important;grid-template-columns:26px minmax(0,1fr) auto!important;gap:8px!important;align-items:center!important;
        }
        #memberProfileMenu .profile-menu-icon{width:26px!important;height:26px!important;min-width:26px!important;font-size:13px!important;}
        #memberProfileMenu .profile-menu-link strong{font-size:14px!important;line-height:1!important;}
        #memberProfileMenu .profile-menu-link small,#memberProfileMenu .profile-chat-notifications{display:none!important;}
      }
      @media(max-width:390px){
        #memberProfileMenu.open{padding:7px!important;gap:3px!important;}
        #memberProfileMenu .profile-menu-link{height:36px!important;min-height:36px!important;max-height:36px!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function setMenuTopVar() {
    const menu = $(MENU);
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    document.documentElement.style.setProperty("--jp-profile-menu-top", `${Math.max(76, Math.round(rect.top || 86))}px`);
  }

  function install() {
    document.documentElement.dataset.jpProfileMenuCompactOverride = VERSION;
    addStyles();
    orderImportantLinks();
    setMenuTopVar();
    window.addEventListener("resize", setMenuTopVar, { passive: true });
    window.visualViewport?.addEventListener("resize", setMenuTopVar, { passive: true });
    new MutationObserver(() => { orderImportantLinks(); setMenuTopVar(); }).observe(document.body, { childList: true, subtree: true });
    console.info(`[${VERSION}] installed`);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install, { once: true });
  else install();
})();
