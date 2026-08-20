(function () {
  "use strict";

  var LS_FAV = "kndict_favorites_v1";
  var DATA_URL = "words.json";

  var baseData = [];
  var favorites = loadJSON(LS_FAV, []);

  var currentTab = "all";
  var currentQuery = "";

  var els = {
    results: document.getElementById("results"),
    empty: document.getElementById("emptyState"),
    search: document.getElementById("searchInput"),
    clear: document.getElementById("clearSearch"),
    tabs: document.querySelectorAll(".tab[data-tab]"),
    countAll: document.getElementById("countAll"),
    countFav: document.getElementById("countFav"),
    stats: document.getElementById("stats"),
    footCount: document.getElementById("footCount"),
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
    var data = baseData;
    if (currentTab === "fav") {
      data = data.filter(function (e) {
        return isFav(e.id);
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

  function cardHtml(entry) {
    var favOn = isFav(entry.id);
    var meta = "";
    if (entry.similar) {
      meta +=
        '<div class="meta-line"><b>similar</b> <span class="tagword">' +
        escapeHtml(entry.similar) +
        "</span></div>";
    }
    if (entry.opposite) {
      meta +=
        '<div class="meta-line"><b>opposite</b> <span class="tagword">' +
        escapeHtml(entry.opposite) +
        "</span></div>";
    }
    return (
      '<div class="card" data-id="' +
      entry.id +
      '">' +
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

    els.countAll.textContent = baseData.length;
    els.countFav.textContent = favorites.length;
    els.stats.textContent = baseData.length + " entries";
    els.footCount.textContent = baseData.length;
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
    if (favBtn) {
      toggleFav(favBtn.getAttribute("data-fav"));
      return;
    }
    if (speakBtn) {
      var id = speakBtn.getAttribute("data-speak");
      var entry = baseData.find(function (x) {
        return x.id === id;
      });
      if (entry) speakEntry(entry);
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

  function init() {
    els.results.innerHTML =
      '<p class="empty-state" style="grid-column:1/-1;">Loading dictionary…</p>';
    fetch(DATA_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (data) {
        baseData = (data || []).map(function (d, i) {
          return {
            id: "b" + i,
            ko: d.ko || "",
            np: d.np || "",
            similar: d.similar || "",
            opposite: d.opposite || ""
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
