// NeonSpace — High-Velocity Cyber Arcade Engine
const canvas = document.getElementById('neonCanvas');
const ctx = canvas.getContext('2d');

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Web Audio API Retro Arcade Synthesizer
class RetroAudio {
  constructor() {
    this.ctx = null;
  }
  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) this.ctx = new AudioContext();
    }
  }
  playLaser() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
  }
  playExplode() {
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'square';
    const now = this.ctx.currentTime;
    osc.frequency.setValueAtTime(180, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.22);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.22);
  }
}
const audio = new RetroAudio();

// Game State
let isPlaying = false;
let score = 0;
let shield = 100;
let multiplier = 1;
let highScore = parseInt(localStorage.getItem('neonspace_highscore') || '0', 10);
let animationId;

// DOM Elements
const hudScore = document.getElementById('hudScore');
const hudShield = document.getElementById('hudShield');
const hudMult = document.getElementById('hudMult');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const highScoreDisplay = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

highScoreDisplay.textContent = highScore;

// Player Ship
const ship = {
  x: width / 2,
  y: height - 120,
  vx: 0,
  vy: 0,
  speed: 8,
  width: 32,
  height: 44,
  lastShot: 0,
  shotCooldown: 180
};

// Input
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === ' ' && isPlaying) fireLaser();
});
window.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});

// Pointer Input
let pointerActive = false;
let pointerX = width / 2;
let pointerY = height - 120;

window.addEventListener('pointerdown', (e) => {
  pointerActive = true;
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (isPlaying) fireLaser();
});
window.addEventListener('pointermove', (e) => {
  if (pointerActive) {
    pointerX = e.clientX;
    pointerY = e.clientY;
  }
});
window.addEventListener('pointerup', () => { pointerActive = false; });

// Entities
let lasers = [];
let targets = [];
let particles = [];
let stars = [];

// Init stars
for (let i = 0; i < 150; i++) {
  stars.push({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 2.5 + 1,
    color: Math.random() > 0.4 ? '#00f0ff' : '#ff007f'
  });
}

function fireLaser() {
  const now = Date.now();
  if (now - ship.lastShot < ship.shotCooldown) return;
  ship.lastShot = now;

  audio.playLaser();
  // Dual Laser blasters
  lasers.push({ x: ship.x - 12, y: ship.y - 10, vy: -15, width: 4, height: 18 });
  lasers.push({ x: ship.x + 12, y: ship.y - 10, vy: -15, width: 4, height: 18 });
}

function spawnTarget() {
  const isDrone = Math.random() > 0.5;
  targets.push({
    x: Math.random() * (width - 80) + 40,
    y: -40,
    vy: Math.random() * 2.5 + 2 + (score > 2000 ? 1 : 0),
    vx: (Math.random() - 0.5) * 1.5,
    radius: isDrone ? 18 : 26,
    hp: isDrone ? 1 : 2,
    type: isDrone ? 'drone' : 'asteroid',
    rot: 0,
    rotSpeed: (Math.random() - 0.5) * 0.05
  });
}

function createSparks(x, y, color, count = 16) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 6 + 2;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: Math.random() * 0.04 + 0.02,
      color,
      size: Math.random() * 3 + 1
    });
  }
}

function startGame() {
  audio.init();
  isPlaying = true;
  score = 0;
  shield = 100;
  multiplier = 1;
  ship.x = width / 2;
  ship.y = height - 120;
  lasers = [];
  targets = [];
  particles = [];

  hudScore.textContent = '0';
  hudShield.textContent = '100%';
  hudShield.style.color = '#22c55e';
  hudMult.textContent = 'x1';

  startScreen.style.display = 'none';
  gameOverScreen.style.display = 'none';

  cancelAnimationFrame(animationId);
  gameLoop();
}

function gameOver() {
  isPlaying = false;
  audio.playExplode();
  createSparks(ship.x, ship.y, '#ff007f', 40);

  if (score > highScore) {
    highScore = score;
    localStorage.setItem('neonspace_highscore', highScore.toString());
  }

  finalScore.textContent = score;
  highScoreDisplay.textContent = highScore;
  gameOverScreen.style.display = 'flex';
}

let lastTargetSpawn = Date.now();

