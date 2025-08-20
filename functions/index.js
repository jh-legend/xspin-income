/**
 * This file contains the backend logic for the "2x Spin Income" Telegram Mini App.
 * It uses a Firebase Cloud Function to create a secure endpoint that Monetag can call.
 * This is known as a "postback" or "server-to-server callback".
 *
 * Why do we need this?
 * To prevent cheating. If the app itself (the frontend) gives points to the user, a clever user
 * could find a way to give themselves points without actually watching an ad.
 *
 * How does this work?
 * 1. The user clicks "Watch Ad" in the app.
 * 2. The app tells the Monetag SDK to show an ad. It also sends a unique ID for this ad view (`ymid`)
 *    and the user's Telegram ID.
 * 3. The user watches the ad.
 * 4. When the ad is successfully completed, Monetag's servers will make a request to our function here.
 * 5. This function verifies the request from Monetag is valid and hasn't been used before.
 * 6. If everything is okay, this function securely adds points to the user's account in Firestore.
 */

// Import the necessary Firebase modules.
// firebase-functions allows us to create Cloud Functions.
// firebase-admin is the "Admin SDK" that lets our server code interact with Firebase with full privileges.
const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize the Firebase Admin SDK.
// This line automatically uses the project's configuration and credentials when deployed to Firebase.
// No need to manage private keys manually when deployed.
admin.initializeApp();

// Get a reference to the Firestore database service.
const db = admin.firestore();

/**
 * This is our main Cloud Function. It's an HTTP-triggered function, which means it runs
 * whenever it receives an HTTP request at its unique URL.
 *
 * We've named it 'postback' because that's its purpose.
 */
exports.postback = functions.https.onRequest(async (req, res) => {
    // Log the full request query for debugging purposes. You can view these logs in the Firebase console.
    functions.logger.info("Received postback with query:", req.query);

    // --- Step 1: Extract and Validate Parameters ---
    // We get the data Monetag sends us from the request's query parameters.
    // e.g., /postback?ymid=123&telegram_id=456&...
    const {
        reward_event_type,
        ymid,
        telegram_id,
        zone_id
    } = req.query;

    // Check if the request is for a "valued" event. This means the user completed the action.
    // If not, we don't need to do anything. We send a 200 OK response to let Monetag know we received it.
    if (reward_event_type !== "valued") {
        functions.logger.info(`Ignoring event of type: ${reward_event_type}`);
        return res.status(200).send("OK: Event ignored.");
    }

    // Check if we received the essential parameters. If not, it's a bad request.
    if (!ymid || !telegram_id) {
        functions.logger.error("Missing required query parameters 'ymid' or 'telegram_id'.");
        return res.status(400).send("Error: Missing required parameters.");
    }

    // --- Step 2: Ensure Idempotency (Prevent Duplicate Rewards) ---
    // We need to make sure we haven't already given a reward for this specific ad view (`ymid`).
    // We do this by saving each `ymid` we process to a special collection in Firestore.
    const ymidRef = db.collection("processedYmids").doc(ymid);

    try {
        // We use a "transaction" to safely check for the ymid and create it if it doesn't exist.
        // A transaction ensures that this whole block of code runs safely without conflicts.
        await db.runTransaction(async (transaction) => {
            const ymidDoc = await transaction.get(ymidRef);

            // If the `ymid` document already exists, it means we've processed this ad view before.
            // We should not give points again. We'll throw an error to stop the process.
            if (ymidDoc.exists) {
                throw new Error("Duplicate ymid detected. No reward will be given.");
            }

            // If the ymid is new, we proceed to reward the user.
            const userRef = db.collection("users").doc(telegram_id);
            const pointsToAdd = 5; // The number of points for watching an ad.

            // We use `FieldValue.increment()` to safely add points to the user's current total.
            // This prevents issues if the user's points are updated from multiple places at once.
            transaction.update(userRef, {
                points: admin.firestore.FieldValue.increment(pointsToAdd)
            });

            // After rewarding the user, we create the `ymid` document.
            // This marks the event as processed so it cannot be rewarded again.
            transaction.set(ymidRef, {
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                telegram_id: telegram_id,
                zone_id: zone_id || null
            });
        });

        // --- Step 3: Send Success Response ---
        // If the transaction was successful, log it and send a 200 OK response.
        // Monetag needs this 200 OK to know that the postback was received successfully.
        functions.logger.info(`Successfully rewarded ${telegram_id} for ymid ${ymid}.`);
        return res.status(200).send("OK: Reward processed.");

    } catch (error) {
        // If any error occurred during the process (e.g., duplicate ymid, database error),
        // we log the error and send an appropriate response.
        functions.logger.error(`Failed to process reward for ymid ${ymid}:`, error);

        // If it was a duplicate ymid, we still send a 200 OK because we successfully handled the request
        // (by ignoring it). Sending an error might cause Monetag to retry, which we don't want.
        if (error.message.includes("Duplicate ymid")) {
            return res.status(200).send("OK: Duplicate event.");
        }

        // For any other errors, we send a 500 Internal Server Error response.
        return res.status(500).send("Error: Internal server error.");
    }
});
