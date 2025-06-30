"use strict";

// ——— SVG container & namespaces ———
const screen   = document.getElementById("screen");
const xmlns    = "http://www.w3.org/2000/svg";
const xlinkns  = "http://www.w3.org/1999/xlink";

// ——— Game state & HUD ———
let gameState = "start";
let score     = 0;
let lives     = 3;

// start button & HUD elements
const startBtn = document.getElementById("start");
const scoreEl  = document.getElementById("score");
const livesEl  = document.getElementById("lives");
startBtn.addEventListener("click", () => {
  gameState = "playing";
  startBtn.style.display = "none";
});

// ——— Canvas resize & pointer tracking ———
let width, height;
const pointer = { x: 0, y: 0, pressed: false };

const resize = () => {
  width  = window.innerWidth;
  height = window.innerHeight;
  pointer.x = width / 2;
  pointer.y = height / 2;
};
window.addEventListener("resize", resize);
resize();

window.addEventListener("pointermove", e => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  rad = 0;
});

// ——— Utility for instancing <use> from defs ———
const prepend = (id, i) => {
  const u = document.createElementNS(xmlns, "use");
  u.setAttributeNS(xlinkns, "xlink:href", "#" + id);
  elems[i].use = u;
  screen.prepend(u);
};

// ——— Dragon parts state ———
const N           = 40;
const globalScale = 0.6;
const elems       = [];
for (let i = 0; i < N; i++) elems[i] = { use: null, x: 0, y: 0 };

// instantiate dragon segments
for (let i = 1; i < N; i++) {
  if      (i === 1)            prepend("Cabeza", i);
  else if (i === 8 || i === 14) prepend("Aletas", i);
  else                           prepend("Espina", i);
}

// ——— Dragon accessories ———
const barbels    = [];
const fangs      = [];
const eyes       = [];
const eyeOffsets = [0.3, -0.3];

// barbels
for (let j = 0; j < 2; j++) {
  const line = document.createElementNS(xmlns, "line");
  line.setAttribute("stroke",       "#8b4513");
  line.setAttribute("stroke-width", "3");
  screen.prepend(line);
  barbels.push(line);
}

// fangs
for (let j = 0; j < 2; j++) {
  const tri = document.createElementNS(xmlns, "polygon");
  tri.setAttribute("points",       "0,0 5,-10 -5,-10");
  tri.setAttribute("fill",         "#f5f5dc");
  tri.setAttribute("stroke",       "#704214");
  tri.setAttribute("stroke-width", "0.5");
  screen.prepend(tri);
  fangs.push(tri);
}

// eyes
for (let j = 0; j < 2; j++) {
  const eye = document.createElementNS(xmlns, "circle");
  eye.setAttribute("r",            "4");
  eye.setAttribute("fill",         "yellow");
  eye.setAttribute("stroke",       "#cc0");
  eye.setAttribute("stroke-width", "0.8");
  screen.prepend(eye);
  eyes.push(eye);
}

// ——— Flame & Enemy containers ———
const flames  = [];
const enemies = [];

// ——— Spawn enemies around screen edge ———
function spawnEnemy() {
  if (gameState !== "playing") return;
  const e = document.createElementNS(xmlns, "circle");
  e.setAttribute("r",     "12");
  e.setAttribute("fill",  "crimson");
  screen.appendChild(e);
  // random edge
  let x, y;
  switch (Math.floor(Math.random() * 4)) {
    case 0: x = 0;         y = Math.random() * height; break;
    case 1: x = width;     y = Math.random() * height; break;
    case 2: x = Math.random() * width; y = 0;         break;
    default: x = Math.random() * width; y = height;  break;
  }
  enemies.push({ elem: e, x, y, vx: 0, vy: 0 });
}
setInterval(spawnEnemy, 1500);

// ——— Fire-blast on click ———
window.addEventListener("click", () => {
  if (gameState !== "playing") return;
  const head = elems[1];
  // spawn 12 flame particles
  for (let i = 0; i < 12; i++) {
    const p = document.createElementNS(xmlns, "circle");
    const r = 15 + Math.random() * 15;
    p.setAttribute("r", r);
    p.setAttribute("fill", "url(#flameGrad)");
    screen.prepend(p);

    const angle  = Math.atan2(pointer.y - head.y, pointer.x - head.x);
    const spread = (Math.random() - 0.5) * 0.6;
    const speed  = 4 + Math.random() * 2;
    flames.push({
      elem: p,
      x: head.x + Math.cos(angle) * 20,
      y: head.y + Math.sin(angle) * 20,
      vx: Math.cos(angle + spread) * speed,
      vy: Math.sin(angle + spread) * speed,
      life: 50 + Math.random() * 20
    });
  }
});

