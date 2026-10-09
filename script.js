/* =========================================================
   NO-ZOOM GUARD (pinch, double-tap, Ctrl+wheel, Ctrl +/-)
   ========================================================= */
(function () {

    ["gesturestart", "gesturechange", "gestureend"].forEach(
        function (type) {
            document.addEventListener(
                type,
                function (event) { event.preventDefault(); },
                { passive: false }
            );
        }
    );

    document.addEventListener(
        "touchmove",
        function (event) {
            if (event.touches && event.touches.length > 1) {
                event.preventDefault();
            }
        },
        { passive: false }
    );

    document.addEventListener(
        "wheel",
        function (event) {
            if (event.ctrlKey) { event.preventDefault(); }
        },
        { passive: false }
    );

    document.addEventListener(
        "keydown",
        function (event) {
            if (
                (event.ctrlKey || event.metaKey) &&
                ["+", "-", "=", "_", "0"].indexOf(event.key) !== -1
            ) {
                event.preventDefault();
            }
        }
    );

})();


/* =========================================================
   PULL TO RELOAD (swipe down at the top / scroll up at the top)
   ========================================================= */
(function () {

    const TRIGGER = 70;      /* px of pull needed */
    const MAX_PULL = 120;

    let indicator = null;
    let startY = 0;
    let pull = 0;
    let tracking = false;
    let reloading = false;

    function appVisible() {

        const app = document.getElementById("dictionary-app");

        if (!app || app.hidden || app.style.display === "none") {
            return false;
        }

        /* not while a pop-up or the user list is open */
        return !document.querySelector(
            ".modal-overlay:not([hidden]), .users-overlay:not([hidden])"
        );

    }

    function ensureIndicator() {

        if (indicator) return indicator;

        indicator = document.createElement("div");

        indicator.className = "ptr";

        indicator.setAttribute("aria-hidden", "true");

        indicator.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
            'stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">' +
            '<path d="M21 12a9 9 0 1 1-3-6.7"/>' +
            '<polyline points="21 3 21 9 15 9"/>' +
            "</svg>";

        document.body.appendChild(indicator);

        return indicator;

    }

    function setPull(value) {

        pull = value;

        const el = ensureIndicator();

        el.style.setProperty("--pull", value + "px");

        el.style.setProperty("--spin", (value / MAX_PULL) * 270 + "deg");

        el.classList.toggle("ptr-show", value > 4);

        el.classList.toggle("ptr-ready", value >= TRIGGER);

    }

    function reloadNow() {

        if (reloading) return;

        reloading = true;

        const el = ensureIndicator();

        el.style.setProperty("--pull", "64px");

        el.classList.add("ptr-show", "ptr-ready", "ptr-loading");

        setTimeout(
            function () { window.location.reload(); },
            650
        );

    }

    function reset() {

        tracking = false;

        if (!reloading) setPull(0);

    }

    document.addEventListener(
        "touchstart",
        function (event) {

            if (
                reloading ||
                event.touches.length !== 1 ||
                window.scrollY > 0 ||
                !appVisible()
            ) {
                tracking = false;
                return;
            }

            startY = event.touches[0].clientY;

            tracking = true;

        },
        { passive: true }
    );

    document.addEventListener(
        "touchmove",
        function (event) {

            if (!tracking || reloading) return;

            const dy = event.touches[0].clientY - startY;

            if (dy <= 0 || window.scrollY > 0) {
                reset();
                return;
            }

            /* rubber-band: pulling gets harder the further you go */
            setPull(Math.min(MAX_PULL, dy * 0.5));

            if (event.cancelable) event.preventDefault();

        },
        { passive: false }
    );

    function release() {

        if (!tracking) return;

        const ready = pull >= TRIGGER;

        tracking = false;

        if (ready) {
            reloadNow();
        } else {
            setPull(0);
        }

    }

    document.addEventListener("touchend", release);
    document.addEventListener("touchcancel", reset);

    /* ---- PC / trackpad: keep scrolling up while already at the top ---- */
    let wheelSum = 0;
    let wheelTimer = null;
    let topSince = 0;

    window.addEventListener(
        "scroll",
        function () {
            topSince = window.scrollY <= 0 ? (topSince || Date.now()) : 0;
        },
        { passive: true }
    );

    document.addEventListener(
        "wheel",
        function (event) {

            if (reloading || event.ctrlKey || !appVisible()) return;

            if (window.scrollY > 0) {
                wheelSum = 0;
                return;
            }

            if (!topSince) topSince = Date.now();

            /* only count scrolling that starts after resting at the top */
            if (event.deltaY >= 0 || Date.now() - topSince < 400) {
                wheelSum = 0;
                return;
            }

            wheelSum += -event.deltaY;

            setPull(Math.min(MAX_PULL, wheelSum / 4));

            clearTimeout(wheelTimer);

            wheelTimer = setTimeout(
                function () {
                    wheelSum = 0;
                    if (!reloading) setPull(0);
                },
                350
            );

            if (wheelSum >= 450) {
                wheelSum = 0;
                reloadNow();
            }

        },
        { passive: true }
    );

})();


/* =========================================================
   KOREAN–NEPALI DICTIONARY
   Dictionary + Supabase Authentication
   ========================================================= */


/* =========================================================
   SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL =
    "https://fcwmksetmdeuzrxwofce.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Ren_76mp55gNH_U2vZsGAg_XZB4jNyF";


/*
 * Whoever logs in with this email gets admin
 * powers: editing/deleting any word applies for
 * everyone (writes to the database), adding a
 * word adds it to the shared dictionary, and a
 * "Users" panel appears for managing accounts.
 */

const ADMIN_EMAIL =
    "whitewalkerofnorth@gmail.com";

/*
 * REMEMBER ME
 * Ticked   -> session kept in localStorage (stays logged in
 *             after the browser is closed).
 * Unticked -> session kept in sessionStorage (logged out when
 *             the tab/browser is closed).
 * The choice itself is stored in localStorage under REMEMBER_KEY.
 */

const REMEMBER_KEY = "kn_remember_me";

function getRememberPreference() {

    try {
        return localStorage.getItem(REMEMBER_KEY) !== "0";
    } catch (e) {
        return true;
    }

}

function setRememberPreference(remember) {

    try {
        localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
    } catch (e) {}

}

const rememberAwareStorage = {

    getItem: function (key) {

        try {

            const fromLocal = localStorage.getItem(key);

            return fromLocal !== null
                ? fromLocal
                : sessionStorage.getItem(key);

        } catch (e) {
            return null;
        }

    },

    setItem: function (key, value) {

        try {

            const keep = getRememberPreference()
                ? localStorage
                : sessionStorage;

            const drop = keep === localStorage
                ? sessionStorage
                : localStorage;

            keep.setItem(key, value);
            drop.removeItem(key);

        } catch (e) {}

    },

    removeItem: function (key) {

        try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
        } catch (e) {}

    }

};


/*
 * Detect — BEFORE the Supabase client strips the URL — that the
 * page was opened from a password-reset email link, or that the
 * link was invalid/expired.
 */

const OPENED_FROM_RECOVERY_LINK =
    /type=recovery/.test(window.location.hash) ||
    /type=recovery/.test(window.location.search);

const RESET_LINK_ERROR =
    /error_code=|error_description=/.test(window.location.hash);

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
            auth: {
                storage: rememberAwareStorage
            }
        }
    );


