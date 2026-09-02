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

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
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

    const logoutBtn =
        document.getElementById("logoutBtn");

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

    const profileBtn =
        document.getElementById("profileBtn");

    const profileMenu =
        document.getElementById("profileMenu");

    const profileName =
        document.getElementById("profileName");

    const profileEmail =
        document.getElementById("profileEmail");

    const profileDob =
        document.getElementById("profileDob");


    let isSignupMode = false;

    let isAdminUser = false;


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

        if (authSection) {
            authSection.style.display = "flex";
        }

        if (dictionaryApp) {
            dictionaryApp.hidden = true;
        }

    }


    /* =====================================================
       SHOW DICTIONARY
       ===================================================== */

    function showDictionary() {

        if (authSection) {
            authSection.style.display = "none";
        }

        if (dictionaryApp) {
            dictionaryApp.hidden = false;
        }

        if (typeof render === "function") {
            render();
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


    function updateUserInterface(user) {

        if (!user) return;

        console.log(
            "Logged in:",
            user.email
        );


        startPresenceHeartbeat(
            user.id
        );


        const metadata =
            user.user_metadata ||
            {};


        if (profileName) {

            profileName.textContent =
                metadata.full_name ||
                "Dictionary user";

        }


        if (profileEmail) {

            profileEmail.textContent =
                user.email ||
                "";

        }


        if (profileDob) {

            if (metadata.date_of_birth) {

                profileDob.textContent =
                    "Born: " +
                    metadata.date_of_birth;

                profileDob.hidden = false;

            } else {

                profileDob.textContent = "";

                profileDob.hidden = true;

            }

        }


        isAdminUser =
            !!user.email &&
            user.email.toLowerCase() ===
                ADMIN_EMAIL.toLowerCase();


        const usersTab =
            document.querySelector(
                '.tab[data-tab="users"]'
            );

        if (usersTab) {

            usersTab.hidden =
                !isAdminUser;

        }


        const profileAdminNote =
            document.getElementById(
                "profileAdminNote"
            );

        if (profileAdminNote) {

            profileAdminNote.hidden =
                !isAdminUser;

        }


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

                                    showDictionary();

                                    updateUserInterface(
                                        data.user
                                    );

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


                        updateUserInterface(
                            data.user
                        );


                        setTimeout(
                            function () {

                                showDictionary();

                            },
                            500
                        );

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
       FORGOT PASSWORD
       ===================================================== */

    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            async function () {

                const email =
                    authEmail.value.trim();


                if (!email) {

                    showAuthMessage(
                        "Enter your email address first.",
                        "error"
                    );

                    authEmail.focus();

                    return;

                }


                showAuthMessage(
                    "Sending password reset email...",
                    ""
                );


                try {


                    const {
                        error
                    } =
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


                    showAuthMessage(
                        "Password reset email sent. Check your inbox.",
                        "success"
                    );


                } catch (error) {

                    console.error(error);


                    let message =
                        error.message ||
                        "Could not send password reset email.";


                    if (
                        message
                            .toLowerCase()
                            .includes("rate limit")
                    ) {

                        message =
                            "Too many emails sent recently. Please wait a bit and try again.";

                    }


                    if (
                        message
                            .toLowerCase()
                            .includes("error sending")
                    ) {

                        message =
                            "Couldn't send the reset email right now. This usually means the site's email service needs attention — please contact the site owner.";

                    }


                    showAuthMessage(
                        message,
                        "error"
                    );

                }

            }
        );

    }


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


            if (
                session &&
                session.user
            ) {

                showDictionary();

                updateUserInterface(
                    session.user
                );

            } else {

                showLogin();

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


            if (
                session &&
                session.user
            ) {

                showDictionary();

                updateUserInterface(
                    session.user
                );

            }

        }
    );


    /* =====================================================
       PROFILE MENU
       ===================================================== */

    if (profileBtn && profileMenu) {

        profileBtn.addEventListener(
            "click",
            function (event) {

                event.stopPropagation();

                const isOpen =
                    !profileMenu.hidden;

                profileMenu.hidden =
                    isOpen;

                profileBtn.setAttribute(
                    "aria-expanded",
                    isOpen ? "false" : "true"
                );

            }
        );


        document.addEventListener(
            "click",
            function (event) {

                if (profileMenu.hidden) {
                    return;
                }

                if (
                    profileMenu.contains(event.target) ||
                    profileBtn.contains(event.target)
                ) {
                    return;
                }

                profileMenu.hidden = true;

                profileBtn.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }
        );

    }


    /* =====================================================
       LOGOUT
       ===================================================== */

    async function performLogout(message) {

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

        if (profileMenu) {
            profileMenu.hidden = true;
        }

        if (profileBtn) {
            profileBtn.setAttribute(
                "aria-expanded",
                "false"
            );
        }

        isAdminUser = false;

        stopPresenceHeartbeat();

        const usersTab =
            document.querySelector(
                '.tab[data-tab="users"]'
            );

        if (usersTab) {
            usersTab.hidden = true;
        }

        showAuthMessage(
            message || ""
        );

        showLogin();

    }


    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async function () {

                logoutBtn.disabled = true;

                await performLogout();

                logoutBtn.disabled = false;

            }
        );

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


    let currentTab =
        "all";

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
                ".tab[data-tab]"
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

    function getFiltered() {

        if (
            currentTab ===
            "trash"
        ) {

            let trashed =
                deletedData();


            if (currentQuery) {

                trashed =
                    trashed.filter(
                        function (entry) {

                            return matches(
                                entry,
                                currentQuery
                            );

                        }
                    );

            }


            return trashed;

        }


        let data =
            allData();


        if (
            currentTab ===
            "fav"
        ) {

            data =
                data.filter(
                    function (entry) {

                        return isFav(
                            entry.id
                        );

                    }
                );

        }


        else if (
            currentTab ===
            "mine"
        ) {

            data =
                data.filter(
                    function (entry) {

                        return entry.mine;

                    }
                );

        }


        if (currentQuery) {

            data =
                data.filter(
                    function (entry) {

                        return matches(
                            entry,
                            currentQuery
                        );

                    }
                );

        }


        return data;

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

    function performSearch(word) {

        if (!word) {
            return;
        }


        if (els.search) {

            els.search.value =
                word;

        }


        currentQuery =
            word;


        currentTab =
            "all";


        els.tabs.forEach(
            function (tabEl) {

                const isActive =
                    tabEl.getAttribute(
                        "data-tab"
                    ) === "all";

                tabEl.classList.toggle(
                    "active",
                    isActive
                );

                tabEl.setAttribute(
                    "aria-selected",
                    isActive ? "true" : "false"
                );

            }
        );


        if (els.clear) {

            els.clear.style.display =
                "flex";

        }


        recordSearchHistory(
            word
        );


        hideSearchHistoryDropdown();


        render();


        window.scrollTo(
            {
                top: 0,
                behavior: "smooth"
            }
        );

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
            currentTab === "trash";


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


        if (currentTab === "users") {

            renderUsersTab();

            return;

        }


        let data = [];


        try {

            const trashedView =
                currentTab === "trash";


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


        els.empty.hidden =
            data.length !== 0;


        const all =
            allData();


        els.countAll.textContent =
            all.length;


        els.countFav.textContent =
            favorites.length;


        els.countMine.textContent =
            mine.length;


        els.countTrash.textContent =
            deleted.length;


        els.stats.textContent =
            all.length +
            " entries";


        els.footCount.textContent =
            rawBaseData.length;

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


        const result =
            await response.json();


        if (!response.ok) {

            throw new Error(
                result.error ||
                ("HTTP " + response.status)
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


    function renderUsersTab() {

        els.empty.hidden = true;

        els.countAll.textContent =
            allData().length;

        els.countFav.textContent =
            favorites.length;

        els.countMine.textContent =
            mine.length;

        els.countTrash.textContent =
            deleted.length;


        const countUsers =
            document.getElementById(
                "countUsers"
            );


        if (usersCache === null) {

            els.results.innerHTML =

                '<p class="empty-state" style="grid-column:1/-1;">' +

                "Loading users…" +

                "</p>";


            callAdminUsersFunction(
                { action: "list" }
            )

                .then(
                    function (result) {

                        usersCache =
                            result.users || [];

                        renderUsersTab();

                    }
                )

                .catch(
                    function (error) {

                        console.error(error);

                        els.results.innerHTML =

                            '<p class="empty-state" style="grid-column:1/-1;">' +

                            "Couldn't load users (" +

                            escapeHtml(error.message || "unknown error") +

                            "). Make sure the admin-users Edge Function is deployed." +

                            "</p>";

                    }
                );


            return;

        }


        if (countUsers) {

            countUsers.textContent =
                usersCache.length;

        }


        if (usersCache.length === 0) {

            els.results.innerHTML =

                '<p class="empty-state" style="grid-column:1/-1;">' +

                "No other users yet." +

                "</p>";

            return;

        }


        els.results.innerHTML =

            usersCache

                .map(userRowHtml)

                .join("");

    }


    function refreshUsersCache() {

        usersCache = null;

        if (currentTab === "users") {

            render();

        }

    }


    if (els.results) {

        els.results.addEventListener(
            "click",
            function (event) {

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

    }


    function renderSearchHistoryDropdown() {

        const dropdown =
            document.getElementById(
                "searchHistoryDropdown"
            );


        if (!dropdown) {
            return;
        }


        if (searchHistory.length === 0) {

            dropdown.innerHTML =

                '<p class="search-history-empty">No recent searches yet.</p>';

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

            "<span>Recent searches</span>" +

            '<button type="button" class="search-history-clear" id="clearHistoryBtn">Clear</button>' +

            "</div>" +

            itemsHtml;

    }


    function showSearchHistoryDropdown() {

        const dropdown =
            document.getElementById(
                "searchHistoryDropdown"
            );


        if (!dropdown) {
            return;
        }


        renderSearchHistoryDropdown();


        dropdown.hidden =
            false;

    }


    function hideSearchHistoryDropdown() {

        const dropdown =
            document.getElementById(
                "searchHistoryDropdown"
            );


        if (dropdown) {

            dropdown.hidden =
                true;

        }

    }


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

                hideSearchHistoryDropdown();

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

                    els.tabs.forEach(
                        function (item) {

                            item.classList
                                .remove(
                                    "active"
                                );

                            item.setAttribute(
                                "aria-selected",
                                "false"
                            );

                        }
                    );


                    tab.classList.add(
                        "active"
                    );


                    tab.setAttribute(
                        "aria-selected",
                        "true"
                    );


                    currentTab =
                        tab.getAttribute(
                            "data-tab"
                        );


                    render();

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


    els.modalOverlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                els.modalOverlay
            ) {

                closeModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key ===
                "Escape" &&
                !els.modalOverlay.hidden
            ) {

                closeModal();

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


            const mineTab =
                document.querySelector(
                    '.tab[data-tab="mine"]'
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

    loadDictionary();


    /* =====================================================
       START AUTHENTICATION
       ===================================================== */

    checkUser();


});
