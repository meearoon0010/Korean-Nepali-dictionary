/* ==========================================================
   한-네 사전 — Korean-Nepali Dictionary PWA
   Vanilla JS, no build step, no dependencies.
   ========================================================== */

(function () {
  "use strict";

  /* ---------------- Storage keys ---------------- */
  const LS_FAVORITES = "kndict_favorites";
  const LS_CUSTOM = "kndict_custom_words";
  const LS_THEME = "kndict_theme";
  const LS_RATE = "kndict_speech_rate";

  /* ---------------- State ---------------- */
  let favorites = loadJSON(LS_FAVORITES, []);      // array of word ids ("base-<id>" or "custom-<id>")
  let customWords = loadJSON(LS_CUSTOM, []);       // array of {id, word, meaning, similar, opposite}
  let allWords = [];                                // merged base + custom, normalized
  let currentSort = "default";
  let flashState = null;
  let quizState = null;

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* storage full/unavailable */ }
  }

  /* ---------------- Build word list ---------------- */
  function buildAllWords() {
    const base = WORDS_DATA.map(w => ({
      uid: "base-" + w.id,
      word: w.word,
      meaning: w.meaning,
      similar: w.similar || "",
      opposite: w.opposite || "",
      custom: false
    }));
    const custom = customWords.map(w => ({
      uid: "custom-" + w.id,
      word: w.word,
      meaning: w.meaning,
      similar: w.similar || "",
      opposite: w.opposite || "",
      custom: true
    }));
    allWords = base.concat(custom);
  }

  function isFavorite(uid) { return favorites.includes(uid); }
  function toggleFavorite(uid) {
    if (isFavorite(uid)) {
      favorites = favorites.filter(f => f !== uid);
    } else {
      favorites.push(uid);
    }
    saveJSON(LS_FAVORITES, favorites);
  }

  function findByUid(uid) {
    return allWords.find(w => w.uid === uid);
  }

  /* ---------------- Korean-aware helpers ---------------- */
  // Basic normalization: lowercases latin, trims whitespace.
  function norm(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function matches(word, query) {
    const q = norm(query);
    if (!q) return true;
    return norm(word.word).includes(q) ||
           norm(word.meaning).includes(q) ||
           norm(word.similar).includes(q) ||
           norm(word.opposite).includes(q);
  }

  /* ---------------- DOM refs ---------------- */
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const searchInput = $("#searchInput");
  const clearSearchBtn = $("#clearSearch");
  const wordListEl = $("#wordList");
  const resultsCountEl = $("#resultsCount");
  const emptyStateEl = $("#emptyState");
  const sortSelect = $("#sortSelect");

  const favListEl = $("#favList");
  const favCountEl = $("#favCount");
  const favEmptyStateEl = $("#favEmptyState");

  const myWordsListEl = $("#myWordsList");
  const myWordsCountEl = $("#myWordsCount");

  const toastEl = $("#toast");
  let toastTimer = null;
  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.remove("hidden");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.add("hidden"), 1800);
  }

  /* ---------------- Rendering: word card ---------------- */
  function wordCardHTML(w) {
    const fav = isFavorite(w.uid);
    return `
      <li class="word-card" data-uid="${w.uid}">
        <div class="word-card-main">
          <div class="word-kr">${escapeHTML(w.word)}${w.custom ? '<span class="word-tag">mine</span>' : ""}</div>
          <div class="word-np">${escapeHTML(w.meaning)}</div>
        </div>
        <div class="word-actions">
          <button class="mini-btn speak-btn" data-uid="${w.uid}" title="Pronounce" aria-label="Pronounce">🔊</button>
          <button class="mini-btn fav-btn ${fav ? "active" : ""}" data-uid="${w.uid}" title="Favorite" aria-label="Favorite">${fav ? "★" : "☆"}</button>
        </div>
      </li>`;
  }

  function escapeHTML(str) {
    const div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  /* ---------------- Search / list view ---------------- */
  function renderSearchList() {
    const q = searchInput.value;
    let list = allWords.filter(w => matches(w, q));

    if (currentSort === "az") {
      list = list.slice().sort((a, b) => a.word.localeCompare(b.word, "ko"));
    } else if (currentSort === "za") {
      list = list.slice().sort((a, b) => b.word.localeCompare(a.word, "ko"));
    }

    resultsCountEl.textContent = `${list.length} word${list.length === 1 ? "" : "s"}`;

    if (list.length === 0) {
      wordListEl.innerHTML = "";
      emptyStateEl.classList.remove("hidden");
    } else {
      emptyStateEl.classList.add("hidden");
      // Cap rendering for performance on very broad queries
      const capped = list.slice(0, 400);
      wordListEl.innerHTML = capped.map(wordCardHTML).join("");
    }
  }

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.classList.add("hidden");
    renderSearchList();
    searchInput.focus();
  });

  searchInput.addEventListener("input", () => {
    clearSearchBtn.classList.toggle("hidden", !searchInput.value);
    renderSearchList();
  });

  sortSelect.addEventListener("change", () => {
    currentSort = sortSelect.value;
    renderSearchList();
  });

  $("#goAddFromEmpty").addEventListener("click", () => {
    switchView("add");
    const q = searchInput.value;
    if (q && !/[\u0900-\u097F]/.test(q)) { // not devanagari -> assume korean word typed
      $("#addWord").value = q;
    } else if (q) {
      $("#addMeaning").value = q;
    }
  });

  /* ---------------- Favorites view ---------------- */
  function renderFavorites() {
    const favWords = allWords.filter(w => isFavorite(w.uid));
    favCountEl.textContent = `${favWords.length} favorite${favWords.length === 1 ? "" : "s"}`;
    if (favWords.length === 0) {
      favListEl.innerHTML = "";
      favEmptyStateEl.classList.remove("hidden");
    } else {
      favEmptyStateEl.classList.add("hidden");
      favListEl.innerHTML = favWords.map(wordCardHTML).join("");
    }
  }

  $("#clearFavsBtn").addEventListener("click", () => {
    if (favorites.length === 0) return;
    if (confirm("Remove all favorites?")) {
      favorites = [];
      saveJSON(LS_FAVORITES, favorites);
      renderFavorites();
      renderSearchList();
    }
  });

  /* ---------------- Delegated click handling (speak / favorite / open detail) ---------------- */
  document.addEventListener("click", (e) => {
    const speakBtn = e.target.closest(".speak-btn");
    const favBtn = e.target.closest(".fav-btn");
    const card = e.target.closest(".word-card");

    if (speakBtn) {
      e.stopPropagation();
      const w = findByUid(speakBtn.dataset.uid);
      if (w) speak(w.word);
      return;
    }
    if (favBtn) {
      e.stopPropagation();
      toggleFavorite(favBtn.dataset.uid);
      renderSearchList();
      renderFavorites();
      renderMyWords();
      return;
    }
    if (card) {
      openDetail(card.dataset.uid);
      return;
    }
  });

  /* ---------------- Detail modal ---------------- */
  const detailModal = $("#detailModal");
  const detailContent = $("#detailContent");

  function openDetail(uid) {
    const w = findByUid(uid);
    if (!w) return;
    const fav = isFavorite(uid);
    detailContent.innerHTML = `
      <div class="detail-word">${escapeHTML(w.word)} ${w.custom ? '<span class="word-tag">mine</span>' : ""}</div>
      <div class="detail-meaning">${escapeHTML(w.meaning)}</div>
      ${w.similar ? `<div class="detail-row"><strong>Similar:</strong> ${escapeHTML(w.similar)}</div>` : ""}
      ${w.opposite ? `<div class="detail-row"><strong>Opposite:</strong> ${escapeHTML(w.opposite)}</div>` : ""}
      <div class="detail-actions">
        <button class="btn btn-outline" id="detailSpeak">🔊 Pronounce</button>
        <button class="btn ${fav ? "btn-danger" : "btn-primary"}" id="detailFav">${fav ? "★ Remove favorite" : "☆ Add favorite"}</button>
      </div>
    `;
    detailModal.classList.remove("hidden");
    $("#detailSpeak").addEventListener("click", () => speak(w.word));
    $("#detailFav").addEventListener("click", () => {
      toggleFavorite(uid);
      renderSearchList();
      renderFavorites();
      renderMyWords();
      openDetail(uid);
    });

    if (w.custom) {
      const actions = detailContent.querySelector(".detail-actions");
      const delBtn = document.createElement("button");
      delBtn.className = "btn btn-danger";
      delBtn.textContent = "🗑 Delete";
      delBtn.style.flex = "1";
      delBtn.addEventListener("click", () => {
        if (confirm("Delete this word?")) {
          const realId = parseInt(uid.replace("custom-", ""), 10);
          customWords = customWords.filter(cw => cw.id !== realId);
          favorites = favorites.filter(f => f !== uid);
          saveJSON(LS_CUSTOM, customWords);
          saveJSON(LS_FAVORITES, favorites);
          buildAllWords();
          detailModal.classList.add("hidden");
          renderMyWords();
          renderSearchList();
          renderFavorites();
          showToast("Word deleted");
        }
      });
      actions.appendChild(delBtn);
    }
  }
  $("#detailClose").addEventListener("click", () => detailModal.classList.add("hidden"));
  detailModal.addEventListener("click", (e) => {
    if (e.target === detailModal) detailModal.classList.add("hidden");
  });

  /* ---------------- Speech synthesis ---------------- */
  let speechRate = parseFloat(localStorage.getItem(LS_RATE)) || 1.0;
  let koVoice = null;

  function pickVoice() {
    const voices = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
    koVoice = voices.find(v => v.lang === "ko-KR") ||
              voices.find(v => v.lang && v.lang.startsWith("ko")) || null;
    const hint = $("#voiceHint");
    if (hint) {
      hint.textContent = koVoice
        ? `Using voice: ${koVoice.name}`
        : "No Korean voice found on this device — pronunciation may use a default voice or be unavailable.";
    }
  }
  if (window.speechSynthesis) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function speak(text) {
    if (!window.speechSynthesis) {
      showToast("Speech synthesis not supported on this device");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ko-KR";
    utter.rate = speechRate;
    if (koVoice) utter.voice = koVoice;
    window.speechSynthesis.speak(utter);
  }

  $("#testVoiceBtn").addEventListener("click", () => speak("안녕하세요"));

  const rateSlider = $("#rateSlider");
  rateSlider.value = speechRate;
  $("#rateLabel").textContent = speechRate.toFixed(1) + "x";
  rateSlider.addEventListener("input", () => {
    speechRate = parseFloat(rateSlider.value);
    $("#rateLabel").textContent = speechRate.toFixed(1) + "x";
    saveJSON(LS_RATE, speechRate);
  });

  /* ---------------- Add word ---------------- */
  const addWordForm = $("#addWordForm");
  addWordForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const word = $("#addWord").value.trim();
    const meaning = $("#addMeaning").value.trim();
    const similar = $("#addSimilar").value.trim();
    const opposite = $("#addOpposite").value.trim();
    if (!word || !meaning) return;

    const newId = customWords.length ? Math.max(...customWords.map(w => w.id)) + 1 : 1;
    customWords.push({ id: newId, word, meaning, similar, opposite });
    saveJSON(LS_CUSTOM, customWords);
    buildAllWords();
    addWordForm.reset();
    renderMyWords();
    renderSearchList();
    showToast("Word saved ✓");
  });

  function renderMyWords() {
    const mine = allWords.filter(w => w.custom);
    myWordsCountEl.textContent = mine.length;
    myWordsListEl.innerHTML = mine.length
      ? mine.slice().reverse().map(wordCardHTML).join("")
      : `<li style="text-align:center;color:var(--text-muted);padding:16px 0;list-style:none;">No custom words yet.</li>`;
  }

  /* ---------------- View switching ---------------- */
  function switchView(view) {
    $$(".view").forEach(v => v.classList.remove("active"));
    $("#view-" + view).classList.add("active");
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === view));
    $("#appMain").scrollTop = 0;
    window.scrollTo(0, 0);
  }
  $$(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      switchView(btn.dataset.view);
      if (btn.dataset.view === "favorites") renderFavorites();
      if (btn.dataset.view === "add") renderMyWords();
    });
  });

  /* ---------------- Dark mode ---------------- */
  const themeToggle = $("#themeToggle");
  const darkModeSwitch = $("#darkModeSwitch");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
    darkModeSwitch.checked = theme === "dark";
    saveJSON(LS_THEME, theme);
  }
  let savedTheme = loadJSON(LS_THEME, null);
  if (!savedTheme) {
    savedTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  applyTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });
  darkModeSwitch.addEventListener("change", () => {
    applyTheme(darkModeSwitch.checked ? "dark" : "light");
  });

  /* ---------------- Flashcards ---------------- */
  const flashSetup = $("#flashSetup");
  const flashSession = $("#flashSession");
  const flashcardEl = $("#flashcard");
  const flashFront = $("#flashFront");
  const flashBack = $("#flashBack");
  const flashProgress = $("#flashProgress");
  const flashCountInput = $("#flashCount");
  const flashCountLabel = $("#flashCountLabel");

  let flashSourceSel = "all";
  let flashDirSel = "kr-np";

  $("#flashSource").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    $$("#flashSource .seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    flashSourceSel = btn.dataset.source;
  });
  $("#flashDirection").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    $$("#flashDirection .seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    flashDirSel = btn.dataset.dir;
  });
  flashCountInput.addEventListener("input", () => {
    flashCountLabel.textContent = flashCountInput.value;
  });

  function getSourceWords(sourceSel) {
    if (sourceSel === "favorites") return allWords.filter(w => isFavorite(w.uid));
    if (sourceSel === "custom") return allWords.filter(w => w.custom);
    return allWords;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  $("#startFlashBtn").addEventListener("click", () => {
    const pool = getSourceWords(flashSourceSel);
    if (pool.length === 0) {
      showToast("No words available in this set");
      return;
    }
    const n = Math.min(parseInt(flashCountInput.value, 10), pool.length);
    flashState = {
      cards: shuffle(pool).slice(0, n),
      index: 0,
      dir: flashDirSel
    };
    flashSetup.classList.add("hidden");
    flashSession.classList.remove("hidden");
    renderFlashcard();
  });

  function renderFlashcard() {
    const { cards, index, dir } = flashState;
    const w = cards[index];
    flashcardEl.classList.remove("flipped");
    if (dir === "kr-np") {
      flashFront.innerHTML = `<div>${escapeHTML(w.word)}</div>`;
      flashBack.innerHTML = `<div>${escapeHTML(w.meaning)}${w.similar ? `<div class="fc-sub">Similar: ${escapeHTML(w.similar)}</div>` : ""}</div>`;
    } else {
      flashFront.innerHTML = `<div>${escapeHTML(w.meaning)}</div>`;
      flashBack.innerHTML = `<div>${escapeHTML(w.word)}${w.similar ? `<div class="fc-sub">Similar: ${escapeHTML(w.similar)}</div>` : ""}</div>`;
    }
    flashProgress.textContent = `${index + 1} / ${cards.length}`;
  }

  flashcardEl.addEventListener("click", () => flashcardEl.classList.toggle("flipped"));

  $("#flashPrevBtn").addEventListener("click", () => {
    if (!flashState) return;
    flashState.index = (flashState.index - 1 + flashState.cards.length) % flashState.cards.length;
    renderFlashcard();
  });
  $("#flashNextBtn").addEventListener("click", () => {
    if (!flashState) return;
    flashState.index = (flashState.index + 1) % flashState.cards.length;
    renderFlashcard();
  });
  $("#flashSpeakBtn").addEventListener("click", () => {
    if (!flashState) return;
    const w = flashState.cards[flashState.index];
    speak(w.word);
  });
  $("#exitFlashBtn").addEventListener("click", () => {
    flashSession.classList.add("hidden");
    flashSetup.classList.remove("hidden");
    flashState = null;
  });

  /* ---------------- Quiz ---------------- */
  const quizSetup = $("#quizSetup");
  const quizSession = $("#quizSession");
  const quizResult = $("#quizResult");
  const quizQuestionEl = $("#quizQuestion");
  const quizOptionsEl = $("#quizOptions");
  const quizProgressEl = $("#quizProgress");
  const quizScoreEl = $("#quizScore");
  const quizNextBtn = $("#quizNextBtn");
  const quizCountInput = $("#quizCount");
  const quizCountLabel = $("#quizCountLabel");

  let quizSourceSel = "all";
  let quizDirSel = "kr-np";

  $("#quizSource").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    $$("#quizSource .seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    quizSourceSel = btn.dataset.source;
  });
  $("#quizDirection").addEventListener("click", (e) => {
    const btn = e.target.closest(".seg-btn");
    if (!btn) return;
    $$("#quizDirection .seg-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    quizDirSel = btn.dataset.dir;
  });
  quizCountInput.addEventListener("input", () => {
    quizCountLabel.textContent = quizCountInput.value;
  });

  $("#startQuizBtn").addEventListener("click", () => startQuiz());
  $("#quizRetryBtn").addEventListener("click", () => startQuiz());
  $("#quizBackBtn").addEventListener("click", () => {
    quizResult.classList.add("hidden");
    quizSetup.classList.remove("hidden");
  });
  $("#exitQuizBtn").addEventListener("click", () => {
    quizSession.classList.add("hidden");
    quizSetup.classList.remove("hidden");
    quizState = null;
  });

  function startQuiz() {
    const pool = getSourceWords(quizSourceSel);
    if (pool.length < 4) {
      showToast("Need at least 4 words in this set to quiz");
      return;
    }
    const n = Math.min(parseInt(quizCountInput.value, 10), pool.length);
    const questions = shuffle(pool).slice(0, n).map(w => {
      const distractorPool = allWords.filter(x => x.uid !== w.uid);
      const distractors = shuffle(distractorPool).slice(0, 3);
      const options = shuffle([w, ...distractors]);
      return { correct: w, options, dir: quizDirSel };
    });
    quizState = { questions, index: 0, score: 0 };
    quizSetup.classList.add("hidden");
    quizResult.classList.add("hidden");
    quizSession.classList.remove("hidden");
    quizScoreEl.textContent = "0";
    renderQuizQuestion();
  }

  function renderQuizQuestion() {
    const { questions, index } = quizState;
    const q = questions[index];
    quizProgressEl.textContent = `Question ${index + 1} / ${questions.length}`;
    quizQuestionEl.textContent = q.dir === "kr-np" ? q.correct.word : q.correct.meaning;
    quizOptionsEl.innerHTML = "";
    quizNextBtn.classList.add("hidden");

    q.options.forEach(opt => {
      const btn = document.createElement("button");
      btn.className = "quiz-option";
      btn.textContent = q.dir === "kr-np" ? opt.meaning : opt.word;
      btn.addEventListener("click", () => handleQuizAnswer(btn, opt, q));
      quizOptionsEl.appendChild(btn);
    });
  }

  function handleQuizAnswer(btn, opt, q) {
    const allBtns = $$(".quiz-option");
    allBtns.forEach(b => b.setAttribute("disabled", "true"));
    const isCorrect = opt.uid === q.correct.uid;
    if (isCorrect) {
      btn.classList.add("correct");
      quizState.score++;
      quizScoreEl.textContent = quizState.score;
    } else {
      btn.classList.add("wrong");
      allBtns.forEach(b => {
        const label = b.textContent;
        const target = q.dir === "kr-np" ? q.correct.meaning : q.correct.word;
        if (label === target) b.classList.add("correct");
      });
    }
    quizNextBtn.classList.remove("hidden");
  }

  quizNextBtn.addEventListener("click", () => {
    quizState.index++;
    if (quizState.index >= quizState.questions.length) {
      finishQuiz();
    } else {
      renderQuizQuestion();
    }
  });

  function finishQuiz() {
    quizSession.classList.add("hidden");
    quizResult.classList.remove("hidden");
    const { score, questions } = quizState;
    const pct = Math.round((score / questions.length) * 100);
    let emoji = "🙂";
    if (pct === 100) emoji = "🏆";
    else if (pct >= 80) emoji = "🎉";
    else if (pct < 50) emoji = "💪";
    $("#quizFinalScore").textContent = `${emoji} ${score} / ${questions.length} correct (${pct}%)`;
  }

  /* ---------------- Export ---------------- */
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toCSV(rows) {
    const header = "Word,Meaning,Similar,Opposite\n";
    const lines = rows.map(w => [w.word, w.meaning, w.similar, w.opposite]
      .map(v => `"${String(v || "").replace(/"/g, '""')}"`)
      .join(","));
    return header + lines.join("\n");
  }

  $("#exportFavJson").addEventListener("click", () => {
    const favWords = allWords.filter(w => isFavorite(w.uid));
    if (!favWords.length) return showToast("No favorites to export");
    downloadFile("favorites.json", JSON.stringify(favWords, null, 2), "application/json");
  });
  $("#exportFavCsv").addEventListener("click", () => {
    const favWords = allWords.filter(w => isFavorite(w.uid));
    if (!favWords.length) return showToast("No favorites to export");
    downloadFile("favorites.csv", toCSV(favWords), "text/csv");
  });
  $("#exportMyJson").addEventListener("click", () => {
    if (!customWords.length) return showToast("No custom words to export");
    downloadFile("my-words.json", JSON.stringify(customWords, null, 2), "application/json");
  });
  $("#exportMyCsv").addEventListener("click", () => {
    if (!customWords.length) return showToast("No custom words to export");
    downloadFile("my-words.csv", toCSV(customWords), "text/csv");
  });
  $("#exportAllCsv").addEventListener("click", () => {
    downloadFile("korean-nepali-dictionary.csv", toCSV(allWords), "text/csv");
  });

  /* ---------------- Reset data ---------------- */
  $("#resetDataBtn").addEventListener("click", () => {
    if (confirm("This will permanently delete your favorites, custom words, and settings on this device. Continue?")) {
      localStorage.removeItem(LS_FAVORITES);
      localStorage.removeItem(LS_CUSTOM);
      localStorage.removeItem(LS_THEME);
      localStorage.removeItem(LS_RATE);
      location.reload();
    }
  });

  /* ---------------- Offline banner ---------------- */
  function updateOnlineStatus() {
    $("#offlineBanner").classList.toggle("hidden", navigator.onLine);
  }
  window.addEventListener("online", updateOnlineStatus);
  window.addEventListener("offline", updateOnlineStatus);
  updateOnlineStatus();

  /* ---------------- PWA install prompt ---------------- */
  let deferredPrompt = null;
  const installBtn = $("#installBtn");
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    installBtn.classList.remove("hidden");
  });
  installBtn.addEventListener("click", async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add("hidden");
  });
  window.addEventListener("appinstalled", () => {
    installBtn.classList.add("hidden");
  });

  /* ---------------- Service worker registration ---------------- */
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => { /* offline registration best-effort */ });
    });
  }

  /* ---------------- Init ---------------- */
  buildAllWords();
  renderSearchList();
  renderFavorites();
  renderMyWords();
})();
