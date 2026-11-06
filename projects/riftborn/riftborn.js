// Riftborn — Core Interactive Canvas Engine
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Web Audio API Synthesizer (Zero External Dependencies)
class SoundFX {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }
  playCollect() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.15);
  }
  playHit() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.25);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }
}
const sfx = new SoundFX();

// Game State
let isPlaying = false;
let score = 0;
let health = 100;
let level = 1;
let highScore = parseInt(localStorage.getItem('riftborn_highscore') || '0', 10);
let animationFrameId;

// DOM Elements
const hudScore = document.getElementById('hudScore');
const hudHealth = document.getElementById('hudHealth');
const hudLevel = document.getElementById('hudLevel');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

highScoreDisplay.textContent = highScore;

// Player
const player = {
  x: width / 2,
  y: height / 2,
  radius: 18,
  speed: 7,
  vx: 0,
  vy: 0,
  trail: []
};

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Pointer / Touch support
let pointerDown = false;
let pointerX = 0;
let pointerY = 0;

window.addEventListener('pointerdown', (e) => {
  pointerDown = true;
  pointerX = e.clientX;
  pointerY = e.clientY;
});
window.addEventListener('pointermove', (e) => {
  if (pointerDown) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
});
window.addEventListener('pointerup', () => { pointerDown = false; });

// Entities
let orbs = [];
let hazards = [];
let particles = [];
let stars = [];

// Initialize Ambient Starfield
for (let i = 0; i < 120; i++) {
  stars.push({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 0.8 + 0.2,
    alpha: Math.random() * 0.7 + 0.3
  });
}

function spawnOrb() {
  orbs.push({
    x: Math.random() * (width - 60) + 30,
    y: Math.random() * (height - 60) + 30,
    radius: 9,
    angle: Math.random() * Math.PI * 2,
    pulse: 0
  });
}

function spawnHazard() {
  const edge = Math.floor(Math.random() * 4);
  let hx, hy;
  if (edge === 0) { hx = Math.random() * width; hy = -30; }
  else if (edge === 1) { hx = width + 30; hy = Math.random() * height; }
  else if (edge === 2) { hx = Math.random() * width; hy = height + 30; }
  else { hx = -30; hy = Math.random() * height; }

  const angle = Math.atan2(player.y - hy, player.x - hx) + (Math.random() - 0.5) * 0.5;
  const speed = 2 + Math.random() * 2.5 + level * 0.3;

  hazards.push({
    x: hx,
    y: hy,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 16 + Math.random() * 8,
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.08
  });
}

function createBurst(x, y, color, count = 15) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: Math.random() * 0.03 + 0.02,
      color,
      size: Math.random() * 3 + 1.5
    });
  }
}

function startGame() {
  sfx.init();
  isPlaying = true;
  score = 0;
  health = 100;
  level = 1;
  player.x = width / 2;
  player.y = height / 2;
  player.trail = [];
  orbs = [];
  hazards = [];
  particles = [];

  for (let i = 0; i < 5; i++) spawnOrb();
  for (let i = 0; i < 3; i++) spawnHazard();

  hudScore.textContent = '0';
  hudHealth.textContent = '100%';
  hudLevel.textContent = '1';

  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';

  cancelAnimationFrame(animationFrameId);
  gameLoop();
}

function gameOver() {
  isPlaying = false;
  sfx.playHit();
  createBurst(player.x, player.y, '#ef4444', 40);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('riftborn_highscore', highScore.toString());
  }

  finalScore.textContent = score;
  highScoreDisplay.textContent = highScore;
  gameOverScreen.style.display = 'flex';
}

let lastSpawnHazard = Date.now();
let lastSpawnOrb = Date.now();

