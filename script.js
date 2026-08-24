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

const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {

            auth: {

                /*
                 * Always require a fresh login on
                 * every visit — don't auto-restore
                 * a saved session, so the login
                 * screen shows before the dictionary.
                 */

                persistSession: false

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

    const logoutBtn =
        document.getElementById("logoutBtn");


    let isSignupMode = false;


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

    function updateUserInterface(user) {

        if (!user) return;

        console.log(
            "Logged in:",
            user.email
        );

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


                /* VALIDATION */

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
                                        window.location.pathname

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


                } else {


                    authTitle.textContent =
                        "Login";


                    authSubmit.textContent =
                        "Login";


                    toggleAuth.textContent =
                        "Create an account";


                    forgotPassword.style.display =
                        "block";

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


                    showAuthMessage(
                        error.message ||
                        "Could not send password reset email.",
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
       LOGOUT
       ===================================================== */

    if (logoutBtn) {

        logoutBtn.addEventListener(
            "click",
            async function () {

                logoutBtn.disabled = true;

                try {

                    const { error } =
                        await supabaseClient.auth.signOut();

                    if (error) {
                        throw error;
                    }

                    authEmail.value = "";
                    authPassword.value = "";

                    showAuthMessage("");

                    showLogin();

                } catch (error) {

                    console.error(
                        "Logout error:",
                        error
                    );

                } finally {

                    logoutBtn.disabled = false;

                }

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

    const DATA_URL =
        "words.json";


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

                escapeHtml(
                    entry.similar
                ) +

                "</span></div>";

        }


        if (entry.opposite) {

            meta +=

                '<div class="meta-line opposite-line">' +

                "<b>opposite</b> " +

                '<span class="tagword">' +

                escapeHtml(
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


        return

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
                meta
                    ? '<div class="meta-row">' +
                      meta +
                      "</div>"
                    : ""
            ) +


            "</div>";

    }


    /* =====================================================
       RENDER
       ===================================================== */

    function render() {

        if (!els.results) return;


        let data = [];


        try {

            const trashedView =
                currentTab === "trash";


            data =
                getFiltered();


            els.results.innerHTML =
                data.map(
                    function (entry) {

                        return cardHtml(
                            entry,
                            trashedView
                        );

                    }
                ).join("");

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


                    if (
                        confirm(
                            "Delete this word? You can restore it later from the Deleted tab."
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

    let searchDebounce =
        null;


    if (els.search) {

        els.search.addEventListener(
            "input",
            function () {

                clearTimeout(
                    searchDebounce
                );


                const value =
                    els.search.value;


                searchDebounce =
                    setTimeout(
                        function () {

                            currentQuery =
                                value;

                            render();

                        },
                        80
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

    function openAddModal() {

        editingId =
            null;


        els.modalTitle.textContent =
            "Add a word";


        els.saveWordBtn.textContent =
            "Save word";


        els.resetEdit.hidden =
            true;


        els.addWordForm.reset();


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
            "Edit word";


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
            !edits[entry.id];


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


                }


                else {


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

                }


                closeModal();


                showToast(
                    "Changes saved."
                );


                render();


                return;

            }


            /* ADD NEW WORD */

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


        fetch(
            DATA_URL +
            "?v=" +
            Date.now(),
            {
                cache:
                    "no-store"
            }
        )


            .then(
                function (response) {

                    if (!response.ok) {

                        throw new Error(
                            "HTTP " +
                            response.status
                        );

                    }


                    return response.json();

                }
            )


            .then(
                function (data) {


                    rawBaseData =
                        (data || []).map(
                            function (
                                item,
                                index
                            ) {

                                return {

                                    id:
                                        "b" +
                                        index,

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

                        "Couldn't load words.json. " +

                        "Please check that words.json is in the same GitHub repository." +

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