/* =========================================================
   WAIT FOR PAGE
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

    "use strict";


    /* =====================================================
       AUTHENTICATION ELEMENTS
       ===================================================== */

    const authSection =
        document.getElementById("auth-section");

    const dictionaryApp =
        document.getElementById("dictionary-app");

    const authTitle =
        document.getElementById("auth-title");

    const authEmail =
        document.getElementById("auth-email");

    const authPassword =
        document.getElementById("auth-password");

    const authSubmit =
        document.getElementById("auth-submit");

    const toggleAuth =
        document.getElementById("toggle-auth");

    const forgotPassword =
        document.getElementById("forgot-password");

    const authMessage =
        document.getElementById("auth-message");

    const resetPasswordSection =
        document.getElementById("reset-password-section");

    const newPasswordInput =
        document.getElementById("new-password-input");

    const confirmNewPasswordInput =
        document.getElementById("confirm-new-password-input");

    const saveNewPasswordBtn =
        document.getElementById("save-new-password-btn");

    const resetPasswordMessage =
        document.getElementById("reset-password-message");

    const authName =
        document.getElementById("auth-name");

    const authDob =
        document.getElementById("auth-dob");

    const authConfirmPassword =
        document.getElementById("auth-confirm-password");

    const signupExtraTop =
        document.getElementById("signupExtraTop");

    const signupExtraBottom =
        document.getElementById("signupExtraBottom");

    const usersOverlay =
        document.getElementById("usersOverlay");

    const usersOverlayContent =
        document.getElementById("usersOverlayContent");

    const closeUsersOverlay =
        document.getElementById("closeUsersOverlay");

    const authRemember =
        document.getElementById("auth-remember");

    const rememberRow =
        document.getElementById("rememberRow");

    const forgotSection =
        document.getElementById("forgot-password-section");

    const approvalSection =
        document.getElementById("approval-section");

    const forgotEmail =
        document.getElementById("forgot-email");

    const forgotSend =
        document.getElementById("forgot-send");

    const forgotBack =
        document.getElementById("forgot-back");

    const forgotMessage =
        document.getElementById("forgot-message");

    const resetCancel =
        document.getElementById("reset-cancel");


    let isSignupMode = false;

    let isAdminUser = false;

    /*
     * True while the user arrived from a reset-password email
     * and hasn't chosen a new password yet. While true, the
     * dictionary must NOT open (the recovery link signs the
     * user in temporarily).
     */
    let recoveryMode = OPENED_FROM_RECOVERY_LINK;

    if (authRemember) {
        authRemember.checked = getRememberPreference();
    }

    function clearUrlHash() {

        try {

            history.replaceState(
                null,
                "",
                window.location.pathname
            );

        } catch (e) {}

    }


    /* =====================================================
       AUTH MESSAGE
       ===================================================== */

    function showAuthMessage(message, type) {

        if (!authMessage) return;

        authMessage.textContent = message;

        authMessage.className = "";

        if (type) {
            authMessage.classList.add(type);
        }

    }


    /* =====================================================
       SHOW LOGIN
       ===================================================== */

    function showLogin() {
        if (approvalSection) {
            approvalSection.style.display = "none";
        }


        if (forgotSection) {
            forgotSection.style.display = "none";
        }

        if (authSection) {
            authSection.style.display = "flex";
        }

        if (dictionaryApp) {
            dictionaryApp.hidden = true;
        }

        if (resetPasswordSection) {
            resetPasswordSection.style.display = "none";
        }

    }


    /* =====================================================
       SHOW DICTIONARY
       ===================================================== */

    function showDictionary() {

        /* Never open the dictionary mid-password-reset */
        if (recoveryMode) {
            showResetPasswordForm();
            return;
        }

        if (approvalSection) {
            approvalSection.style.display = "none";
        }

        if (forgotSection) {
            forgotSection.style.display = "none";
        }

        if (authSection) {
            authSection.style.display = "none";
        }

        if (dictionaryApp) {
            dictionaryApp.hidden = false;
        }

        if (resetPasswordSection) {
            resetPasswordSection.style.display = "none";
        }

        if (typeof render === "function") {
            render();
        }

    }


    /* =====================================================
       SHOW SET-NEW-PASSWORD FORM
       ===================================================== */

    function showResetPasswordForm() {

        const alreadyOpen =
            resetPasswordSection &&
            resetPasswordSection.style.display === "flex";

        if (approvalSection) {
            approvalSection.style.display = "none";
        }

        if (forgotSection) {
            forgotSection.style.display = "none";
        }

        if (authSection) {
            authSection.style.display = "none";
        }

        if (dictionaryApp) {
            dictionaryApp.hidden = true;
        }

        if (resetPasswordSection) {
            resetPasswordSection.style.display = "flex";
        }

        /* Don't wipe what the user is typing if this re-runs */
        if (alreadyOpen) {
            return;
        }

        if (newPasswordInput) {
            newPasswordInput.value = "";
            newPasswordInput.focus();
        }

        if (confirmNewPasswordInput) {
            confirmNewPasswordInput.value = "";
        }

        if (resetPasswordMessage) {
            resetPasswordMessage.textContent = "";
        }

    }


    /* =====================================================
       UPDATE USER
       ===================================================== */

    /* =====================================================
       PRESENCE HEARTBEAT
       ===================================================== */

    function getDeviceId() {

        let deviceId =
            localStorage.getItem(
                LS_DEVICE_ID
            );


        if (!deviceId) {

            deviceId =
                (
                    window.crypto &&
                    window.crypto.randomUUID
                )
                    ? window.crypto.randomUUID()
                    : (
                        "dev-" +
                        Date.now() +
                        "-" +
                        Math.random()
                            .toString(36)
                            .slice(2)
                    );


            localStorage.setItem(
                LS_DEVICE_ID,
                deviceId
            );

        }


        return deviceId;

    }


    function claimDeviceSession(userId) {

        return supabaseClient

            .from("active_sessions")

            .upsert({

                user_id:
                    userId,

                device_id:
                    getDeviceId(),

                updated_at:
                    new Date().toISOString()

            })

            .then(
                function (response) {

                    if (response.error) {

                        console.error(
                            "Couldn't claim session:",
                            response.error
                        );

                    }

                }
            );

    }


    function checkDeviceSession(userId) {

        supabaseClient

            .from("active_sessions")

            .select("device_id")

            .eq("user_id", userId)

            .maybeSingle()

            .then(
                function (response) {

                    if (response.error) {

                        console.error(
                            "Couldn't check session:",
                            response.error
                        );

                        return;

                    }


                    const activeDeviceId =
                        response.data &&
                        response.data.device_id;


                    if (
                        activeDeviceId &&
                        activeDeviceId !== getDeviceId()
                    ) {

                        performLogout(
                            "You've been logged out because your account was used on another device."
                        );

                    }

                }
            );

    }


    let presenceIntervalId =
        null;


    function sendHeartbeat(userId) {

        supabaseClient

            .from("profiles")

            .upsert({

                user_id:
                    userId,

                last_seen_at:
                    new Date().toISOString()

            })

            .then(
                function (response) {

                    if (response.error) {

                        console.error(
                            "Presence heartbeat failed:",
                            response.error
                        );

                    }

                }
            );


        checkDeviceSession(
            userId
        );

    }


    function startPresenceHeartbeat(userId) {

        stopPresenceHeartbeat();


        claimDeviceSession(
            userId
        )

            .then(
                function () {

                    sendHeartbeat(
                        userId
                    );

                }
            );


        presenceIntervalId =
            setInterval(
                function () {

                    sendHeartbeat(
                        userId
                    );

                },
                60000
            );

    }


    function stopPresenceHeartbeat() {

        if (presenceIntervalId) {

            clearInterval(
                presenceIntervalId
            );

            presenceIntervalId =
                null;

        }

    }


    let currentUserEmail =
        "";

    let currentUserMetadata =
        {};


    function updateUserInterface(user) {

        if (!user) return;

        console.log(
            "Logged in:",
            user.email
        );


        startPresenceHeartbeat(
            user.id
        );


        currentUserEmail =
            user.email ||
            "";

        currentUserMetadata =
            user.user_metadata ||
            {};


        isAdminUser =
            !!user.email &&
            user.email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase();


        if (typeof render === "function") {

            render();

        }

    }


    /* =====================================================
       LOGIN / CREATE ACCOUNT
       ===================================================== */

    if (authSubmit) {

        authSubmit.addEventListener(
            "click",
            async function () {

                const email =
                    authEmail.value.trim();

                const password =
                    authPassword.value;

                const name =
                    authName ?
                        authName.value.trim() :
                        "";

                const dob =
                    authDob ?
                        authDob.value :
                        "";

                const confirmPassword =
                    authConfirmPassword ?
                        authConfirmPassword.value :
                        "";


                /* VALIDATION */

                if (isSignupMode && !name) {

                    showAuthMessage(
                        "Please enter your full name.",
                        "error"
                    );

                    if (authName) {
                        authName.focus();
                    }

                    return;
                }


                if (isSignupMode && !dob) {

                    showAuthMessage(
                        "Please enter your date of birth.",
                        "error"
                    );

                    if (authDob) {
                        authDob.focus();
                    }

                    return;
                }


                if (!email) {

                    showAuthMessage(
                        "Please enter your email address.",
                        "error"
                    );

                    authEmail.focus();

                    return;
                }


                if (!password) {

                    showAuthMessage(
                        "Please enter your password.",
                        "error"
                    );

                    authPassword.focus();

                    return;
                }


                if (password.length < 6) {

                    showAuthMessage(
                        "Password must be at least 6 characters.",
                        "error"
                    );

                    authPassword.focus();

                    return;
                }


                if (isSignupMode && !confirmPassword) {

                    showAuthMessage(
                        "Please confirm your password.",
                        "error"
                    );

                    if (authConfirmPassword) {
                        authConfirmPassword.focus();
                    }

                    return;
                }


                if (isSignupMode && confirmPassword !== password) {

                    showAuthMessage(
                        "Passwords do not match.",
                        "error"
                    );

                    if (authConfirmPassword) {
                        authConfirmPassword.focus();
                    }

                    return;
                }


                setRememberPreference(
                    authRemember
                        ? authRemember.checked
                        : true
                );


                authSubmit.disabled = true;


                if (isSignupMode) {

                    authSubmit.textContent =
                        "Creating account...";

                } else {

                    authSubmit.textContent =
                        "Logging in...";

                }


                try {


                    /* =====================================
                       CREATE ACCOUNT
                       ===================================== */

                    if (isSignupMode) {

                        const {
                            data,
                            error
                        } =
                            await supabaseClient.auth.signUp({

                                email: email,

                                password: password,

                                options: {

                                    emailRedirectTo:
                                        window.location.origin +
                                        window.location.pathname,

                                    data: {

                                        full_name:
                                            name,

                                        date_of_birth:
                                            dob

                                    }

                                }

                            });


                        if (error) {
                            throw error;
                        }


                        console.log(
                            "Signup result:",
                            data
                        );


                        /*
                         * Supabase may require email
                         * confirmation.
                         */

                        if (
                            data &&
                            data.session
                        ) {

                            showAuthMessage(
                                "Account created successfully!",
                                "success"
                            );

                            setTimeout(
                                function () {
                                    handleSignedIn(data.user);
                                },
                                700
                            );

                        } else {

                            showAuthMessage(
                                "Account created! Check your email and click the verification link — you'll be brought straight into the dictionary.",
                                "success"
                            );

                        }


                    }


                    /* =====================================
                       LOGIN
                       ===================================== */

                    else {

                        const {
                            data,
                            error
                        } =
                            await supabaseClient.auth
                                .signInWithPassword({

                                    email: email,

                                    password: password

                                });


                        if (error) {
                            throw error;
                        }


                        showAuthMessage(
                            "Login successful!",
                            "success"
                        );


                        handleSignedIn(data.user);

                    }


                } catch (error) {

                    console.error(
                        "Authentication error:",
                        error
                    );


                    let message =
                        error.message ||
                        "Something went wrong.";


                    /*
                     * Make common Supabase errors
                     * easier to understand.
                     */

                    if (
                        message
                            .toLowerCase()
                            .includes("invalid login")
                    ) {

                        message =
                            "Incorrect email or password.";

                    }


                    if (
                        message
                            .toLowerCase()
                            .includes("already registered")
                    ) {

                        message =
                            "This email is already registered. Please login.";

                    }


                    if (
                        message
                            .toLowerCase()
                            .includes("rate limit")
                    ) {

                        message =
                            "Too many emails sent recently. Please wait a bit and try again, or contact the site owner.";

                    }


                    showAuthMessage(
                        message,
                        "error"
                    );


                } finally {

                    authSubmit.disabled =
                        false;


                    if (isSignupMode) {

                        authSubmit.textContent =
                            "Create Account";

                    } else {

                        authSubmit.textContent =
                            "Login";

                    }

                }

            }
        );

    }


    /* =====================================================
       LOGIN ↔ CREATE ACCOUNT
       ===================================================== */

    if (toggleAuth) {

        toggleAuth.addEventListener(
            "click",
            function () {

                isSignupMode =
                    !isSignupMode;


                showAuthMessage("");


                if (isSignupMode) {


                    authTitle.textContent =
                        "Create Account";


                    authSubmit.textContent =
                        "Create Account";


                    toggleAuth.textContent =
                        "Already have an account? Login";


                    forgotPassword.style.display =
                        "none";

                    if (rememberRow) {
                        rememberRow.hidden = true;
                    }


                    if (signupExtraTop) {
                        signupExtraTop.hidden = false;
                    }

                    if (signupExtraBottom) {
                        signupExtraBottom.hidden = false;
                    }

                    authPassword.autocomplete =
                        "new-password";


                } else {


                    authTitle.textContent =
                        "Login";


                    authSubmit.textContent =
                        "Login";


                    toggleAuth.textContent =
                        "Create an account";


                    forgotPassword.style.display =
                        "block";

                    if (rememberRow) {
                        rememberRow.hidden = false;
                    }


                    if (signupExtraTop) {
                        signupExtraTop.hidden = true;
                    }

                    if (signupExtraBottom) {
                        signupExtraBottom.hidden = true;
                    }

                    if (authName) {
                        authName.value = "";
                    }

                    if (authDob) {
                        authDob.value = "";
                    }

                    if (authConfirmPassword) {
                        authConfirmPassword.value = "";
                    }

                    authPassword.autocomplete =
                        "current-password";

                }


                authEmail.focus();

            }
        );

    }


    /* =====================================================
       FORGOT PASSWORD  (full-screen window)
       ===================================================== */

    let forgotCooldownTimer = null;

    function showForgotMessage(message, type) {

        if (!forgotMessage) return;

        forgotMessage.textContent = message;

        forgotMessage.className = type || "";

    }

    function openForgotWindow() {

        if (!forgotSection) return;

        showForgotMessage("");

        if (forgotEmail) {
            forgotEmail.value =
                authEmail ? authEmail.value.trim() : "";
        }

        if (authSection) {
            authSection.style.display = "none";
        }

        forgotSection.style.display = "flex";

        if (forgotEmail) {
            forgotEmail.focus();
        }

    }

    function closeForgotWindow() {

        if (forgotSection) {
            forgotSection.style.display = "none";
        }

        if (authSection) {
            authSection.style.display = "flex";
        }

        showForgotMessage("");

    }

    function startForgotCooldown(seconds) {

        if (!forgotSend) return;

        clearInterval(forgotCooldownTimer);

        let left = seconds;

        forgotSend.disabled = true;

        forgotSend.textContent =
            "Resend in " + left + "s";

        forgotCooldownTimer = setInterval(
            function () {

                left -= 1;

                if (left <= 0) {

                    clearInterval(forgotCooldownTimer);

                    forgotSend.disabled = false;

                    forgotSend.textContent =
                        "Send reset link";

                    return;
                }

                forgotSend.textContent =
                    "Resend in " + left + "s";

            },
            1000
        );

    }

    async function sendResetEmail() {

        const email =
            forgotEmail
                ? forgotEmail.value.trim()
                : "";

        if (!email) {

            showForgotMessage(
                "Please enter your email address.",
                "error"
            );

            forgotEmail.focus();

            return;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

            showForgotMessage(
                "That doesn't look like a valid email address.",
                "error"
            );

            forgotEmail.focus();

            return;
        }

        forgotSend.disabled = true;

        forgotSend.textContent = "Sending...";

        showForgotMessage("");

        try {

            const { error } =
                await supabaseClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                window.location.origin +
                                window.location.pathname
                        }
                    );

            if (error) {
                throw error;
            }

            showForgotMessage(
                "If an account exists for " + email +
                ", a reset link is on its way. " +
                "Check your inbox (and spam folder), " +
                "then click the link to set a new password.",
                "success"
            );

            startForgotCooldown(60);

        } catch (error) {

            console.error(error);

            let message =
                error.message ||
                "Could not send password reset email.";

            const lower = message.toLowerCase();

            if (lower.includes("rate limit")) {

                message =
                    "Too many emails sent recently. Please wait a bit and try again.";

            } else if (lower.includes("error sending")) {

                message =
                    "Couldn't send the reset email right now. This usually means the site's email service needs attention — please contact the site owner.";

            }

            showForgotMessage(message, "error");

            forgotSend.disabled = false;

            forgotSend.textContent = "Send reset link";

        }

    }

    if (forgotPassword) {
        forgotPassword.addEventListener(
            "click",
            openForgotWindow
        );
    }

    if (forgotSend) {
        forgotSend.addEventListener(
            "click",
            sendResetEmail
        );
    }

    if (forgotBack) {
        forgotBack.addEventListener(
            "click",
            closeForgotWindow
        );
    }

    if (forgotEmail) {

        forgotEmail.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    if (!forgotSend.disabled) {
                        sendResetEmail();
                    }

                }

            }
        );

    }

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                forgotSection &&
                forgotSection.style.display === "flex"
            ) {
                closeForgotWindow();
            }

        }
    );


    /* =====================================================
       ENTER KEY LOGIN
       ===================================================== */

    if (authPassword) {

        authPassword.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    event.preventDefault();

                    authSubmit.click();

                }

            }
        );

    }


    /* =====================================================
       ACCESS APPROVAL (new users wait for the admin)
       ===================================================== */

    let approvedFor = null;
    let dictionaryLoadedFor = null;
    let accessPollTimer = null;
    let adminPollTimer = null;
    let accessCheckSeq = 0;
    let approvalUser = null;

    let pendingRequestCount = 0;
    let requestsCache = null;
    let requestsFilter = "pending";

    const requestsOverlay =
        document.getElementById("requestsOverlay");

    const requestsOverlayContent =
        document.getElementById("requestsOverlayContent");

    function isAdminEmail(email) {

        return (
            !!email &&
            email.toLowerCase() === ADMIN_EMAIL.toLowerCase()
        );

    }

    function stopAccessPolling() {

        if (accessPollTimer) {
            clearInterval(accessPollTimer);
            accessPollTimer = null;
        }

    }

    function stopAdminPolling() {

        if (adminPollTimer) {
            clearInterval(adminPollTimer);
            adminPollTimer = null;
        }

    }

    function showApprovalScreen(state, user, errorText) {

        if (!approvalSection) return;

        approvalUser = user;

        if (authSection) authSection.style.display = "none";
        if (forgotSection) forgotSection.style.display = "none";
        if (resetPasswordSection) resetPasswordSection.style.display = "none";
        if (dictionaryApp) dictionaryApp.hidden = true;

        const icon = document.getElementById("approvalIcon");
        const title = document.getElementById("approvalTitle");
        const text = document.getElementById("approvalText");
        const mail = document.getElementById("approvalEmail");
        const checkBtn = document.getElementById("approvalCheck");

        if (mail) mail.textContent = (user && user.email) || "";

        if (state === "rejected") {

            icon.textContent = "🚫";
            title.textContent = "Request declined";
            text.textContent =
                "The admin hasn't approved your access. If you think this is a mistake, please contact the admin.";

        } else if (state === "error") {

            icon.textContent = "⚠️";
            title.textContent = "Couldn't check your approval";
            text.textContent =
                (errorText || "Something went wrong.") +
                " Check your connection and try again.";

        } else {

            icon.textContent = "⏳";
            title.textContent = "Waiting for approval";
            text.textContent =
                "Thanks for signing up! The admin needs to approve your request before you can open the dictionary. This page updates by itself once you're approved.";

        }

        if (checkBtn) {
            checkBtn.disabled = false;
            checkBtn.textContent = "Check again";
        }

        approvalSection.hidden = false;
        approvalSection.style.display = "flex";

        stopAccessPolling();

        accessPollTimer = setInterval(
            function () {
                if (approvalUser) handleSignedIn(approvalUser);
            },
            20000
        );

    }

    async function fetchApprovalStatus(user) {

        try {

            const { data, error } =
                await supabaseClient
                    .from("user_approvals")
                    .select("status")
                    .eq("user_id", user.id)
                    .maybeSingle();

            if (error) throw error;

            if (data && data.status) {
                return { status: data.status };
            }

            /* no request on file yet: create one */
            const meta = user.user_metadata || {};

            const inserted =
                await supabaseClient
                    .from("user_approvals")
                    .insert({
                        user_id: user.id,
                        email: user.email || "",
                        full_name: meta.full_name || "",
                        date_of_birth: meta.date_of_birth || "",
                        status: "pending"
                    });

            if (inserted.error && inserted.error.code !== "23505") {
                throw inserted.error;
            }

            return { status: "pending" };

        } catch (error) {

            console.error("Approval check failed:", error);

            return {
                status: "error",
                error: (error && error.message) || "Unknown error."
            };

        }

    }

    function enterDictionary(user) {

        stopAccessPolling();

        if (approvalSection) {
            approvalSection.style.display = "none";
        }

        showDictionary();

        updateUserInterface(user);

        if (dictionaryLoadedFor !== user.id) {
            dictionaryLoadedFor = user.id;
            loadDictionary();
        }

        if (isAdminEmail(user.email)) {
            refreshPendingCount();
            startAdminPolling();
        }

    }

    async function handleSignedIn(user) {

        if (!user) return;

        const seq = ++accessCheckSeq;

        if (isAdminEmail(user.email) || approvedFor === user.id) {
            enterDictionary(user);
            return;
        }

        const result = await fetchApprovalStatus(user);

        if (seq !== accessCheckSeq) return;

        if (result.status === "approved") {

            approvedFor = user.id;

            enterDictionary(user);

            return;

        }

        /* keep name / email ready for the profile once approved */
        currentUserEmail = user.email || "";
        currentUserMetadata = user.user_metadata || {};

        showApprovalScreen(result.status, user, result.error);

    }

    (function wireApprovalScreen() {

        const checkBtn = document.getElementById("approvalCheck");
        const logoutBtn = document.getElementById("approvalLogout");

        if (checkBtn) {
            checkBtn.addEventListener(
                "click",
                async function () {
                    checkBtn.disabled = true;
                    checkBtn.textContent = "Checking…";
                    if (approvalUser) {
                        await handleSignedIn(approvalUser);
                    }
                    checkBtn.disabled = false;
                    checkBtn.textContent = "Check again";
                }
            );
        }

        if (logoutBtn) {
            logoutBtn.addEventListener(
                "click",
                function () { performLogout(""); }
            );
        }

        document.addEventListener(
            "visibilitychange",
            function () {
                if (
                    !document.hidden &&
                    approvalUser &&
                    approvalSection &&
                    approvalSection.style.display === "flex"
                ) {
                    handleSignedIn(approvalUser);
                }
            }
        );

    })();


    /* =====================================================
       ADMIN: MY REQUESTS
       ===================================================== */

    function updateRequestBadges() {

        const badge = document.getElementById("profileBadge");

        if (!badge) return;

        const show = isAdminUser && pendingRequestCount > 0;

        badge.hidden = !show;

        badge.textContent =
            pendingRequestCount > 99 ? "99+" : String(pendingRequestCount);

    }

    async function refreshPendingCount() {

        if (!isAdminUser) return;

        try {

            const { count, error } =
                await supabaseClient
                    .from("user_approvals")
                    .select("user_id", { count: "exact", head: true })
                    .eq("status", "pending");

            if (error) throw error;

            pendingRequestCount = count || 0;

        } catch (error) {

            console.error("Pending count failed:", error);

            return;

        }

        updateRequestBadges();

        if (currentTab === "profile") {
            renderProfileTab();
        }

    }

    function startAdminPolling() {

        stopAdminPolling();

        adminPollTimer = setInterval(
            function () {

                refreshPendingCount();

                if (requestsOverlay && !requestsOverlay.hidden) {
                    loadRequests();
                }

            },
            45000
        );

    }

    function requestRowHtml(r) {

        const labels = {
            pending: "Pending",
            approved: "Approved",
            rejected: "Rejected"
        };

        const when =
            r.requested_at
                ? new Date(r.requested_at).toLocaleString()
                : "";

        const decided =
            r.decided_at && r.status !== "pending"
                ? " · " + labels[r.status] + " " +
                  new Date(r.decided_at).toLocaleDateString()
                : "";

        const id = escapeHtml(r.user_id);

        let actions = "";

        if (r.status === "pending") {

            actions =
                '<button class="btn primary" data-req-approve="' + id + '">Approve</button>' +
                '<button class="btn ghost" data-req-reject="' + id + '">Reject</button>';

        } else if (r.status === "approved") {

            actions =
                '<button class="btn ghost" data-req-reject="' + id + '">Revoke access</button>';

        } else {

            actions =
                '<button class="btn primary" data-req-approve="' + id + '">Approve</button>';

        }

        return (
            '<div class="user-row request-row" data-request-id="' + id + '">' +
            '<div class="user-row-info">' +
            '<p class="user-row-name">' +
            escapeHtml(r.full_name || "(no name)") +
            ' <span class="req-status req-status-' + escapeHtml(r.status) + '">' +
            escapeHtml(labels[r.status] || r.status) +
            "</span></p>" +
            '<p class="user-row-email">' + escapeHtml(r.email || "") + "</p>" +
            '<p class="user-row-meta">' +
            (r.date_of_birth ? "Born " + escapeHtml(r.date_of_birth) + " · " : "") +
            "Requested " + escapeHtml(when) + escapeHtml(decided) +
            "</p>" +
            "</div>" +
            '<div class="user-row-actions">' + actions + "</div>" +
            "</div>"
        );

    }

    function renderRequestsOverlay() {

        if (!requestsOverlayContent) return;

        if (requestsCache === null) {

            requestsOverlayContent.innerHTML =
                '<p class="empty-state">Loading requests…</p>';

            return;

        }

        const counts = { pending: 0, approved: 0, rejected: 0 };

        requestsCache.forEach(
            function (r) {
                counts[r.status] = (counts[r.status] || 0) + 1;
            }
        );

        function chip(key, label) {

            return (
                '<button type="button" class="subtab' +
                (requestsFilter === key ? " active" : "") +
                '" data-req-filter="' + key + '">' +
                label + ' <span class="count">' + (counts[key] || 0) + "</span>" +
                "</button>"
            );

        }

        const list =
            requestsCache.filter(
                function (r) { return r.status === requestsFilter; }
            );

        const emptyText = {
            pending: "No pending requests. New sign-ups will appear here.",
            approved: "No approved users yet.",
            rejected: "No rejected requests."
        }[requestsFilter];

        requestsOverlayContent.innerHTML =
            '<div class="subtabs requests-filters">' +
            chip("pending", "Pending") +
            chip("approved", "Approved") +
            chip("rejected", "Rejected") +
            "</div>" +
            (
                list.length
                    ? list.map(requestRowHtml).join("")
                    : '<p class="empty-state">' + emptyText + "</p>"
            );

    }

    async function loadRequests() {

        if (!isAdminUser) return;

        try {

            const { data, error } =
                await supabaseClient
                    .from("user_approvals")
                    .select("*")
                    .order("requested_at", { ascending: false })
                    .limit(2000);

            if (error) throw error;

            requestsCache =
                (data || []).filter(
                    function (r) { return !isAdminEmail(r.email); }
                );

            pendingRequestCount =
                requestsCache.filter(
                    function (r) { return r.status === "pending"; }
                ).length;

            updateRequestBadges();

            if (currentTab === "profile") {
                renderProfileTab();
            }

            renderRequestsOverlay();

        } catch (error) {

            console.error("Load requests failed:", error);

            if (requestsOverlayContent) {
                requestsOverlayContent.innerHTML =
                    '<p class="empty-state">Couldn\'t load requests (' +
                    escapeHtml((error && error.message) || "unknown error") +
                    "). Make sure approval_setup.sql has been run in Supabase.</p>";
            }

        }

    }

    function openRequestsOverlay() {

        if (!requestsOverlay) return;

        requestsOverlay.hidden = false;

        renderRequestsOverlay();

        loadRequests();

    }

    function closeRequestsOverlayFn() {

        if (requestsOverlay) requestsOverlay.hidden = true;

    }

    async function decideRequest(userId, status, button) {

        if (status === "rejected") {

            const sure = window.confirm(
                "Block this user from the dictionary?"
            );

            if (!sure) return;

        }

        if (button) button.disabled = true;

        try {

            const { data, error } =
                await supabaseClient
                    .from("user_approvals")
                    .update({
                        status: status,
                        decided_at: new Date().toISOString()
                    })
                    .eq("user_id", userId)
                    .select("user_id");

            if (error) throw error;

            if (!data || data.length === 0) {
                throw new Error("Not allowed, or the request no longer exists.");
            }

            const row =
                (requestsCache || []).find(
                    function (r) { return r.user_id === userId; }
                );

            if (row) {
                row.status = status;
                row.decided_at = new Date().toISOString();
            }

            pendingRequestCount =
                (requestsCache || []).filter(
                    function (r) { return r.status === "pending"; }
                ).length;

            updateRequestBadges();

            if (currentTab === "profile") {
                renderProfileTab();
            }

            renderRequestsOverlay();

            showToast(
                status === "approved"
                    ? "Approved. They can open the dictionary now."
                    : "Access blocked."
            );

        } catch (error) {

            console.error("Decision failed:", error);

            showToast(
                "Couldn't update: " +
                ((error && error.message) || "unknown error")
            );

            if (button) button.disabled = false;

        }

    }

    const closeRequestsBtn =
        document.getElementById("closeRequestsOverlay");

    if (closeRequestsBtn) {
        closeRequestsBtn.addEventListener("click", closeRequestsOverlayFn);
    }

    if (requestsOverlayContent) {

        requestsOverlayContent.addEventListener(
            "click",
            function (event) {

                const filterBtn =
                    event.target.closest("[data-req-filter]");

                if (filterBtn) {
                    requestsFilter = filterBtn.getAttribute("data-req-filter");
                    renderRequestsOverlay();
                    return;
                }

                const approveBtn =
                    event.target.closest("[data-req-approve]");

                if (approveBtn) {
                    decideRequest(
                        approveBtn.getAttribute("data-req-approve"),
                        "approved",
                        approveBtn
                    );
                    return;
                }

                const rejectBtn =
                    event.target.closest("[data-req-reject]");

                if (rejectBtn) {
                    decideRequest(
                        rejectBtn.getAttribute("data-req-reject"),
                        "rejected",
                        rejectBtn
                    );
                }

            }
        );

    }


    /* =====================================================
       CHECK EXISTING SESSION
       ===================================================== */

    async function checkUser() {

        try {

            const {
                data,
                error
            } =
                await supabaseClient.auth.getSession();


            if (error) {
                throw error;
            }


            const session =
                data.session;


            if (recoveryMode) {

                if (session && session.user) {

                    showResetPasswordForm();

                    return;
                }

                /* link was invalid / already used */
                recoveryMode = false;

            }


            if (
                session &&
                session.user
            ) {

                handleSignedIn(session.user);

            } else {

                showLogin();

                if (RESET_LINK_ERROR) {

                    showAuthMessage(
                        "That reset link is invalid or has expired. Tap \"Forgot password?\" to get a new one.",
                        "error"
                    );

                    clearUrlHash();

                }

            }


        } catch (error) {

            console.error(
                "Session check error:",
                error
            );

            showLogin();

        }

    }


    /* =====================================================
       AUTH STATE LISTENER
       ===================================================== */

    supabaseClient.auth.onAuthStateChange(
        function (event, session) {

            console.log(
                "Auth event:",
                event
            );


            if (event === "SIGNED_OUT") {
                approvedFor = null;
                dictionaryLoadedFor = null;
                accessCheckSeq++;
                stopAccessPolling();
                stopAdminPolling();
            }

            if (event === "PASSWORD_RECOVERY") {

                recoveryMode = true;

                showResetPasswordForm();

                return;

            }


            /* keep the reset window open until password is saved */
            if (recoveryMode) {

                if (session) {
                    showResetPasswordForm();
                }

                return;

            }


            if (
                session &&
                session.user
            ) {

                handleSignedIn(session.user);

            }

        }
    );


    if (saveNewPasswordBtn) {

        saveNewPasswordBtn.addEventListener(
            "click",
            async function () {

                const newPassword =
                    newPasswordInput.value;

                const confirmNewPassword =
                    confirmNewPasswordInput.value;


                if (!newPassword) {

                    resetPasswordMessage.textContent =
                        "Please enter a new password.";

                    newPasswordInput.focus();

                    return;

                }


                if (newPassword.length < 6) {

                    resetPasswordMessage.textContent =
                        "Password must be at least 6 characters.";

                    newPasswordInput.focus();

                    return;

                }


                if (newPassword !== confirmNewPassword) {

                    resetPasswordMessage.textContent =
                        "Passwords do not match.";

                    confirmNewPasswordInput.focus();

                    return;

                }


                saveNewPasswordBtn.disabled =
                    true;


                try {

                    const { data, error } =
                        await supabaseClient.auth.updateUser({

                            password:
                                newPassword

                        });


                    if (error) {
                        throw error;
                    }


                    resetPasswordMessage.textContent =
                        "Password updated! Taking you to the dictionary…";


                    recoveryMode = false;

                    clearUrlHash();


                    setTimeout(
                        function () {

                            if (data && data.user) {
                                handleSignedIn(data.user);
                            } else {
                                showDictionary();
                            }

                        },
                        1200
                    );

                } catch (error) {

                    console.error(
                        error
                    );


                    resetPasswordMessage.textContent =
                        error.message ||
                        "Couldn't update password. Please try the reset link again.";

                } finally {

                    saveNewPasswordBtn.disabled =
                        false;

                }

            }
        );

    }


    if (resetCancel) {

        resetCancel.addEventListener(
            "click",
            function () {

                recoveryMode = false;

                clearUrlHash();

                performLogout(
                    "Password reset cancelled."
                );

            }
        );

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    let loggingOut =
        false;


    async function performLogout(message) {

        if (loggingOut) {
            return;
        }

        loggingOut =
            true;


        try {

            const { error } =
                await supabaseClient.auth.signOut();

            if (error) {
                throw error;
            }

        } catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }


        authEmail.value = "";
        authPassword.value = "";

        isAdminUser = false;
        approvedFor = null;
        dictionaryLoadedFor = null;
        accessCheckSeq++;
        stopAccessPolling();
        stopAdminPolling();
        pendingRequestCount = 0;
        requestsCache = null;
        updateRequestBadges();
        if (typeof closeRequestsOverlayFn === "function") {
            closeRequestsOverlayFn();
        }
        stopPresenceHeartbeat();

        if (typeof closeUsersOverlayFn === "function") {

            closeUsersOverlayFn();

        }

        showAuthMessage(
            message || ""
        );

        showLogin();


        loggingOut =
            false;

    }


    /* =====================================================
       DICTIONARY SETTINGS
       ===================================================== */

    const LS_FAV =
        "kndict_favorites_v1";

    const LS_MINE =
        "kndict_mine_v1";

    const LS_EDITS =
        "kndict_edits_v1";

    const LS_DELETED =
        "kndict_deleted_v1";

    const LS_THEME =
        "kndict_theme_v1";

    const LS_HISTORY =
        "kndict_search_history_v1";

    const LS_DEVICE_ID =
        "kndict_device_id_v1";


    /* =====================================================
       THEME
       ===================================================== */

    function loadTheme() {

        let saved = null;

        try {

            saved =
                localStorage.getItem(
                    LS_THEME
                );

        } catch (e) {}


        if (!saved) {

            saved =
                window.matchMedia &&
                window.matchMedia(
                    "(prefers-color-scheme: dark)"
                ).matches
                    ? "dark"
                    : "light";

        }


        document.documentElement
            .setAttribute(
                "data-theme",
                saved
            );

    }


    function toggleTheme() {

        const current =
            document.documentElement
                .getAttribute(
                    "data-theme"
                );


        const next =
            current === "dark"
                ? "light"
                : "dark";


        document.documentElement
            .setAttribute(
                "data-theme",
                next
            );


        try {

            localStorage.setItem(
                LS_THEME,
                next
            );

        } catch (e) {}

    }


    loadTheme();


    /* =====================================================
       DATA
       ===================================================== */

    let rawBaseData = [];

    let favorites =
        loadJSON(
            LS_FAV,
            []
        );

    let mine =
        loadJSON(
            LS_MINE,
            []
        );

    let edits =
        loadJSON(
            LS_EDITS,
            {}
        );

    let deleted =
        loadJSON(
            LS_DELETED,
            []
        );

    let searchHistory =
        loadJSON(
            LS_HISTORY,
            []
        );


    let currentTab = "home";

    let myView = "mine";

    let homeGroup = null;

    let homeLimit = 60;

    let currentQuery =
        "";

    let editingId =
        null;


    /* =====================================================
       ELEMENTS
       ===================================================== */

    const els = {

        results:
            document.getElementById(
                "results"
            ),

        empty:
            document.getElementById(
                "emptyState"
            ),

        search:
            document.getElementById(
                "searchInput"
            ),

        clear:
            document.getElementById(
                "clearSearch"
            ),

        tabs:
            document.querySelectorAll(
                ".tab[data-tab], .profile-btn[data-tab]"
            ),

        countAll:
            document.getElementById(
                "countAll"
            ),

        countFav:
            document.getElementById(
                "countFav"
            ),

        countMine:
            document.getElementById(
                "countMine"
            ),

        countTrash:
            document.getElementById(
                "countTrash"
            ),

        stats:
            document.getElementById(
                "stats"
            ),

        footCount:
            document.getElementById(
                "footCount"
            ),

        addWordBtn:
            document.getElementById(
                "addWordBtn"
            ),

        modalOverlay:
            document.getElementById(
                "modalOverlay"
            ),

        modalTitle:
            document.getElementById(
                "modalTitle"
            ),

        modalClose:
            document.getElementById(
                "modalClose"
            ),

        cancelAdd:
            document.getElementById(
                "cancelAdd"
            ),

        resetEdit:
            document.getElementById(
                "resetEdit"
            ),

        descriptionFieldWrap:
            document.getElementById(
                "descriptionFieldWrap"
            ),

        fDescription:
            document.getElementById(
                "fDescription"
            ),

        imageFieldWrap:
            document.getElementById(
                "imageFieldWrap"
            ),

        fImage:
            document.getElementById(
                "fImage"
            ),

        imagePreviewWrap:
            document.getElementById(
                "imagePreviewWrap"
            ),

        imagePreview:
            document.getElementById(
                "imagePreview"
            ),

        removeImageBtn:
            document.getElementById(
                "removeImageBtn"
            ),

        saveWordBtn:
            document.getElementById(
                "saveWordBtn"
            ),

        addWordForm:
            document.getElementById(
                "addWordForm"
            ),

        toast:
            document.getElementById(
                "toast"
            ),

        themeToggle:
            document.getElementById(
                "themeToggle"
            )

    };


    /* =====================================================
       LOCAL STORAGE
       ===================================================== */

    function loadJSON(
        key,
        fallback
    ) {

        try {

            const value =
                JSON.parse(
                    localStorage.getItem(
                        key
                    )
                );

            return value || fallback;

        } catch (e) {

            return fallback;

        }

    }


    function saveJSON(
        key,
        value
    ) {

        try {

            localStorage.setItem(
                key,
                JSON.stringify(
                    value
                )
            );

        } catch (e) {

            showToast(
                "Could not save data."
            );

        }

    }


    /* =====================================================
       THEME BUTTON
       ===================================================== */

    if (els.themeToggle) {

        els.themeToggle.addEventListener(
            "click",
            toggleTheme
        );

    }


    /* =====================================================
       ALL DATA
       ===================================================== */

    function allData() {

        const base =
            rawBaseData

                .filter(
                    function (entry) {

                        return (
                            deleted.indexOf(
                                entry.id
                            ) === -1
                        );

                    }
                )

                .map(
                    function (entry) {

                        const ed =
                            edits[
                                entry.id
                            ];


                        if (ed) {

                            return {

                                id:
                                    entry.id,

                                ko:
                                    ed.ko,

                                np:
                                    ed.np,

                                similar:
                                    ed.similar,

                                opposite:
                                    ed.opposite,

                                mine:
                                    false,

                                edited:
                                    true

                            };

                        }


                        return entry;

                    }
                );


        return base.concat(
            mine
        );

    }


    /* =====================================================
       DELETED DATA
       ===================================================== */

    function deletedData() {

        return rawBaseData.filter(
            function (entry) {

                return (
                    deleted.indexOf(
                        entry.id
                    ) !== -1
                );

            }
        );

    }


    /* =====================================================
       FAVORITES
       ===================================================== */

    function isFav(id) {

        return (
            favorites.indexOf(id)
            !== -1
        );

    }


    function toggleFav(id) {

        const index =
            favorites.indexOf(id);


        if (index === -1) {

            favorites.push(id);

        } else {

            favorites.splice(
                index,
                1
            );

        }


        saveJSON(
            LS_FAV,
            favorites
        );


        render();

    }


    /* =====================================================
       DELETE WORD
       ===================================================== */

    function deleteWord(id) {

        const entry =
            allData().find(
                function (e) {

                    return e.id === id;

                }
            );


        if (!entry) return;


        if (entry.mine) {

            removeMine(id);

            return;

        }


        if (isAdminUser) {

            supabaseClient

                .from("words")

                .delete()

                .eq("id", Number(id))

                .then(
                    function (response) {

                        if (response.error) {

                            throw response.error;

                        }


                        rawBaseData =
                            rawBaseData.filter(
                                function (e) {

                                    return e.id !== id;

                                }
                            );


                        render();


                        showToast(
                            "Word permanently deleted from the dictionary."
                        );

                    }
                )

                .catch(
                    function (error) {

                        console.error(error);

                        showToast(
                            "Couldn't delete: " +
                            (error.message || "unknown error")
                        );

                    }
                );


            return;

        }


        if (
            deleted.indexOf(id)
            === -1
        ) {

            deleted.push(id);

            saveJSON(
                LS_DELETED,
                deleted
            );

        }


        const favIndex =
            favorites.indexOf(id);


        if (favIndex !== -1) {

            favorites.splice(
                favIndex,
                1
            );

            saveJSON(
                LS_FAV,
                favorites
            );

        }


        render();


        showToast(
            "Word deleted. Restore it from Deleted."
        );

    }


    /* =====================================================
       RESTORE
       ===================================================== */

    function restoreWord(id) {

        deleted =
            deleted.filter(
                function (d) {

                    return d !== id;

                }
            );


        saveJSON(
            LS_DELETED,
            deleted
        );


        render();


        showToast(
            "Word restored."
        );

    }


    /* =====================================================
       REMOVE USER WORD
       ===================================================== */

    function removeMine(id) {

        mine =
            mine.filter(
                function (word) {

                    return word.id !== id;

                }
            );


        saveJSON(
            LS_MINE,
            mine
        );


        favorites =
            favorites.filter(
                function (fav) {

                    return fav !== id;

                }
            );


        saveJSON(
            LS_FAV,
            favorites
        );


        render();


        showToast(
            "Word removed."
        );

    }


    /* =====================================================
       RESET EDIT
       ===================================================== */

    function resetEditFor(id) {

        delete edits[id];


        saveJSON(
            LS_EDITS,
            edits
        );


        render();


        showToast(
            "Reverted to original."
        );

    }


    /* =====================================================
       NORMALIZE
       ===================================================== */

    function normalize(value) {

        return (
            value || ""
        )
            .toString()
            .trim()
            .toLowerCase();

    }


    /* =====================================================
       SEARCH
       ===================================================== */

    function matches(
        entry,
        query
    ) {

        if (!query) {
            return true;
        }


        const nq =
            normalize(
                query
            );


        return (

            normalize(
                entry.ko
            ).indexOf(nq) !== -1

            ||

            normalize(
                entry.np
            ).indexOf(nq) !== -1

            ||

            normalize(
                entry.similar
            ).indexOf(nq) !== -1

            ||

            normalize(
                entry.opposite
            ).indexOf(nq) !== -1

        );

    }


    /* =====================================================
       FILTER
       ===================================================== */

    function isTrashView() {

        return (
            currentTab === "mywords" &&
            myView === "trash"
        );

    }


    function getFiltered() {

        if (currentTab === "search") {

            if (!normalize(currentQuery)) {
                return [];
            }

            return allData().filter(
                function (entry) {
                    return matches(entry, currentQuery);
                }
            );

        }

        if (currentTab === "mywords") {

            if (myView === "trash") {
                return deletedData();
            }

            if (myView === "fav") {
                return allData().filter(
                    function (entry) {
                        return isFav(entry.id);
                    }
                );
            }

            return allData().filter(
                function (entry) {
                    return entry.mine;
                }
            );

        }

        return [];

    }