function update() {
  if (!isPlaying) return;

  // Keyboard Movement
  let dx = 0;
  let dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (pointerDown) {
    const angle = Math.atan2(pointerY - player.y, pointerX - player.x);
    const dist = Math.hypot(pointerX - player.x, pointerY - player.y);
    if (dist > 15) {
      dx = Math.cos(angle);
      dy = Math.sin(angle);
    }
  }

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  player.vx = player.vx * 0.85 + dx * player.speed * 0.15;
  player.vy = player.vy * 0.85 + dy * player.speed * 0.15;

  player.x += player.vx * player.speed;
  player.y += player.vy * player.speed;

  // Boundaries
  player.x = Math.max(player.radius, Math.min(width - player.radius, player.x));
  player.y = Math.max(player.radius + 60, Math.min(height - player.radius, player.y));

  // Player Trail
  player.trail.push({ x: player.x, y: player.y, alpha: 1 });
  if (player.trail.length > 12) player.trail.shift();
  player.trail.forEach(t => t.alpha *= 0.85);

  // Spawns
  const now = Date.now();
  if (now - lastSpawnHazard > Math.max(1200 - level * 80, 450)) {
    spawnHazard();
    lastSpawnHazard = now;
  }
  if (orbs.length < 5 && now - lastSpawnOrb > 1500) {
    spawnOrb();
    lastSpawnOrb = now;
  }

  // Check Orbs
  for (let i = orbs.length - 1; i >= 0; i--) {
    const o = orbs[i];
    o.pulse += 0.06;
    const dist = Math.hypot(player.x - o.x, player.y - o.y);
    if (dist < player.radius + o.radius + 4) {
      score += 150 * level;
      sfx.playCollect();
      createBurst(o.x, o.y, '#38bdf8', 16);
      orbs.splice(i, 1);
      spawnOrb();

      if (score >= level * 1000) {
        level++;
        hudLevel.textContent = level;
      }
      hudScore.textContent = score;
    }
  }

  // Check Hazards
  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    h.x += h.vx;
    h.y += h.vy;
    h.rot += h.rotSpeed;

    const dist = Math.hypot(player.x - h.x, player.y - h.y);
    if (dist < player.radius + h.radius - 2) {
      health -= 25;
      sfx.playHit();
      createBurst(h.x, h.y, '#c084fc', 20);
      hazards.splice(i, 1);
      hudHealth.textContent = Math.max(0, health) + '%';

      if (health <= 0) {
        gameOver();
        return;
      }
      continue;
    }

    // Remove if off screen
    if (h.x < -100 || h.x > width + 100 || h.y < -100 || h.y > height + 100) {
      hazards.splice(i, 1);
    }
  }

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Update Starfield
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > height) s.y = 0;
  });
}

function draw() {
  // Clear with subtle trail fade
  ctx.fillStyle = '#060713';
  ctx.fillRect(0, 0, width, height);

  // Background Dimensional Vortex Glow
  const grad = ctx.createRadialGradient(width / 2, height / 2, 50, width / 2, height / 2, width * 0.7);
  grad.addColorStop(0, 'rgba(126, 34, 206, 0.12)');
  grad.addColorStop(0.5, 'rgba(56, 189, 248, 0.05)');
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Draw Stars
  stars.forEach(s => {
    ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
    ctx.fillRect(s.x, s.y, s.size, s.size);
  });

  // Draw Player Trail
  player.trail.forEach(t => {
    ctx.beginPath();
    ctx.arc(t.x, t.y, player.radius * 0.75 * t.alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(168, 85, 247, ${t.alpha * 0.4})`;
    ctx.fill();
  });

  // Draw Player Core
  ctx.save();
  ctx.shadowColor = '#38bdf8';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  ctx.lineWidth = 3;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();

  // Core internal ring
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#a855f7';
  ctx.fill();
  ctx.restore();

  // Draw Orbs (Celestial Shards)
  orbs.forEach(o => {
    ctx.save();
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 15;
    const r = o.radius + Math.sin(o.pulse) * 2;
    ctx.beginPath();
    ctx.arc(o.x, o.y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#38bdf8';
    ctx.fill();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  });

  // Draw Hazards (Void Tears)
  hazards.forEach(h => {
    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.rotate(h.rot);
    ctx.shadowColor = '#c084fc';
    ctx.shadowBlur = 20;

    ctx.beginPath();
    const spikes = 6;
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? h.radius : h.radius * 0.45;
      const angle = (i * Math.PI) / spikes;
      if (i === 0) ctx.moveTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
      else ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(20, 15, 38, 0.95)';
    ctx.fill();
    ctx.strokeStyle = '#c084fc';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Inner danger core
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.restore();
  });

  // Draw Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function gameLoop() {
  update();
  draw();
  if (isPlaying) {
    animationFrameId = requestAnimationFrame(gameLoop);
  }
}

// Event Listeners
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial ambient loop for start screen
function idleLoop() {
  if (!isPlaying) {
    draw();
    requestAnimationFrame(idleLoop);
  }
}
idleLoop();
