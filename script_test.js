const bin = document.getElementById("bin");
const message = document.getElementById("message");
const levelDisplay = document.getElementById("level");
const catchSound = document.getElementById("catch-sound");
const bgMusic = document.getElementById("bg-music");

const trashTypes = ["🍌","🍕","💩","🥑","🤡"];
let level = 1;
let trashCount = 3;
let recycled = 0;
let started = false;
let totalTrash = trashCount;

const trashes = [];
let pointerX = 0, pointerY = 0;  // mouse/touch position
let activeDrag = null;           // keep track of dragging

// Create trash items
function createTrash(num) {
  for (let i = 0; i < num; i++) {
    totalTrash = num;
    const trash = document.createElement("div");
    trash.classList.add("trash");
    trash.textContent = trashTypes[Math.floor(Math.random()*trashTypes.length)];
    trash.style.fontSize = `${Math.max(20, 60 - level*5)}px`;
    trash.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    trash.style.top = `${Math.random() * (window.innerHeight - 150)}px`;

    document.body.appendChild(trash);
    trashes.push({ el: trash, vx: 0, vy: 0 });

    // Pointer events (work on desktop & mobile)
    trash.addEventListener("pointerdown", e => {
      e.preventDefault();
      activeDrag = {
        el: trash,
        offsetX: e.clientX - trash.offsetLeft,
        offsetY: e.clientY - trash.offsetTop
      };
      trash.setPointerCapture(e.pointerId);
      trash.classList.add("wiggle");
    });

    trash.addEventListener("pointermove", e => {
      if (!activeDrag || activeDrag.el !== trash) return;
      const newLeft = e.clientX - activeDrag.offsetX;
      const newTop = e.clientY - activeDrag.offsetY;
      trash.style.left = newLeft + "px";
      trash.style.top = newTop + "px";
    });

    trash.addEventListener("pointerup", e => {
      if (!activeDrag || activeDrag.el !== trash) return;
      trash.releasePointerCapture(e.pointerId);
      trash.classList.remove("wiggle");
      activeDrag = null;

      // Check drop on bin
      const binRect = bin.getBoundingClientRect();
      const tRect = trash.getBoundingClientRect();
      if (!(tRect.right < binRect.left || tRect.left > binRect.right || tRect.bottom < binRect.top || tRect.top > binRect.bottom)) {
        catchSound.play();
        trash.remove();
        recycled++;
        bin.style.transform = "scale(1.2)";
        setTimeout(()=> bin.style.transform="scale(1)", 200);
        message.textContent = `Cleaned ${recycled} out of ${totalTrash} trash!`;

        if (document.querySelectorAll(".trash").length === 0) {
          nextLevel();
        }
      }
    });
  }
}

// Next level
function nextLevel() {
  level++;
  trashCount += 2;
  recycled = 0;
  levelDisplay.textContent = `Level: ${level}`;
  message.textContent = "Level up! New trash incoming...";
  setTimeout(()=> createTrash(trashCount), 1000);
}

// Track pointer (mouse or touch)
document.addEventListener("pointermove", e => {
  pointerX = e.clientX;
  pointerY = e.clientY;
});

// Animate trashes (make them escape)
function animateTrashes() {
  const speed = 0.03 + level * 0.1;

  trashes.forEach(obj => {
    if (!document.body.contains(obj.el) || (activeDrag && activeDrag.el === obj.el)) return;

    const rect = obj.el.getBoundingClientRect();
    const x = rect.left + rect.width/2;
    const y = rect.top + rect.height/2;

    const dx = pointerX - x;
    const dy = pointerY - y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 120) { // move away if pointer is close
      obj.vx -= dx / dist * speed;
      obj.vy -= dy / dist * speed;
    }

    obj.vx *= 0.9;
    obj.vy *= 0.9;

    let newLeft = parseFloat(obj.el.style.left) + obj.vx;
    let newTop  = parseFloat(obj.el.style.top) + obj.vy;

    newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, newLeft));
    newTop  = Math.max(0, Math.min(window.innerHeight - rect.height, newTop));

    obj.el.style.left = newLeft + "px";
    obj.el.style.top  = newTop + "px";
  });

  requestAnimationFrame(animateTrashes);
}

// Chaos
function chaos() {
  if (Math.random() < 0.003) {
    document.querySelectorAll(".trash").forEach(t=>{
      t.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
      t.style.top = `${Math.random() * (window.innerHeight - 150)}px`;
    });

    const paw = document.createElement("div");
    paw.textContent = "🐾";
    paw.style.position = "fixed";
    paw.style.fontSize = "80px";
    paw.style.left = `${Math.random() * (window.innerWidth - 100)}px`;
    paw.style.top = `${Math.random() * (window.innerHeight - 100)}px`;
    paw.style.transition = "opacity 1s ease, transform 1s ease";
    document.body.appendChild(paw);

    setTimeout(() => {
      paw.style.opacity = "0";
      paw.style.transform = "scale(2)";
      setTimeout(() => paw.remove(), 1000);
    }, 500);

    message.textContent = "🐾 A cat shuffled the trash!";
  }
  requestAnimationFrame(chaos);
}

// Start game
document.body.addEventListener("click", () => {
  if (!started) {
    started = true;
    bgMusic.play();
    message.textContent = "Drag trash into the bin!";
    createTrash(trashCount);
    animateTrashes();
    chaos();
  }
});
