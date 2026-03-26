const yearTarget = document.getElementById("current-year");
const signupForm = document.getElementById("email-signup-form");
const feedback = document.getElementById("form-feedback");

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

if (signupForm && feedback) {
  signupForm.addEventListener("submit", (event) => {
    const action = signupForm.getAttribute("action") || "";
    const emailField = signupForm.querySelector('input[type="email"]');
    const email = emailField instanceof HTMLInputElement ? emailField.value.trim() : "";

    if (!emailField || !emailField.checkValidity()) {
      event.preventDefault();
      feedback.textContent = "Please enter a valid email address.";
      return;
    }

    // Keep the placeholder form from navigating until a real endpoint is configured.
    if (action.startsWith("#")) {
      event.preventDefault();
      feedback.textContent = "Signup placeholder active. Replace the form action with your Brevo endpoint to collect submissions.";
      signupForm.reset();
    }
  });
}

const revealElements = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window && revealElements.length > 0) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.14,
      rootMargin: "0px 0px -32px 0px"
    }
  );

  revealElements.forEach((element) => observer.observe(element));
} else {
  revealElements.forEach((element) => element.classList.add("is-visible"));
}
