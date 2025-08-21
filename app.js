// --- Firebase SDK Imports ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- Firebase Configuration ---
// This configuration was provided by the user.
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

document.addEventListener('DOMContentLoaded', () => {
    // --- Telegram Web App Initialization ---
    const tg = window.Telegram.WebApp;
    tg.ready();

    // --- Mock User for Local Testing ---
    // const currentUser = { id: 123456789, first_name: "Test", username: "testuser" };
    // const start_param = "referrer_id_123"; // Mock start_param

    const currentUser = tg.initDataUnsafe?.user;
    const start_param = tg.initDataUnsafe?.start_param;

    if (!currentUser) {
        document.getElementById('app-container').innerHTML = '<p class="text-center text-red-500">Could not retrieve user data. Please open this app through Telegram.</p>';
        return;
    }

    const userId = String(currentUser.id);
    const userRef = doc(db, 'users', userId);

    // --- App State ---
    let userState = {}; // Will be populated from Firestore
    let activeTimers = {};

    // --- DOM ELEMENTS ---
    const tkDisplay = document.getElementById('tk-display');
    const referralDisplay = document.getElementById('referral-display');
    const buttons = {
        ri1: document.getElementById('rewarded-interstitial-1'),
        ri2: document.getElementById('rewarded-interstitial-2'),
        ri3: document.getElementById('rewarded-interstitial-3'),
        rp1: document.getElementById('rewarded-popup-1'),
        rp2: document.getElementById('rewarded-popup-2'),
        inApp: document.getElementById('in-app-interstitial'),
        spin: document.getElementById('spin-earn-btn'),
        withdraw: document.getElementById('withdraw-btn'),
        refer: document.getElementById('refer-btn'),
        guide: document.getElementById('guide-btn'),
    };
    const timers = {
        ri1: document.getElementById('timer-ri-1'),
        ri2: document.getElementById('timer-ri-2'),
        ri3: document.getElementById('timer-ri-3'),
        rpShared: document.getElementById('timer-rp-shared')
    };
    const modals = {
        spin: document.getElementById('spin-modal'),
        guide: document.getElementById('guide-modal'),
        withdraw: document.getElementById('withdraw-modal'),
    };
    const closeButtons = {
        spin: document.getElementById('close-spin-modal'),
        guide: document.getElementById('close-guide-modal'),
        withdraw: document.getElementById('close-withdraw-modal'),
    };
    const forms = {
        withdraw: document.getElementById('withdraw-form'),
    };
    const spinElements = {
        wheel: document.getElementById('wheel'),
        spinBtn: document.getElementById('spin-btn'),
        spinResult: document.getElementById('spin-result'),
    };
    const wheelPointValues = [5, 10, 15, 20, 25, 40, 3, 5];
    const sliceColors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

    // --- CORE FUNCTIONS ---

    const updateUI = () => {
        tkDisplay.textContent = userState.tk || 0;
        referralDisplay.textContent = userState.referrals || 0;
        initializeAllCooldowns();
    };

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const updateTimerDisplay = (key, timerEl, buttonEls) => {
        const cooldowns = userState.cooldowns || {};
        const endTime = cooldowns[key] ? cooldowns[key].toDate() : null;

        if (!endTime || Date.now() >= endTime) {
            timerEl.textContent = '';
            buttonEls.forEach(btn => btn.disabled = false);
            if (activeTimers[key]) {
                clearInterval(activeTimers[key]);
                delete activeTimers[key];
            }
            return;
        }

        const timeLeft = endTime - Date.now();
        buttonEls.forEach(btn => btn.disabled = true);
        timerEl.textContent = `Please wait: ${formatTime(timeLeft)}`;
    };

    const startCooldownTimer = (key, timerEl, buttonEls) => {
        if (activeTimers[key]) clearInterval(activeTimers[key]);
        updateTimerDisplay(key, timerEl, buttonEls);
        activeTimers[key] = setInterval(() => updateTimerDisplay(key, timerEl, buttonEls), 1000);
    };

    const initializeAllCooldowns = () => {
        const allCooldowns = [
            { key: 'ri1', timerEl: timers.ri1, buttons: [buttons.ri1] },
            { key: 'ri2', timerEl: timers.ri2, buttons: [buttons.ri2] },
            { key: 'ri3', timerEl: timers.ri3, buttons: [buttons.ri3] },
            { key: 'rp_shared', timerEl: timers.rpShared, buttons: [buttons.rp1, buttons.rp2] }
        ];
        allCooldowns.forEach(cd => startCooldownTimer(cd.key, cd.timerEl, cd.buttons));
    };

    // --- FEATURE LOGIC ---

    const handleAd = async (buttonEls, cooldownKey, adFunction, reward, adType) => {
        const cooldowns = userState.cooldowns || {};
        const endTime = cooldowns[cooldownKey] ? cooldowns[cooldownKey].toDate() : null;

        if (cooldownKey && endTime && Date.now() < endTime) {
            tg.showAlert("This ad is on cooldown. Please wait for the timer to finish.");
            return;
        }

        buttonEls.forEach(btn => btn.disabled = true);

        const ymid = crypto.randomUUID();
        const options = {
            ymid: ymid,
            telegram_id: userId,
            reward_amount: reward,
            ad_type: adType
        };

        try {
            await adFunction(options);
            tg.showAlert("Thanks for watching! Your reward is being processed and will appear in your balance soon.");
            if (cooldownKey) {
                const newCooldowns = { ...userState.cooldowns, [cooldownKey]: Timestamp.fromDate(new Date(Date.now() + 10 * 60 * 1000)) };
                await updateDoc(userRef, { cooldowns: newCooldowns });
                userState.cooldowns = newCooldowns;
                startCooldownTimer(cooldownKey, timers[cooldownKey] || timers.rpShared, buttonEls);
            }
        } catch (e) {
            console.error("Ad failed or was closed early.", e);
            tg.showAlert("Ad was not completed. No TK awarded.");
        } finally {
            if (!cooldownKey) {
                 buttonEls.forEach(btn => btn.disabled = false);
            }
        }
    };

    const handleReferral = async () => {
        if (!start_param || start_param === userId) return;

        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            const referrerRef = doc(db, 'users', start_param);
            const referrerDoc = await getDoc(referrerRef);
            if (referrerDoc.exists()) {
                await updateDoc(referrerRef, {
                    tk: increment(10),
                    referrals: increment(1)
                });
                console.log(`Credited 10 TK to referrer ${start_param}`);
            }
        }
    };

    const referFriend = () => {
        const botUsername = "YOUR_BOT_USERNAME"; // IMPORTANT: Replace with your bot's username
        if (botUsername === "YOUR_BOT_USERNAME") {
            tg.showAlert("Bot username is not set. Please contact support.");
            return;
        }
        const referralLink = `https://t.me/${botUsername}?start=${userId}`;
        tg.showPopup({
            title: 'Your Referral Link',
            message: `Share this link with your friends. You get 10 TK for each new user who starts the bot with your link!\n\n${referralLink}`,
            buttons: [{id: 'copy', type: 'default', text: 'Copy Link'}, {type: 'cancel'}]
        }, (buttonId) => {
            if (buttonId === 'copy') {
                navigator.clipboard.writeText(referralLink).then(() => tg.showAlert('Link copied to clipboard!'));
            }
        });
    };

    const spinTheWheel = async () => {
        const lastSpin = userState.lastSpinTime ? userState.lastSpinTime.toDate() : null;
        if (lastSpin && (Date.now() - lastSpin < 2 * 60 * 60 * 1000)) {
             tg.showAlert("You can spin again in a while. Please check back later.");
             return;
        }

        spinElements.spinBtn.disabled = true;
        spinElements.spinResult.textContent = "Spinning...";

        const randomSlice = Math.floor(Math.random() * wheelPointValues.length);
        const winningTK = wheelPointValues[randomSlice];

        const finalRotation = (5 * 360) + (randomSlice * (360 / wheelPointValues.length)) + ((360 / wheelPointValues.length) / 2);
        spinElements.wheel.style.transform = `rotate(${finalRotation}deg)`;

        setTimeout(async () => {
            spinElements.spinResult.textContent = `You won ${winningTK} TK!`;
            const newLastSpinTime = Timestamp.fromDate(new Date());
            await updateDoc(userRef, {
                tk: increment(winningTK),
                lastSpinTime: newLastSpinTime
            });
            userState.tk += winningTK;
            userState.lastSpinTime = newLastSpinTime;
            updateUI();
            spinElements.spinBtn.disabled = false;
        }, 4500);
    };

    const handleWithdraw = async (event) => {
        event.preventDefault();
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';

        const formData = new FormData(event.target);
        const requestData = {
            name: formData.get('name'),
            method: formData.get('method'),
            number: formData.get('number'),
        };

        try {
            await addDoc(collection(db, 'withdrawals'), {
                userId: userId,
                userName: currentUser.first_name,
                requestDetails: requestData,
                tkWithdrawn: 50,
                status: 'pending',
                timestamp: Timestamp.fromDate(new Date())
            });
            await updateDoc(userRef, { tk: increment(-50) });
            userState.tk -= 50;
            updateUI();
            modals.withdraw.classList.add('hidden');
            tg.showAlert('Withdrawal request submitted successfully! 50 TK have been deducted.');
        } catch (e) {
            console.error("Error submitting withdrawal request: ", e);
            tg.showAlert('There was an error submitting your request.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = 'Submit Request';
            event.target.reset();
        }
    };

    // --- EVENT LISTENERS & INITIALIZATION ---
    const initApp = async () => {
        tg.expand();
        await handleReferral();
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
            const newUser = {
                tk: 0,
                referrals: 0,
                lastSpinTime: null,
                cooldowns: {},
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

        // Ad Buttons
        buttons.ri1.addEventListener('click', () => handleAd([buttons.ri1], 'ri1', () => show_9671872(), 5, 'interstitial'));
        buttons.ri2.addEventListener('click', () => handleAd([buttons.ri2], 'ri2', () => show_9671872(), 5, 'interstitial'));
        buttons.ri3.addEventListener('click', () => handleAd([buttons.ri3], 'ri3', () => show_9671872(), 5, 'interstitial'));
        const sharedPopupHandler = () => handleAd([buttons.rp1, buttons.rp2], 'rp_shared', () => show_9671872('pop'), 5, 'popup');
        buttons.rp1.addEventListener('click', sharedPopupHandler);
        buttons.rp2.addEventListener('click', sharedPopupHandler);
        buttons.inApp.addEventListener('click', () => handleAd([buttons.inApp], null, () => show_9671872({ type: 'inApp' }), 10, 'inApp'));

        // Feature Buttons
        buttons.refer.addEventListener('click', referFriend);
        buttons.guide.addEventListener('click', () => modals.guide.classList.remove('hidden'));
        buttons.spin.addEventListener('click', () => {
            modals.spin.classList.remove('hidden');
            // Generate wheel slices only when modal is opened
            spinElements.wheel.innerHTML = '';
            wheelPointValues.forEach((points, i) => {
                const slice = document.createElement('div');
                slice.className = 'wheel-slice';
                slice.style.transform = `rotate(${(360 / wheelPointValues.length) * i}deg)`;
                slice.style.backgroundColor = sliceColors[i % sliceColors.length];
                const text = document.createElement('span');
                text.style.transform = `rotate(45deg) translate(-20px, -20px)`;
                text.innerText = points;
                slice.appendChild(text);
                spinElements.wheel.appendChild(slice);
            });
        });
        buttons.withdraw.addEventListener('click', () => {
             if ((userState.tk || 0) < 50 || (userState.referrals || 0) < 5) {
                tg.showAlert(`You need at least 50 TK and 5 referrals to withdraw. You have ${userState.tk || 0} TK and ${userState.referrals || 0} referrals.`);
                return;
            }
            modals.withdraw.classList.remove('hidden')
        });

        // Other Listeners
        spinElements.spinBtn.addEventListener('click', spinTheWheel);
        forms.withdraw.addEventListener('submit', handleWithdraw);
        closeButtons.spin.addEventListener('click', () => modals.spin.classList.add('hidden'));
        closeButtons.guide.addEventListener('click', () => modals.guide.classList.add('hidden'));
        closeButtons.withdraw.addEventListener('click', () => modals.withdraw.classList.add('hidden'));
    };

    initApp();
});
