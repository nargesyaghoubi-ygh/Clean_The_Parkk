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
let mouseX = 0, mouseY = 0;  // Mouse or finger position


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


// -------------
