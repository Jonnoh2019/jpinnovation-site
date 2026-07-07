function $(selector) {
  return document.querySelector(selector);
}

function $all(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

function formData(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  $all("input[type='checkbox']", form).forEach((input) => {
    data[input.name] = input.checked;
  });
  return data;
}

function buildInterestEmail(data) {
  const lines = [
    "Hello JP Innovation,",
    "",
    "I would like to register my interest in the JP Innovation Hub.",
    "",
    `Full name: ${data.fullName || ""}`,
    `Business name: ${data.business || ""}`,
    `Email: ${data.email || ""}`,
    `Phone: ${data.phone || ""}`,
    `Location: ${data.location || ""}`,
    `Main skill set: ${data.skill || ""}`,
    `Years of experience: ${data.experience || ""}`,
    `Equipment/machines available: ${data.equipment || ""}`,
    `Website/portfolio: ${data.portfolio || ""}`,
    `Interested in hosting events: ${data.events ? "Yes" : "No"}`,
    `Interested in becoming a verified partner: ${data.partner ? "Yes" : "No"}`,
    "",
    "Message:",
    data.message || "",
    "",
    "Please let me know the next step for approval and payment.",
    "",
    "Thanks"
  ];
  return lines.join("\n");
}

function registerInterestHandler() {
  const form = $("#applyForm");
  const status = $("#applyStatus");
  if (!form) return;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = formData(form);
    const subject = "JP Innovation Hub membership interest";
    const body = buildInterestEmail(data);
    window.location.href = `mailto:enquiries-jpinnovation@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (status) {
      status.textContent = "Your email app should now open with the details ready to send.";
    }
  });
}

registerInterestHandler();
