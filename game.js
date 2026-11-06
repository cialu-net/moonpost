"use strict";

const scenes = [
  {
    name: "Bosco del crepuscolo", badge: "♠", color: "#705477", budget: 22,
    map: [
      "  T.T  ",
      " T.L.P ",
      " ..T.. ",
      "L.....T",
      ".B.WT..",
      " S...L ",
      "  B..  "
    ],
    sky: ["#403053", "#6c4c75", "#b2728b", "#eeaa92"],
    far: "#8e617e", near: "#635372", lake: "#735476", glow: "#ffd699",
    grass: ["#899859", "#9ca766", "#a4ac69"], edge: ["#705943", "#534250"], path: "#cf9c69", tree: ["#3e5550", "#628063", "#8ba06e"]
  },
  {
    name: "Palude delle lucciole", badge: "✧", color: "#376e73", budget: 26,
    map: [
      " .T.L  ",
      " .WW.. ",
      " L..T. ",
      "T.W....",
      ".PWT.WL",
      " ..W.S ",
      "  ..T  "
    ],
    sky: ["#202e4d", "#3b4b73", "#567e88", "#a2aa9a"],
    far: "#567986", near: "#3c606c", lake: "#46647b", glow: "#f4e8ad",
    grass: ["#759773", "#8cab80", "#95ad86"], edge: ["#4d665c", "#3b4857"], path: "#b3a784", tree: ["#304f56", "#4e7870", "#7a9b79"]
  },
  {
    name: "Cima dell’aurora", badge: "▲", color: "#89556f", budget: 22,
    map: [
      "  L..P ",
      " T.WT. ",
      " L.W...",
      " ..W.W.",
      " T.W.WL",
      " .S..T ",
      "  T..  "
    ],
    sky: ["#453550", "#78547b", "#bd7188", "#f2b08f"],
    far: "#a57890", near: "#745d7e", lake: "#866680", glow: "#ffe1aa",
    grass: ["#a1a2a1", "#b6b4b1", "#c4bdb9"], edge: ["#746074", "#51475d"], path: "#d5ad9b", tree: ["#4b5668", "#697e88", "#a8b6b5"]
  }
];

const $ = (id) => document.getElementById(id);
const canvas = $("world");
const ctx = canvas.getContext("2d");
const W = canvas.width;
const H = canvas.height;
const HW = 23;
const HH = 12;
const ORIGIN_Y = 102;
const directions = {left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1]};
const keyDirections = {
  arrowleft: "left", arrowright: "right", arrowup: "up", arrowdown: "down",
  a: "left", d: "right", w: "up", s: "down"
};

let progress = readProgress();
let chapter = 0;
let scene;
let state;
let totalLetters;
let history;
let route = [];
let routeTime = 0;
let hover = null;
let motion = null;
let statusText;
let clock = 0;
let audio = null;
let soundOn = false;
let lastOutcome = null;

function readProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem("moonpost-v1"));
    return Array.isArray(saved) ? saved.filter((value) => Number.isInteger(value) && value >= 0 && value < scenes.length) : [];
  } catch {
    return [];
  }
}

function completeChapter() {
  if (progress.includes(chapter)) return;
  progress = [...progress, chapter];
  try { localStorage.setItem("moonpost-v1", JSON.stringify(progress)); } catch { /* Play still works with storage disabled. */ }
}

function tile(x, y) {
  return scene.map[y]?.[x] || " ";
}

function passable(x, y) {
  return ".LSP".includes(tile(x, y));
}

function reset(index) {
  chapter = index;
  scene = scenes[index];
  const startY = scene.map.findIndex((row) => row.includes("S"));
  totalLetters = scene.map.join("").split("L").length - 1;
  state = {x: scene.map[startY].indexOf("S"), y: startY, steps: scene.budget, bag: new Set(), facing: 1, outcome: null};
  history = [];
  route = [];
  hover = null;
  motion = null;
  statusText = "Raccogli le lettere e raggiungi la casetta.";
  renderChapters();
  update();
}