// ——— Core animation loop ———
let frm = Math.random(), rad = 0, radm;

const run = () => {
  if (gameState === "gameover") {
    alert(`Game Over!\nScore: ${score}`);
    return;
  }
  requestAnimationFrame(run);

  // begin play after start
  if (gameState === "playing") {
    // Move enemies & detect collisions
    enemies.forEach((en, i) => {
      const head = elems[1];
      const dx = head.x - en.x, dy = head.y - en.y;
      const dist = Math.hypot(dx, dy);
      // chase
      en.vx = dx / dist * 1.5;
      en.vy = dy / dist * 1.5;
      en.x += en.vx; en.y += en.vy;
      en.elem.setAttribute("cx", en.x);
      en.elem.setAttribute("cy", en.y);
      // hit dragon?
      if (dist < 20) {
        en.elem.remove(); enemies.splice(i,1);
        lives--; livesEl.textContent = lives;
        if (lives <= 0) gameState = "gameover";
      }
    });

    // flame vs enemy collisions
    flames.forEach((f, fi) => {
      enemies.forEach((en, ei) => {
        const dx = f.x - en.x, dy = f.y - en.y;
        if (Math.hypot(dx,dy) < (+f.elem.getAttribute("r")+12)) {
          en.elem.remove(); enemies.splice(ei,1);
          score += 10; scoreEl.textContent = score;
        }
      });
    });
  }

  // dragon head motion
  radm = Math.min(width/2, height/2) - 20;
  const e0 = elems[1];
  const ax = (Math.cos(3 * frm) * rad * width)  / height;
  const ay = (Math.sin(4 * frm) * rad * height) / width;
  e0.x += (ax + pointer.x - e0.x) / 10;
  e0.y += (ay + pointer.y - e0.y) / 10;

  // jaw angle
  const headAngle = Math.atan2(pointer.y - e0.y + ay,
                               pointer.x - e0.x + ax);

  // position eyes
  eyes.forEach((eye,i) => {
    const θ = headAngle + eyeOffsets[i];
    eye.setAttribute("cx", e0.x + 10 * Math.cos(θ));
    eye.setAttribute("cy", e0.y + 10 * Math.sin(θ));
  });

  // position barbels
  barbels.forEach((l,i) => {
    const θ  = headAngle + (i? -0.6:0.6),
          x1 = e0.x + 5 * Math.cos(θ),
          y1 = e0.y + 5 * Math.sin(θ),
          x2 = e0.x + 40 * Math.cos(θ),
          y2 = e0.y + 40 * Math.sin(θ);
    l.setAttribute("x1",x1); l.setAttribute("y1",y1);
    l.setAttribute("x2",x2); l.setAttribute("y2",y2);
  });

  // position fangs
  fangs.forEach((t,i) => {
    const θ  = headAngle + (i? -0.3:0.3),
          fx = e0.x + 12 * Math.cos(headAngle),
          fy = e0.y + 12 * Math.sin(headAngle);
    t.setAttribute("transform",
      `translate(${fx},${fy}) rotate(${(180/Math.PI)*θ}) scale(1.2)`
    );
  });

  // animate body & tail
  for (let i = 2; i < N; i++) {
    const e  = elems[i], ep = elems[i-1];
    const a  = Math.atan2(e.y - ep.y, e.x - ep.x);
    e.x += (ep.x - e.x + (Math.cos(a)*(100-i))/5) / 4;
    e.y += (ep.y - e.y + (Math.sin(a)*(100-i))/5) / 4;
    let s = ((162 + 4*(1-i))/50) * globalScale;
    if (i % 8 === 0) s *= 1.3;
    ep.use.setAttribute("transform",
      `translate(${(ep.x+e.x)/2},${(ep.y+e.y)/2})
       rotate(${(180/Math.PI)*a})
       scale(${s},${s})`
    );
  }

  // animate flames
  for (let i = flames.length - 1; i >= 0; i--) {
    const f = flames[i];
    f.life--;
    f.x += f.vx; f.y += f.vy;
    const scale = 1 + (50 - f.life)/25;
    f.elem.setAttribute("transform",
      `translate(${f.x},${f.y}) scale(${scale})`
    );
    f.elem.setAttribute("fill-opacity", (f.life/70).toFixed(2));
    if (f.life <= 0) {
      f.elem.remove();
      flames.splice(i,1);
    }
  }

  // expand radius
  if (rad < radm) rad++;
  frm += 0.003;
  if (rad > 60) {
    pointer.x += (width/2 - pointer.x)*0.05;
    pointer.y += (height/2 - pointer.y)*0.05;
  }
};

// kick it off
run();