function update() {
  if (!isPlaying) return;

  // Keyboard Movement
  let dx = 0;
  let dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;

  if (pointerActive) {
    const distX = pointerX - ship.x;
    const distY = pointerY - ship.y;
    if (Math.abs(distX) > 8) dx = Math.sign(distX);
    if (Math.abs(distY) > 8) dy = Math.sign(distY);
  }

  if (dx !== 0 && dy !== 0) {
    dx *= 0.7071;
    dy *= 0.7071;
  }

  ship.vx = ship.vx * 0.8 + dx * ship.speed * 0.2;
  ship.vy = ship.vy * 0.8 + dy * ship.speed * 0.2;

  ship.x += ship.vx * ship.speed;
  ship.y += ship.vy * ship.speed;

  // Boundaries
  ship.x = Math.max(ship.width, Math.min(width - ship.width, ship.x));
  ship.y = Math.max(80, Math.min(height - ship.height, ship.y));

  // Spawns
  const now = Date.now();
  if (now - lastTargetSpawn > Math.max(900 - Math.min(score * 0.05, 500), 380)) {
    spawnTarget();
    lastTargetSpawn = now;
  }

  // Update Lasers
  for (let i = lasers.length - 1; i >= 0; i--) {
    const l = lasers[i];
    l.y += l.vy;

    // Laser vs Target Collision
    let hit = false;
    for (let j = targets.length - 1; j >= 0; j--) {
      const t = targets[j];
      const dist = Math.hypot(l.x - t.x, l.y - t.y);
      if (dist < t.radius + 8) {
        t.hp--;
        hit = true;
        createSparks(l.x, l.y, '#00f0ff', 8);

        if (t.hp <= 0) {
          audio.playExplode();
          createSparks(t.x, t.y, t.type === 'drone' ? '#ff007f' : '#38bdf8', 22);
          targets.splice(j, 1);
          score += 100 * multiplier;
          if (score % 600 === 0 && multiplier < 5) multiplier++;
          hudScore.textContent = score;
          hudMult.textContent = 'x' + multiplier;
        }
        break;
      }
    }

    if (hit || l.y < -30) {
      lasers.splice(i, 1);
    }
  }

  // Update Targets
  for (let i = targets.length - 1; i >= 0; i--) {
    const t = targets[i];
    t.y += t.vy;
    t.x += t.vx;
    t.rot += t.rotSpeed;

    // Check collision with ship
    const distToShip = Math.hypot(t.x - ship.x, t.y - ship.y);
    if (distToShip < t.radius + ship.width * 0.6) {
      shield -= 25;
      multiplier = 1;
      hudMult.textContent = 'x1';
      audio.playExplode();
      createSparks(t.x, t.y, '#ef4444', 25);
      targets.splice(i, 1);

      hudShield.textContent = Math.max(0, shield) + '%';
      if (shield <= 50) hudShield.style.color = '#eab308';
      if (shield <= 25) hudShield.style.color = '#ef4444';

      if (shield <= 0) {
        gameOver();
        return;
      }
      continue;
    }

    if (t.y > height + 50) {
      targets.splice(i, 1);
    }
  }

  // Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= p.decay;
    if (p.life <= 0) particles.splice(i, 1);
  }

  // Update Stars
  stars.forEach(s => {
    s.y += s.speed;
    if (s.y > height) {
      s.y = 0;
      s.x = Math.random() * width;
    }
  });
}

function draw() {
  ctx.fillStyle = '#040612';
  ctx.fillRect(0, 0, width, height);

  // Background Synthwave Horizon Glow
  const horizonGrad = ctx.createLinearGradient(0, height * 0.6, 0, height);
  horizonGrad.addColorStop(0, 'rgba(0, 240, 255, 0.02)');
  horizonGrad.addColorStop(1, 'rgba(255, 0, 127, 0.08)');
  ctx.fillStyle = horizonGrad;
  ctx.fillRect(0, 0, width, height);

  // Draw Stars
  stars.forEach(s => {
    ctx.fillStyle = s.color;
    ctx.fillRect(s.x, s.y, s.size, s.size * 2);
  });

  // Draw Lasers
  lasers.forEach(l => {
    ctx.save();
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#fff';
    ctx.fillRect(l.x - l.width / 2, l.y, l.width, l.height);
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(l.x - l.width / 2, l.y, l.width, l.height);
    ctx.restore();
  });

  // Draw Targets (Drones & Asteroids)
  targets.forEach(t => {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(t.rot);

    if (t.type === 'drone') {
      ctx.shadowColor = '#ff007f';
      ctx.shadowBlur = 16;
      ctx.strokeStyle = '#ff007f';
      ctx.lineWidth = 2.5;
      ctx.fillStyle = 'rgba(25, 10, 30, 0.9)';

      // Hexagon Drone
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const x = Math.cos(a) * t.radius;
        const y = Math.sin(a) * t.radius;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Drone Core
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = '#00f0ff';
      ctx.fill();
    } else {
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 12;
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(10, 18, 38, 0.85)';

      // Asteroid Polygon
      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const r = i % 2 === 0 ? t.radius : t.radius * 0.75;
        const x = Math.cos(a) * r;
        const y = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
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

  // Draw Player Starship
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 18;

  // Engine exhaust trails
  ctx.beginPath();
  ctx.moveTo(-10, 20);
  ctx.lineTo(0, 34 + Math.random() * 8);
  ctx.lineTo(10, 20);
  ctx.fillStyle = Math.random() > 0.5 ? '#ff007f' : '#00f0ff';
  ctx.fill();

  // Ship Body
  ctx.beginPath();
  ctx.moveTo(0, -ship.height / 2); // Nose
  ctx.lineTo(ship.width, ship.height / 2); // Right wing
  ctx.lineTo(0, ship.height / 3); // Tail notch
  ctx.lineTo(-ship.width, ship.height / 2); // Left wing
  ctx.closePath();

  ctx.fillStyle = 'rgba(12, 18, 38, 0.95)';
  ctx.fill();
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // Ship Cockpit
  ctx.beginPath();
  ctx.ellipse(0, 0, 5, 12, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();
  ctx.restore();
}

function gameLoop() {
  update();
  draw();
  if (isPlaying) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

function idleLoop() {
  if (!isPlaying) {
    draw();
    requestAnimationFrame(idleLoop);
  }
}
idleLoop();

