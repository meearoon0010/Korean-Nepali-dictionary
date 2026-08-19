const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let words=[], userWords=JSON.parse(localStorage.getItem("kn_userWords")||"[]");
let favorites=new Set(JSON.parse(localStorage.getItem("kn_favorites")||"[]"));
let learned=new Set(JSON.parse(localStorage.getItem("kn_learned")||"[]"));
let history=JSON.parse(localStorage.getItem("kn_history")||"[]");
let rate=Number(localStorage.getItem("kn_rate")||.9), deferredPrompt=null;

async function init(){
 words=await (await fetch("data/words.json")).json();
 $("#wordCount").textContent=words.length+userWords.length; $("#rate").value=rate;
 const dark=localStorage.getItem("kn_theme")==="dark"; document.body.classList.toggle("dark",dark); $("#darkToggle").checked=dark;
 renderResults(words.slice(0,30)); updateStats(); $("#onlineState").textContent=navigator.onLine?"🟢 Online":"🔴 Offline";
}
function allWords(){return [...words,...userWords]}
function save(){localStorage.setItem("kn_userWords",JSON.stringify(userWords));localStorage.setItem("kn_favorites",JSON.stringify([...favorites]));localStorage.setItem("kn_learned",JSON.stringify([...learned]));}
function esc(s){return String(s||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function speak(text){if(!("speechSynthesis" in window)||!text)return; speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(text);u.lang="ko-KR";u.rate=rate;speechSynthesis.speak(u)}
function card(w){
 const fav=favorites.has(w.id), learnedNow=learned.has(w.id);
 return `<article class="word"><button class="fav" onclick="toggleFav('${esc(w.id)}')">${fav?"⭐":"☆"}</button>
 <h3>${esc(w.korean)}</h3><div class="meaning">${esc(w.nepali)}</div>
 ${w.english?`<div class="english">${esc(w.english)}</div>`:""}${w.romanization?`<div class="meta">Romanization: ${esc(w.romanization)}</div>`:""}
 ${w.partOfSpeech?`<div class="meta">${esc(w.partOfSpeech)}</div>`:""}
 ${w.exampleKorean?`<div class="example"><b>${esc(w.exampleKorean)}</b>${w.exampleNepali?`<br>${esc(w.exampleNepali)}`:""}</div>`:""}
 ${w.similar?`<div class="meta"><b>Similar:</b> ${esc(w.similar)}</div>`:""}${w.opposite?`<div class="meta"><b>Opposite:</b> ${esc(w.opposite)}</div>`:""}
 <div class="actions"><button onclick="speak('${esc(w.korean)}')">🔊 Listen</button><button onclick="copyWord('${esc(w.korean)}')">📋 Copy</button><button onclick="markLearned('${esc(w.id)}')">${learnedNow?"✅ Learned":"📚 Mark learned"}</button></div></article>`
}
function renderResults(list){$("#results").innerHTML=list.length?list.map(card).join(""):`<div class="form-card"><h3>No matching words</h3><p class="muted">Try Korean, Nepali, English or Romanization.</p></div>`}
function search(q){
 q=q.trim().toLowerCase(); if(!q){renderResults(allWords().slice(0,30));$("#resultsTitle").textContent="Dictionary";return}
 const fields=["korean","nepali","english","romanization","similar","opposite","exampleKorean","exampleNepali"];
 const result=allWords().filter(w=>fields.some(f=>String(w[f]||"").toLowerCase().includes(q)));
 history=[q,...history.filter(x=>x!==q)].slice(0,50);localStorage.setItem("kn_history",JSON.stringify(history));
 $("#resultsTitle").textContent=`Results (${result.length})`; renderResults(result.slice(0,100));
}
function toggleFav(id){id=isNaN(id)?id:Number(id);favorites.has(id)?favorites.delete(id):favorites.add(id);save();updateStats();search($("#search").value);renderFavorites()}
function markLearned(id){id=isNaN(id)?id:Number(id);learned.add(id);save();updateStats();search($("#search").value)}
function updateStats(){$("#favCount").textContent=favorites.size;$("#learnedCount").textContent=learned.size;$("#wordCount").textContent=allWords().length}
function renderFavorites(){let list=allWords().filter(w=>favorites.has(w.id));$("#favoritesList").innerHTML=list.length?list.map(card).join(""):`<div class="form-card"><h3>No favorites yet</h3><p class="muted">Press ☆ on a word to save it.</p></div>`}
function copyWord(t){navigator.clipboard?.writeText(t);}

$$("[data-view]").forEach(b=>b.onclick=()=>showView(b.dataset.view));
function showView(v){$$(".view").forEach(x=>x.classList.remove("active"));$("#"+v).classList.add("active");$$(".tab").forEach(x=>x.classList.toggle("active",x.dataset.view===v));if(v==="favorites")renderFavorites();if(v==="study")newCard()}
$("#search").oninput=e=>search(e.target.value);$("#clearSearch").onclick=()=>{$("#search").value="";search("")};
$("#themeBtn").onclick=()=>toggleDark();$("#darkToggle").onchange=()=>toggleDark();
function toggleDark(){let d=!document.body.classList.contains("dark");document.body.classList.toggle("dark",d);localStorage.setItem("kn_theme",d?"dark":"light");$("#darkToggle").checked=d}
$("#rate").oninput=e=>{rate=Number(e.target.value);localStorage.setItem("kn_rate",rate)}
$("#randomBtn").onclick=()=>{let w=allWords()[Math.floor(Math.random()*allWords().length)];$("#search").value=w.korean;search(w.korean)}
$("#wordForm").onsubmit=e=>{e.preventDefault();let f=new FormData(e.target),w={id:"u_"+Date.now(),...Object.fromEntries(f.entries()),source:"User Added"};userWords.unshift(w);save();updateStats();e.target.reset();$("#formMsg").textContent="✓ Word added successfully and is now searchable.";setTimeout(()=>$("#formMsg").textContent="",2500)}
$("#exportJson").onclick=()=>{let blob=new Blob([JSON.stringify({userWords,favorites:[...favorites],learned:[...learned]},null,2)],{type:"application/json"});let a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="korean-nepali-user-data.json";a.click()}
$("#clearHistory").onclick=()=>{history=[];localStorage.removeItem("kn_history");alert("Search history cleared.")}
$("#resetApp").onclick=()=>{if(confirm("Reset only your local favorites, learned words and added words?")){localStorage.removeItem("kn_userWords");localStorage.removeItem("kn_favorites");localStorage.removeItem("kn_learned");location.reload()}}
function newCard(){let w=allWords()[Math.floor(Math.random()*allWords().length)];window.studyWord=w;$("#cardKorean").textContent=w.korean;$("#cardNepali").textContent=w.nepali;$("#cardNepali").classList.add("hidden")}
$("#revealBtn").onclick=()=>$("#cardNepali").classList.remove("hidden");$("#listenCard").onclick=()=>speak(window.studyWord?.korean);$("#dontKnow").onclick=newCard;$("#difficult").onclick=newCard;$("#know").onclick=()=>{if(window.studyWord)learned.add(window.studyWord.id);save();updateStats();newCard()};

let quiz={active:false,score:0,n:0};
function startQuiz(){quiz={active:true,score:0,n:0};nextQuiz()}
function nextQuiz(){if(quiz.n>=10){$("#quizQ").textContent=`Finished! Score: ${quiz.score}/10`;$("#quizOptions").innerHTML="";return}
 let a=allWords()[Math.floor(Math.random()*allWords().length)], opts=[a];while(opts.length<4){let x=allWords()[Math.floor(Math.random()*allWords().length)];if(x&&!opts.some(o=>o.id===x.id))opts.push(x)}opts.sort(()=>Math.random()-.5);quiz.answer=a;quiz.n++;$("#quizQ").textContent=`What is the Nepali meaning of “${a.korean}”?`;$("#quizOptions").innerHTML=opts.map(o=>`<button class="quiz-option" onclick="answerQuiz('${esc(o.id)}')">${esc(o.nepali)}</button>`).join("")}
function answerQuiz(id){if(String(id)===String(quiz.answer.id))quiz.score++;nextQuiz()}
$("#quizStart").onclick=startQuiz;
window.addEventListener("online",()=>$("#onlineState").textContent="🟢 Online");window.addEventListener("offline",()=>$("#onlineState").textContent="🔴 Offline");
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e;$("#installBtn").hidden=false});$("#installBtn").onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();deferredPrompt=null}};
init();
