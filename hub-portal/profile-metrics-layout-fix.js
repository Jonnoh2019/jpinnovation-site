/* JP Innovation Hub profile button + analytics reset layout fix. */
(function () {
  function installProfileMetricsLayoutFix() {
    if (document.getElementById("profileMetricsLayoutFixStyles")) return;
    const style = document.createElement("style");
    style.id = "profileMetricsLayoutFixStyles";
    style.textContent = `
      #memberProfileButton.member-chip {
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
        border-radius: 999px !important;
        overflow: hidden !important;
        text-align: center !important;
      }
      #memberProfileButton.member-chip #memberInitials {
        box-sizing: border-box !important;
        display: grid !important;
        place-items: center !important;
        width: 100% !important;
        height: 100% !important;
        min-width: 100% !important;
        min-height: 100% !important;
        border-radius: 999px !important;
        line-height: 1 !important;
      }
      #memberProfileButton.member-chip #memberInitials img {
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
      }
      @media (max-width: 430px) {
        #memberProfileButton.member-chip {
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
      }
    `;
    document.head.appendChild(style);
  }

  installProfileMetricsLayoutFix();
  window.addEventListener("load", installProfileMetricsLayoutFix);
})();
