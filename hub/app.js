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
    "I would like to register my interest in the JP Innovation Hub launch.",
    "",
    `Full name: ${data.fullName || ""}`,
    `Email: ${data.email || ""}`,
    `Location: ${data.location || ""}`,
    `Interested as: ${data.interestType || ""}`,
    "",
    "Introductory offer requested: 10% off my first approved JP Innovation engineering quote.",
    "",
    "Message:",
    data.message || "",
    "",
    "Please keep me updated as the Hub develops and let me know when early access becomes available.",
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
    const subject = "JP Innovation Hub launch interest";
    const body = buildInterestEmail(data);
    window.location.href = `mailto:enquiries-jpinnovation@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    if (status) {
      status.textContent = "Your email app should now open with the details ready to send.";
    }
  });
}

registerInterestHandler();