function renderChapters() {
  $("chapters").replaceChildren(...scenes.map((level, index) => {
    const button = document.createElement("button");
    const done = progress.includes(index);
    button.type = "button";
    button.className = "chapter";
    button.style.setProperty("--chapter-color", level.color);
    button.disabled = index > 0 && !progress.includes(index - 1) && !done;
    if (index === chapter) button.setAttribute("aria-current", "step");
    const badge = document.createElement("span");
    badge.className = "chapter-icon";
    badge.setAttribute("aria-hidden", "true");
    badge.textContent = level.badge;
    const title = document.createElement("span");
    title.className = "chapter-text";
    const name = document.createElement("strong");
    name.textContent = level.name;
    const subtitle = document.createElement("small");
    subtitle.textContent = `0${index + 1} · ${done ? "CONSEGNATO" : button.disabled ? "BLOCCATO" : "GIOCABILE"}`;
    title.append(name, subtitle);
    button.append(badge, title);
    button.addEventListener("click", () => {
      reset(index);
      $("chapters").children[index].focus();
    });
    return button;
  }));
}

function update() {
  const number = String(chapter + 1).padStart(2, "0");
  $("scene-label").textContent = `${number} / 03 · ${scene.name.toUpperCase()}`;
  $("scene-caption").textContent = `TURNO ${number}`;
  $("letters").textContent = `${state.bag.size} / ${totalLetters}`;
  $("steps").textContent = state.steps;
  $("status").textContent = statusText;
  $("undo").disabled = !history.length || state.outcome === "won";
  $("meter").replaceChildren(...Array.from({length: scene.budget}, (_, index) => {
    const bar = document.createElement("i");
    if (index < state.steps) bar.className = "on";
    return bar;
  }));
  if (lastOutcome === state.outcome) return;
  lastOutcome = state.outcome;
  $("result").hidden = !state.outcome;
  if (!state.outcome) return;

  const won = state.outcome === "won";
  const final = chapter === scenes.length - 1;
  $("result-kicker").textContent = won ? "✦ TIMBRO LUNARE" : "✦ FINE DEL TURNO";
  $("result-title").textContent = won ? (final ? "Giro completato!" : "Posta consegnata!") : "È spuntata l’alba!";
  $("result-text").textContent = won
    ? (final ? "Tutte le lettere sono arrivate. Buonanotte, corriere!" : `Consegna riuscita con ${state.steps} passi di scorta.`)
    : "Hai esaurito i passi. Puoi tornare indietro e cambiare strada.";
  $("result-action").textContent = won && !final ? "Prossima isola →" : won ? "Torna alla prima isola" : "Riprova";
  $("result-undo").hidden = won;
  $("result-action").focus({preventScroll: true});
}

function move(dx, dy) {
  if (state.outcome) return false;
  const x = state.x + dx;
  const y = state.y + dy;
  if (!passable(x, y)) {
    statusText = "Strada chiusa. Cerca una casella libera.";
    update();
    return false;
  }
  history.push({...state, bag: new Set(state.bag)});
  motion = {x: state.x, y: state.y, start: performance.now()};
  state.x = x;
  state.y = y;
  state.steps--;
  state.facing = dx - dy > 0 ? 1 : -1;
  const key = `${x},${y}`;
  let cue = "step";
  statusText = state.bag.size === totalLetters ? "Borsa piena! Raggiungi la casetta." : "Cerca le buste dorate lungo il sentiero.";

  if (tile(x, y) === "L" && !state.bag.has(key)) {
    state.bag.add(key);
    cue = "letter";
    statusText = state.bag.size === totalLetters ? "Borsa piena! Raggiungi la casetta." : "Una lettera al sicuro nella borsa!";
  }
  if (tile(x, y) === "P" && state.bag.size === totalLetters) {
    state.outcome = "won";
    statusText = "Consegna riuscita.";
    completeChapter();
    renderChapters();
    cue = "win";
  } else if (state.steps === 0) {
    state.outcome = "lost";
    statusText = "Passi esauriti.";
    cue = "lost";
  } else if (tile(x, y) === "P") {
    statusText = "La casetta aspetta il resto della posta.";
  }
  if (state.outcome) route = [];
  playSound(cue);
  update();
  return true;
}

function manualMove(dir) {
  route = [];
  hover = null;
  move(...directions[dir]);
}

function undo() {
  if (!history.length || state.outcome === "won") return;
  route = [];
  hover = null;
  motion = null;
  state = history.pop();
  statusText = "Ultimo passo annullato.";
  update();
}

