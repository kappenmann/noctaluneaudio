# Noctalune Audio Landing Page

Lightweight static landing page for **Noctalune Audio** and **NoctaTape**, built with plain HTML, CSS, and JavaScript for easy hosting on standard IONOS webspace.

## Files

- `index.html` - page structure and content
- `styles.css` - layout, theme, and responsive styling
- `script.js` - small UX helpers for reveal animation and placeholder signup form handling

## Deploy On IONOS

1. Open your IONOS webspace or FTP access.
2. Upload `index.html`, `styles.css`, and `script.js` to the target web directory, usually the site root such as `/htdocs`.
3. If an existing `index.html` is already there and should stay live, back it up first and deploy these files to a subfolder or merge carefully.
4. Visit your domain to confirm the page loads correctly on desktop and mobile.

No build step is required.

## Replace Before Launch

- **Plugin screenshot placeholder:** In `index.html`, update the `.plugin-stage__screen` content in the hero section with a real product screenshot or render.
- **Audio demo placeholders:** In `index.html`, replace both `.demo-placeholder` blocks with your embedded audio players or custom demo markup.
- **Email form endpoint:** In `index.html`, replace `action="#brevo-endpoint-placeholder"` on `#email-signup-form` with your Brevo form endpoint or your own backend handler.
- **Legal links:** In `index.html`, replace `#imprint-placeholder` and `#privacy-placeholder` in the footer with your real URLs.

## Notes

- The signup form is intentionally set up as a placeholder so the page can be published before backend integration.
- All placeholder areas are labeled in the markup and visible in the UI to make future editing straightforward.
- The design is responsive and intended to work as a simple deploy-anywhere static page.
