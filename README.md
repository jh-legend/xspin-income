# 2x Spin Income - Telegram Mini App

This project is a complete Telegram Mini App that allows users to earn points through various activities and request withdrawals. It features a secure, server-side validated system for rewarding users for watching ads.

This guide will walk you through deploying and configuring the entire application.

## File Structure

The project is organized into the following files:

- `index.html`: The main HTML file that provides the structure and layout of the app.
- `style.css`: The stylesheet for the app, including button gradients and modal styling.
- `app.js`: The main JavaScript file for the frontend. It handles all user interactions, UI updates, and communication with the ad SDK.
- `/functions`: This directory contains the backend code.
    - `functions/package.json`: Defines the dependencies for our backend function.
    - `functions/index.js`: The Firebase Cloud Function that acts as a secure backend to handle postbacks from Monetag and award points.

---

## Deployment & Configuration Instructions

Follow these steps carefully to get your application running.

### Step 1: Deploy the Frontend

The frontend consists of `index.html`, `style.css`, and `app.js`. You will host these files for free using GitHub Pages.

1.  **Create a GitHub Repository:**
    - Go to [GitHub](https://github.com/) and create a new **public** repository. Let's call it `2x-spin-income`.
2.  **Upload Files:**
    - Upload `index.html`, `style.css`, and `app.js` to this new repository.
3.  **Enable GitHub Pages:**
    - In your repository, go to the **Settings** tab.
    - On the left menu, click on **Pages**.
    - Under "Build and deployment", for the "Source", select **Deploy from a branch**.
    - Choose the `main` branch (or `master`) and keep the folder as `/ (root)`. Click **Save**.
4.  **Get Your App's URL:**
    - After a minute, GitHub will publish your page and show you the live URL at the top of the "Pages" settings. It will look like this:
      `https://YOUR_USERNAME.github.io/2x-spin-income/`
    - **This is your WebApp URL.** You will link this URL to your Telegram Bot using BotFather.

### Step 2: Deploy the Backend (Firebase Cloud Function)

The backend is a Node.js function that you will deploy to Firebase Cloud Functions.

**Prerequisites:**
- You must have **Node.js** installed on your computer. You can get it from [nodejs.org](https://nodejs.org/).
- You must have the **Firebase CLI** (Command Line Interface) installed. If you don't have it, open a terminal or command prompt and run:
  `npm install -g firebase-tools`

**Deployment Steps:**
1.  **Navigate to Project Folder:**
    - On your computer, create a main project folder (e.g., `my-app-folder`).
    - Place the `functions` directory (containing `index.js` and `package.json`) inside this folder.
2.  **Login to Firebase:**
    - Open your terminal or command prompt inside the `my-app-folder`.
    - Run the command: `firebase login`
    - This will open a browser window for you to log in to your Google account.
3.  **Initialize Firebase:**
    - This is a one-time setup to link your folder to your Firebase project.
    - Run the command: `firebase init functions`
    - The tool will ask you some questions:
        - "Please select an option": Choose **Use an existing project**.
        - Select your Firebase project (`xspin-income-bot`).
        - "What language would you like to use...": Choose **JavaScript**.
        - "Do you want to use ESLint...": You can say **No** (or `n`).
        - "Do you want to install dependencies with npm now?": Say **Yes** (or `y`).
    - This will create a `firebase.json` file and a `.firebaserc` file. It will also install the necessary dependencies inside the `functions` folder.
4.  **Deploy the Function:**
    - Now you are ready to deploy. Run the command:
      `firebase deploy --only functions`
    - Wait for the deployment to complete. It may take a few minutes.

### Step 3: Get Your Backend Postback URL

Once the deployment in Step 2 is finished, the terminal will show you the URL for your function.

1.  **Find the URL:** Look for a line in the deployment output that says:
    `Function URL (postback): https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/postback`
2.  **Copy this URL.** This is the secure backend URL you will give to Monetag.

### Step 4: Configure Monetag

1.  **Log in** to your Monetag publisher account.
2.  Go to your **Verification** or **Postback** settings.
3.  Paste the **Function URL** you copied in the previous step into the "Postback URL" field.
4.  **Configure the Macros:** Monetag will ask you to add parameters to the URL. You need to add the following, exactly as written:
    `?reward_event_type={event_type}&ymid={ymid}&zone_id={zone_id}&telegram_id={telegram_id}`
5.  Your **final Postback URL** in Monetag should look like this:
    `https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/postback?reward_event_type={event_type}&ymid={ymid}&zone_id={zone_id}&telegram_id={telegram_id}`
6.  **Save** your settings in Monetag.

### Step 5: Final Configuration Checks

1.  **Set Bot Username:** Open `app.js` and replace `"YOUR_BOT_USERNAME"` with your actual bot's username (e.g., `"xspin_income_bot"`). This is essential for the referral links to work.
2.  **Set Firestore Rules:** Go to your Firebase project -> Firestore Database -> Rules tab. Replace the default rules with these to allow your app to work (for development):
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /{document=**} {
          allow read, write: if true;
        }
      }
    }
    ```
    Click **Publish**.

You are now fully deployed and configured!