function shortestPath(target) {
  if (!target || !passable(...target)) return [];
  const queue = [{x: state.x, y: state.y, path: []}];
  const seen = new Set([`${state.x},${state.y}`]);
  for (const {x, y, path} of queue) {
    if (x === target[0] && y === target[1]) return path;
    for (const [dx, dy] of Object.values(directions)) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !passable(nx, ny)) continue;
      seen.add(key);
      queue.push({x: nx, y: ny, path: [...path, [nx, ny]]});
    }
  }
  return [];
}

function point(x, y) {
  return [W / 2 + (x - y) * HW, ORIGIN_Y + (x + y) * HH];
}

function pick(event) {
  const bounds = canvas.getBoundingClientRect();
  const sx = ((event.clientX - bounds.left) * W / bounds.width - W / 2) / HW;
  const sy = ((event.clientY - bounds.top) * H / bounds.height - ORIGIN_Y) / HH;
  return [Math.round((sx + sy) / 2), Math.round((sy - sx) / 2)];
}

canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "touch") hover = pick(event);
});
canvas.addEventListener("pointerleave", () => { hover = null; });
canvas.addEventListener("click", (event) => {
  if (state.outcome) return;
  const target = pick(event);
  const path = shortestPath(target);
  if (path.length > state.steps) {
    statusText = "Quella casella è troppo lontana per i passi rimasti.";
    update();
    return;
  }
  if (!path.length) {
    if (target[0] === state.x && target[1] === state.y) route = [];
    return;
  }
  route = path;
  routeTime = performance.now();
});
document.querySelectorAll("[data-dir]").forEach((button) => {
  button.addEventListener("click", () => manualMove(button.dataset.dir));
});
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  const key = event.key.toLowerCase();
  if (keyDirections[key]) {
    event.preventDefault();
    manualMove(keyDirections[key]);
  } else if (key === "z") {
    event.preventDefault();
    undo();
  } else if (key === "r" && !event.repeat) {
    reset(chapter);
  }
});
$("undo").addEventListener("click", undo);
$("restart").addEventListener("click", () => reset(chapter));
$("result-undo").addEventListener("click", () => {
  undo();
  document.querySelector("[data-dir]").focus({preventScroll: true});
});
$("result-action").addEventListener("click", () => {
  reset(state.outcome === "won" ? (chapter + 1) % scenes.length : chapter);
  document.querySelector("[data-dir]").focus({preventScroll: true});
});
$("sound").addEventListener("click", async () => {
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) {
    $("sound").disabled = true;
    $("sound").textContent = "Audio assente";
    return;
  }
  soundOn = !soundOn;
  $("sound").setAttribute("aria-pressed", String(soundOn));
  $("sound").querySelector("span").textContent = soundOn ? "Audio on" : "Audio off";
  if (soundOn) {
    try {
      audio ||= new Audio();
      await audio.resume();
      playSound("letter");
    } catch {
      soundOn = false;
      $("sound").setAttribute("aria-pressed", "false");
      $("sound").querySelector("span").textContent = "Audio off";
    }
  }
});

function playSound(cue) {
  if (!soundOn || !audio || audio.state !== "running") return;
  const melody = {step: [230], letter: [550, 740], win: [440, 554, 659, 880], lost: [370, 280, 210]}[cue];
  melody.forEach((frequency, index) => {
    const start = audio.currentTime + index * 0.095;
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = cue === "step" ? "triangle" : "square";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(cue === "step" ? 0.022 : 0.034, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.095);
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start(start);
    oscillator.stop(start + 0.1);
  });
}

function rect(x, y, width, height, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), width, height);
}

