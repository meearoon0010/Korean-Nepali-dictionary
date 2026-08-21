(function () {
  "use strict";

  var LS_FAV = "kndict_favorites_v1";
  var LS_MINE = "kndict_mine_v1";
  var LS_EDITS = "kndict_edits_v1";
  var DATA_URL = "words.json";

  var rawBaseData = [];
  var favorites = loadJSON(LS_FAV, []);
  var mine = loadJSON(LS_MINE, []);
  var edits = loadJSON(LS_EDITS, {});

  var currentTab = "all";
  var currentQuery = "";
  var editingId = null; // null = add mode, otherwise editing this entry's id

  var els = {
    results: document.getElementById("results"),
    empty: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    clear: document.getElementById("clearSearch"),
    tabs: document.querySelectorAll(".tab[data-tab]"),
    countAll: document.getElementById("countAll"),
    countFav: document.getElementById("countFav"),
    countMine: document.getElementById("countMine"),
    stats: document.getElementById("stats"),
    footCount: document.getElementById("footCount"),
    addWordBtn: document.getElementById("addWordBtn"),
    modalOverlay: document.getElementById("modalOverlay"),
    modalTitle: document.getElementById("modalTitle"),
    modalClose: document.getElementById("modalClose"),
    cancelAdd: document.getElementById("cancelAdd"),
    resetEdit: document.getElementById("resetEdit"),
    saveWordBtn: document.getElementById("saveWordBtn"),
    addWordForm: document.getElementById("addWordForm"),
    toast: document.getElementById("toast")
  };

  function loadJSON(key, fallback) {
    try {
      var v = JSON.parse(localStorage.getItem(key));
      return v || fallback;
    } catch (e) {
      return fallback;
    }
  }
  function saveJSON(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      showToast("Could not save — storage may be full or blocked.");
    }
  }

  // Merge base data with any local edits, plus user-added words
  function allData() {
    var base = rawBaseData.map(function (entry) {
      var ed = edits[entry.id];
      if (ed) {
        return {
          id: entry.id,
          ko: ed.ko,
          np: ed.np,
          similar: ed.similar,
          opposite: ed.opposite,
          mine: false,
          edited: true
        };
      }
      return entry;
    });
    return base.concat(mine);
  }

  function isFav(id) {
    return favorites.indexOf(id) !== -1;
  }

  function toggleFav(id) {
    var idx = favorites.indexOf(id);
    if (idx === -1) favorites.push(id);
    else favorites.splice(idx, 1);
    saveJSON(LS_FAV, favorites);
    render();
  }

  function removeMine(id) {
    mine = mine.filter(function (w) {
      return w.id !== id;
    });
    saveJSON(LS_MINE, mine);
    var favIdx = favorites.indexOf(id);
    if (favIdx !== -1) {
      favorites.splice(favIdx, 1);
      saveJSON(LS_FAV, favorites);
    }
    render();
    showToast("Word removed.");
  }

  function resetEditFor(id) {
    delete edits[id];
    saveJSON(LS_EDITS, edits);
    render();
    showToast("Reverted to original.");
  }

  function normalize(s) {
    return (s || "").toString().trim().toLowerCase();
  }

  function matches(entry, q) {
    if (!q) return true;
    var nq = normalize(q);
    return (
      normalize(entry.ko).indexOf(nq) !== -1 ||
      normalize(entry.np).indexOf(nq) !== -1 ||
      normalize(entry.similar).indexOf(nq) !== -1 ||
      normalize(entry.opposite).indexOf(nq) !== -1
    );
  }

  function getFiltered() {
    var data = allData();
    if (currentTab === "fav") {
      data = data.filter(function (e) {
        return isFav(e.id);
      });
    } else if (currentTab === "mine") {
      data = data.filter(function (e) {
        return e.mine;
      });
    }
    if (currentQuery) {
      data = data.filter(function (e) {
        return matches(e, currentQuery);
      });
    }
    return data;
  }

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var speakIcon =
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4 9v6h4l5 5V4L8 9H4z"/><path d="M16.5 12c0-1.5-.7-2.8-1.8-3.7l1-1.5c1.5 1.2 2.4 3 2.4 5.2s-.9 4-2.4 5.2l-1-1.5c1.1-.9 1.8-2.2 1.8-3.7z" opacity=".85"/></svg>';
  var editIcon =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';

  function cardHtml(entry) {
    var favOn = isFav(entry.id);
    var meta = "";
    if (entry.similar) {
      meta +=
        '<div class="meta-line similar-line"><b>similar</b> <span class="tagword">' +
        escapeHtml(entry.similar) +
        "</span></div>";
    }
    if (entry.opposite) {
      meta +=
        '<div class="meta-line opposite-line"><b>opposite</b> <span class="tagword">' +
        escapeHtml(entry.opposite) +
        "</span></div>";
    }
    var badge = "";
    if (entry.mine) {
      badge =
        '<span class="mine-tag">yours</span><button class="remove-mine" data-remove="' +
        entry.id +
        '" title="Delete this word">delete</button>';
    } else if (entry.edited) {
      badge = '<span class="mine-tag edited-tag">edited</span>';
    }
    return (
      '<div class="card' +
      (entry.mine ? " mine" : "") +
      (entry.edited ? " edited" : "") +
      '" data-id="' +
      entry.id +
      '">' +
      badge +
      '<div class="card-top">' +
      '<p class="ko-word">' +
      escapeHtml(entry.ko) +
      "</p>" +
      '<div class="card-actions">' +
      '<button class="icon-btn speak-btn" data-speak="' +
      entry.id +
      '" title="Hear Korean pronunciation" aria-label="Pronounce">' +
      speakIcon +
      "</button>" +
      '<button class="icon-btn edit-btn" data-edit="' +
      entry.id +
      '" title="Edit this entry" aria-label="Edit">' +
      editIcon +
      "</button>" +
      '<button class="icon-btn fav-btn' +
      (favOn ? " fav-on" : "") +
      '" data-fav="' +
      entry.id +
      '" title="Toggle favorite" aria-label="Toggle favorite">' +
      (favOn ? "★" : "☆") +
      "</button>" +
      "</div>" +
      "</div>" +
      '<p class="np-word">' +
      escapeHtml(entry.np) +
      "</p>" +
      (meta ? '<div class="meta-row">' + meta + "</div>" : "") +
      "</div>"
    );
  }

  function render() {
    var data = getFiltered();
    els.results.innerHTML = data.map(cardHtml).join("");
    els.empty.hidden = data.length !== 0;

    var all = allData();
    els.countAll.textContent = all.length;
    els.countFav.textContent = favorites.length;
    els.countMine.textContent = mine.length;
    els.stats.textContent = all.length + " entries";
    els.footCount.textContent = rawBaseData.length;
  }

  // ---- Speech ----
  var voices = [];
  function loadVoices() {
    if ("speechSynthesis" in window) {
      voices = window.speechSynthesis.getVoices();
    }
  }
  if ("speechSynthesis" in window) {
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  function pickVoice(langPrefix) {
    for (var i = 0; i < voices.length; i++) {
      if (voices[i].lang && voices[i].lang.toLowerCase().indexOf(langPrefix) === 0) {
        return voices[i];
      }
    }
    return null;
  }

  function speak(text, langPrefix, fallbackLang) {
    if (!("speechSynthesis" in window)) {
      showToast("Pronunciation isn't supported in this browser.");
      return;
    }
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    var v = pickVoice(langPrefix);
    if (v) {
      utter.voice = v;
      utter.lang = v.lang;
    } else {
      utter.lang = fallbackLang || langPrefix;
    }
    window.speechSynthesis.speak(utter);
  }

  function speakEntry(entry) {
    speak(entry.ko, "ko", "ko-KR");
  }

  // ---- Toast ----
  var toastTimer = null;
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      els.toast.hidden = true;
    }, 2200);
  }

  // ---- Events ----
  els.results.addEventListener("click", function (e) {
    var favBtn = e.target.closest("[data-fav]");
    var speakBtn = e.target.closest("[data-speak]");
    var removeBtn = e.target.closest("[data-remove]");
    var editBtn = e.target.closest("[data-edit]");
    if (favBtn) {
      toggleFav(favBtn.getAttribute("data-fav"));
      return;
    }
    if (speakBtn) {
      var id = speakBtn.getAttribute("data-speak");
      var entry = allData().find(function (x) {
        return x.id === id;
      });
      if (entry) speakEntry(entry);
      return;
    }
    if (editBtn) {
      var eid = editBtn.getAttribute("data-edit");
      var eentry = allData().find(function (x) {
        return x.id === eid;
      });
      if (eentry) openEditModal(eentry);
      return;
    }
    if (removeBtn) {
      var rid = removeBtn.getAttribute("data-remove");
      if (confirm("Delete this word you added?")) removeMine(rid);
    }
  });

  var searchDebounce = null;
  els.search.addEventListener("input", function () {
    clearTimeout(searchDebounce);
    var val = els.search.value;
    searchDebounce = setTimeout(function () {
      currentQuery = val;
      render();
    }, 80);
    els.clear.style.display = val ? "flex" : "none";
  });
  els.clear.style.display = "none";
  els.clear.addEventListener("click", function () {
    els.search.value = "";
    currentQuery = "";
    els.clear.style.display = "none";
    render();
    els.search.focus();
  });

  els.tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      els.tabs.forEach(function (t) {
        t.classList.remove("active");
        t.setAttribute("aria-selected", "false");
      });
      tab.classList.add("active");
      tab.setAttribute("aria-selected", "true");
      currentTab = tab.getAttribute("data-tab");
      render();
    });
  });

  // ---- Modal (shared by Add + Edit) ----
  function openAddModal() {
    editingId = null;
    els.modalTitle.textContent = "Add a word";
    els.saveWordBtn.textContent = "Save word";
    els.resetEdit.hidden = true;
    els.addWordForm.reset();
    els.modalOverlay.hidden = false;
    document.getElementById("fKo").focus();
  }

  function openEditModal(entry) {
    editingId = entry.id;
    els.modalTitle.textContent = "Edit word";
    els.saveWordBtn.textContent = "Save changes";
    document.getElementById("fKo").value = entry.ko;
    document.getElementById("fNp").value = entry.np;
    document.getElementById("fSimilar").value = entry.similar || "";
    document.getElementById("fOpposite").value = entry.opposite || "";
    // Only show "reset to original" for base (non-"mine") entries that have an edit override
    els.resetEdit.hidden = entry.mine || !edits[entry.id];
    els.modalOverlay.hidden = false;
    document.getElementById("fKo").focus();
  }

  function closeModal() {
    els.modalOverlay.hidden = true;
    els.addWordForm.reset();
    editingId = null;
  }

  els.addWordBtn.addEventListener("click", openAddModal);
  els.modalClose.addEventListener("click", closeModal);
  els.cancelAdd.addEventListener("click", closeModal);
  els.modalOverlay.addEventListener("click", function (e) {
    if (e.target === els.modalOverlay) closeModal();
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !els.modalOverlay.hidden) closeModal();
  });

  els.resetEdit.addEventListener("click", function () {
    if (editingId) {
      resetEditFor(editingId);
      closeModal();
    }
  });

  els.addWordForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var ko = document.getElementById("fKo").value.trim();
    var np = document.getElementById("fNp").value.trim();
    var similar = document.getElementById("fSimilar").value.trim();
    var opposite = document.getElementById("fOpposite").value.trim();
    if (!ko || !np) return;

    if (editingId) {
      // Editing an existing entry
      var target = mine.find(function (w) {
        return w.id === editingId;
      });
      if (target) {
        // "mine" entry — update in place
        target.ko = ko;
        target.np = np;
        target.similar = similar;
        target.opposite = opposite;
        saveJSON(LS_MINE, mine);
      } else {
        // base entry — store as a local override
        edits[editingId] = { ko: ko, np: np, similar: similar, opposite: opposite };
        saveJSON(LS_EDITS, edits);
      }
      closeModal();
      showToast("Changes saved.");
      render();
    } else {
      // Adding a new word
      var id = "m" + Date.now() + Math.floor(Math.random() * 1000);
      mine.unshift({ id: id, ko: ko, np: np, similar: similar, opposite: opposite, mine: true });
      saveJSON(LS_MINE, mine);
      closeModal();
      showToast("Word added.");
      document.querySelector('.tab[data-tab="mine"]').click();
    }
  });

  function init() {
    els.results.innerHTML =
      '<p class="empty-state" style="grid-column:1/-1;">Loading dictionary…</p>';
    fetch(DATA_URL + "?v=" + Date.now(), { cache: "no-store" })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        rawBaseData = (data || []).map(function (d, i) {
          return {
            id: "b" + i,
            ko: d.ko || "",
            np: d.np || "",
            similar: d.similar || "",
            opposite: d.opposite || "",
            mine: false
          };
        });
        render();
      })
      .catch(function (err) {
        els.results.innerHTML =
          '<p class="empty-state" style="grid-column:1/-1;">Couldn\'t load words.json (' +
          escapeHtml(err.message) +
          "). If you're opening this file directly from disk, run a local server instead " +
          "(e.g. <code>python3 -m http.server</code>) — browsers block file:// fetches. " +
          "On GitHub Pages this loads normally.</p>";
      });
  }

  init();
})();
