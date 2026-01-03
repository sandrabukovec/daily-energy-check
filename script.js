console.log("SCRIPT LOADED OK");

const stage = document.getElementById("stage");
const cardsTop = Array.from(document.querySelectorAll(".card"));

const reveal = document.getElementById("reveal");
const cardImg = document.getElementById("card-image");
const cardTitle = document.getElementById("card-title");
const cardText = document.getElementById("card-text");
const statusEl = document.getElementById("status");

const INDEX_URL = "index.json";
const DAILY_KEY = "daily_draw_v1";

function todayKeyLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function loadDailyPick() {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj || !obj.dateKey || !obj.card) return null;
    return obj;
  } catch {
    return null;
  }
}

function saveDailyPick(dateKey, card) {
  localStorage.setItem(DAILY_KEY, JSON.stringify({ dateKey, card }));
}

let deckCache = null;

async function loadDeck() {
  if (deckCache) return deckCache;
  const res = await fetch(INDEX_URL, { cache: "no-store" });
  if (!res.ok) throw new Error("Ne najdem index.json (mora biti v isti mapi kot index.html).");
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("index.json je prazen ali ni array.");
  }
  deckCache = data;
  return data;
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Fan animacija: iz kliknjene kartice naredi kupček (n kopij),
 * ki poleti v loku proti reveal sekciji.
 */
function fanFlight(fromButtonEl, toEl, n = 7) {
  return new Promise((resolve) => {
    const from = fromButtonEl.getBoundingClientRect();
    const to = toEl.getBoundingClientRect();

    const sx = from.left + from.width / 2;
    const sy = from.top + from.height / 2;

    const ex = to.left + to.width / 2;
    const ey = to.top + 40;

    const created = [];

    for (let i = 0; i < n; i++) {
      const el = document.createElement("div");
      el.className = "fly-card";

      // start pozicija (center klika)
      el.style.left = `${sx - 90}px`;  // 180/2
      el.style.top  = `${sy - 140}px`; // 280/2

      const spread = (i - (n - 1) / 2);
      const rotStart = spread * 6;
      const rotEnd = spread * 2;

      const mx = (sx + ex) / 2 + spread * 18;
      const my = Math.min(sy, ey) - 160 - Math.abs(spread) * 10;

      const anim = el.animate([
        { transform: `translate(0px, 0px) rotate(${rotStart}deg) scale(1)`, opacity: 1 },
        {
          transform: `translate(${mx - sx}px, ${my - sy}px) rotate(${rotStart}deg) scale(1)`,
          opacity: 1,
          offset: 0.55
        },
        {
          transform: `translate(${ex - sx}px, ${ey - sy}px) rotate(${rotEnd}deg) scale(0.85)`,
          opacity: 0.0
        }
      ], {
        duration: 520 + i * 30,
        easing: "cubic-bezier(.2,.8,.2,1)",
        fill: "forwards"
      });

      document.body.appendChild(el);
      created.push({ el, anim });
    }

    const last = created[created.length - 1].anim;
    last.onfinish = () => {
      created.forEach(o => o.el.remove());
      resolve();
    };
  });
}

async function drawFromDeck(clickedBtn) {
  const hint = document.getElementById("hint"); // opcijsko: če ne obstaja, OK

  cardsTop.forEach(b => b.disabled = true);
  statusEl.textContent = "Shuffling…";

  try {
    // da ima reveal bbox, ciljanje fanFlight dela bolj stabilno
    reveal.hidden = false;
    reveal.style.opacity = "0";
    reveal.style.pointerEvents = "none";

    await fanFlight(clickedBtn, reveal, 7);

    const deck = await loadDeck();
    const key = todayKeyLocal();

    const saved = loadDailyPick();
    let card;

    if (saved && saved.dateKey === key) {
      card = saved.card;
    } else {
      card = pickRandom(deck);
      saveDailyPick(key, card);
    }

    cardImg.src = card.image;
    cardImg.alt = card.title;
    cardTitle.textContent = card.title;

    const tRes = await fetch(card.text, { cache: "no-store" });
    if (!tRes.ok) throw new Error("Ne najdem tekst datoteke: " + card.text);
    const txt = await tRes.text();
    cardText.textContent = txt;

    reveal.style.opacity = "1";
    reveal.style.pointerEvents = "auto";
    statusEl.textContent = "";

    reveal.scrollIntoView({ behavior: "smooth", block: "start" });

    if (hint) {
      hint.hidden = false;
      setTimeout(() => (hint.hidden = true), 2500);
    }

  } catch (err) {
    console.error(err);
    statusEl.textContent = "Napaka: " + err.message;
  } finally {
    cardsTop.forEach(b => b.disabled = false);
  }
}

cardsTop.forEach(btn => {
  btn.addEventListener("click", () => {
    console.log("CARD CLICK", btn);
    drawFromDeck(btn);
  });
});