function poly(points, color) {
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function hash(x, y) {
  return ((Math.imul(x + 127, 1597334677) ^ Math.imul(y + 93, 3812015801)) >>> 0) % 997;
}

function sparkle(x, y, color, large = false) {
  rect(x - 2, y, 5, 1, color);
  rect(x, y - 2, 1, 5, color);
  if (large) {
    rect(x - 1, y - 1, 3, 3, color);
    rect(x, y, 1, 1, "#fff5cc");
  }
}

function disk(cx, cy, radius, color) {
  for (let y = -radius; y <= radius; y += 2) {
    const width = 2 * Math.round(Math.sqrt(radius * radius - y * y) / 2);
    rect(cx - width, cy + y, width * 2, 2, color);
  }
}

function landscape() {
  const gradient = ctx.createLinearGradient(0, 0, 0, 165);
  scene.sky.forEach((color, index) => gradient.addColorStop(index / 3, color));
  rect(0, 0, W, H, gradient);
  const moonX = [365, 104, 364][chapter];
  const moonY = [54, 56, 47][chapter];
  ctx.globalAlpha = 0.09;
  disk(moonX, moonY, 44, scene.glow);
  disk(moonX, moonY, 36, scene.glow);
  ctx.globalAlpha = 1;
  disk(moonX, moonY, 26, scene.glow);
  rect(moonX + 8, moonY - 12, 7, 3, "#efb687");
  rect(moonX + 10, moonY - 9, 4, 3, "#efb687");
  rect(moonX - 11, moonY + 3, 5, 3, "#efb687");
  rect(moonX - 8, moonY + 6, 6, 2, "#efb687");
  rect(moonX + 5, moonY + 15, 4, 2, "#efb687");

  for (let i = 0; i < 73; i++) {
    const x = hash(i, 72) % W;
    const y = 7 + hash(i, 23) % 103;
    if (Math.hypot(x - moonX, y - moonY) < 34) continue;
    ctx.globalAlpha = 0.35 + hash(i, 89) % 45 / 100;
    if (i % 11 === 0) sparkle(x, y, "#ffe5b0");
    else rect(x, y, i % 4 === 0 ? 2 : 1, 1, "#ffe5b0");
  }
  ctx.globalAlpha = 1;
  if (chapter === 2) {
    ctx.globalAlpha = 0.32;
    poly([[0,62],[90,32],[146,34],[218,69],[300,77],[380,49],[480,22],[480,33],[380,62],[300,89],[214,78],[145,47],[88,42],[0,71]], "#b5d6b2");
    ctx.globalAlpha = 1;
  }
  for (const [x, y, width] of [[24,84,67],[91,103,54],[305,86,65],[403,72,43],[381,109,63]]) {
    ctx.globalAlpha = 0.32;
    rect(x, y + 2, width, 2, "#ffd2a7");
    rect(x + 10, y, width - 24, 2, "#ffd2a7");
    rect(x + 18, y + 4, width - 22, 1, "#ffd2a7");
  }
  ctx.globalAlpha = 1;

  poly([[0,131],[38,120],[81,90],[114,105],[139,128],[174,116],[225,89],[250,106],[286,126],[316,117],[340,99],[361,110],[389,96],[414,101],[445,83],[480,108],[480,168],[0,168]], scene.far);
  poly([[0,126],[28,132],[48,127],[79,119],[115,137],[141,134],[185,152],[215,139],[244,142],[282,131],[310,138],[333,134],[367,145],[403,127],[430,133],[453,118],[480,128],[480,170],[0,170]], scene.near);

  // The jagged shoreline adds a silhouette behind the cutaway island.
  for (let x = 0; x < W; x += 5) {
    const y = 146 + Math.round(Math.sin(x * .044) * 5);
    const height = 2 + hash(x, 19) % 14;
    rect(x, y - height, 3, height + 12, scene.near);
    rect(x - 1, y - height + 3, 5, 5, scene.near);
  }
  const water = ctx.createLinearGradient(0, 154, 0, H);
  water.addColorStop(0, scene.far);
  water.addColorStop(.23, scene.lake);
  water.addColorStop(1, scene.sky[0]);
  rect(0, 156, W, H - 156, water);
  for (let i = 0; i < 122; i++) {
    const y = 158 + hash(i, 115) % 151;
    const x = hash(i, 9) % W;
    const size = 2 + hash(i, 14) % (y > 216 ? 36 : 22);
    const reflection = Math.abs(x - moonX) < 30 + (y - 156) / 4;
    ctx.globalAlpha = reflection ? 0.34 : 0.13;
    rect(x, y, size, i % 8 === 0 ? 2 : 1, reflection ? scene.glow : "#e6bfd5");
  }
  ctx.globalAlpha = 1;
  poly([[69,206],[221,130],[412,209],[270,296],[215,288],[104,242]], "#2d253d55");
}

function diamond(x, y, inset, color) {
  const w = HW - inset;
  const h = HH - inset / 2;
  poly([[x, y - h], [x + w, y], [x, y + h], [x - w, y]], color);
}

function ground(tx, ty, kind) {
  const [x, y] = point(tx, ty);
  const variation = hash(tx, ty);
  const outline = "#392e3e";
  const depth = 22 + variation % 5;
  if (tile(tx, ty + 1) === " ") {
    poly([[x - HW,y],[x,y + HH],[x,y + HH + depth],[x - HW,y + depth]], outline);
    poly([[x - HW + 1,y + 1],[x,y + HH],[x,y + HH + depth - 2],[x - HW + 1,y + depth - 1]], scene.edge[0]);
    for (let j = 0; j < 7; j++) {
      const dx = 2 + hash(tx + j, ty + 32) % 17;
      rect(x - HW + dx, y + 4 + Math.floor(dx / 2) + hash(j, tx + ty) % 13, 2 + j % 3, 1, "#332d4166");
    }
    poly([[x-HW,y + 3],[x,y + HH + 3],[x,y + HH + 6],[x-HW,y + 6]], scene.tree[0]);
  }
  if (tile(tx + 1, ty) === " ") {
    poly([[x,y + HH],[x + HW,y],[x + HW,y + depth],[x,y + HH + depth]], outline);
    poly([[x,y + HH],[x + HW - 1,y + 1],[x + HW - 1,y + depth - 1],[x,y + HH + depth - 2]], scene.edge[1]);
    for (let j = 0; j < 6; j++) {
      const dx = 2 + hash(tx + j, ty + 59) % 17;
      rect(x + dx, y + HH + 4 - Math.floor(dx / 2) + hash(j, tx + ty) % 14, 2 + j % 3, 1, "#b18e794d");
    }
    poly([[x,y + HH + 2],[x + HW,y + 2],[x + HW,y + 5],[x,y + HH + 6]], scene.tree[0]);
  }
  diamond(x, y, 0, "#515749");
  const grass = scene.grass[variation % 3];
  diamond(x, y, 1.1, kind === "W" ? scene.lake : grass);
  if (kind === "W") {
    rect(x - 8, y - 1, 12, 1, "#b3ccd388");
    rect(x + 1, y + 3, 9, 1, "#dae5b477");
    rect(x - 5, y + 6, 5, 1, "#283b5277");
    return;
  }
  if (passable(tx, ty)) {
    diamond(x, y, 4, scene.path);
    for (let j = 0; j < 5; j++) {
      const dx = hash(tx + j * 3, ty) % 23 - 11;
      const dy = hash(tx, ty + j * 7) % 7 - 3;
      rect(x + dx, y + dy, 2 + j % 3, 1, j % 2 ? "#59404a38" : "#fff0b65a");
    }
  }
  for (let j = 0; j < 5; j++) {
    const dx = hash(tx + j * 2, ty + 1) % 33 - 16;
    const dy = (j % 2 ? 1 : -1) * (Math.floor((HW - Math.abs(dx)) / 2) - 2);
    rect(x + dx, y + dy, 2 + j % 3, 1, j % 2 ? "#f0deb36b" : "#314d4a7a");
  }
}

function pine(x, y, seed) {
  const [dark, mid, light] = scene.tree;
  const shift = seed % 7;
  const top = y - 41 - shift;
  poly([[x-12,y],[x,y-6],[x+14,y],[x,y+6]], "#35423970");
  rect(x - 3, y - 14, 6, 15, "#523a3d");
  rect(x - 2, y - 12, 2, 12, "#a17454");
  for (const [offset, width] of [[17,15],[9,12],[0,8]]) {
    const yy = top + offset;
    poly([[x-2,yy],[x+2,yy],[x+width,yy+19],[x+width,yy+23],[x,yy+27],[x-width,yy+22],[x-width,yy+19]], "#2d3540");
    poly([[x,yy+1],[x+width-1,yy+21],[x,yy+25],[x-width+1,yy+21]], dark);
    poly([[x,yy+2],[x,yy+21],[x-width+1,yy+21]], mid);
    rect(x - 5, yy + 12, 4, 2, light);
    rect(x - 2, yy + 7, 3, 2, light);
    rect(x + 3, yy + 17, 4, 2, mid);
  }
}

function shrub(x, y) {
  const [dark, mid, light] = scene.tree;
  poly([[x-12,y],[x,y-5],[x+12,y],[x,y+6]], "#35423970");
  poly([[x-11,y-1],[x-11,y-7],[x-7,y-7],[x-7,y-12],[x+5,y-12],[x+5,y-9],[x+10,y-9],[x+10,y-1],[x+5,y+3],[x-6,y+3]], "#2d3540");
  poly([[x-9,y-2],[x-9,y-6],[x-5,y-6],[x-5,y-10],[x+4,y-10],[x+4,y-7],[x+8,y-7],[x+8,y-2],[x+4,y+1],[x-5,y+1]], dark);
  rect(x-4, y-9, 7, 3, mid);
  rect(x-6, y-5, 5, 3, mid);
  rect(x-2, y-8, 3, 1, light);
  rect(x+4, y-5, 2, 2, "#e99d7d");
}

function cabin(x, y) {
  poly([[x-26,y],[x+1,y-15],[x+27,y-2],[x+1,y+12]], "#4b344f70");
  poly([[x-18,y-19],[x+3,y-8],[x+3,y+8],[x-18,y-3]], "#6a433f");
  poly([[x+3,y-8],[x+23,y-19],[x+23,y-3],[x+3,y+8]], "#a1624c");
  poly([[x-16,y-16],[x+1,y-7],[x+1,y+5],[x-16,y-4]], "#cc895e");
  for (let i = 0; i < 3; i++) {
    poly([[x-16,y-13+i*4],[x+1,y-4+i*4],[x+1,y-3+i*4],[x-16,y-12+i*4]], "#aa644e");
  }
  poly([[x+8,y-9],[x+15,y-13],[x+15,y+1],[x+8,y+5]], "#4c3544");
  poly([[x+9,y-8],[x+13,y-10],[x+13,y+1],[x+9,y+3]], "#ebb06f");
  poly([[x-13,y-13],[x-7,y-10],[x-7,y-4],[x-13,y-7]], "#5d3944");
  poly([[x-12,y-12],[x-8,y-10],[x-8,y-6],[x-12,y-8]], "#ffe299");
  rect(x+12,y-39,6,14,"#58414e");
  rect(x+12,y-40,7,3,"#b17b66");
  const puff = (clock / 48) % 19;
  ctx.globalAlpha = (1 - puff / 19) * .68;
  rect(x + 14 + puff * .55, y - 45 - puff, 4 + Math.floor(puff / 4), 3, "#fbe0bb");
  ctx.globalAlpha = 1;
  poly([[x-25,y-19],[x-15,y-36],[x+5,y-47],[x+26,y-29],[x+28,y-20],[x+3,y-7]], "#3e2c41");
  poly([[x-24,y-21],[x-14,y-35],[x+6,y-25],[x+3,y-10]], "#d06f67");
  poly([[x-14,y-35],[x+5,y-45],[x+25,y-29],[x+6,y-20]], "#f49c76");
  poly([[x+6,y-20],[x+25,y-29],[x+26,y-21],[x+3,y-9]], "#ab5059");
  poly([[x-12,y-34],[x+6,y-43],[x+7,y-42],[x-11,y-33]], "#ffbd8d");
  for (let i = 0; i < 3; i++) {
    poly([[x-9+i*5,y-31+i*4],[x+10+i*5,y-41+i*4],[x+11+i*5,y-40+i*4],[x-8+i*5,y-30+i*4]], "#d8786e");
  }
  poly([[x-24,y-21],[x+3,y-9],[x+3,y-7],[x-24,y-19]], "#743f53");
}

function letter(x, y, seed) {
  const lift = Math.round(Math.sin(clock / 230 + seed) * 2);
  const top = y - 13 + lift;
  diamond(x, y, 17, "#75544288");
  rect(x - 8, top - 1, 16, 11, "#5b3b48");
  rect(x - 7, top, 14, 8, "#ffdc8e");
  rect(x - 6, top, 12, 1, "#fff0bc");
  for (let i = 0; i < 4; i++) {
    rect(x - 6 + i, top + 1 + i, 2, 1, "#c47b59");
    rect(x + 5 - i, top + 1 + i, 2, 1, "#c47b59");
  }
  rect(x - 2, top + 4, 4, 3, "#a75854");
  if (Math.sin(clock / 325 + seed) > .3) sparkle(x + 12, top - 4, "#ffefaa");
}

const courier = [
  "....OOOO....",
  "...ORRRRO...",
  "..ORRRRRRO..",
  "..ORRHHHRO..",
  ".OOOOOOOOOO.",
  "...OSSESO...",
  "..OOSSSSO...",
  "..OYYOOO....",
  ".OGYYYGOO...",
  ".OGGYYGBO...",
  "..OGGGGBO...",
  "...OBBBO....",
  "...OO.OO...."
];
const courierColors = {O:"#2f253d",R:"#e66e62",H:"#ffad79",S:"#ffd49c",E:"#352744",Y:"#edb460",G:"#6da391",B:"#af6c56"};

function drawCourier(x, y, facing) {
  diamond(x, y + 1, 14, "#4d354b85");
  const size = 2;
  courier.forEach((row, py) => {
    [...row].forEach((key, px) => {
      if (key !== ".") rect(x + ((facing > 0 ? px : row.length - 1 - px) - 6) * size, y - 25 + py * size, size, size, courierColors[key]);
    });
  });
}

function flower(x, y, seed) {
  const color = ["#ffe6a6", "#e8a394", "#f6c48c"][seed % 3];
  rect(x, y - 4, 1, 5, scene.tree[0]);
  rect(x - 1, y - 5, 3, 2, color);
  rect(x + 3, y - 3, 1, 3, scene.tree[0]);
  rect(x + 2, y - 4, 3, 1, color);
}

function draw() {
  landscape();
  const tiles = [];
  scene.map.forEach((row, y) => {
    [...row].forEach((kind, x) => {
      if (kind !== " ") tiles.push({x, y, kind});
    });
  });
  tiles.sort((a, b) => a.x + a.y - b.x - b.y);
  tiles.forEach(({x, y, kind}) => ground(x, y, kind));
  const preview = state.outcome ? [] : route.length ? route : shortestPath(hover);
  preview.forEach(([x, y], index) => {
    const [sx, sy] = point(x, y);
    const color = index >= state.steps ? "#a6475c" : "#ffeba7";
    if (index === preview.length - 1) {
      diamond(sx, sy, 2, color);
      diamond(sx, sy, 4, scene.path);
    }
    rect(sx - 2, sy - 1, 4, 2, color);
  });

  const actors = [];
  for (const {x, y, kind} of tiles) {
    const [sx, sy] = point(x, y);
    const seed = hash(x, y);
    if (kind === "T") actors.push({depth: x + y, paint: () => pine(sx, sy, seed)});
    if (kind === "B") actors.push({depth: x + y, paint: () => shrub(sx, sy)});
    if (kind === "P") actors.push({depth: x + y - 0.05, paint: () => cabin(sx, sy)});
    if (kind === "L" && !state.bag.has(`${x},${y}`)) actors.push({depth: x + y, paint: () => letter(sx, sy, seed)});
    if (kind === "." && seed % 3 === 0) actors.push({depth: x + y, paint: () => flower(sx + 12, sy - 2, seed)});
    if (kind === "W" && chapter === 1 && seed % 2 === 0) actors.push({
      depth: x + y,
      paint: () => {
        const flicker = Math.sin(clock / 280 + seed);
        if (flicker > -.4) sparkle(sx + Math.round(flicker * 5), sy - 8 + Math.round(flicker * 3), "#efe994");
      }
    });
  }
  let px = state.x;
  let py = state.y;
  let hop = 0;
  if (motion) {
    const t = Math.min((clock - motion.start) / 115, 1);
    if (t >= 1) motion = null;
    else {
      const phase = Math.max(0, t);
      px = motion.x + (px - motion.x) * phase;
      py = motion.y + (py - motion.y) * phase;
      hop = Math.sin(phase * Math.PI) * 4;
    }
  }
  const [sx, sy] = point(px, py);
  actors.push({depth: px + py + 0.25, paint: () => drawCourier(sx, sy - hop, state.facing)});
  actors.sort((a, b) => a.depth - b.depth).forEach(({paint}) => paint());
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
function frame(now) {
  if (route.length && now >= routeTime) {
    const [x, y] = route.shift();
    if (!move(x - state.x, y - state.y)) route = [];
    routeTime = now + 145;
  }
  clock = reducedMotion.matches ? 0 : now;
  if (reducedMotion.matches) motion = null;
  draw();
  requestAnimationFrame(frame);
}

const next = scenes.findIndex((_, index) => !progress.includes(index));
reset(next === -1 ? 0 : next);
requestAnimationFrame(frame);
