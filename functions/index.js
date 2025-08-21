const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * Handles server-to-server postbacks from Monetag to securely reward users.
 * This function is designed to be deployed as a Firebase Cloud Function.
 *
 * Expected query parameters from the client via Monetag macros:
 * - ymid: A unique ID for the ad event to prevent duplicate rewards.
 * - telegram_id: The user's Telegram ID.
 * - reward_amount: The amount of TK to award (e.g., 5 or 10).
 * - ad_type: A descriptor of the ad shown (e.g., 'interstitial').
 */
exports.rewardUser = functions.https.onRequest(async (req, res) => {
    // Set CORS headers to allow requests from any origin, which is good practice for public APIs.
    res.set("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") {
        res.set("Access-Control-Allow-Methods", "GET");
        res.set("Access-Control-Allow-Headers", "Content-Type");
        res.set("Access-control-max-age", "3600");
        res.status(204).send("");
        return;
    }

    functions.logger.info("Received reward request with query:", req.query);

    const {
        ymid,
        telegram_id: telegramId,
        reward_amount: rewardAmountStr,
        ad_type: adType,
    } = req.query;

    // --- Validation ---
    if (!ymid || !telegramId || !rewardAmountStr) {
        functions.logger.error("Missing required parameters.", { ymid, telegramId, rewardAmountStr });
        return res.status(400).send("Error: Missing required parameters.");
    }

    const rewardAmount = parseInt(rewardAmountStr, 10);
    if (isNaN(rewardAmount) || rewardAmount <= 0) {
        functions.logger.error("Invalid reward amount.", { rewardAmountStr });
        return res.status(400).send("Error: Invalid reward amount.");
    }

    // --- Idempotency and Transaction ---
    const ymidRef = db.collection("processed_rewards").doc(ymid);
    const userRef = db.collection("users").doc(String(telegramId));

    try {
        await db.runTransaction(async (transaction) => {
            const ymidDoc = await transaction.get(ymidRef);

            if (ymidDoc.exists) {
                // This ymid has already been processed.
                throw new Error("Duplicate ymid");
            }

            // Get user doc to ensure it exists before trying to update.
            const userDoc = await transaction.get(userRef);
            if (!userDoc.exists) {
                throw new Error("User document does not exist");
            }

            // Reward the user and log the transaction.
            transaction.update(userRef, {
                tk: admin.firestore.FieldValue.increment(rewardAmount)
            });
            transaction.set(ymidRef, {
                processedAt: admin.firestore.FieldValue.serverTimestamp(),
                telegramId: telegramId,
                rewardAmount: rewardAmount,
                adType: adType || null,
            });
        });

        functions.logger.info(`Successfully processed reward for user ${telegramId}, ymid: ${ymid}`);
        return res.status(200).send("OK: Reward processed successfully.");

    } catch (error) {
        functions.logger.error(`Failed to process reward for ymid: ${ymid}`, error);

        if (error.message === "Duplicate ymid") {
            // It's not an error if we receive a duplicate; it just means we don't process it.
            // Sending 200 OK prevents Monetag from retrying the postback.
            return res.status(200).send("OK: Duplicate event ignored.");
        }
        if (error.message === "User document does not exist") {
            // Can't reward a user that doesn't exist in our DB.
            return res.status(404).send("Error: User not found.");
        }

        // For all other errors, signal that something went wrong on our end.
        return res.status(500).send("Internal Server Error.");
    }
});
