// --- Firebase SDKs ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-analytics.js";

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDi3Xb3xPk_7bxG0brh85a_KiR80DApWPo",
    authDomain: "xspin-income-bot.firebaseapp.com",
    projectId: "xspin-income-bot",
    storageBucket: "xspin-income-bot.firebasestorage.app",
    messagingSenderId: "784212385666",
    appId: "1:784212385666:web:827eca0781e2441b14399b",
    measurementId: "G-R328XD7019"
};

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const analytics = getAnalytics(app);

document.addEventListener('DOMContentLoaded', () => {
    // --- Telegram Web App Initialization ---
    const tg = window.Telegram.WebApp;
    tg.ready();

    // --- Mock User for Local Testing ---
    // Comment this out when deploying
    // const currentUser = { id: 123456789, first_name: "Test", username: "testuser" };

    // Use real Telegram user data
    const currentUser = tg.initDataUnsafe?.user;

    if (!currentUser) {
        document.getElementById('app-container').innerHTML = '<p class="text-center text-red-500">Could not retrieve user data. Please open this app through Telegram.</p>';
        return;
    }

    const userId = String(currentUser.id);
    const userRef = doc(db, 'users', userId);

    // --- App State ---
    let userState = {
        points: 0,
        referrals: 0,
        lastSpinTime: null
    };

    // --- UI Elements ---
    const pointsDisplay = document.getElementById('points-display');
    const referralDisplay = document.getElementById('referral-display');
    const watchAdBtn = document.getElementById('watch-ad-btn');
    const referBtn = document.getElementById('refer-btn');
    const spinEarnBtn = document.getElementById('spin-earn-btn');
    const guideBtn = document.getElementById('guide-btn');
    const withdrawBtn = document.getElementById('withdraw-btn');

    // Modals
    const spinModal = document.getElementById('spin-modal');
    const guideModal = document.getElementById('guide-modal');
    const withdrawModal = document.getElementById('withdraw-modal');
    const closeSpinModalBtn = document.getElementById('close-spin-modal');
    const closeGuideModalBtn = document.getElementById('close-guide-modal');
    const closeWithdrawModalBtn = document.getElementById('close-withdraw-modal');

    // Forms
    const withdrawForm = document.getElementById('withdraw-form');

    // Spin Wheel
    const wheel = document.getElementById('wheel');
    const spinBtn = document.getElementById('spin-btn');
    const spinResult = document.getElementById('spin-result');
    const wheelPoints = [3, 20, 5, 40, 10, 25, 15, 5]; // 8 slices
    const sliceColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

    // --- Main App Initialization ---
    async function initApp() {
        tg.expand(); // Expand the app to full height
        await handleReferral();
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            // Create new user
            const newUser = {
                points: 0,
                referrals: 0,
                lastSpinTime: null,
                firstName: currentUser.first_name,
                username: currentUser.username || '',
                createdAt: Timestamp.fromDate(new Date())
            };
            await setDoc(userRef, newUser);
            userState = newUser;
        } else {
            userState = docSnap.data();
        }
        updateUI();
    }

    // --- UI Update Function ---
    function updateUI() {
        pointsDisplay.innerText = userState.points || 0;
        referralDisplay.innerText = userState.referrals || 0;
    }

    // --- Monetag Ad ---
    function triggerMonetagAd() {
        // This function is now responsible for initiating the ad, but NOT for awarding points.
        // The point reward is handled by the secure backend (Firebase Cloud Function) via postback.

        // Generate a unique ID for this specific ad event.
        // This is crucial for the backend to prevent duplicate reward requests (idempotency).
        const ymid = crypto.randomUUID();

        // Check if the Monetag SDK function is available on the window object.
        if (window.show_9671872) {
            console.log(`Triggering ad with ymid: ${ymid} and telegram_id: ${userId}`);

            // We need to pass our custom data to the ad call.
            // Monetag's postback system will then use macros to pick up these values and send them to our backend.
            const options = {
                ymid: ymid,
                telegram_id: userId
            };

            // Call the ad function with the popup format and our custom options.
            window.show_9671872('pop', options).then(() => {
                // IMPORTANT: We NO LONGER award points on the client-side.
                // The .then() block is now only for UI feedback.
                console.log("Ad popup closed. Reward will be processed by the server if successful.");
                tg.showAlert('Thanks for watching! Your reward is being processed and will appear in your balance soon.');
            }).catch(e => {
                // Handle cases where the ad fails to show.
                console.error("Error showing ad: ", e);
                tg.showAlert('Sorry, an error occurred while showing the ad. Please try again.');
            });
        } else {
            console.error("Monetag ad function 'show_9671872' not found on window object.");
            tg.showAlert("Error: Ad service is not available at the moment.");
        }
    }

    // --- Feature Logic ---
    function updateUserPoints(newPoints, newReferrals = userState.referrals) {
        userState.points = newPoints;
        userState.referrals = newReferrals;
        updateDoc(userRef, { points: newPoints, referrals: newReferrals })
            .then(updateUI)
            .catch(e => console.error("Error updating points: ", e));
    }

    async function handleReferral() {
        const referrerId = tg.initDataUnsafe?.start_param;
        if (!referrerId || referrerId === userId) return;

        const docSnap = await getDoc(userRef);
        // Only give referral points if the user is new and not referring themselves
        if (!docSnap.exists()) {
            const referrerRef = doc(db, 'users', referrerId);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
                await updateDoc(referrerRef, {
                    points: increment(10),
                    referrals: increment(1)
                });
                console.log(`Credited 10 points to referrer ${referrerId}`);
            }
        }
    }

    function referFriend() {
        const botUsername = "xspin_income_bot"; // IMPORTANT: Please replace this with your bot's username
        if (botUsername === "YOUR_BOT_USERNAME") {
            tg.showAlert("Please ask the developer to set the bot username in app.js.");
            return;
        }
        const referralLink = `https://t.me/${botUsername}?start=${userId}`;
        tg.showPopup({
            title: 'Your Referral Link',
            message: `Share this link with your friends. You get 10 points for each new user who starts the bot with your link!\n\n${referralLink}`,
            buttons: [{id: 'copy', type: 'default', text: 'Copy Link'}, {type: 'cancel'}]
        }, (buttonId) => {
            if (buttonId === 'copy') {
                navigator.clipboard.writeText(referralLink).then(() => {
                   tg.showAlert('Link copied to clipboard!');
                });
            }
        });
    }

    function openSpinModal() {
        const twoHours = 2 * 60 * 60 * 1000;
        const lastSpin = userState.lastSpinTime ? userState.lastSpinTime.toDate() : null;
        const now = new Date();

        if (lastSpin && (now - lastSpin < twoHours)) {
            const timeLeft = twoHours - (now - lastSpin);
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            tg.showAlert(`You can spin again in ${hours}h ${minutes}m.`);
            return;
        }

        generateWheelSlices();
        spinResult.innerText = '';
        spinBtn.disabled = false;
        spinModal.classList.remove('hidden');
    }

    function generateWheelSlices() {
        wheel.innerHTML = '';
        wheelPoints.forEach((points, i) => {
            const rotation = (360 / wheelPoints.length) * i;
            const slice = document.createElement('div');
            slice.className = 'wheel-slice';
            slice.style.transform = `rotate(${rotation}deg)`;
            slice.style.backgroundColor = sliceColors[i % sliceColors.length];

            const text = document.createElement('span');
            text.style.transform = `rotate(45deg) translate(-20px, -20px)`;
            text.innerText = points;
            slice.appendChild(text);
            wheel.appendChild(slice);
        });
    }

    function spinTheWheel() {
        spinBtn.disabled = true;
        spinResult.innerText = "Spinning...";

        const totalSlices = wheelPoints.length;
        const sliceAngle = 360 / totalSlices;
        const randomSlice = Math.floor(Math.random() * totalSlices);
        const winningPoints = wheelPoints[randomSlice];

        const spinOffset = (randomSlice * sliceAngle) + (sliceAngle / 2);
        const randomSpins = 5 * 360; // Spin at least 5 times
        const finalRotation = randomSpins + spinOffset;

        wheel.style.transform = `rotate(${finalRotation}deg)`;

        setTimeout(() => {
            spinResult.innerText = `You won ${winningPoints} points!`;
            const newLastSpinTime = Timestamp.fromDate(new Date());
            userState.lastSpinTime = newLastSpinTime;
            updateDoc(userRef, {
                points: increment(winningPoints),
                lastSpinTime: newLastSpinTime
            });
            // Manually update local state for points since increment doesn't return new value
            userState.points += winningPoints;
            updateUI();
        }, 4500); // Wait for animation to finish
    }

    function withdraw() {
        const requiredPoints = 50;
        const requiredReferrals = 5;

        if (userState.points < requiredPoints || (userState.referrals || 0) < requiredReferrals) {
            tg.showAlert(`Withdrawal failed. You need at least ${requiredPoints} points and ${requiredReferrals} referrals. You have ${userState.points || 0} points and ${userState.referrals || 0} referrals.`);
            return;
        }

        // Open the withdraw modal instead of just confirming
        withdrawModal.classList.remove('hidden');
    }

    async function handleWithdrawalFormSubmit(event) {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';

        const formData = new FormData(event.target);
        const name = formData.get('name');
        const method = formData.get('method');
        const number = formData.get('number');

        try {
            // 1. Log the withdrawal request
            await addDoc(collection(db, 'withdrawals'), {
                userId: userId,
                userName: currentUser.first_name,
                userUsername: currentUser.username || '',
                requesterName: name,
                method: method,
                number: number,
                pointsWithdrawn: 50,
                status: 'pending',
                timestamp: Timestamp.fromDate(new Date())
            });

            // 2. Deduct points from user
            const newPoints = userState.points - 50;
            await updateDoc(userRef, { points: newPoints });
            userState.points = newPoints;
            updateUI();

            // 3. Close modal and show success
            withdrawModal.classList.add('hidden');
            tg.showAlert('Withdrawal request submitted successfully! 50 points have been deducted. Your request will be processed soon.');

        } catch (e) {
            console.error("Error submitting withdrawal request: ", e);
            tg.showAlert('There was an error submitting your request. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Submit Request';
            event.target.reset();
        }
    }

    // --- Event Listeners ---
    watchAdBtn.addEventListener('click', triggerMonetagAd);
    referBtn.addEventListener('click', referFriend);
    withdrawBtn.addEventListener('click', withdraw);

    // Modals
    spinEarnBtn.addEventListener('click', openSpinModal);
    guideBtn.addEventListener('click', () => guideModal.classList.remove('hidden'));
    closeSpinModalBtn.addEventListener('click', () => spinModal.classList.add('hidden'));
    closeGuideModalBtn.addEventListener('click', () => guideModal.classList.add('hidden'));
    closeWithdrawModalBtn.addEventListener('click', () => withdrawModal.classList.add('hidden'));

    // Forms
    withdrawForm.addEventListener('submit', handleWithdrawalFormSubmit);

    // Spin Wheel
    spinBtn.addEventListener('click', spinTheWheel);

    // --- Start the app ---
    initApp();
});