/* =====================================================
       ESCAPE HTML
       ===================================================== */

    function escapeHtml(value) {

        return (
            value || ""
        ).replace(
            /[&<>"']/g,
            function (character) {

                return {

                    "&":
                        "&amp;",

                    "<":
                        "&lt;",

                    ">":
                        "&gt;",

                    '"':
                        "&quot;",

                    "'":
                        "&#39;"

                }[character];

            }
        );

    }


    /* =====================================================
       ICONS
       ===================================================== */

    const speakIcon =

        '<svg viewBox="0 0 24 24" fill="currentColor">' +

        '<path d="M4 9v6h4l5 5V4L8 9H4z"/>' +

        '<path d="M16.5 12c0-1.5-.7-2.8-1.8-3.7l1-1.5c1.5 1.2 2.4 3 2.4 5.2s-.9 4-2.4 5.2l-1-1.5c1.1-.9 1.8-2.2 1.8-3.7z" opacity=".85"/>' +

        "</svg>";


    const editIcon =

        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +

        '<path d="M12 20h9"/>' +

        '<path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>' +

        "</svg>";


    const trashIcon =

        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +

        '<path d="M3 6h18"/>' +

        '<path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>' +

        '<path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>' +

        '<line x1="10" y1="11" x2="10" y2="17"/>' +

        '<line x1="14" y1="11" x2="14" y2="17"/>' +

        "</svg>";


    const restoreIcon =

        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +

        '<path d="M3 12a9 9 0 1 0 3-6.7"/>' +

        '<polyline points="3 4 3 9 8 9"/>' +

        "</svg>";


    /* =====================================================
       CARD
       ===================================================== */

    function setTab(name) {

        currentTab = name;

        els.tabs.forEach(
            function (tabEl) {

                const isActive =
                    tabEl.getAttribute("data-tab") === name;

                tabEl.classList.toggle("active", isActive);

                tabEl.setAttribute(
                    "aria-selected",
                    isActive ? "true" : "false"
                );

            }
        );

    }


    function openWordInSearch(word, remember) {

        if (!word) {
            return;
        }

        if (els.search) {
            els.search.value = word;
        }

        currentQuery = word;

        if (els.clear) {
            els.clear.style.display = "flex";
        }

        if (remember) {
            recordSearchHistory(word);
        }

        setTab("search");

        render();

        window.scrollTo({ top: 0, behavior: "smooth" });

    }


    function performSearch(word) {

        openWordInSearch(word, true);

    }

    function tagWordsHtml(text) {

        if (!text) {
            return "";
        }


        const tokens =
            text

                .split(/[,\/]/)

                .map(
                    function (part) {

                        return part.trim();

                    }
                )

                .filter(
                    function (part) {

                        return part.length > 0;

                    }
                );


        return tokens

            .map(
                function (word) {

                    return (

                        '<span class="tagword-item" data-search-word="' +

                        escapeHtml(word) +

                        '">' +

                        escapeHtml(word) +

                        "</span>"

                    );

                }
            )

            .join(
                '<span class="tagword-sep">, </span>'
            );

    }


    function uploadWordImage(file) {

        const ext =
            (
                file.name.split(".").pop() ||
                "jpg"
            ).toLowerCase();


        const path =
            "word-" +
            Date.now() +
            "-" +
            Math.floor(
                Math.random() * 100000
            ) +
            "." +
            ext;


        return supabaseClient

            .storage

            .from("word-images")

            .upload(
                path,
                file,
                {
                    cacheControl: "3600",
                    upsert: false
                }
            )

            .then(
                function (response) {

                    if (response.error) {

                        throw response.error;

                    }


                    const { data } =
                        supabaseClient

                            .storage

                            .from("word-images")

                            .getPublicUrl(
                                path
                            );


                    return data.publicUrl;

                }
            );

    }


    function resolveImageUrl(existingUrl) {

        if (pendingImageRemoval) {

            return Promise.resolve(
                null
            );

        }


        if (pendingImageFile) {

            return uploadWordImage(
                pendingImageFile
            );

        }


        return Promise.resolve(
            existingUrl || null
        );

    }


    function cardHtml(
        entry,
        trashed
    ) {

        const favOn =
            isFav(entry.id);


        let meta = "";


        if (entry.similar) {

            meta +=

                '<div class="meta-line similar-line">' +

                "<b>similar</b> " +

                '<span class="tagword">' +

                tagWordsHtml(
                    entry.similar
                ) +

                "</span></div>";

        }


        if (entry.opposite) {

            meta +=

                '<div class="meta-line opposite-line">' +

                "<b>opposite</b> " +

                '<span class="tagword">' +

                tagWordsHtml(
                    entry.opposite
                ) +

                "</span></div>";

        }


        let badge = "";


        if (trashed) {

            badge =
                '<span class="mine-tag deleted-tag">deleted</span>';

        }

        else if (entry.mine) {

            badge =
                '<span class="mine-tag">yours</span>';

        }

        else if (entry.edited) {

            badge =
                '<span class="mine-tag edited-tag">edited</span>';

        }


        let actions;


        if (trashed) {

            actions =

                '<button class="icon-btn restore-btn" ' +

                'data-restore="' +

                entry.id +

                '" ' +

                'title="Restore this word" ' +

                'aria-label="Restore">' +

                restoreIcon +

                "</button>";

        }

        else {

            actions =

                '<button class="icon-btn speak-btn" ' +

                'data-speak="' +

                entry.id +

                '" ' +

                'title="Hear Korean pronunciation" ' +

                'aria-label="Pronounce">' +

                speakIcon +

                "</button>" +


                '<button class="icon-btn edit-btn" ' +

                'data-edit="' +

                entry.id +

                '" ' +

                'title="Edit this entry" ' +

                'aria-label="Edit">' +

                editIcon +

                "</button>" +


                '<button class="icon-btn fav-btn' +

                (
                    favOn
                        ? " fav-on"
                        : ""
                ) +

                '" data-fav="' +

                entry.id +

                '" ' +

                'title="Toggle favorite" ' +

                'aria-label="Toggle favorite">' +

                (
                    favOn
                        ? "★"
                        : "☆"
                ) +

                "</button>" +


                '<button class="icon-btn delete-btn" ' +

                'data-delete="' +

                entry.id +

                '" ' +

                'title="Delete this word" ' +

                'aria-label="Delete">' +

                trashIcon +

                "</button>";

        }


        return (

            '<div class="card' +

            (
                entry.mine
                    ? " mine"
                    : ""
            ) +

            (
                entry.edited
                    ? " edited"
                    : ""
            ) +

            (
                trashed
                    ? " trashed"
                    : ""
            ) +

            '" data-id="' +

            entry.id +

            '">' +


            badge +


            '<div class="card-top">' +

            '<p class="ko-word">' +

            escapeHtml(
                entry.ko
            ) +

            "</p>" +


            '<div class="card-actions">' +

            actions +

            "</div>" +


            "</div>" +


            '<p class="np-word">' +

            escapeHtml(
                entry.np
            ) +

            "</p>" +


            (
                entry.description
                    ? '<p class="word-description">' +
                      "<b>어휘</b>" +
                      escapeHtml(entry.description) +
                      "</p>"
                    : ""
            ) +


            (
                entry.image_url
                    ? '<img class="word-image" src="' +
                      escapeHtml(entry.image_url) +
                      '" alt="' +
                      escapeHtml(entry.ko) +
                      '" loading="lazy" data-view-image="' +
                      escapeHtml(entry.image_url) +
                      '">'
                    : ""
            ) +


            (
                meta
                    ? '<div class="meta-row">' +
                      meta +
                      "</div>"
                    : ""
            ) +


            "</div>"

        );

    }


    /* =====================================================
       RENDER
       ===================================================== */

    const RENDER_BATCH_SIZE =
        80;

    let currentFilteredData =
        [];

    let renderedCount =
        0;

    let resultsObserver =
        null;


    function cardsHtmlForSlice(data, startIndex, endIndex, trashedView) {

        let html = "";


        for (
            let i = startIndex;
            i < endIndex && i < data.length;
            i++
        ) {

            html +=
                cardHtml(
                    data[i],
                    trashedView
                );

        }


        return html;

    }


    function attachLoadMoreSentinel() {

        const existingSentinel =
            document.getElementById(
                "loadMoreSentinel"
            );


        if (existingSentinel) {

            existingSentinel.remove();

        }


        if (
            renderedCount >=
            currentFilteredData.length
        ) {

            return;

        }


        const sentinel =
            document.createElement(
                "div"
            );

        sentinel.id =
            "loadMoreSentinel";

        sentinel.style.gridColumn =
            "1 / -1";

        sentinel.style.height =
            "1px";


        els.results.appendChild(
            sentinel
        );


        if (!resultsObserver) {

            resultsObserver =
                new IntersectionObserver(
                    function (entries) {

                        entries.forEach(
                            function (entry) {

                                if (entry.isIntersecting) {

                                    loadNextBatch();

                                }

                            }
                        );

                    },
                    {
                        rootMargin:
                            "600px"
                    }
                );

        }


        resultsObserver.disconnect();

        resultsObserver.observe(
            sentinel
        );

    }


    function loadNextBatch() {

        if (
            renderedCount >=
            currentFilteredData.length
        ) {
            return;
        }


        const trashedView =
            isTrashView();


        const nextEnd =
            Math.min(
                renderedCount +
                RENDER_BATCH_SIZE,
                currentFilteredData.length
            );


        const html =
            cardsHtmlForSlice(
                currentFilteredData,
                renderedCount,
                nextEnd,
                trashedView
            );


        const sentinel =
            document.getElementById(
                "loadMoreSentinel"
            );


        if (sentinel) {

            sentinel.insertAdjacentHTML(
                "beforebegin",
                html
            );

        } else {

            els.results.insertAdjacentHTML(
                "beforeend",
                html
            );

        }


        renderedCount =
            nextEnd;


        attachLoadMoreSentinel();

    }


    function render() {

        if (!els.results) return;


        const all = allData();

        if (els.stats) {
            els.stats.textContent = all.length + " entries";
        }

        if (els.footCount) {
            els.footCount.textContent = rawBaseData.length;
        }

        const searchPanel =
            document.getElementById("searchPanel");

        if (searchPanel) {
            searchPanel.hidden = currentTab !== "search";
        }

        if (currentTab === "search") {
            renderSearchHistoryDropdown();
        }


        if (currentTab === "profile") {

            els.empty.hidden = true;

            renderProfileTab();

            return;

        }


        if (currentTab === "home") {

            els.empty.hidden = true;

            renderHomeTab(all);

            return;

        }


        let data = [];

        try {

            const trashedView =
                isTrashView();

            data =
                getFiltered();

            currentFilteredData =
                data;

            renderedCount =
                Math.min(
                    RENDER_BATCH_SIZE,
                    data.length
                );

            els.results.innerHTML =
                (currentTab === "mywords" ? mySubTabsHtml() : "") +
                cardsHtmlForSlice(
                    data,
                    0,
                    renderedCount,
                    trashedView
                );

            attachLoadMoreSentinel();

        } catch (renderError) {

            console.error(
                "Render error:",
                renderError
            );

            els.results.innerHTML =

                '<p class="empty-state" style="grid-column:1/-1;">' +

                "Something went wrong displaying the words (" +

                escapeHtml(renderError.message || "unknown error") +

                "). Please refresh the page." +

                "</p>";

            return;

        }


        let emptyText =
            "No entries match yet. Try a different spelling, or add it yourself.";

        if (currentTab === "search" && !normalize(currentQuery)) {
            emptyText =
                "Type a Korean, Nepali or English word above to search.";
        } else if (currentTab === "mywords") {
            emptyText =
                myView === "fav"
                    ? "No favourites yet. Tap the ★ on any word to save it here."
                    : myView === "trash"
                        ? "Nothing deleted."
                        : "You haven't added any words yet. Tap + Add word.";
        }

        els.empty.textContent = emptyText;

        els.empty.hidden =
            data.length !== 0;

    }


    /* =====================================================
       MY WORDS SUB-TABS (Mine / Favourites / Deleted)
       ===================================================== */

    function mySubTabsHtml() {

        function btn(view, label, count) {

            return (
                '<button type="button" class="subtab' +
                (myView === view ? " active" : "") +
                '" data-my-view="' + view + '">' +
                label +
                ' <span class="count">' + count + "</span>" +
                "</button>"
            );

        }

        return (
            '<div class="subtabs">' +
            btn("mine", "Mine", mine.length) +
            btn("fav", "★ Favourites", favorites.length) +
            btn("trash", "🗑 Deleted", deleted.length) +
            "</div>"
        );

    }


    /* =====================================================
       HOME TAB (alphabetical by Korean initial consonant)
       ===================================================== */

    const HANGUL_INITIALS = [
        "ㄱ", "ㄲ", "ㄴ", "ㄷ", "ㄸ", "ㄹ", "ㅁ", "ㅂ", "ㅃ", "ㅅ",
        "ㅆ", "ㅇ", "ㅈ", "ㅉ", "ㅊ", "ㅋ", "ㅌ", "ㅍ", "ㅎ"
    ];

    const GROUP_GRAMMAR = "grammar";
    const GROUP_OTHER = "other";
const GROUP_EOHWI = "eohwi";
const GROUP_PICTURE = "picture";

    function homeGroupKey(ko) {

        const text = (ko || "").trim();

        if (!text) {
            return GROUP_OTHER;
        }

        /* words starting with a dash are grammar endings/patterns */
        if (/^[-\u2010-\u2015\u2212]/.test(text)) {
            return GROUP_GRAMMAR;
        }

        const code = text.charCodeAt(0);

        if (code >= 0xAC00 && code <= 0xD7A3) {
            return HANGUL_INITIALS[
                Math.floor((code - 0xAC00) / 588)
            ];
        }

        /* a bare consonant letter typed on its own */
        if (HANGUL_INITIALS.indexOf(text.charAt(0)) !== -1) {
            return text.charAt(0);
        }

        /* Any other starting character gets its own heading, so a
           brand-new heading appears on Home as soon as a word needs it */
        const first = Array.from(text)[0].toUpperCase();

        if (/[0-9]/.test(first)) {
            return "0-9";
        }

        if (/\p{L}/u.test(first)) {
            return "x:" + first;
        }

        return GROUP_OTHER;

    }

    function homeGroupLabel(key) {

        if (key === GROUP_GRAMMAR) return "Grammar";
        if (key === GROUP_EOHWI) return "어휘";
        if (key === GROUP_PICTURE) return "📷 Picture";
        if (key === GROUP_OTHER) return "Other";
        if (key.indexOf("x:") === 0) return key.slice(2);

        return key;

    }

    function renderHomeTab(all) {

        const groups = {};

        all.forEach(
            function (entry) {

                const key = homeGroupKey(entry.ko);

                (groups[key] = groups[key] || []).push(entry);

                /* separate headings for words that carry 어휘 or a picture */
                if (
                    key !== GROUP_GRAMMAR &&
                    (entry.description || "").trim()
                ) {
                    (groups[GROUP_EOHWI] = groups[GROUP_EOHWI] || []).push(entry);
                }

                if (entry.image_url) {
                    (groups[GROUP_PICTURE] = groups[GROUP_PICTURE] || []).push(entry);
                }

            }
        );

        const extraKeys =
            Object.keys(groups)
                .filter(
                    function (key) {
                        return (
                            HANGUL_INITIALS.indexOf(key) === -1 &&
                            key !== GROUP_GRAMMAR &&
                            key !== GROUP_EOHWI &&
                            key !== GROUP_PICTURE &&
                            key !== GROUP_OTHER
                        );
                    }
                )
                .sort(
                    function (a, b) {
                        return a.localeCompare(b);
                    }
                );

        const order =
            HANGUL_INITIALS
                .concat([GROUP_GRAMMAR, GROUP_EOHWI, GROUP_PICTURE])
                .concat(extraKeys)
                .concat([GROUP_OTHER])
                .filter(
                    function (key) {
                        return !!groups[key];
                    }
                );

        if (order.length === 0) {

            els.results.innerHTML =
                '<p class="empty-state" style="grid-column:1/-1;">Loading dictionary…</p>';

            return;

        }

        if (!homeGroup || !groups[homeGroup]) {
            homeGroup = order[0];
        }

        const list =
            groups[homeGroup]
                .slice()
                .sort(
                    function (a, b) {
                        return (a.ko || "").localeCompare(b.ko || "", "ko");
                    }
                );

        const shown = list.slice(0, homeLimit);

        const tabsHtml =
            order
                .map(
                    function (key) {
                        return (
                            '<button type="button" class="letter-tab' +
                            ((key === GROUP_EOHWI || key === GROUP_PICTURE) ? " letter-tab-special" : "") +
                            (key === homeGroup ? " active" : "") +
                            '" data-home-group="' + key + '">' +
                            escapeHtml(homeGroupLabel(key)) +
                            ' <span class="count">' + groups[key].length + "</span>" +
                            "</button>"
                        );
                    }
                )
                .join("");

        const wordsHtml =
            shown
                .map(
                    function (entry) {
                        return cardHtml(entry, false);
                    }
                )
                .join("");

        els.results.innerHTML =
            '<div class="home-view">' +
            '<div class="letter-tabs" role="tablist">' + tabsHtml + "</div>" +
            '<div class="home-head">' +
            "<h2>" + escapeHtml(homeGroupLabel(homeGroup)) + "</h2>" +
            "<span>" + list.length + " words</span>" +
            "</div>" +
            '<div class="home-cards">' + wordsHtml + "</div>" +
            (
                list.length > shown.length
                    ? '<button type="button" class="btn ghost home-more" data-home-more>Show more (' +
                      (list.length - shown.length) + " left)</button>"
                    : ""
            ) +
            "</div>";

        const activeLetter =
            els.results.querySelector(".letter-tab.active");

        if (activeLetter && activeLetter.parentElement) {

            const row = activeLetter.parentElement;

            row.scrollLeft =
                activeLetter.offsetLeft -
                (row.clientWidth - activeLetter.offsetWidth) / 2;

        }

    }


/* =====================================================
       PROFILE TAB
       ===================================================== */

    function renderProfileTab() {

        if (!els.results) {
            return;
        }

        const name =
            currentUserMetadata.full_name ||
            "Dictionary user";

        const dob =
            currentUserMetadata.date_of_birth;

        const entryCount =
            allData().length;

        const darkOn =
            document.documentElement
                .getAttribute("data-theme") === "dark";

        const profileSettingsHtml =
            '<div class="profile-settings">' +
            '<div class="profile-row">' +
            "<span>Dictionary entries</span>" +
            "<strong>" + entryCount + "</strong>" +
            "</div>" +
            '<div class="profile-row">' +
            "<span>Dark mode</span>" +
            '<button type="button" class="theme-switch" ' +
            "data-theme-toggle " +
            'role="switch" ' +
            'aria-label="Dark mode" ' +
            'aria-checked="' + (darkOn ? "true" : "false") + '">' +
            '<span class="theme-switch-knob"></span>' +
            "</button>" +
            "</div>" +
            "</div>";

        els.results.innerHTML =

            '<div class="profile-view">' +

            '<p class="profile-name">' +
            escapeHtml(name) +
            ' <button type="button" class="name-edit" data-open-details ' +
            'title="Change display name" aria-label="Change display name">✏️</button>' +
            "</p>" +

            '<p class="profile-email">' +
            escapeHtml(currentUserEmail) +
            "</p>" +

            (
                dob
                    ? '<p class="profile-dob">Born: ' +
                      escapeHtml(dob) +
                      "</p>"
                    : ""
            ) +

            (
                isAdminUser
                    ? '<span class="profile-admin-note">👑 Admin</span>'
                    : ""
            ) +

            profileSettingsHtml +

            '<div class="profile-view-actions">' +

            '<button type="button" class="btn ghost" data-open-details>' +
            "👤 My details" +
            "</button>" +

            '<button type="button" class="btn ghost" data-open-password>' +
            "🔑 Change password" +
            "</button>" +

            (
                isAdminUser
                    ? '<button type="button" class="btn ghost" data-open-requests>' +
                      "📥 My requests" +
                      (
                          pendingRequestCount > 0
                              ? ' <span class="req-badge">' + pendingRequestCount + "</span>"
                              : ""
                      ) +
                      "</button>"
                    : ""
            ) +

            (
                isAdminUser
                    ? '<button type="button" class="btn ghost" data-open-users-overlay>' +
                      "👑 Manage Users" +
                      "</button>"
                    : ""
            ) +

            '<button type="button" class="btn ghost" data-logout>' +
            "Log out" +
            "</button>" +

            "</div>" +

            "</div>";

    }


    /* =====================================================
       PROFILE OVERLAYS (My details / Change password)
       ===================================================== */

    const detailsOverlay =
        document.getElementById("detailsOverlay");

    const passwordOverlay =
        document.getElementById("passwordOverlay");

    const changePasswordForm =
        document.getElementById("changePasswordForm");

    const cpNew =
        document.getElementById("cpNew");

    const cpConfirm =
        document.getElementById("cpConfirm");

    const cpMessage =
        document.getElementById("cpMessage");

    const cpUpdate =
        document.getElementById("cpUpdate");


    function openDetailsOverlay() {

        if (!detailsOverlay) return;

        document.getElementById("detailsUsername").textContent =
            currentUserEmail || "—";

        const dnInputEl = document.getElementById("dnInput");

        if (dnInputEl) {
            dnInputEl.value = currentUserMetadata.full_name || "";
        }

        const dnMsgEl = document.getElementById("dnMessage");

        if (dnMsgEl) {
            dnMsgEl.textContent = "";
            dnMsgEl.className = "pw-message";
        }

        detailsOverlay.hidden = false;

    }

    function closeDetailsOverlay() {

        if (detailsOverlay) detailsOverlay.hidden = true;

    }

    function setPasswordMessage(text, type) {

        if (!cpMessage) return;

        cpMessage.textContent = text || "";

        cpMessage.className = "pw-message" + (type ? " " + type : "");

    }

    function openPasswordOverlay() {

        if (!passwordOverlay) return;

        cpNew.value = "";
        cpConfirm.value = "";

        setPasswordMessage("");

        passwordOverlay.hidden = false;

        cpNew.focus();

    }

    function closePasswordOverlay() {

        if (passwordOverlay) passwordOverlay.hidden = true;

        if (cpNew) cpNew.value = "";
        if (cpConfirm) cpConfirm.value = "";

    }

    [
        ["detailsClose", closeDetailsOverlay],
        ["detailsDone", closeDetailsOverlay],
        ["passwordClose", closePasswordOverlay],
        ["cpCancel", closePasswordOverlay]
    ].forEach(
        function (pair) {

            const el = document.getElementById(pair[0]);

            if (el) el.addEventListener("click", pair[1]);

        }
    );

    [
        [detailsOverlay, closeDetailsOverlay],
        [passwordOverlay, closePasswordOverlay]
    ].forEach(
        function (pair) {

            if (!pair[0]) return;

            pair[0].addEventListener(
                "click",
                function (event) {
                    if (event.target === pair[0]) pair[1]();
                }
            );

        }
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (event.key !== "Escape") return;

            closeDetailsOverlay();
            closePasswordOverlay();

        }
    );

    const displayNameForm =
        document.getElementById("displayNameForm");

    function setDisplayNameMessage(text, type) {

        const el = document.getElementById("dnMessage");

        if (!el) return;

        el.textContent = text || "";

        el.className = "pw-message" + (type ? " " + type : "");

    }

    if (displayNameForm) {

        displayNameForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const input = document.getElementById("dnInput");
                const saveBtn = document.getElementById("dnSave");

                const name =
                    input.value.replace(/\s+/g, " ").trim();

                if (!name) {
                    setDisplayNameMessage("Display name can't be empty.", "error");
                    return;
                }

                if (name === (currentUserMetadata.full_name || "")) {
                    setDisplayNameMessage("That's already your display name.");
                    return;
                }

                saveBtn.disabled = true;

                setDisplayNameMessage("Saving…");

                try {

                    const { data, error } =
                        await supabaseClient.auth.updateUser({
                            data: { full_name: name }
                        });

                    if (error) throw error;

                    currentUserMetadata =
                        (data && data.user && data.user.user_metadata) ||
                        Object.assign({}, currentUserMetadata, { full_name: name });

                    closeDetailsOverlay();

                    if (currentTab === "profile") {
                        renderProfileTab();
                    }

                    showToast("Display name updated.");

                } catch (err) {

                    setDisplayNameMessage(
                        (err && err.message) || "Could not save your display name.",
                        "error"
                    );

                } finally {

                    saveBtn.disabled = false;

                }

            }
        );

    }


    if (changePasswordForm) {

        changePasswordForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                const pw = cpNew.value;
                const confirmPw = cpConfirm.value;

                if (pw.length < 6) {
                    setPasswordMessage("Password must be at least 6 characters.", "error");
                    return;
                }

                if (pw !== confirmPw) {
                    setPasswordMessage("The two passwords don't match.", "error");
                    return;
                }

                cpUpdate.disabled = true;

                setPasswordMessage("Updating…");

                try {

                    const { error } =
                        await supabaseClient.auth.updateUser({ password: pw });

                    if (error) throw error;

                    closePasswordOverlay();

                    showToast("Password updated.");

                } catch (err) {

                    setPasswordMessage(
                        (err && err.message) || "Could not update the password.",
                        "error"
                    );

                } finally {

                    cpUpdate.disabled = false;

                }

            }
        );

    }


