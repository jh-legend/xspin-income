# Monetag Ad Reward Page

This is a simple, self-contained web page designed to demonstrate and test various Monetag ad formats with a point system managed on the client-side.

## Features

-   **Three Ad Sections:**
    1.  **Rewarded Interstitial:** Three buttons, each with its own 10-minute cooldown.
    2.  **Rewarded Popup:** Two buttons that share a single 10-minute cooldown.
    3.  **In-App Interstitial:** A single button with no cooldown.
-   **Point System:** Earn points for successfully watching ads (+5 or +10 depending on the ad).
-   **Client-Side Persistence:** All points and cooldown timers are saved in your browser's `localStorage`. No database is needed.
-   **Responsive Design:** A clean, mobile-friendly dark theme with green accents.

---

## How to Use

This project is a single `index.html` file and does not require any backend or complex deployment steps.

1.  **Host the File:** The easiest way to host this page is using a free service like GitHub Pages.
    -   Create a new public repository on GitHub.
    -   Upload the `index.html` file to the repository.
    -   In the repository's **Settings** -> **Pages**, enable GitHub Pages for your main branch.
2.  **Access the Page:** GitHub will provide you with a public URL. Simply navigate to that URL in your browser to use the page.

**Note:** There is **no Firebase or backend deployment** required for this project. All logic is handled directly in the browser.
