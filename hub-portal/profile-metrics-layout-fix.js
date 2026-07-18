/* JP Innovation Hub profile button + analytics reset layout fix. */
(function () {
  function installProfileMetricsLayoutFix() {
    if (document.getElementById("profileMetricsLayoutFixStyles")) return;
    const style = document.createElement("style");
    style.id = "profileMetricsLayoutFixStyles";
    style.textContent = `
      .member-profile-control {
        flex: 0 0 auto !important;
        width: auto !important;
        min-width: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      #memberProfileButton.member-chip,
      .account-control-cluster #memberProfileButton.member-chip {
        box-sizing: border-box !important;
        display: grid !important;
        place-items: center !important;
        flex: 0 0 42px !important;
        width: 42px !important;
        height: 42px !important;
        min-width: 42px !important;
        max-width: 42px !important;
        min-height: 42px !important;
        max-height: 42px !important;
        aspect-ratio: 1 / 1 !important;
        padding: 0 !important;
        border-radius: 50% !important;
        clip-path: circle(50% at 50% 50%) !important;
        overflow: hidden !important;
        text-align: center !important;
        align-self: center !important;
        transform: none !important;
      }
      #memberProfileButton.member-chip #memberInitials,
      .account-control-cluster #memberProfileButton.member-chip #memberInitials {
        box-sizing: border-box !important;
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 100% !important;
        min-height: 100% !important;
        border-radius: 50% !important;
        clip-path: circle(50% at 50% 50%) !important;
        line-height: 1 !important;
        padding: 0 !important;
        margin: 0 !important;
        text-align: center !important;
      }
      #memberProfileButton.member-chip #memberInitials img {
        display: block !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
        border-radius: 999px !important;
      }
      .analytics-tools-v2 {
        display: grid !important;
        grid-template-columns: minmax(0, 1fr) auto !important;
        align-items: start !important;
        gap: 12px !important;
        padding: 12px !important;
        margin: 0 0 12px !important;
      }
      .analytics-tools-v2 > div:first-child {
        display: grid !important;
        gap: 5px !important;
        min-width: 0 !important;
      }
      .analytics-tools-v2 strong {
        display: block !important;
        margin: 0 !important;
        font-size: 14px !important;
        line-height: 1.2 !important;
      }
      .analytics-tools-v2 small {
        display: block !important;
        max-width: 62ch !important;
        color: #aeb8c6 !important;
        font-size: 11.5px !important;
        line-height: 1.35 !important;
      }
      .analytics-tools-v2 .analytics-reset-actions {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        gap: 8px !important;
        min-width: 260px !important;
      }
      .analytics-tools-v2 .analytics-reset-actions .secondary-button {
        min-height: 38px !important;
        padding-inline: 12px !important;
        white-space: nowrap !important;
      }
      .admin-control-shell {
        gap: 11px !important;
      }
      .admin-control-card {
        border-radius: 18px !important;
      }
      .admin-hero-control {
        padding: 12px !important;
      }
      .admin-hero-top {
        gap: 10px !important;
        align-items: start !important;
      }
      .admin-hero-top h2 {
        margin-bottom: 4px !important;
        font-size: clamp(20px, 2.2vw, 28px) !important;
        line-height: 1.08 !important;
      }
      .admin-priority-grid-v2 {
        gap: 7px !important;
        margin-top: 9px !important;
      }
      .admin-priority-tile {
        min-height: 58px !important;
        padding: 8px 9px !important;
      }
      .admin-priority-tile strong {
        font-size: 22px !important;
        line-height: 1 !important;
      }
      .pending-actions-v2 {
        padding: 10px !important;
      }
      .pending-actions-v2:not(.has-work) .section-head-v2 .secondary-button[data-view-link="admin"],
      .pending-actions-v2:not(.has-work) .section-head-v2 button.secondary-button[data-view-link="admin"] {
        display: none !important;
      }
      .section-head-v2 {
        gap: 9px !important;
        margin-bottom: 9px !important;
      }
      .section-head-v2 h2 {
        font-size: 17px !important;
        line-height: 1.12 !important;
        margin-bottom: 2px !important;
      }
      .section-head-v2 p {
        font-size: 12px !important;
        line-height: 1.3 !important;
      }
      .quick-action-groups {
        gap: 8px !important;
      }
      .quick-action-grid-v2 {
        gap: 7px !important;
      }
      .quick-action-v2 {
        min-height: 34px !important;
        padding: 7px 9px !important;
        border-radius: 12px !important;
        font-size: 12px !important;
        line-height: 1.12 !important;
      }
      .quick-action-v2 svg {
        width: 15px !important;
        height: 15px !important;
      }
      .metrics-grid-v2 {
        gap: 7px !important;
      }
      .metrics-grid-v2 .metric-v2 {
        min-height: 62px !important;
        padding: 9px !important;
        border-radius: 13px !important;
      }
      .metric-v2 strong {
        font-size: 23px !important;
        line-height: 1 !important;
      }
      .metric-v2 small {
        font-size: 11px !important;
        line-height: 1.25 !important;
      }
      button,
      .dashboard-link,
      .primary-button,
      .secondary-button {
        transition: transform 180ms ease, border-color 180ms ease, background-color 180ms ease, box-shadow 180ms ease !important;
      }
      button:active,
      .dashboard-link:active,
      .primary-button:active,
      .secondary-button:active {
        transform: scale(.985) !important;
      }
      @media (max-width: 760px) {
        .analytics-tools-v2 {
          grid-template-columns: 1fr !important;
          gap: 10px !important;
          padding: 11px !important;
        }
        .analytics-tools-v2 .analytics-reset-actions {
          min-width: 0 !important;
        }
        .analytics-tools-v2 small {
          max-width: 100% !important;
        }
        .admin-control-shell {
          gap: 9px !important;
        }
        .admin-hero-control,
        .pending-actions-v2 {
          padding: 9px !important;
        }
        .admin-priority-grid-v2,
        .metrics-grid-v2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
        .admin-priority-tile,
        .metrics-grid-v2 .metric-v2 {
          min-height: 56px !important;
        }
        .quick-action-v2 {
          min-height: 32px !important;
        }
      }
      @media (max-width: 430px) {
        #memberProfileButton.member-chip,
        .account-control-cluster #memberProfileButton.member-chip {
          flex-basis: 40px !important;
          width: 40px !important;
          height: 40px !important;
          min-width: 40px !important;
          max-width: 40px !important;
          min-height: 40px !important;
          max-height: 40px !important;
        }
        .analytics-tools-v2 .analytics-reset-actions {
          grid-template-columns: 1fr !important;
        }
        .quick-action-grid-v2 {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  installProfileMetricsLayoutFix();
  window.addEventListener("load", installProfileMetricsLayoutFix);
})();