/* =====================================================
       USERS (ADMIN ONLY)
       ===================================================== */

    let usersCache =
        null;


    async function callAdminUsersFunction(body) {

        const {
            data:
                sessionData
        } =
            await supabaseClient.auth.getSession();


        const token =
            sessionData &&
            sessionData.session &&
            sessionData.session.access_token;


        if (!token) {

            throw new Error(
                "Not signed in."
            );

        }


        const response =
            await fetch(
                SUPABASE_URL +
                "/functions/v1/admin-users",
                {

                    method:
                        "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            "Bearer " +
                            token

                    },

                    body:
                        JSON.stringify(body)

                }
            );


        /* Gateway errors (404, 502, timeouts) may not be JSON */
        let result = {};

        try {

            result =
                await response.json();

        } catch (parseError) {

            result = {};

        }


        if (!response.ok) {

            throw new Error(
                result.error ||
                ("Admin service error (HTTP " + response.status + ")")
            );

        }


        return result;

    }


    function formatLastSeen(lastSeenAt) {

        if (!lastSeenAt) {

            return "never";

        }


        const diffMs =
            Date.now() -
            new Date(lastSeenAt).getTime();


        const diffMinutes =
            Math.floor(
                diffMs / 60000
            );


        if (diffMinutes < 1) {

            return "just now";

        }


        if (diffMinutes < 60) {

            return (
                diffMinutes +
                (diffMinutes === 1 ? " minute ago" : " minutes ago")
            );

        }


        const diffHours =
            Math.floor(
                diffMinutes / 60
            );


        if (diffHours < 24) {

            return (
                diffHours +
                (diffHours === 1 ? " hour ago" : " hours ago")
            );

        }


        const diffDays =
            Math.floor(
                diffHours / 24
            );


        return (
            diffDays +
            (diffDays === 1 ? " day ago" : " days ago")
        );

    }


    function userRowHtml(user) {

        const joined =
            user.created_at
                ? new Date(user.created_at)
                    .toLocaleDateString()
                : "";


        const lastLogin =
            user.last_sign_in_at
                ? new Date(user.last_sign_in_at)
                    .toLocaleString()
                : "Never logged in";


        return (

            '<div class="user-row" data-user-id="' +
            escapeHtml(user.id) +
            '">' +

            '<div class="user-row-info">' +

            '<p class="user-row-name">' +

            '<span class="presence-dot ' +
            (user.online ? "presence-online" : "presence-offline") +
            '" title="' +
            (
                user.online
                    ? "Online now"
                    : "Last active " + escapeHtml(formatLastSeen(user.last_seen_at))
            ) +
            '"></span> ' +

            escapeHtml(user.full_name || "(no name)") +
            (
                user.banned
                    ? ' <span class="user-badge-banned">Banned</span>'
                    : ""
            ) +
            "</p>" +

            '<p class="user-row-email">' +
            escapeHtml(user.email || "") +
            "</p>" +

            '<p class="user-row-meta">' +
            (
                user.date_of_birth
                    ? "Born " + escapeHtml(user.date_of_birth) + " · "
                    : ""
            ) +
            "Joined " + escapeHtml(joined) +
            "</p>" +

            '<p class="user-row-meta">' +
            (
                user.online
                    ? "Online now"
                    : "Last active " + escapeHtml(formatLastSeen(user.last_seen_at))
            ) +
            " · Last login: " +
            escapeHtml(lastLogin) +
            "</p>" +

            "</div>" +

            '<div class="user-row-actions">' +

            '<button class="btn ghost" data-user-toggle-ban="' +
            escapeHtml(user.id) +
            '" data-currently-banned="' +
            (user.banned ? "true" : "false") +
            '">' +
            (user.banned ? "Unban" : "Ban") +
            "</button>" +

            '<button class="btn ghost" data-user-delete="' +
            escapeHtml(user.id) +
            '">Delete</button>' +

            "</div>" +

            "</div>"

        );

    }


    function renderUsersOverlay() {

        if (!usersOverlayContent) {
            return;
        }


        if (usersCache === null) {

            usersOverlayContent.innerHTML =

                '<p class="empty-state">' +

                "Loading users…" +

                "</p>";


            callAdminUsersFunction(
                { action: "list" }
            )

                .then(
                    function (result) {

                        usersCache =
                            result.users || [];

                        renderUsersOverlay();

                    }
                )

                .catch(
                    function (error) {

                        console.error(error);

                        usersOverlayContent.innerHTML =

                            '<p class="empty-state">' +

                            "Couldn't load users (" +

                            escapeHtml(error.message || "unknown error") +

                            "). Make sure the admin-users Edge Function is deployed." +

                            "</p>";

                    }
                );


            return;

        }


        if (usersCache.length === 0) {

            usersOverlayContent.innerHTML =

                '<p class="empty-state">' +

                "No other users yet." +

                "</p>";

            return;

        }


        usersOverlayContent.innerHTML =

            usersCache

                .map(userRowHtml)

                .join("");

    }


    function openUsersOverlay() {

        if (!usersOverlay) {
            return;
        }

        usersOverlay.hidden =
            false;

        renderUsersOverlay();

    }


    function closeUsersOverlayFn() {

        if (usersOverlay) {

            usersOverlay.hidden =
                true;

        }

    }


    if (closeUsersOverlay) {

        closeUsersOverlay.addEventListener(
            "click",
            closeUsersOverlayFn
        );

    }


    function refreshUsersCache() {

        usersCache = null;

        if (
            usersOverlay &&
            !usersOverlay.hidden
        ) {

            renderUsersOverlay();

        }

    }


    function handleUsersPanelClick(event) {

                const banBtn =
                    event.target.closest(
                        "[data-user-toggle-ban]"
                    );


                if (banBtn) {

                    const userId =
                        banBtn.getAttribute(
                            "data-user-toggle-ban"
                        );

                    const currentlyBanned =
                        banBtn.getAttribute(
                            "data-currently-banned"
                        ) === "true";

                    const action =
                        currentlyBanned
                            ? "unban"
                            : "ban";

                    const confirmMsg =
                        currentlyBanned
                            ? "Unban this user? They'll be able to log in again."
                            : "Ban this user? They won't be able to log in until unbanned.";


                    if (!confirm(confirmMsg)) {
                        return;
                    }


                    banBtn.disabled = true;


                    callAdminUsersFunction(
                        { action: action, userId: userId }
                    )

                        .then(
                            function () {

                                showToast(
                                    currentlyBanned
                                        ? "User unbanned."
                                        : "User banned."
                                );

                                refreshUsersCache();

                            }
                        )

                        .catch(
                            function (error) {

                                console.error(error);

                                showToast(
                                    "Couldn't update user: " +
                                    (error.message || "unknown error")
                                );

                                banBtn.disabled = false;

                            }
                        );


                    return;

                }


                const deleteBtn =
                    event.target.closest(
                        "[data-user-delete]"
                    );


                if (deleteBtn) {

                    const userId =
                        deleteBtn.getAttribute(
                            "data-user-delete"
                        );


                    if (
                        !confirm(
                            "Permanently delete this user's account? This cannot be undone."
                        )
                    ) {
                        return;
                    }


                    deleteBtn.disabled = true;


                    callAdminUsersFunction(
                        { action: "delete", userId: userId }
                    )

                        .then(
                            function () {

                                showToast(
                                    "User account deleted."
                                );

                                refreshUsersCache();

                            }
                        )

                        .catch(
                            function (error) {

                                console.error(error);

                                showToast(
                                    "Couldn't delete user: " +
                                    (error.message || "unknown error")
                                );

                                deleteBtn.disabled = false;

                            }
                        );


                    return;

                }

            }


    if (els.results) {
        els.results.addEventListener(
            "click",
            handleUsersPanelClick
        );
    }

    if (usersOverlayContent) {
        usersOverlayContent.addEventListener(
            "click",
            handleUsersPanelClick
        );
    }


    /* =====================================================
       SPEECH
       ===================================================== */

    let voices = [];


    function loadVoices() {

        if (
            "speechSynthesis"
            in window
        ) {

            voices =
                window.speechSynthesis
                    .getVoices();

        }

    }


    if (
        "speechSynthesis"
        in window
    ) {

        loadVoices();

        window.speechSynthesis
            .onvoiceschanged =
            loadVoices;

    }


    function pickVoice(
        languagePrefix
    ) {

        const candidates =
            voices.filter(
                function (voice) {

                    return (
                        voice.lang &&
                        voice.lang
                            .toLowerCase()
                            .indexOf(
                                languagePrefix
                            ) === 0
                    );

                }
            );


        if (
            candidates.length === 0
        ) {

            return null;

        }


        const preferred =
            candidates.find(
                function (voice) {

                    return /google|microsoft|natural|neural|premium|enhanced/i
                        .test(
                            voice.name
                        );

                }
            );


        return (
            preferred ||
            candidates[0]
        );

    }


    function speak(
        text,
        languagePrefix,
        fallbackLanguage
    ) {

        if (
            !(
                "speechSynthesis"
                in window
            )
        ) {

            showToast(
                "Pronunciation isn't supported."
            );

            return;

        }


        window.speechSynthesis.cancel();


        const utterance =
            new SpeechSynthesisUtterance(
                text
            );


        const voice =
            pickVoice(
                languagePrefix
            );


        if (voice) {

            utterance.voice =
                voice;

            utterance.lang =
                voice.lang;

        } else {

            utterance.lang =
                fallbackLanguage ||
                languagePrefix;

        }


        utterance.rate =
            0.78;


        utterance.pitch =
            1;


        window.speechSynthesis
            .speak(
                utterance
            );

    }


    function speakEntry(
        entry
    ) {

        speak(
            entry.ko,
            "ko",
            "ko-KR"
        );

    }


    /* =====================================================
       TOAST
       ===================================================== */

    let toastTimer =
        null;


    function showToast(
        message
    ) {

        if (!els.toast) return;


        els.toast.textContent =
            message;


        els.toast.hidden =
            false;


        clearTimeout(
            toastTimer
        );


        toastTimer =
            setTimeout(
                function () {

                    els.toast.hidden =
                        true;

                },
                2200
            );

    }


    /* =====================================================
       RESULT BUTTONS
       ===================================================== */

    if (els.results) {

        els.results.addEventListener(
            "click",
            function (event) {


                const themeSwitch =
                    event.target.closest(
                        "[data-theme-toggle]"
                    );


                if (themeSwitch) {

                    toggleTheme();

                    if (currentTab === "profile") {
                        renderProfileTab();
                    }

                    return;

                }


                const logoutButton =
                    event.target.closest(
                        "[data-logout]"
                    );


                if (logoutButton) {

                    logoutButton.disabled =
                        true;

                    performLogout()

                        .finally(
                            function () {

                                logoutButton.disabled =
                                    false;

                            }
                        );

                    return;

                }


                const requestsBtn =
                    event.target.closest("[data-open-requests]");

                if (requestsBtn) {
                    openRequestsOverlay();
                    return;
                }

                const detailsBtn =
                    event.target.closest("[data-open-details]");

                if (detailsBtn) {
                    openDetailsOverlay();
                    return;
                }

                const passwordBtn =
                    event.target.closest("[data-open-password]");

                if (passwordBtn) {
                    openPasswordOverlay();
                    return;
                }

                const groupBtn =
                    event.target.closest("[data-home-group]");

                if (groupBtn) {
                    homeGroup = groupBtn.getAttribute("data-home-group");
                    homeLimit = 60;
                    render();
                    return;
                }

                const moreBtn =
                    event.target.closest("[data-home-more]");

                if (moreBtn) {
                    homeLimit += 60;
                    render();
                    return;
                }

                const homeWordBtn =
                    event.target.closest("[data-home-word]");

                if (homeWordBtn) {
                    openWordInSearch(
                        homeWordBtn.getAttribute("data-home-word"),
                        false
                    );
                    return;
                }

                const myViewBtn =
                    event.target.closest("[data-my-view]");

                if (myViewBtn) {
                    myView = myViewBtn.getAttribute("data-my-view");
                    render();
                    return;
                }

                const openUsersButton =
                    event.target.closest(
                        "[data-open-users-overlay]"
                    );


                if (openUsersButton) {

                    openUsersOverlay();

                    return;

                }


                const favButton =
                    event.target.closest(
                        "[data-fav]"
                    );


                const imageEl =
                    event.target.closest(
                        "[data-view-image]"
                    );


                if (imageEl) {

                    window.open(
                        imageEl.getAttribute(
                            "data-view-image"
                        ),
                        "_blank"
                    );

                    return;

                }


                const searchWordEl =
                    event.target.closest(
                        "[data-search-word]"
                    );


                if (searchWordEl) {

                    const word =
                        searchWordEl.getAttribute(
                            "data-search-word"
                        );


                    performSearch(
                        word
                    );


                    return;

                }


                const speakButton =
                    event.target.closest(
                        "[data-speak]"
                    );


                const editButton =
                    event.target.closest(
                        "[data-edit]"
                    );


                const deleteButton =
                    event.target.closest(
                        "[data-delete]"
                    );


                const restoreButton =
                    event.target.closest(
                        "[data-restore]"
                    );


                if (favButton) {

                    toggleFav(
                        favButton.getAttribute(
                            "data-fav"
                        )
                    );

                    return;

                }


                if (speakButton) {

                    const id =
                        speakButton.getAttribute(
                            "data-speak"
                        );


                    const entry =
                        allData().find(
                            function (item) {

                                return (
                                    item.id === id
                                );

                            }
                        );


                    if (entry) {

                        speakEntry(
                            entry
                        );

                    }


                    return;

                }


                if (editButton) {

                    const id =
                        editButton.getAttribute(
                            "data-edit"
                        );


                    const entry =
                        allData().find(
                            function (item) {

                                return (
                                    item.id === id
                                );

                            }
                        );


                    if (entry) {

                        openEditModal(
                            entry
                        );

                    }


                    return;

                }


                if (deleteButton) {

                    const id =
                        deleteButton.getAttribute(
                            "data-delete"
                        );


                    const targetEntry =
                        allData().find(
                            function (e) {

                                return e.id === id;

                            }
                        );


                    const isPermanent =
                        isAdminUser &&
                        !(targetEntry && targetEntry.mine);


                    const confirmMessage =
                        isPermanent
                            ? "Permanently delete this word for everyone? This cannot be undone."
                            : "Delete this word? You can restore it later from the Deleted tab.";


                    if (
                        confirm(
                            confirmMessage
                        )
                    ) {

                        deleteWord(id);

                    }


                    return;

                }


                if (restoreButton) {

                    restoreWord(
                        restoreButton.getAttribute(
                            "data-restore"
                        )
                    );

                }

            }
        );

    }


    /* =====================================================
       SEARCH
       ===================================================== */

    const MAX_HISTORY_ITEMS =
        15;


    function recordSearchHistory(term) {

        const clean =
            (term || "")
                .trim();


        if (!clean) {
            return;
        }


        searchHistory =
            searchHistory.filter(
                function (item) {

                    return (
                        item.toLowerCase() !==
                        clean.toLowerCase()
                    );

                }
            );


        searchHistory.unshift(
            clean
        );


        if (
            searchHistory.length >
            MAX_HISTORY_ITEMS
        ) {

            searchHistory =
                searchHistory.slice(
                    0,
                    MAX_HISTORY_ITEMS
                );

        }


        saveJSON(
            LS_HISTORY,
            searchHistory
        );

    
        renderSearchHistoryDropdown();

    }


    function renderSearchHistoryDropdown() {

        const dropdown =
            document.getElementById("searchHistoryDropdown");

        if (!dropdown) {
            return;
        }

        if (searchHistory.length === 0) {

            dropdown.innerHTML =
                '<div class="search-history-title"><span>Search history</span></div>' +
                '<p class="search-history-empty">No searches yet.</p>';

            return;

        }

        const itemsHtml =
            searchHistory
                .map(
                    function (term) {
                        return (
                            '<button type="button" class="search-history-item" data-history-word="' +
                            escapeHtml(term) +
                            '">🕑 ' +
                            escapeHtml(term) +
                            "</button>"
                        );
                    }
                )
                .join("");

        dropdown.innerHTML =
            '<div class="search-history-title">' +
            "<span>Search history</span>" +
            '<button type="button" class="search-history-clear" id="clearHistoryBtn">Clear</button>' +
            "</div>" +
            itemsHtml;

    }


    function showSearchHistoryDropdown() {

        renderSearchHistoryDropdown();

    }


    /* history is always visible on the Search tab */
    function hideSearchHistoryDropdown() {}

