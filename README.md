# 2x Spin Income - Telegram Mini App (Unified Version)

This repository contains the complete, unified code for the "2x Spin Income" Telegram Mini App. It combines a multi-feature frontend with a secure, server-side backend for ad reward validation.

## Key Features
- **Multiple Ad Formats:** Supports Rewarded Interstitial, Rewarded Popup, and In-App Interstitial ads from Monetag, each with its own logic and cooldowns.
- **Secure Ad Rewards:** Uses a Firebase Cloud Function backend to validate ad completions via server-to-server postbacks, preventing cheating.
- **Firebase Persistence:** All user data, including TK balance, referrals, and ad cooldowns, is stored securely in Firestore.
- **Telegram-Native Referrals:** Implements a referral system using official `t.me` deep links. The bot username is pre-configured.
- **Additional Games:** Includes a "Spin and Earn" wheel and a withdrawal system with form submission.

---

## Deployment & Configuration Instructions

Follow these steps carefully to get your application running. This project has two parts to deploy: the **Frontend** (your web app) and the **Backend** (your secure function).

### Step 1: Deploy the Frontend

The frontend consists of the `index.html`, `style.css`, and `app.js` files. You will host these for free using GitHub Pages.

1.  **Create a GitHub Repository:**
    -   Go to [GitHub](https://github.com/) and create a new **public** repository.
    -   Upload all the project files and the `functions` directory to this repository. (Your bot username has already been set in `app.js`).

2.  **Enable GitHub Pages:**
    -   In your repository, go to the **Settings** tab.
    -   On the left menu, click on **Pages**.
    -   Under "Build and deployment", select **Deploy from a branch**.
    -   Choose your `main` branch and keep the folder as `/ (root)`. Click **Save**.

3.  **Get Your App's URL:**
    -   After a minute, GitHub will provide you with the public URL for your Mini App (e.g., `https://your-username.github.io/your-repo-name/`).
    -   This is your **WebApp URL**. You will link this URL to your Telegram Bot using BotFather.

### Step 2: Deploy the Backend (Firebase Cloud Function)

The backend is a Node.js function that you will deploy to Firebase Cloud Functions.

**Prerequisites:**
- You must have **Node.js** (version 16) installed on your computer. You can get it from [nodejs.org](https://nodejs.org/).
- You must have the **Firebase CLI** installed (`npm install -g firebase-tools`).

**Deployment Steps:**
1.  **Login to Firebase:**
    -   Open your computer's terminal or command prompt.
    -   Navigate to the root directory of your project (the one containing the `functions` folder).
    -   Run the command: `firebase login` and follow the on-screen instructions.

2.  **Initialize Firebase Project:**
    -   If you haven't done this before for this folder, run: `firebase init functions`
    -   Choose **Use an existing project** and select your `xspin-income-bot` project.
    -   Choose **JavaScript** as the language.
    -   Answer **No** to ESLint to avoid style errors.
    -   Answer **Yes** to install dependencies with npm.

3.  **Deploy the Function:**
    -   From the root directory of your project, run the command:
      `firebase deploy --only functions`
    -   Wait for the deployment to complete.

### Step 3: Get Your Backend Postback URL

Once deployment is finished, the terminal will show you the URL for your function.

1.  **Find the URL:** Look for a line in the output that says:
    `Function URL (rewardUser): https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/rewardUser`
2.  **Copy this URL.** This is the secure backend URL you will give to Monetag.

### Step 4: Configure Monetag

1.  Log in to your Monetag publisher account.
2.  Go to your ad zone settings where you can configure **Server-to-Server Postbacks**.
3.  Paste the **Function URL** you just copied into the postback URL field.
4.  **Add Macros:** You must add the required parameters to the end of the URL. Append the following string exactly as written:

    `?ymid={ymid}&telegram_id={telegram_id}&reward_amount={reward_amount}&ad_type={ad_type}`

5.  Your **final Postback URL** in Monetag should look like this:
    `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/rewardUser?ymid={ymid}&telegram_id={telegram_id}&reward_amount={reward_amount}&ad_type={ad_type}`
6.  Save your settings in Monetag.

### Step 5: Set Firestore Rules

Finally, you must set your database rules to allow your app and backend to work.

1.  Go to your **Firebase project -> Firestore Database -> Rules tab**.
2.  Replace the default rules with these (for development):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow public read/write access.
        // WARNING: For development only. Not secure for production.
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
    ```
3.  Click **Publish**.

You are now fully deployed and configured!
