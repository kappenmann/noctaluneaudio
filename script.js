const yearTarget = document.getElementById("current-year");
const signupForm = document.getElementById("email-signup-form");
const feedback = document.getElementById("form-feedback");
const submitButton = document.getElementById("signup-submit");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

function setFeedbackState(type, message) {
  if (!feedback) {
    return;
  }

  feedback.textContent = message;
  feedback.classList.remove("is-success", "is-error");

  if (type) {
    feedback.classList.add(type === "success" ? "is-success" : "is-error");
  }
}

if (signupForm && feedback) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const emailField = signupForm.querySelector('input[type="email"]');

    if (!(emailField instanceof HTMLInputElement)) {
      setFeedbackState("error", "The signup form is currently unavailable. Please try again later.");
      return;
    }

    const email = emailField.value.trim().toLowerCase();

    if (!email || !EMAIL_PATTERN.test(email) || !emailField.checkValidity()) {
      setFeedbackState("error", "Please enter a valid email address.");
      emailField.focus();
      return;
    }

    const originalLabel = submitButton ? submitButton.textContent : "";

    if (submitButton instanceof HTMLButtonElement) {
      submitButton.disabled = true;
      submitButton.classList.add("is-loading");
      submitButton.textContent = "Submitting...";
    }

    emailField.disabled = true;
    setFeedbackState("", "");

    try {
      const response = await fetch(signupForm.action, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Unable to complete signup right now. Please try again in a moment.");
      }

      signupForm.reset();
      setFeedbackState("success", result.message || "You're on the list. We'll keep you posted.");
    } catch (error) {
      setFeedbackState("error", error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      emailField.disabled = false;

      if (submitButton instanceof HTMLButtonElement) {
        submitButton.disabled = false;
        submitButton.classList.remove("is-loading");
        submitButton.textContent = originalLabel || "Notify Me";
      }
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
