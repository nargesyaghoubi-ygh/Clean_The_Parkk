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
let mouseX = 0, mouseY = 0;  // Mouse position


// ----------------- ایجاد آشغال -----------------
function createTrash(num) {
  for (let i = 0; i < num; i++) {
    totalTrash = num;
    const trash = document.createElement("div");
    trash.classList.add("trash");
    trash.textContent = trashTypes[Math.floor(Math.random()*trashTypes.length)];
    trash.style.fontSize = `${Math.max(20, 60 - level*5)}px`;
    trash.style.left = `${Math.random() * (window.innerWidth - 50)}px`;
    trash.style.top = `${Math.random() * (window.innerHeight - 150)}px`;
    trash.draggable = true;

    document.body.appendChild(trash);
    trashes.push({ el: trash, vx: 0, vy: 0 });  

    // فعال کردن قابلیت دسکتاپ + موبایل
    makeTrashInteractive(trash);
  }
}


// ----------------- قابلیت تعامل آشغال -----------------
function makeTrashInteractive(trash) {
  // دسکتاپ: drag & drop
  trash.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", "trash");
    trash.classList.add("wiggle");
  });

  // موبایل: touch
  let offsetX, offsetY;

  trash.addEventListener("touchstart", e => {
    const touch = e.touches[0];
    const rect = trash.getBoundingClientRect();
    offsetX = touch.clientX - rect.left;
    offsetY = touch.clientY - rect.top;
    trash.classList.add("wiggle");
  });

  trash.addEventListener("touchmove", e => {
    const touch = e.touches[0];
    trash.style.left = (touch.clientX - offsetX) + "px";
    trash.style.top = (touch.clientY - offsetY) + "px";
  });

  trash.addEventListener("touchend", e => {
    const rect = trash.getBoundingClientRect();
    const binRect = bin.getBoundingClientRect();

    // بررسی برخورد با سطل
    if (
      rect.left < binRect.right &&
      rect.right > binRect.left &&
      rect.top < binRect.bottom &&
      rect.bottom > binRect.top
    ) {
      catchSound.play();
      trash.remove();
      recycled++;
      bin.style.transform = "scale(1.2)";
      setTimeout(() => bin.style.transform = "scale(1)", 200);
      message.textContent = `Cleaned ${recycled} out of ${totalTrash} trash!`;

      if (document.querySelectorAll(".trash").length === 0) {
        nextLevel();
      }
    } else {
      trash.classList.remove("wiggle");
    }
  });
}


// ----------------- سطل برای دسکتاپ -----------------
bin.addEventListener("dragover", e => e.preventDefault());
bin.addEventListener("drop", e => {
  const trash = document.querySelector(".trash.wiggle");
  if (trash) {
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


// ----------------- رفتن به مرحله بعد -----------------
function nextLevel() {
  level++;
  trashCount += 2;
  recycled = 0;
  levelDisplay.textContent = `Level: ${level}`;
  message.textContent = "Level up! New trash incoming...";
  setTimeout(()=> createTrash(trashCount), 1000);
}


// ----------------- حرکت آشغال ها -----------------
document.addEventListener("mousemove", e => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function animateTrashes() {
  const speed = 0.03 + level * 0.1; // سرعت بیشتر در هر مرحله

  trashes.forEach(obj => {
    if (!document.body.contains(obj.el)) return;

    const rect = obj.el.getBoundingClientRect();
    const x = rect.left + rect.width/2;
    const y = rect.top + rect.height/2;

    const dx = mouseX - x;
    const dy = mouseY - y;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < 120) { // فرار از ماوس
      obj.vx -= dx / dist * speed;
      obj.vy -= dy / dist * speed;
    }

    // اصطکاک
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


// ----------------- حالت آشوب -----------------
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


// ----------------- شروع بازی -----------------
document.body.addEventListener("click", () => {
  if (!started) {
    started = true;
    bgMusic.play();
    message.textContent = "Drag or touch trash into the bin!";
    createTrash(trashCount);
    animateTrashes();
    chaos();
  }
});
