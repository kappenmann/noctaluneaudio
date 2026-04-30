# Noctalune Audio Landing Page

Lightweight static landing page for **Noctalune Audio** and **NoctaTape**, built with plain HTML, CSS, and JavaScript for easy hosting on standard IONOS webspace.

## Files

- `index.html` - page structure and content
- `styles.css` - layout, theme, and responsive styling
- `script.js` - small UX helpers for reveal animation and newsletter form handling

## Deploy On IONOS

1. Open your IONOS webspace or FTP access.
2. Upload `index.html`, `styles.css`, and `script.js` to the target web directory, usually the site root such as `/htdocs`.
3. If an existing `index.html` is already there and should stay live, back it up first and deploy these files to a subfolder or merge carefully.
4. Visit your domain to confirm the page loads correctly on desktop and mobile.

No build step is required.

## Launch Notes

- The hero **Buy Now** button links to `https://noctaluneaudio.lemonsqueezy.com/`.
- The newsletter form posts to `/api/subscribe`.
- The default Brevo list ID is `4`; if `BREVO_LIST_ID` is set in the hosting environment, make sure it is also set to `4`.

## Notes

- The newsletter form requires `BREVO_API_KEY` in the hosting environment.
- The design is responsive and intended to work as a simple deploy-anywhere static page.
