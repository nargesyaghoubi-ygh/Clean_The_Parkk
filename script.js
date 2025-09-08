const bin = document.getElementById("bin");
const message = document.getElementById("message");
const levelDisplay = document.getElementById("level");
const catchSound = document.getElementById("catch-sound");
const bgMusic = document.getElementById("bg-music");

const trashTypes = ["🍌", "🍕", "💩", "🥑", "🤡"];
let level = 1, trashCount = 3, recycled = 0, started = false, totalTrash = trashCount;
const trashes = [];

let mouseX=0, mouseY=0;

function createTrash(num){
  for(let i=0;i<num;i++){
    totalTrash=num;
    const trash=document.createElement("div");
    trash.classList.add("trash");
    trash.textContent = trashTypes[Math.floor(Math.random()*trashTypes.length)];
    
    let isMobile = window.innerWidth < 768;
    let baseSize = isMobile ? 80 : 60;
    trash.style.fontSize = `${Math.max(30, baseSize - level*5)}px`;
    trash.style.left = `${Math.random()*(window.innerWidth-50)}px`;
    trash.style.top = `${Math.random()*(window.innerHeight-150)}px`;
    
    document.body.appendChild(trash);
    trashes.push({el:trash, vx:0, vy:0});

    // --- Drag/Touch ---
    let offsetX=0, offsetY=0, dragging=false;
    const startDrag = e => {
      dragging=true;
      const clientX=e.touches ? e.touches[0].clientX : e.clientX;
      const clientY=e.touches ? e.touches[0].clientY : e.clientY;
      offsetX=clientX - trash.getBoundingClientRect().left;
      offsetY=clientY - trash.getBoundingClientRect().top;
      trash.classList.add("wiggle");
      e.preventDefault();
    };
    const moveDrag = e => {
      if(!dragging) return;
      const clientX=e.touches ? e.touches[0].clientX : e.clientX;
      const clientY=e.touches ? e.touches[0].clientY : e.clientY;
      trash.style.left=`${clientX - offsetX}px`;
      trash.style.top=`${clientY - offsetY}px`;
      e.preventDefault();
    };
    const endDrag = e => {
      if(!dragging) return;
      dragging=false;
      trash.classList.remove("wiggle");
      checkBinCollision(trash);
    };
    trash.addEventListener("mousedown", startDrag);
    trash.addEventListener("mousemove", moveDrag);
    trash.addEventListener("mouseup", endDrag);
    trash.addEventListener("mouseleave", endDrag);
    trash.addEventListener("touchstart", startDrag, {passive:false});
    trash.addEventListener("touchmove", moveDrag, {passive:false});
    trash.addEventListener("touchend", endDrag);
  }
}

function checkBinCollision(trash){
  const t=trash.getBoundingClientRect();
  const b=bin.getBoundingClientRect();
  if(t.left < b.right && t.right > b.left && t.top < b.bottom && t.bottom > b.top){
    catchSound.play();
    trash.remove();
    recycled++;
    bin.style.transform="scale(1.2)";
    setTimeout(()=>bin.style.transform="scale(1)",200);
    message.textContent=`Cleaned ${recycled} out of ${totalTrash} trash!`;
    if(document.querySelectorAll(".trash").length===0) nextLevel();
  }
}

function nextLevel(){
  level++;
  trashCount+=2;
  recycled=0;
  levelDisplay.textContent=`Level: ${level}`;
  message.textContent="Level up! New trash incoming...";
  setTimeout(()=>createTrash(trashCount),1000);
}

document.addEventListener("mousemove", e=>{ mouseX=e.clientX; mouseY=e.clientY; });
document.addEventListener("touchmove", e=>{ if(e.touches.length>0){ mouseX=e.touches[0].clientX; mouseY=e.touches[0].clientY; }}, {passive:false});

function animateTrashes(){
  const speed=0.03+level*0.1;
  trashes.forEach(obj=>{
    if(!document.body.contains(obj.el)) return;
    const rect=obj.el.getBoundingClientRect();
    const x=rect.left+rect.width/2;
    const y=rect.top+rect.height/2;
    const dx=mouseX-x, dy=mouseY-y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<150){ obj.vx-=dx/dist*speed; obj.vy-=dy/dist*speed; }
    obj.vx*=0.9; obj.vy*=0.9;
    let newLeft=parseFloat(obj.el.style.left)+obj.vx;
    let newTop=parseFloat(obj.el.style.top)+obj.vy;
    newLeft=Math.max(0, Math.min(window.innerWidth-rect.width, newLeft));
    newTop=Math.max(0, Math.min(window.innerHeight-rect.height, newTop));
    obj.el.style.left=newLeft+"px";
    obj.el.style.top=newTop+"px";
  });
  requestAnimationFrame(animateTrashes);
}

function chaos(){
  if(Math.random()<0.003){
    document.querySelectorAll(".trash").forEach(t=>{
      t.style.left=`${Math.random()*(window.innerWidth-50)}px`;
      t.style.top=`${Math.random()*(window.innerHeight-150)}px`;
    });
    const paw=document.createElement("div");
    paw.textContent="🐾";
    paw.style.position="fixed";
    paw.style.fontSize="80px";
    paw.style.left=`${Math.random()*(window.innerWidth-100)}px`;
    paw.style.top=`${Math.random()*(window.innerHeight-100)}px`;
    paw.style.transition="opacity 1s ease, transform 1s ease";
    document.body.appendChild(paw);
    setTimeout(()=>{
      paw.style.opacity="0";
      paw.style.transform="scale(2)";
      setTimeout(()=>paw.remove(),1000);
    },500);
    message.textContent="🐾 A cat shuffled the trash!";
  }
  requestAnimationFrame(chaos);
}

document.body.addEventListener("click", ()=>{
  if(!started){
    started=true;
    bgMusic.play();
    message.textContent="Drag trash into the bin!";
    createTrash(trashCount);
    animateTrashes();
    chaos();
  }
});