document.addEventListener(
        "click",
        function (event) {

            const dropdown =
                document.getElementById(
                    "searchHistoryDropdown"
                );


            if (
                !dropdown ||
                dropdown.hidden
            ) {
                return;
            }


            const clickedHistoryItem =
                event.target.closest(
                    "[data-history-word]"
                );


            if (clickedHistoryItem) {

                performSearch(
                    clickedHistoryItem.getAttribute(
                        "data-history-word"
                    )
                );

                return;

            }


            const clickedClearBtn =
                event.target.closest(
                    "#clearHistoryBtn"
                );


            if (clickedClearBtn) {

                searchHistory = [];

                saveJSON(
                    LS_HISTORY,
                    searchHistory
                );

                renderSearchHistoryDropdown();

                return;

            }


            const clickedSearchInput =
                event.target.closest(
                    ".searchbar"
                );


            if (!clickedSearchInput) {

                hideSearchHistoryDropdown();

            }

        }
    );


    if (els.search) {

        els.search.addEventListener(
            "blur",
            function () {

                setTimeout(
                    function () {

                        const active =
                            document.activeElement;


                        const dropdown =
                            document.getElementById(
                                "searchHistoryDropdown"
                            );


                        const focusMovedIntoDropdown =
                            dropdown &&
                            active &&
                            dropdown.contains(active);


                        if (!focusMovedIntoDropdown) {

                            hideSearchHistoryDropdown();

                        }

                    },
                    150
                );

            }
        );

    }


    let searchDebounce =
        null;

    let historyDebounce =
        null;


    if (els.search) {

        els.search.addEventListener(
            "focus",
            function () {

                if (!els.search.value) {

                    showSearchHistoryDropdown();

                }

            }
        );


        els.search.addEventListener(
            "keydown",
            function (event) {

                if (event.key === "Enter") {

                    clearTimeout(
                        searchDebounce
                    );

                    clearTimeout(
                        historyDebounce
                    );


                    currentQuery =
                        els.search.value;


                    recordSearchHistory(
                        els.search.value
                    );


                    hideSearchHistoryDropdown();


                    render();


                    els.search.blur();

                }

            }
        );


        els.search.addEventListener(
            "input",
            function () {

                clearTimeout(
                    searchDebounce
                );

                clearTimeout(
                    historyDebounce
                );


                const value =
                    els.search.value;


                if (value) {

                    hideSearchHistoryDropdown();

                } else {

                    showSearchHistoryDropdown();

                }


                searchDebounce =
                    setTimeout(
                        function () {

                            currentQuery =
                                value;

                            render();

                        },
                        80
                    );


                historyDebounce =
                    setTimeout(
                        function () {

                            recordSearchHistory(
                                value
                            );

                        },
                        1200
                    );


                els.clear.style.display =
                    value
                        ? "flex"
                        : "none";

            }
        );

    }


    if (els.clear) {

        els.clear.style.display =
            "none";


        els.clear.addEventListener(
            "click",
            function () {

                els.search.value =
                    "";

                currentQuery =
                    "";

                els.clear.style.display =
                    "none";

                render();

                els.search.focus();

                showSearchHistoryDropdown();

            }
        );

    }


    /* =====================================================
       TABS
       ===================================================== */

    els.tabs.forEach(
        function (tab) {

            tab.addEventListener(
                "click",
                function () {

                    setTab(tab.getAttribute("data-tab"));

                    render();

                    window.scrollTo({ top: 0 });

                    if (currentTab === "search" && els.search) {
                        els.search.focus();
                    }

                }
            );

        }
    );

