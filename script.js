/* Clean the Park - responsive, touch+mouse friendly game
   No external assets needed: sounds generated via WebAudio API
*/

(() => {
    // --- CONFIG ---
    const trashTypes = ["🍌","🍕","💩","🥑","🤡","🍟","🧻","🧃"];
    const baseTrashCount = 3;
    const levelIncrease = 1; // how many extra trash per level
    const escapeRadius = 70; // px for mouse proximity to trigger escape
    const pawChancePerSecond = 0.06; // chance each second to show paw
    const maxLevel = 12;
  
    // DOM
    const playArea = document.getElementById("play-area");
    const messageEl = document.getElementById("message");
    const levelEl = document.getElementById("level");
    const recycledEl = document.getElementById("recycled");
    const binEl = document.getElementById("bin");
    const muteBtn = document.getElementById("muteBtn");
  
    // state
    let level = 1;
    let recycled = 0;
    let trashCount = baseTrashCount;
    let trashElements = new Set();
    let isRunning = false;
    let animationRAF = null;
    let lastChaosCheck = performance.now();
    let audioCtx = null;
    let bgGain = null;
    let bgOsc = null;
    let isMuted = false;
  
    // dragging
    let currentDrag = null;
    let pointerOffset = {x:0,y:0};
    let pointerId = null; // track touch id
  
    // responsive helpers
    function vw(percent) { return (window.innerWidth * percent) / 100; }
  
    // --- AUDIO (WebAudio - start on first user interaction) ---
    function initAudio() {
      if (audioCtx) return;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        bgGain = audioCtx.createGain();
        bgGain.gain.value = 0.02; // low volume ambient
        bgGain.connect(audioCtx.destination);
  
        // simple ambient oscillator as background music
        bgOsc = audioCtx.createOscillator();
        bgOsc.type = 'sine';
        bgOsc.frequency.value = 160;
        const lfo = audioCtx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.18;
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 60;
        lfo.connect(lfoGain);
        lfoGain.connect(bgOsc.frequency);
        bgOsc.connect(bgGain);
        lfo.start();
        bgOsc.start();
      } catch (e) {
        console.warn("Audio init failed:", e);
        audioCtx = null;
      }
    }
  
    function toggleMute() {
      isMuted = !isMuted;
      if (bgGain) bgGain.gain.value = isMuted ? 0 : 0.02;
      muteBtn.textContent = isMuted ? "🔇" : "🔊";
      muteBtn.setAttribute("aria-pressed", String(isMuted));
    }
  
    function playCatchSound() {
      if (!audioCtx) return;
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      g.connect(audioCtx.destination);
      const o = audioCtx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(820, t);
      o.connect(g);
      o.start(t);
      o.stop(t + 0.36);
    }
  
    // --- UTILITIES ---
    function rand(min, max){ return Math.random() * (max - min) + min; }
  
    function getEventPos(e) {
      // e may be MouseEvent, TouchEvent, or custom with clientX/Y
      if (e.touches && e.touches.length) {
        return {x: e.touches[0].clientX, y: e.touches[0].clientY};
      }
      if ('clientX' in e) return {x: e.clientX, y: e.clientY};
      return null;
    }
  
    function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  
    // collision check: element center with bin rect
    function isOverBin(x,y){
      const r = binEl.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    }
  
    // --- TRASH CREATION & BEHAVIOR ---
    function spawnTrash(n){
      const area = playArea.getBoundingClientRect();
      for (let i=0;i<n;i++){
        const el = document.createElement('div');
        el.className = 'trash wiggle';
        el.dataset.id = Math.random().toString(36).slice(2,9);
        // size scales with level (smaller as level increases)
        const baseSizeVW = clamp(10 - level*0.5, 6, 10); // vw
        el.style.setProperty('--size-vw', baseSizeVW + 'vw');
        el.textContent = trashTypes[Math.floor(Math.random() * trashTypes.length)];
        // position random within area with padding
        const pad = 10;
        const left = rand(pad, area.width - pad);
        const top = rand(pad, area.height - pad);
        el.style.left = left + 'px';
        el.style.top = top + 'px';
        // add attributes for movement
        el._vx = rand(-0.25, 0.25) * (1 + level*0.12);
        el._vy = rand(-0.25, 0.25) * (1 + level*0.12);
        el._wiggle = true;
        el._size = baseSizeVW;
        // prevent default dragging behaviors
        el.addEventListener('dragstart', e => e.preventDefault());
        // add pointer / touch / mouse listeners
        addPointerListeners(el);
        playArea.appendChild(el);
        trashElements.add(el);
      }
    }
  
    function removeTrash(el){
      if (!el) return;
      trashElements.delete(el);
      el.remove();
    }
  
    // --- INPUT / DRAG HANDLERS (mouse + touch unified) ---
    function addPointerListeners(el){
      // mousedown / touchstart
      el.addEventListener('mousedown', startPointerDrag);
      el.addEventListener('touchstart', startPointerDrag, {passive:false});
      // also support pointer events if available
      el.addEventListener('pointerdown', startPointerDrag);
    }
  
    function startPointerDrag(e){
      // single drag at a time
      e.preventDefault && e.preventDefault();
      // initialize audio if first interaction
      initAudio(); isRunning = true; messageEl.style.opacity = 0.9;
      if (e.pointerId !== undefined) pointerId = e.pointerId;
      const pos = getEventPos(e);
      if (!pos) return;
      // find the element (if event bubbled)
      const el = e.currentTarget;
      currentDrag = el;
      el.classList.add('dragging');
      // compute offset between pointer and center
      const rect = el.getBoundingClientRect();
      pointerOffset.x = pos.x - (rect.left + rect.width/2);
      pointerOffset.y = pos.y - (rect.top + rect.height/2);
  
      // attach move/end listeners to window for robust tracking
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', endPointerDrag);
      window.addEventListener('touchmove', onPointerMove, {passive:false});
      window.addEventListener('touchend', endPointerDrag);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', endPointerDrag);
    }
  
    function onPointerMove(e){
      if(!currentDrag) {
        // escape logic still uses pointer to repel trash
        // but we also want to prevent scroll on touchmove while interacting
        if (e.type === 'touchmove') e.preventDefault && e.preventDefault();
        return;
      }
      // prevent scroll if touch
      if (e.type === 'touchmove') e.preventDefault && e.preventDefault();
      const pos = getEventPos(e);
      if (!pos) return;
      const el = currentDrag;
      // move element center to pointer minus offset
      const cx = pos.x - pointerOffset.x;
      const cy = pos.y - pointerOffset.y;
      // place by center using transform for smoothness
      el.style.left = cx + 'px';
      el.style.top = cy + 'px';
    }
  
    function endPointerDrag(e){
      if (!currentDrag) return;
      const el = currentDrag;
      el.classList.remove('dragging');
      // determine drop position center
      let pos = getEventPos(e) || {x: parseFloat(el.style.left||0), y: parseFloat(el.style.top||0)};
      // final check: over bin?
      const centerX = pos.x;
      const centerY = pos.y;
      if (isOverBin(centerX, centerY)){
        // caught
        playCatchSound();
        animateBin();
        recycled++;
        recycledEl.textContent = 'Recycled: ' + recycled;
        // remove element
        removeTrash(el);
        checkLevelProgress();
      } else {
        // give a little bounce back
        el.style.transform = 'translate(-50%,-50%) scale(1)';
        // small timeout to clear transform so wiggle continues
        setTimeout(()=>el.style.transform = '', 160);
      }
      currentDrag = null;
      pointerId = null;
  
      // remove listeners
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', endPointerDrag);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', endPointerDrag);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endPointerDrag);
    }
  
    // --- BIN ANIMATION ---
    function animateBin(){
      binEl.classList.add('pop');
      setTimeout(()=>binEl.classList.remove('pop'), 160);
    }
  
    // --- ESCAPE LOGIC & MOVEMENT LOOP ---
    function gameLoop(now){
      // move trash passively
      trashElements.forEach(el => {
        if (el === currentDrag) return; // don't move dragged item
        // random drift
        el._vx += rand(-0.02,0.02) * (0.7 + level*0.06);
        el._vy += rand(-0.02,0.02) * (0.7 + level*0.06);
        // apply damping
        el._vx *= 0.995;
        el._vy *= 0.995;
        // update position
        let left = parseFloat(el.style.left || 0) + el._vx * (1 + level*0.2);
        let top  = parseFloat(el.style.top || 0)  + el._vy * (1 + level*0.2);
        // bounds check within play area
        const rect = playArea.getBoundingClientRect();
        left = clamp(left, 8, rect.width - 8);
        top = clamp(top, 8, rect.height - 8);
        el.style.left = left + 'px';
        el.style.top  = top + 'px';
        // occasionally toggle wiggle
        if (Math.random() < 0.003) {
          el._wiggle = !el._wiggle;
          el.classList.toggle('wiggle', el._wiggle);
        }
      });
  
      // escape logic: pointer proximity (mouse or touch)
      // use last known pointer from window events if available
      // For simplicity, read from global last pointer saved in pointerTracker
      if (pointerTracker.pos) {
        const px = pointerTracker.pos.x;
        const py = pointerTracker.pos.y;
        trashElements.forEach(el => {
          if (el === currentDrag) return;
          const rect = el.getBoundingClientRect();
          const cx = rect.left + rect.width/2;
          const cy = rect.top + rect.height/2;
          const dx = cx - px;
          const dy = cy - py;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < escapeRadius + rect.width*0.5) {
            // push away
            const pushStrength = (escapeRadius + rect.width*0.5 - dist) * 0.06 * (1 + level*0.06);
            el._vx += (dx/dist || 0.5) * pushStrength;
            el._vy += (dy/dist || 0.5) * pushStrength;
          }
        });
      }
  
      // chaotic paw
      if (now - lastChaosCheck > 800) {
        lastChaosCheck = now;
        if (Math.random() < pawChancePerSecond * 0.8) {
          showPawAndShuffle();
        }
      }
  
      animationRAF = requestAnimationFrame(gameLoop);
    }
  
    // pointerTracker saves last pointer pos for escape logic
    const pointerTracker = { pos: null };
  
    // listen globally for pointer position to feed escape behavior (touch & mouse)
    window.addEventListener('mousemove', e => {
      pointerTracker.pos = {x: e.clientX, y: e.clientY};
    });
    window.addEventListener('touchmove', e => {
      if (e.touches && e.touches.length) {
        pointerTracker.pos = {x: e.touches[0].clientX, y: e.touches[0].clientY};
        // prevent page scroll when interacting with playground
        const target = e.target;
        if (playArea.contains(target)) e.preventDefault && e.preventDefault();
      }
    }, {passive:false});
    window.addEventListener('pointermove', e => { pointerTracker.pos = {x: e.clientX, y: e.clientY}; });
  
    // --- CHAOS: paw shows & shuffles trash positions ---
    function showPawAndShuffle(){
      const paw = document.createElement('div');
      paw.className = 'paw';
      paw.textContent = '🐾';
      // random location near center
      const area = playArea.getBoundingClientRect();
      const left = rand(area.width*0.1, area.width*0.9);
      const top = rand(area.height*0.1, area.height*0.8);
      paw.style.left = left + 'px';
      paw.style.top  = top + 'px';
      playArea.appendChild(paw);
      setTimeout(()=> {
        // shuffle positions of a few trash items
        const arr = Array.from(trashElements);
        const n = Math.max(1, Math.floor(arr.length * 0.35));
        for (let i=0;i<n;i++){
          const t = arr[Math.floor(Math.random() * arr.length)];
          if (!t) continue;
          const area = playArea.getBoundingClientRect();
          t.style.left = rand(12, area.width - 12) + 'px';
          t.style.top  = rand(12, area.height - 12) + 'px';
          // give a little velocity
          t._vx = rand(-0.8,0.8);
          t._vy = rand(-0.8,0.8);
        }
        paw.remove();
      }, 700);
    }
  
    // --- LEVELS / PROGRESSION ---
    function checkLevelProgress(){
      // simple rule: when recycled reaches level * baseTrashCount, level up
      const required = level * baseTrashCount;
      if (recycled >= required) {
        levelUp();
      }
    }
  
    function levelUp(){
      if (level >= maxLevel) {
        displayMessage("You're a Park Champion! 🏆 All levels cleared!");
        return;
      }
      level++;
      trashCount += levelIncrease;
      levelEl.textContent = 'Level: ' + level;
      displayMessage(`Level up! Level ${level} — New trash incoming...`);
      // spawn next wave with more
      spawnTrash(trashCount);
      // increase general motion by slightly increasing velocities
      trashElements.forEach(t => {
        t._vx *= 1.06;
        t._vy *= 1.06;
      });
    }
  
    // --- MESSAGES ---
    let msgTimer = null;
    function displayMessage(txt, dur=2200){
      messageEl.textContent = txt;
      messageEl.style.opacity = 0.98;
      if (msgTimer) clearTimeout(msgTimer);
      msgTimer = setTimeout(()=> {
        messageEl.style.opacity = 0.85;
        messageEl.textContent = `Level ${level} — clean ${trashCount} items`;
      }, dur);
    }
  
    // --- CHECK & START GAME ---
    function startGameOnce(){
      if (isRunning) return;
      initAudio();
      isRunning = true;
      displayMessage(`Go! Level ${level} — catch the trash and drag to the bin ♻️`);
      spawnTrash(trashCount);
      // start loop
      if (!animationRAF) animationRAF = requestAnimationFrame(gameLoop);
    }
  
    // click/touch anywhere to start music & game
    function initialStartHandler(e){
      initAudio(); startGameOnce();
      // ensure user gesture resumed AudioContext if suspended
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume && audioCtx.resume();
      }
      // remove this listener after first activation
      window.removeEventListener('pointerdown', initialStartHandler);
      window.removeEventListener('touchstart', initialStartHandler);
      window.removeEventListener('mousedown', initialStartHandler);
    }
    window.addEventListener('pointerdown', initialStartHandler);
    window.addEventListener('touchstart', initialStartHandler, {passive:true});
    window.addEventListener('mousedown', initialStartHandler);
  
    // mute toggle
    muteBtn.addEventListener('click', toggleMute);
  
    // make sure bin responds to layout changes (pointer-events none, so not interactive)
    window.addEventListener('resize', ()=>{ /* optionally reposition or rescale items */ });
  
    // initial UI
    levelEl.textContent = 'Level: ' + level;
    recycledEl.textContent = 'Recycled: ' + recycled;
    displayMessage('Tap / click to start — جمع کنیم پارک رو!');
  
  })();
  