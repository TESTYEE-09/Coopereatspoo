const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreText = document.getElementById('scoreText');
const bestText = document.getElementById('bestText');
const finalScore = document.getElementById('finalScore');
const rankText = document.getElementById('rankText');
const startOverlay = document.getElementById('startOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const soundButton = document.getElementById('soundButton');
const howButton = document.getElementById('howButton');
const howDialog = document.getElementById('howDialog');
const closeDialog = document.getElementById('closeDialog');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverMessage = document.getElementById('gameOverMessage');

let width = 1100, height = 620, running = false, score = 0, combo = 1;
let elapsed = 0, spawnTimer = 0, lastCatch = 0, soundOn = true, audioCtx;
let best = Number(localStorage.getItem('cooperBest') || 0);
let items = [], particles = [], keys = {};
const player = { x: 550, y: 515, width: 112, height: 86, speed: 620, targetX: 550 };
const foods = [
  { emoji: '🍔', value: 10, name: 'burger' },
  { emoji: '🍕', value: 15, name: 'pizza' },
  { emoji: '🍎', value: 20, name: 'apple' }
];
bestText.textContent = String(best).padStart(4, '0');

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  height = Math.max(rect.height, 460);
  width = rect.width;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  player.y = height - 105;
  player.x = Math.min(player.x, width - player.width / 2);
  player.targetX = player.x;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function beep(freq, duration, type = 'sine', volume = 0.06) {
  if (!soundOn) return;
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (_) {}
}

function startGame() {
  score = 0; combo = 1; elapsed = 0; spawnTimer = 0; items = []; particles = [];
  player.x = width / 2; player.targetX = player.x;
  scoreText.textContent = '0000';
  running = true;
  startOverlay.classList.remove('visible');
  gameOverOverlay.classList.remove('visible');
  beep(520, .08, 'square'); setTimeout(() => beep(660, .12, 'square'), 70);
}

function endGame() {
  running = false;
  best = Math.max(best, score);
  localStorage.setItem('cooperBest', best);
  bestText.textContent = String(best).padStart(4, '0');
  finalScore.textContent = score;
  rankText.textContent = score >= 700 ? 'Cooper Whisperer' : score >= 400 ? 'Snack Security' : score >= 200 ? 'Poo Patrol' : score >= 80 ? 'Concerned Citizen' : 'Rookie';
  const messages = [
    ['Cooper ate the forbidden snack.', 'Honestly, this was preventable.'],
    ['You looked away for one second.', 'That was all Cooper needed.'],
    ['The poo has won.', 'History will remember this moment.'],
    ['Cooper ignored every warning.', 'A shocking but predictable result.']
  ];
  const [title, message] = messages[Math.floor(Math.random() * messages.length)];
  gameOverTitle.textContent = title;
  gameOverMessage.textContent = message;
  gameOverOverlay.classList.add('visible');
  beep(180, .4, 'sawtooth', .12);
}

function spawnItem() {
  const isPoo = Math.random() < Math.min(.2 + elapsed / 180, .45);
  const type = isPoo ? { emoji: '💩', value: 0, name: 'poo' } : foods[Math.floor(Math.random() * foods.length)];
  const size = 46 + Math.random() * 18;
  items.push({ x: 45 + Math.random() * (width - 90), y: -60, size, speed: 165 + elapsed * 4.2 + Math.random() * 90, rotation: Math.random() * 6, spin: (Math.random() - .5) * 3, type });
}

function burst(x, y, emoji, count) {
  for (let i = 0; i < count; i++) particles.push({ x, y, vx: (Math.random() - .5) * 260, vy: -80 - Math.random() * 240, life: .55 + Math.random() * .55, emoji: i < 3 ? emoji : '✦', size: 13 + Math.random() * 18, rotation: Math.random() * 6, spin: (Math.random() - .5) * 8 });
}

function intersects(a, b) { return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y; }

function update(dt) {
  if (!running) return;
  elapsed += dt; spawnTimer -= dt;
  if (spawnTimer <= 0) { spawnItem(); spawnTimer = Math.max(.28, .74 - elapsed * .006) * (.75 + Math.random() * .5); }
  if (keys.ArrowLeft || keys.a || keys.A) player.targetX -= player.speed * dt;
  if (keys.ArrowRight || keys.d || keys.D) player.targetX += player.speed * dt;
  player.targetX = Math.max(player.width / 2, Math.min(width - player.width / 2, player.targetX));
  player.x += (player.targetX - player.x) * Math.min(1, dt * 14);

  for (let i = items.length - 1; i >= 0; i--) {
    const item = items[i]; item.y += item.speed * dt; item.rotation += item.spin * dt;
    if (intersects({x:item.x-item.size*.36,y:item.y-item.size*.36,w:item.size*.72,h:item.size*.72},{x:player.x-player.width*.38,y:player.y-player.height*.36,w:player.width*.76,h:player.height*.7})) {
      if (item.type.name === 'poo') { burst(item.x, item.y, '💩', 18); endGame(); return; }
      const now = performance.now(); combo = now - lastCatch < 1100 ? Math.min(combo + 1, 5) : 1; lastCatch = now;
      score += item.type.value * combo; scoreText.textContent = String(score).padStart(4, '0');
      burst(item.x, item.y, item.type.emoji, 10); beep(430 + combo * 80, .09, 'square'); items.splice(i, 1); continue;
    }
    if (item.y > height + 80) items.splice(i, 1);
  }
  particles.forEach(p => { p.x += p.vx*dt; p.y += p.vy*dt; p.vy += 160*dt; p.life -= dt; p.rotation += p.spin*dt; });
  particles = particles.filter(p => p.life > 0);
}

function roundRect(x,y,w,h,r){ctx.beginPath();ctx.roundRect(x,y,w,h,r);}
function drawCloud(x,y,s){ctx.beginPath();ctx.arc(x,y,30*s,0,Math.PI*2);ctx.arc(x+34*s,y-10*s,38*s,0,Math.PI*2);ctx.arc(x+73*s,y,29*s,0,Math.PI*2);ctx.fill();}
function draw() {
  ctx.clearRect(0,0,width,height);
  const sky = ctx.createLinearGradient(0,0,0,height); sky.addColorStop(0,'#aee8ff'); sky.addColorStop(.72,'#eef8df'); sky.addColorStop(.721,'#7bc65f'); sky.addColorStop(1,'#43a154'); ctx.fillStyle=sky; ctx.fillRect(0,0,width,height);
  ctx.fillStyle='rgba(255,255,255,.75)'; for(let i=0;i<5;i++) drawCloud(((i*270+elapsed*9)%(width+300))-160,60+(i%2)*62,1+(i%3)*.15);
  ctx.fillStyle='#2b7e44'; for(let x=-60;x<width+80;x+=75){const h=25+Math.abs((x*17)%30);ctx.beginPath();ctx.moveTo(x,height-48);ctx.lineTo(x+34,height-48-h);ctx.lineTo(x+68,height-48);ctx.fill();}
  items.forEach(item=>{ctx.save();ctx.translate(item.x,item.y);ctx.rotate(item.rotation);ctx.font=`${item.size}px Apple Color Emoji, Segoe UI Emoji, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,.22)';ctx.shadowBlur=10;ctx.shadowOffsetY=7;ctx.fillText(item.type.emoji,0,0);ctx.restore();});
  ctx.save();ctx.translate(player.x,player.y);ctx.fillStyle='rgba(0,0,0,.2)';ctx.beginPath();ctx.ellipse(0,43,54,12,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffcc68';ctx.strokeStyle='#11110f';ctx.lineWidth=4;roundRect(-48,-43,96,78,30);ctx.fill();ctx.stroke();ctx.fillStyle='#11110f';ctx.beginPath();ctx.arc(-18,-13,5,0,Math.PI*2);ctx.arc(18,-13,5,0,Math.PI*2);ctx.fill();ctx.lineWidth=5;ctx.beginPath();ctx.arc(0,2,18,.15,Math.PI-.15);ctx.stroke();ctx.font='bold 14px Space Mono';ctx.textAlign='center';ctx.fillText('COOPER',0,61);ctx.restore();
  particles.forEach(p=>{ctx.save();ctx.globalAlpha=Math.max(0,p.life);ctx.translate(p.x,p.y);ctx.rotate(p.rotation);ctx.font=`${p.size}px sans-serif`;ctx.textAlign='center';ctx.fillText(p.emoji,0,0);ctx.restore();});
  if(running){ctx.fillStyle='#11110f';roundRect(18,18,155,38,8);ctx.fill();ctx.fillStyle='#dfff39';ctx.font='700 15px Space Mono';ctx.fillText(`COMBO x${combo}`,33,43);}
}

let lastTime = performance.now();
function loop(now){const dt=Math.min((now-lastTime)/1000,.034);lastTime=now;update(dt);draw();requestAnimationFrame(loop);} requestAnimationFrame(loop);
window.addEventListener('keydown',e=>{keys[e.key]=true;if(['ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(!running&&e.key===' ')startGame();});
window.addEventListener('keyup',e=>keys[e.key]=false);
function movePointer(clientX){const r=canvas.getBoundingClientRect();player.targetX=((clientX-r.left)/r.width)*width;}
canvas.addEventListener('mousemove',e=>movePointer(e.clientX));
canvas.addEventListener('pointerdown',e=>movePointer(e.clientX));
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons)movePointer(e.clientX);});
startButton.addEventListener('click',startGame); restartButton.addEventListener('click',startGame);
soundButton.addEventListener('click',()=>{soundOn=!soundOn;soundButton.textContent=soundOn?'🔊':'🔇';});
howButton.addEventListener('click',()=>howDialog.showModal()); closeDialog.addEventListener('click',()=>howDialog.close());
howDialog.addEventListener('click',e=>{const r=howDialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)howDialog.close();});