/* =====================================================
       ADD / EDIT MODAL
       ===================================================== */

    let pendingImageFile =
        null;

    let pendingImageRemoval =
        false;


    function resetImageField(existingUrl, allowImage) {

        pendingImageFile =
            null;

        pendingImageRemoval =
            false;


        if (els.fImage) {

            els.fImage.value =
                "";

        }


        if (els.imageFieldWrap) {

            els.imageFieldWrap.hidden =
                !allowImage;

        }


        if (
            els.imagePreviewWrap &&
            els.imagePreview
        ) {

            if (existingUrl) {

                els.imagePreview.src =
                    existingUrl;

                els.imagePreviewWrap.hidden =
                    false;

            } else {

                els.imagePreview.src =
                    "";

                els.imagePreviewWrap.hidden =
                    true;

            }

        }

    }


    function resetDescriptionField(existingValue, allowField) {

        if (els.descriptionFieldWrap) {

            els.descriptionFieldWrap.hidden =
                !allowField;

        }


        if (els.fDescription) {

            els.fDescription.value =
                existingValue || "";

        }

    }


    function openAddModal() {

        editingId =
            null;


        els.modalTitle.textContent =
            isAdminUser
                ? "Add a word (visible to everyone)"
                : "Add a word";


        els.saveWordBtn.textContent =
            "Save word";


        els.resetEdit.hidden =
            true;


        els.addWordForm.reset();


        resetDescriptionField(
            null,
            isAdminUser
        );


        resetImageField(
            null,
            isAdminUser
        );


        els.modalOverlay.hidden =
            false;

        snapshotModal();


        document
            .getElementById("fKo")
            .focus();

    }


    function openEditModal(
        entry
    ) {

        editingId =
            entry.id;


        els.modalTitle.textContent =
            (isAdminUser && !entry.mine)
                ? "Edit word (visible to everyone)"
                : "Edit word";


        els.saveWordBtn.textContent =
            "Save changes";


        document
            .getElementById("fKo")
            .value =
            entry.ko;


        document
            .getElementById("fNp")
            .value =
            entry.np;


        document
            .getElementById("fSimilar")
            .value =
            entry.similar || "";


        document
            .getElementById("fOpposite")
            .value =
            entry.opposite || "";


        els.resetEdit.hidden =
            entry.mine ||
            isAdminUser ||
            !edits[entry.id];


        resetDescriptionField(
            entry.mine ? null : (entry.description || null),
            isAdminUser && !entry.mine
        );


        resetImageField(
            entry.mine ? null : (entry.image_url || null),
            isAdminUser && !entry.mine
        );


        els.modalOverlay.hidden =
            false;

        snapshotModal();


        document
            .getElementById("fKo")
            .focus();

    }


    function closeModal() {

        els.modalOverlay.hidden =
            true;


        els.addWordForm.reset();


        editingId =
            null;

    }


    els.addWordBtn.addEventListener(
        "click",
        openAddModal
    );


    els.modalClose.addEventListener(
        "click",
        closeModal
    );


    els.cancelAdd.addEventListener(
        "click",
        closeModal
    );


    /* A stray tap/click outside the window, a text-selection drag that ends
       outside it, or the Esc key must never throw away what was typed. */

    let modalSnapshotValue = "";

    function modalFormState() {

        return Array.prototype.map.call(
            els.addWordForm.elements,
            function (field) {

                if (field.type === "file") {
                    return field.files && field.files.length ? "file" : "";
                }

                if (field.type === "checkbox" || field.type === "radio") {
                    return field.checked ? "1" : "0";
                }

                return field.value || "";

            }
        ).join("\u0001");

    }

    function snapshotModal() {

        modalSnapshotValue = modalFormState();

    }

    function isModalDirty() {

        return modalFormState() !== modalSnapshotValue;

    }

    let backdropPressStartedOutside = false;

    els.modalOverlay.addEventListener(
        "pointerdown",
        function (event) {
            backdropPressStartedOutside =
                event.target === els.modalOverlay;
        }
    );

    els.modalOverlay.addEventListener(
        "click",
        function (event) {

            const startedOutside = backdropPressStartedOutside;

            backdropPressStartedOutside = false;

            if (
                event.target === els.modalOverlay &&
                startedOutside &&
                !isModalDirty()
            ) {
                closeModal();
            }

        }
    );

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape" &&
                !els.modalOverlay.hidden &&
                !isModalDirty()
            ) {
                closeModal();
            }

        }
    );

    /* warn before leaving the page (reload, back, closing the tab)
       while an add/edit window has unsaved changes */
    window.addEventListener(
        "beforeunload",
        function (event) {

            if (!els.modalOverlay.hidden && isModalDirty()) {
                event.preventDefault();
                event.returnValue = "";
            }

        }
    );

    els.resetEdit.addEventListener(
        "click",
        function () {

            if (editingId) {

                resetEditFor(
                    editingId
                );

                closeModal();

            }

        }
    );


    /* =====================================================
       SAVE WORD
       ===================================================== */

    if (els.fImage) {

        els.fImage.addEventListener(
            "change",
            function () {

                const file =
                    els.fImage.files &&
                    els.fImage.files[0];


                if (!file) {
                    return;
                }


                pendingImageFile =
                    file;

                pendingImageRemoval =
                    false;


                const reader =
                    new FileReader();


                reader.onload =
                    function (event) {

                        if (
                            els.imagePreview &&
                            els.imagePreviewWrap
                        ) {

                            els.imagePreview.src =
                                event.target.result;

                            els.imagePreviewWrap.hidden =
                                false;

                        }

                    };


                reader.readAsDataURL(
                    file
                );

            }
        );

    }


    if (els.removeImageBtn) {

        els.removeImageBtn.addEventListener(
            "click",
            function () {

                pendingImageFile =
                    null;

                pendingImageRemoval =
                    true;


                if (els.fImage) {

                    els.fImage.value =
                        "";

                }


                if (
                    els.imagePreview &&
                    els.imagePreviewWrap
                ) {

                    els.imagePreview.src =
                        "";

                    els.imagePreviewWrap.hidden =
                        true;

                }

            }
        );

    }


    els.addWordForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const ko =
                document
                    .getElementById("fKo")
                    .value
                    .trim();


            const np =
                document
                    .getElementById("fNp")
                    .value
                    .trim();


            const similar =
                document
                    .getElementById("fSimilar")
                    .value
                    .trim();


            const opposite =
                document
                    .getElementById("fOpposite")
                    .value
                    .trim();


            const description =
                els.fDescription
                    ? els.fDescription.value.trim()
                    : "";


            if (!ko || !np) {

                return;

            }


            /* EDIT */

            if (editingId) {


                const isDuplicateOnEdit =
                    allData().some(
                        function (existing) {

                            return (
                                existing.id !==
                                    editingId &&
                                existing.ko
                                    .trim()
                                    .toLowerCase() ===
                                ko
                                    .trim()
                                    .toLowerCase()
                            );

                        }
                    );


                if (isDuplicateOnEdit) {

                    showToast(
                        '"' +
                        ko +
                        '" already exists in the dictionary.'
                    );

                    return;

                }


                const target =
                    mine.find(
                        function (word) {

                            return (
                                word.id ===
                                editingId
                            );

                        }
                    );


                if (target) {


                    target.ko =
                        ko;


                    target.np =
                        np;


                    target.similar =
                        similar;


                    target.opposite =
                        opposite;


                    saveJSON(
                        LS_MINE,
                        mine
                    );


                    closeModal();


                    showToast(
                        "Changes saved."
                    );


                    render();


                    return;

                }


                if (isAdminUser) {


                    const baseForImage =
                        rawBaseData.find(
                            function (e) {

                                return (
                                    e.id ===
                                    editingId
                                );

                            }
                        );


                    resolveImageUrl(
                        baseForImage &&
                        baseForImage.image_url
                    )

                        .then(
                            function (resolvedImageUrl) {

                                return supabaseClient

                                    .from("words")

                                    .update({

                                        ko: ko,

                                        np: np,

                                        similar: similar,

                                        opposite: opposite,

                                        description: description,

                                        image_url: resolvedImageUrl,

                                        updated_at:
                                            new Date().toISOString()

                                    })

                                    .eq("id", Number(editingId))

                                    .then(
                                        function (response) {

                                            if (response.error) {

                                                throw response.error;

                                            }


                                            const base =
                                                rawBaseData.find(
                                                    function (e) {

                                                        return (
                                                            e.id ===
                                                            editingId
                                                        );

                                                    }
                                                );


                                            if (base) {

                                                base.ko = ko;
                                                base.np = np;
                                                base.similar = similar;
                                                base.opposite = opposite;
                                                base.description = description;
                                                base.image_url = resolvedImageUrl;

                                            }


                                            if (edits[editingId]) {

                                                delete edits[editingId];

                                                saveJSON(
                                                    LS_EDITS,
                                                    edits
                                                );

                                            }


                                            closeModal();


                                            showToast(
                                                "Word updated for everyone."
                                            );


                                            render();

                                        }
                                    );

                            }
                        )

                        .catch(
                            function (error) {

                                console.error(error);

                                showToast(
                                    "Couldn't save: " +
                                    (error.message || "unknown error")
                                );

                            }
                        );


                    return;

                }


                edits[editingId] = {
                    ko:
                        ko,

                    np:
                        np,

                    similar:
                        similar,

                    opposite:
                        opposite

                };


                saveJSON(
                    LS_EDITS,
                    edits
                );


                closeModal();


                showToast(
                    "Changes saved."
                );


                render();


                return;

            }


            /* ADD NEW WORD */

            const isDuplicateWord =
                allData().some(
                    function (existing) {

                        return (
                            existing.ko
                                .trim()
                                .toLowerCase() ===
                            ko
                                .trim()
                                .toLowerCase()
                        );

                    }
                );


            if (isDuplicateWord) {

                showToast(
                    '"' +
                    ko +
                    '" already exists in the dictionary.'
                );

                return;

            }


            if (isAdminUser) {


                resolveImageUrl(
                    null
                )

                    .then(
                        function (resolvedImageUrl) {

                            return supabaseClient

                                .from("words")

                                .insert({

                                    ko: ko,

                                    np: np,

                                    similar: similar,

                                    opposite: opposite,

                                    description: description,

                                    image_url: resolvedImageUrl

                                })

                                .select()

                                .then(
                                    function (response) {

                                        if (response.error) {

                                            throw response.error;

                                        }


                                        const row =
                                            response.data &&
                                            response.data[0];


                                        if (row) {

                                            rawBaseData.unshift({

                                                id: String(row.id),

                                                ko: row.ko || "",

                                                np: row.np || "",

                                                similar: row.similar || "",

                                                opposite: row.opposite || "",

                                                description: row.description || "",

                                                image_url: row.image_url || "",

                                                mine: false

                                            });

                                        }


                                        closeModal();


                                        showToast(
                                            "Word added to the dictionary."
                                        );


                                        render();

                                    }
                                );

                        }
                    )

                    .catch(
                        function (error) {

                            console.error(error);

                            showToast(
                                "Couldn't add word: " +
                                (error.message || "unknown error")
                            );

                        }
                    );


                return;

            }


            const id =
                "m" +
                Date.now() +
                Math.floor(
                    Math.random() *
                    1000
                );


            mine.unshift({

                id:
                    id,

                ko:
                    ko,

                np:
                    np,

                similar:
                    similar,

                opposite:
                    opposite,

                mine:
                    true

            });


            saveJSON(
                LS_MINE,
                mine
            );


            closeModal();


            showToast(
                "Word added."
            );


            myView = "mine";

            const mineTab =
                document.querySelector(
                    '.tab[data-tab="mywords"]'
                );


            if (mineTab) {

                mineTab.click();

            }

        }
    );


    /* =====================================================
       LOAD WORDS
       ===================================================== */

    function loadDictionary() {

        if (!els.results) {
            return;
        }


        els.results.innerHTML =

            '<p class="empty-state" style="grid-column:1/-1;">' +

            "Loading dictionary…" +

            "</p>";


        const PAGE_SIZE =
            500;


        const MAX_PAGES =
            50;


        function fetchPage(offset, accumulated, pageCount) {

            if (pageCount >= MAX_PAGES) {

                return Promise.resolve(
                    accumulated
                );

            }


            return supabaseClient

                .from("words")

                .select("*")

                .order("ko", { ascending: true })

                .range(
                    offset,
                    offset + PAGE_SIZE - 1
                )

                .then(
                    function (response) {

                        if (response.error) {

                            throw response.error;

                        }


                        const pageRows =
                            response.data ||
                            [];


                        const combined =
                            accumulated.concat(
                                pageRows
                            );


                        if (
                            pageRows.length > 0
                        ) {

                            return fetchPage(
                                offset +
                                pageRows.length,
                                combined,
                                pageCount + 1
                            );

                        }


                        return combined;

                    }
                );

        }


        fetchPage(0, [], 0)

            .then(
                function (allRows) {


                    rawBaseData =
                        allRows.map(
                            function (item) {

                                return {

                                    id:
                                        String(item.id),

                                    ko:
                                        item.ko ||
                                        "",

                                    np:
                                        item.np ||
                                        "",

                                    similar:
                                        item.similar ||
                                        "",

                                    opposite:
                                        item.opposite ||
                                        "",

                                    description:
                                        item.description ||
                                        "",

                                    image_url:
                                        item.image_url ||
                                        "",

                                    mine:
                                        false

                                };

                            }
                        );


                    render();

                }
            )


            .catch(
                function (error) {

                    console.error(
                        error
                    );


                    els.results.innerHTML =

                        '<p class="empty-state" style="grid-column:1/-1;">' +

                        "Couldn't load the dictionary. " +

                        "(" + escapeHtml(error.message || "unknown error") + ")" +

                        "</p>";

                }
            );

    }


    /* =====================================================
       START DICTIONARY
       ===================================================== */

    /* the words load after login, once the user is approved */


    /* =====================================================
       START AUTHENTICATION
       ===================================================== */

    checkUser();


});
