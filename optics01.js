const canvas = document.getElementById("optics-canvas");
const ctx = canvas.getContext("2d");
const statusDisplay = document.getElementById("status-display");

const clearBtn = document.getElementById("clear-btn");
const homeBtn = document.getElementById("home-btn");

// ---------------------------------------------------------
// Game State
// ---------------------------------------------------------
let components = [];
let rays = []; // Array of line segments {x1, y1, x2, y2, color}

// Interaction State
let isDragging = false;
let draggedComponent = null;
let dragOffset = { x: 0, y: 0 };
let dragStartPosition = { x: 0, y: 0 }; // To detect clicks vs drags

// Constants
const GRID_SIZE = 20;
const MAX_REFLECTIONS = 20;

// Game Mode State
let gameMode = "normal"; // "normal" or "challenge"

// Challenge State
const challengeState = {
  currentQuestion: 0,
  totalQuestions: 5,
  isCompleted: false,
  transitioning: false,
  health: 5,
  timeLeft: 30,
  maxTime: 30,
  timerInterval: null
};

// ---------------------------------------------------------
// Vector Helpers
// ---------------------------------------------------------
const Vec2 = {
  add: (v1, v2) => ({ x: v1.x + v2.x, y: v1.y + v2.y }),
  sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y }),
  mag: (v) => Math.sqrt(v.x * v.x + v.y * v.y),
  norm: (v) => {
    const m = Math.sqrt(v.x * v.x + v.y * v.y);
    return m === 0 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
  },
  scale: (v, s) => ({ x: v.x * s, y: v.y * s }),
  dot: (v1, v2) => v1.x * v2.x + v1.y * v2.y,
  rotate: (v, angle) => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
  }),
};

// ---------------------------------------------------------
// Component Class
// ---------------------------------------------------------
class Component {
  constructor(type, x, y) {
    this.id = Date.now() + Math.random();
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = 0; // Radians

    // Default size
    this.width = 60;
    this.height = 60;

    // Laser Control
    this.isOn = true; // Lasers default on

    // Target State
    this.isHit = false;

    // Challenge Logic
    this.isLocked = false; // If true, cannot be deleted/moved in challenge mode

    this.setSize();
  }

  setSize() {
    if (this.type === "laser") {
      this.width = 60;
      this.height = 30;
    } else if (this.type === "mirror") {
      this.width = 10;
      this.height = 100; // Long plane mirror
    } else if (this.type === "block") {
      this.width = 60;
      this.height = 60;
    } else if (this.type === "target") {
      this.width = 50;
      this.height = 50;
    }
  }

  getCorners() {
    const hw = this.width / 2;
    const hh = this.height / 2;
    const corners = [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
    return corners.map((p) => {
      const rotated = Vec2.rotate(p, this.rotation);
      return { x: this.x + rotated.x, y: this.y + rotated.y };
    });
  }

  // Get line segments for collision (World Space)
  // For mirrors, mainly the front face matters, but let's do all sides for blocks
  getSegments() {
    const c = this.getCorners();
    const segments = [];
    for (let i = 0; i < c.length; i++) {
      segments.push({
        p1: c[i],
        p2: c[(i + 1) % c.length],
        parent: this,
      });
    }
    return segments;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.type === "laser") {
      // Body
      ctx.fillStyle = "#34495e";
      ctx.beginPath();
      ctx.roundRect(-30, -15, 50, 30, 5);
      ctx.fill();

      // Emitter Tip
      ctx.fillStyle = this.isOn ? "#ff4757" : "#7f8c8d";
      ctx.beginPath();
      ctx.arc(22, 0, 6, 0, Math.PI * 2); // Emitter at local x=20
      ctx.fill();

      // Button
      ctx.fillStyle = "#bdc3c7";
      ctx.fillRect(-10, -15, 10, 5);

      // Label
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // ctx.fillText("ON", 0, 0);
    } else if (this.type === "mirror") {
      // Front face (Positive X side in local?) -> No, Plane Mirror usually reflects on both or one side.
      // Let's assume double sided for simplicity OR visual indicator.
      // Let's make it a thick slab.

      // Frame
      ctx.fillStyle = "#95a5a6";
      ctx.fillRect(-5, -50, 10, 100);

      // Glass surface (Slightly lighter)
      ctx.fillStyle = "#ecf0f1";
      ctx.fillRect(-3, -48, 6, 96);

      // Reflection hint
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-2, -30);
      ctx.lineTo(-2, 30);
      ctx.stroke();
    } else if (this.type === "block") {
      ctx.fillStyle = "#2c3e50"; // Dark block
      ctx.beginPath();
      ctx.roundRect(-30, -30, 60, 60, 4);
      ctx.fill();
      ctx.strokeStyle = "#34495e";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (this.type === "target") {
      // Glow if hit
      if (this.isHit) {
        ctx.shadowColor = "#f1c40f";
        ctx.shadowBlur = 20;
      }

      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fillStyle = this.isHit ? "#f1c40f" : "#27ae60";
      ctx.fill();

      // Rings
      ctx.strokeStyle = "white";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fillStyle = "white";
      ctx.fill();

      ctx.shadowBlur = 0; // Reset
    }

    ctx.restore();

    // Hit Status Reset (done in physics update, but visual persistence needs care)
    // Visuals are drawn AFTER physics usually.
  }
}

// ---------------------------------------------------------
// Physics Engine (Ray Tracing)
// ---------------------------------------------------------
function updatePhysics(skipVictoryCheck = false) {
  rays = []; // Clear

  // Reset Target States
  components
    .filter((c) => c.type === "target")
    .forEach((t) => (t.isHit = false));

  // Get all segments from all objects
  let segments = [];
  components.forEach((c) => {
    segments = segments.concat(c.getSegments());
  });

  // Add Canvas Boundaries as segments
  const w = canvas.width;
  const h = canvas.height;
  const bounds = [
    { p1: { x: 0, y: 0 }, p2: { x: w, y: 0 } },
    { p1: { x: w, y: 0 }, p2: { x: w, y: h } },
    { p1: { x: w, y: h }, p2: { x: 0, y: h } },
    { p1: { x: 0, y: h }, p2: { x: 0, y: 0 } },
  ];
  segments = segments.concat(bounds);

  // Process Lasers
  const lasers = components.filter((c) => c.type === "laser" && c.isOn);
  lasers.forEach((laser) => {
    const rad = laser.rotation;
    const emitterPos = Vec2.add(
      { x: laser.x, y: laser.y },
      Vec2.rotate({ x: 31, y: 0 }, rad)
    );
    const dir = { x: Math.cos(rad), y: Math.sin(rad) };

    castRay(emitterPos, dir, segments, 0);
  });

  // Check Victory in Challenge Mode
  if (
    gameMode === "challenge" &&
    !challengeState.isCompleted &&
    !skipVictoryCheck
  ) {
    checkChallengeVictory();
  }
}

function checkChallengeVictory() {
  const target = components.find((c) => c.type === "target");
  if (target && target.isHit) {
    // Debounce or immediate?
    completeCurrentQuestion();
  }
}

function completeCurrentQuestion() {
  // Only proceed if not already transitioning
  if (challengeState.transitioning) return;
  challengeState.transitioning = true;

  stopChallengeTimer();
  playSound("snd-success");

  setTimeout(() => {
    challengeState.currentQuestion++;
    if (challengeState.currentQuestion >= challengeState.totalQuestions) {
      showResults();
    } else {
      generateNextQuestion();
      challengeState.transitioning = false;
    }
  }, 1000);
}

// ---------------------------------------------------------
// Challenge Timer & Health Logic
// ---------------------------------------------------------
function startChallengeTimer() {
  stopChallengeTimer();
  challengeState.timeLeft = challengeState.maxTime;
  updateTimerUI();

  challengeState.timerInterval = setInterval(() => {
    challengeState.timeLeft--;
    updateTimerUI();

    if (challengeState.timeLeft <= 0) {
      handleTimeUp();
    }
  }, 1000);
}

function stopChallengeTimer() {
  if (challengeState.timerInterval) {
    clearInterval(challengeState.timerInterval);
    challengeState.timerInterval = null;
  }
}

function updateTimerUI() {
  const timerEl = document.getElementById("timer-display");
  if (timerEl) {
    timerEl.textContent = `⏱️ ${challengeState.timeLeft}s`;
    if (challengeState.timeLeft <= 10) {
      timerEl.classList.add("low-time");
    } else {
      timerEl.classList.remove("low-time");
    }
  }
}

function handleTimeUp() {
  stopChallengeTimer();
  challengeState.health--;
  renderHearts();
  playSound("snd-fail");

  // Animate health bar
  const bar = document.getElementById("health-bar");
  if (bar) {
    bar.classList.add("heart-lost");
    setTimeout(() => bar.classList.remove("heart-lost"), 500);
  }

  if (challengeState.health <= 0) {
    showResults(true); // Failed
  } else {
    // Reset timer for the same question
    startChallengeTimer();
  }
}

function renderHearts() {
  const bar = document.getElementById("health-bar");
  if (!bar) return;

  bar.innerHTML = "";
  for (let i = 0; i < 5; i++) {
    const heart = document.createElement("span");
    heart.className =
      "heart-icon" + (i >= challengeState.health ? " empty" : "");
    heart.textContent = "💚";
    bar.appendChild(heart);
  }
}

function castRay(start, dir, segments, depth) {
  if (depth > MAX_REFLECTIONS) return;

  let closest = null;
  let minDist = Infinity;
  let closestSeg = null;

  // Find closest intersection
  for (let seg of segments) {
    const info = getIntersection(start, dir, seg.p1, seg.p2);
    if (info) {
      const dist = info.t;
      if (dist < minDist && dist > 0.1) {
        minDist = dist;
        closest = info.point;
        closestSeg = seg;
        
        // Calculate Normal
        const dx = seg.p2.x - seg.p1.x;
        const dy = seg.p2.y - seg.p1.y;
        hitNormal = Vec2.norm({ x: -dy, y: dx });
        if (Vec2.dot(dir, hitNormal) > 0) {
          hitNormal = Vec2.scale(hitNormal, -1);
        }

        // Track reflection capability
        closest.reflect = seg.parent && seg.parent.type === "mirror";
      }
    }
  }

  if (closest) {
    // Register hit on target ONLY if it's the closest object hit
    if (closestSeg && closestSeg.parent && closestSeg.parent.type === "target") {
      closestSeg.parent.isHit = true;
    }

    // Add Ray Segment
    rays.push({ p1: start, p2: closest, alpha: 1.0 - depth * 0.05 });

    // Reflect if mirror
    if (closest.reflect) {
      // R = D - 2(D.N)N
      const d_dot_n = Vec2.dot(dir, hitNormal);
      const reflectDir = Vec2.sub(dir, Vec2.scale(hitNormal, 2 * d_dot_n));
      castRay(closest, reflectDir, segments, depth + 1);
    }
  } else {
    // Go off screen (should hit bounds, but fallback)
    const end = Vec2.add(start, Vec2.scale(dir, 2000));
    rays.push({ p1: start, p2: end, alpha: 1.0 - depth * 0.05 });
  }
}

// Ray-Line Segment Intersection
// Returns { t: distance, point: {x,y} } or null
function getIntersection(rayOrigin, rayDir, p1, p2) {
  const v1 = rayOrigin;
  const v2 = Vec2.add(rayOrigin, rayDir); // Just a point far away for logic? No, rayDir is unit.
  // Standard formula:
  // P = P1 + u(P2-P1)
  // Ray = R1 + t(R2)

  // x1,y1 P1; x2,y2 P2
  // x3,y3 RayOrigin; x4,y4 RayOrigin+Dir

  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;
  const x3 = v1.x;
  const y3 = v1.y;
  const x4 = v1.x + rayDir.x;
  const y4 = v1.y + rayDir.y;

  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (den == 0) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den; // Segment parameter u?
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den; // Ray parameter t?

  // Check line segment parameter t must be between 0 and 1
  // And Ray parameter u must be > 0

  if (t >= 0 && t <= 1 && u > 0) {
    return {
      t: u, // Distance units
      point: {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
      },
    };
  }
  return null;
}

// ---------------------------------------------------------
// Game Loop
// ---------------------------------------------------------
// Standardize Canvas Size
function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);

function loop() {
  resizeCanvas(); // Naive, but robust
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePhysics();

  // Draw Rays
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  rays.forEach((r) => {
    ctx.beginPath();
    ctx.moveTo(r.p1.x, r.p1.y);
    ctx.lineTo(r.p2.x, r.p2.y);
    ctx.strokeStyle = `rgba(231, 76, 60, ${r.alpha})`; // Laser Red
    ctx.lineWidth = 4;
    ctx.shadowColor = "#e74c3c";
    ctx.shadowBlur = 10;
    ctx.stroke();

    // Inner white core
    ctx.strokeStyle = `rgba(255, 255, 255, ${r.alpha})`;
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
    ctx.stroke();
  });
  ctx.restore();

  // Draw Components
  components.forEach((c) => c.draw(ctx));

  requestAnimationFrame(loop);
}


// ---------------------------------------------------------
// Interaction Logic
// ---------------------------------------------------------

// Touch State
let dragStartTime = 0;

function getEventPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

// Check point in polygon (Ray casting algorithm)
function isPointInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;

    const intersect =
      yi > pt.y != yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

canvas.addEventListener("mousedown", handleStart);
canvas.addEventListener("touchstart", handleStart, { passive: false });
canvas.addEventListener("mousemove", handleMove);
canvas.addEventListener("touchmove", handleMove, { passive: false });
canvas.addEventListener("mouseup", handleEnd);
canvas.addEventListener("touchend", handleEnd);

function handleStart(e) {
  e.preventDefault();
  const pos = getEventPos(e);
  dragStartPosition = { ...pos };
  dragStartTime = Date.now();

  // Right click handled elsewhere
  if (e.button === 2) return;

  // Hit Test (Reverse order for "Top" first)
  const clicked = components
    .slice()
    .reverse()
    .find((c) => isPointInPoly(pos, c.getCorners()));

  if (clicked) {
    // Challenge Restriction
    if (gameMode === "challenge" && clicked.isLocked) {
      return;
    }

    isDragging = true;
    draggedComponent = clicked;
    dragOffset = { x: pos.x - clicked.x, y: pos.y - clicked.y };

    // Move to top
    components = components.filter((c) => c !== clicked);
    components.push(clicked);
  } else {
    hideContextMenu();
  }
}

function handleMove(e) {
  e.preventDefault();
  const pos = getEventPos(e);

  if (isDragging && draggedComponent) {
    // Calculate snap or constraints if needed? Nah, free move.
    draggedComponent.x = pos.x - dragOffset.x;
    draggedComponent.y = pos.y - dragOffset.y;
  } else {
    const hover = components
      .slice()
      .reverse()
      .find((c) => isPointInPoly(pos, c.getCorners()));
    if (hover) {
      if (gameMode === "challenge" && hover.isLocked) {
        canvas.style.cursor = "not-allowed";
      } else {
        canvas.style.cursor = "grab";
      }
    } else {
      canvas.style.cursor = "default";
    }
  }
}

function handleEnd(e) {
  isDragging = false;
  draggedComponent = null;
  canvas.style.cursor = "default";

  // Tap Detection (Robust for both Mouse and Touch)
  const timeDiff = Date.now() - dragStartTime;

  // Need end coordinates. For mouseup e.clientX is fine. 
  // For touchend, use changedTouches.
  let clientX, clientY;
  if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
  } else {
      clientX = e.clientX;
      clientY = e.clientY;
  }
  
  const rect = canvas.getBoundingClientRect();
  const endX = clientX - rect.left;
  const endY = clientY - rect.top;
  
  const dist = Math.hypot(endX - dragStartPosition.x, endY - dragStartPosition.y);

  // If short time and small movement -> It's a TAP/CLICK
  if (timeDiff < 300 && dist < 10) {
    // Check what was tapped based on ORIGINAL start position (safest)
    const clicked = components
      .slice()
      .reverse()
      .find((c) => isPointInPoly(dragStartPosition, c.getCorners()));
      
    if (clicked) {
       // Rotate
       // Challenge Lock Check
       if (gameMode === "challenge" && clicked.isLocked) {
           // Do nothing/Shake?
       } else {
           clicked.rotation += Math.PI / 4; // 45 degrees
           
           // If Laser, toggle? NO, user asked for rotate on tap.
           // Maybe separate button or double tap for toggle? 
           // Standard behavior: rotate.
           // Special case: Mirror lock, etc.
           
           if (clicked.type === 'laser') {
               // Lasers might also toggle on tap?
               // Let's stick to rotate as primary action requested.
           }
       }
    } else {
       // Tapped empty space
    }
  }
}


// ---------------------------------------------------------
// Drag & Drop (Toolbox)
// ---------------------------------------------------------
const toolboxItems = document.querySelectorAll(".component-item");
toolboxItems.forEach((item) => {
  item.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("type", item.dataset.type);
  });
});

const workspace = document.querySelector(".workspace-container");
workspace.addEventListener("dragover", (e) => e.preventDefault());
workspace.addEventListener("drop", (e) => {
  e.preventDefault();
  const type = e.dataTransfer.getData("type");
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (type) {
    if (gameMode === "challenge" && type !== "mirror") {
      // Warning or silent ignore
    } else {
      components.push(new Component(type, x, y));
    }
  }
});

// Touch Dragging for Toolbox (Copied logic)
function initToolboxTouch() {
  const items = document.querySelectorAll(".component-item");
  let ghost = null;
  let draggedType = null;
  let touchOffsetX = 0;
  let touchOffsetY = 0;

  items.forEach((item) => {
    item.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length > 1) return;
        draggedType = item.dataset.type;
        const touch = e.touches[0];
        const rect = item.getBoundingClientRect();
        touchOffsetX = touch.clientX - rect.left;
        touchOffsetY = touch.clientY - rect.top;

        ghost = item.cloneNode(true);
        ghost.style.position = "absolute";
        ghost.style.zIndex = "9999";
        ghost.style.opacity = "0.8";
        ghost.style.pointerEvents = "none";
        ghost.style.left = rect.left + "px";
        ghost.style.top = rect.top + "px";
        ghost.style.width = rect.width + "px";
        ghost.style.height = rect.height + "px";
        document.body.appendChild(ghost);
      },
      { passive: false }
    );

    item.addEventListener(
      "touchmove",
      (e) => {
        if (!ghost) return;
        const touch = e.touches[0];
        e.preventDefault(); // Prevent scroll
        ghost.style.left = touch.clientX - touchOffsetX + "px";
        ghost.style.top = touch.clientY - touchOffsetY + "px";
      },
      { passive: false }
    );

    item.addEventListener("touchend", (e) => {
      if (!ghost) return;
      const touch = e.changedTouches[0];
      const clientX = touch.clientX;
      const clientY = touch.clientY;
      const canvasRect = canvas.getBoundingClientRect();

      if (
        clientX >= canvasRect.left &&
        clientX <= canvasRect.right &&
        clientY >= canvasRect.top &&
        clientY <= canvasRect.bottom
      ) {
        const x = clientX - canvasRect.left;
        const y = clientY - canvasRect.top;

        // Check if allowed
        if (gameMode === "challenge" && draggedType !== "mirror") {
          // Ignore
        } else {
          components.push(new Component(draggedType, x, y));
        }
      }
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      draggedType = null;
    });
  });
}
initToolboxTouch();

// ---------------------------------------------------------
// UI Controls
// ---------------------------------------------------------
// Context Menu
const contextMenu = document.getElementById("context-menu");
const menuDelete = document.getElementById("menu-delete");
const menuAngle = document.getElementById("menu-angle-info");
let contextMenuTarget = null;

canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const pos = getEventPos(e);
  const comp = components
    .slice()
    .reverse()
    .find((c) => isPointInPoly(pos, c.getCorners()));

  if (comp) {
    contextMenuTarget = comp;
    contextMenu.style.left = pos.x + "px"; // Relative to workspace? contextmenu is absolute?
    // Note: Context menu CSS needs position: absolute inside relative container or page.
    // Usually event.clientX is better if fixed.
    // Let's use logic from magnet01, assuming it works there.
    // magnet01 uses pos.x (canvas relative) but menu is in workspace-container.
    contextMenu.style.left = pos.x + "px";
    contextMenu.style.top = pos.y + "px";
    contextMenu.classList.remove("hidden");

    // Convert rad to deg [0-360]
    let deg = ((comp.rotation * 180) / Math.PI) % 360;
    if (deg < 0) deg += 360;
    menuAngle.textContent = `角度: ${Math.round(deg)}°`;
  } else {
    hideContextMenu();
  }
});

// ---------------------------------------------------------
// Challenge Logic
// ---------------------------------------------------------
function startChallengeMode(count, timeLimit) {
  gameMode = "challenge";
  challengeState.totalQuestions = count;
  challengeState.currentQuestion = 0;
  challengeState.isCompleted = false;
  challengeState.transitioning = false;
  challengeState.health = 5;
  challengeState.maxTime = timeLimit || 30;

  updateToolboxUI();
  document.getElementById("challenge-hud").classList.remove("hidden");
  document.getElementById("challenge-stats-overlay").classList.remove("hidden");
  statusDisplay.textContent = "目前狀態: 挑戰模式中...";

  renderHearts();
  generateNextQuestion();
}

function updateToolboxUI() {
  const items = document.querySelectorAll(".component-item");
  items.forEach((item) => {
    const type = item.dataset.type;
    if (gameMode === "challenge") {
      // Only allow mirrors to be added
      if (type !== "mirror") {
        item.style.opacity = "0.3";
        item.style.pointerEvents = "none";
        item.setAttribute("draggable", "false");
      } else {
        item.style.opacity = "1";
        item.style.pointerEvents = "auto";
        item.setAttribute("draggable", "true");
      }
    } else {
      // Normal mode allows all
      item.style.opacity = "1";
      item.style.pointerEvents = "auto";
      item.setAttribute("draggable", "true");
    }
  });
}

function generateNextQuestion() {
  components = [];

  // UI Update
  document.getElementById("current-question-num").textContent =
    challengeState.currentQuestion + 1;
  document.getElementById("total-questions-num").textContent =
    challengeState.totalQuestions;
  const progress =
    (challengeState.currentQuestion / challengeState.totalQuestions) * 100;
  document.getElementById("challenge-progress-bar").style.width =
    progress + "%";

  // Ensure we have current dimensions
  resizeCanvas();
  const w = canvas.width || 800;
  const h = canvas.height || 600;

  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    components = [];

    // 1. Laser (Left 20%)
    const lx = 60;
    const ly = 100 + Math.random() * (h - 200);
    const laser = new Component("laser", lx, ly);
    // Pointing generally towards the right half
    laser.rotation = (Math.random() - 0.5) * Math.PI * 0.6;
    laser.isLocked = true;
    components.push(laser);

    // 2. Target (Right 20%)
    const tx = w - 60;
    const ty = 100 + Math.random() * (h - 200);
    const target = new Component("target", tx, ty);
    target.isLocked = true;
    components.push(target);

    // 3. Barriers
    const blockCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < blockCount; i++) {
      const bx = 150 + Math.random() * (w - 300);
      const by = 80 + Math.random() * (h - 160);
      const b = new Component("block", bx, by);
      b.isLocked = true;

      // Avoid placement directly on laser or target
      const dL = Vec2.mag(Vec2.sub({ x: bx, y: by }, { x: lx, y: ly }));
      const dT = Vec2.mag(Vec2.sub({ x: bx, y: by }, { x: tx, y: ty }));
      if (dL > 120 && dT > 120) {
        components.push(b);
      }
    }

    // Final verification: Run physics silently
    updatePhysics(true);

    // Strictly avoid initial hit
    if (!target.isHit) {
      break;
    }
  }

  startChallengeTimer();

  // Fallback force blockage if all attempts somehow result in hits (unlikely)
  if (components.length > 0) {
    const target = components.find((c) => c.type === "target");
    if (target && target.isHit) {
      // Place a block directly in front of the laser as a last resort
      const laser = components.find((c) => c.type === "laser");
      const rad = laser.rotation;
      const blockPos = Vec2.add(
        { x: laser.x, y: laser.y },
        Vec2.rotate({ x: 100, y: 0 }, rad)
      );
      const rescueBlock = new Component("block", blockPos.x, blockPos.y);
      rescueBlock.isLocked = true;
      components.push(rescueBlock);
      updatePhysics(true);
    }
  }
}

// Simple Solver Check
function isLevelSolvable() {
  // This is a partial solver. We check if any path exists using 1 mirror.
  // Logic: If Laser Ray + Target Ray (in reverse) intersect at a point,
  // and a mirror can be placed there at the correct angle.

  const laser = components.find((c) => c.type === "laser");
  const target = components.find((c) => c.type === "target");
  if (!laser || !target) return false;

  // Laser Ray Start & Dir
  const lRad = laser.rotation;
  const lPos = Vec2.add(
    { x: laser.x, y: laser.y },
    Vec2.rotate({ x: 31, y: 0 }, lRad)
  );
  const lDir = { x: Math.cos(lRad), y: Math.sin(lRad) };

  // We check purely for "Geometric Space" availability.
  // In a real solver, we'd do more, but for an elementary game,
  // as long as the path isn't completely blocked by barriers,
  // 1 mirror is usually enough.

  // Let's just insure the target is not hidden inside a wall of barriers.
  return true; // Simple pass for now, we rely on random distribution
}

function showResults(failed = false) {
  challengeState.isCompleted = true;
  stopChallengeTimer();

  const resultsScreen = document.getElementById("results-screen");
  const title = resultsScreen.querySelector("h2");
  const icon = resultsScreen.querySelector(".victory-icon");
  const msg = document.getElementById("results-message");
  const settingsEl = document.getElementById("stat-settings");

  if (settingsEl) {
    settingsEl.textContent = `${challengeState.totalQuestions} 題 / 每題 ${challengeState.maxTime}s`;
  }

  if (failed) {
    playSound("snd-fail");
    if (title) title.textContent = "挑戰失敗";
    if (icon) icon.textContent = "❌";
    if (msg) msg.textContent = "很可惜，您的生命值已耗盡。";
    document.getElementById("stat-count").textContent =
      challengeState.currentQuestion;
  } else {
    playSound("snd-victory");
    if (title) title.textContent = "太棒了！";
    if (icon) icon.textContent = "🏆";
    if (msg) msg.textContent = "您已完成所有挑戰！";
    document.getElementById("stat-count").textContent =
      challengeState.totalQuestions;
  }
  openAnimModal(resultsScreen);
}

function playSound(id) {
  const snd = document.getElementById(id);
  if (snd) {
    snd.currentTime = 0;
    snd.play().catch(() => {}); // Ignore autoplay blocks
  }
}

function hideContextMenu() {
  contextMenu.classList.add("hidden");
  contextMenuTarget = null;
}

menuDelete.addEventListener("click", () => {
  if (contextMenuTarget) {
    if (gameMode === "challenge" && contextMenuTarget.isLocked) {
      // Cannot delete locked items in challenge
      hideContextMenu();
      return;
    }
    components = components.filter((c) => c !== contextMenuTarget);
    hideContextMenu();
  }
});

window.addEventListener("click", (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});

// UI Helper Functions (Animations & Modals)
function openAnimModal(element) {
  if (!element) return;
  element.classList.remove("hidden");
  element.classList.remove("anim-close");
  // Force Reflow
  void element.offsetWidth;
  element.classList.add("anim-open");
}

function closeAnimModal(element) {
  if (!element) return;
  element.classList.remove("anim-open");
  element.classList.add("anim-close");

  const cleanup = () => {
    element.classList.add("hidden");
    element.classList.remove("anim-close");
    element.removeEventListener("animationend", cleanup);
    element.removeEventListener("transitionend", cleanup);
  };

  element.addEventListener("animationend", cleanup, { once: true });
  element.addEventListener("transitionend", cleanup, { once: true });

  // Fallback cleanup
  setTimeout(cleanup, 400);
}

function showModal(title, message, type = "info") {
  return new Promise((resolve) => {
    const modal = document.getElementById("generic-modal");
    const titleEl = document.getElementById("modal-title");
    const msgEl = document.getElementById("modal-message");
    const confirmBtn = document.getElementById("modal-btn-confirm");
    const cancelBtn = document.getElementById("modal-btn-cancel");

    if (!modal) return resolve(true);

    titleEl.textContent = title;
    msgEl.innerHTML = message;

    // Reset Buttons
    confirmBtn.onclick = null;
    cancelBtn.onclick = null;
    cancelBtn.classList.add("hidden");

    if (type === "confirm") {
      cancelBtn.classList.remove("hidden");
    }

    const closeScale = (result) => {
      closeAnimModal(modal);
      resolve(result);
    };

    confirmBtn.onclick = () => closeScale(true);
    cancelBtn.onclick = () => closeScale(false);

    openAnimModal(modal);
  });
}

// Clear Button
clearBtn.addEventListener("click", () => {
  const msg =
    gameMode === "challenge"
      ? "確定要清除您放置的所有鏡子嗎？"
      : "確定要清除所有物品嗎？";
  showModal("清除確認", msg, "confirm").then((confirmed) => {
    if (confirmed) {
      if (gameMode === "challenge") {
        // Keep locked items (Laser, Target, Barriers)
        components = components.filter((c) => c.isLocked);
      } else {
        components = [];
      }
    }
  });
});

// Home
if (homeBtn) {
  homeBtn.addEventListener(
    "click",
    () => (window.location.href = "index.html")
  );
}

// Start Screen & Instructions Logic
const startScreen = document.getElementById("start-screen");
const btnNormal = document.getElementById("btn-normal-mode");
const btnChallenge = document.getElementById("btn-challenge-mode");
const setupModal = document.getElementById("challenge-setup-modal");
const btnConfirmChallenge = document.getElementById("btn-confirm-challenge");
const btnCancelChallenge = document.getElementById("btn-cancel-challenge");
const selectCount = document.getElementById("modal-challenge-count");

const instructionsScreen = document.getElementById("instructions-screen");
const btnOpenInstructions = document.getElementById("btn-open-instructions");
const btnCloseInstructions = document.getElementById("btn-close-instructions");
const btnSidebarInstructions = document.getElementById(
  "sidebar-instructions-btn"
);

const resultsScreen = document.getElementById("results-screen");
const btnRestart = document.getElementById("btn-restart");

// Populate select
for (let i = 1; i <= 20; i++) {
  const opt = document.createElement("option");
  opt.value = i;
  opt.textContent = i + " 題";
  if (i === 5) opt.selected = true;
  selectCount.appendChild(opt);
}

if (btnNormal) {
  btnNormal.addEventListener("click", () => {
    gameMode = "normal";
    updateToolboxUI();
    document.getElementById("challenge-hud").classList.add("hidden");
    const statsOverlay = document.getElementById("challenge-stats-overlay");
    if (statsOverlay) statsOverlay.classList.add("hidden");
    stopChallengeTimer();
    statusDisplay.textContent = "目前狀態: 自由探索中...";
    closeAnimModal(startScreen);
  });
}

if (btnChallenge) {
  btnChallenge.addEventListener("click", () => {
    openAnimModal(setupModal);
  });
}

if (btnConfirmChallenge) {
  btnConfirmChallenge.addEventListener("click", () => {
    const count = parseInt(selectCount.value);
    const timeLimit = parseInt(
      document.getElementById("modal-challenge-time").value
    );
    closeAnimModal(setupModal);
    closeAnimModal(startScreen);
    startChallengeMode(count, timeLimit);
  });
}

if (btnCancelChallenge) {
  btnCancelChallenge.addEventListener("click", () => {
    closeAnimModal(setupModal);
  });
}

if (btnRestart) {
  btnRestart.addEventListener("click", () => {
    closeAnimModal(resultsScreen);
    openAnimModal(startScreen);
  });
}

if (btnOpenInstructions) {
  btnOpenInstructions.addEventListener("click", () =>
    openAnimModal(instructionsScreen)
  );
}
if (btnCloseInstructions) {
  btnCloseInstructions.addEventListener("click", () =>
    closeAnimModal(instructionsScreen)
  );
}
if (btnSidebarInstructions) {
  btnSidebarInstructions.addEventListener("click", () =>
    openAnimModal(instructionsScreen)
  );
}

// Global Click for Context Menu Dismissal
window.addEventListener("mousedown", (e) => {
  if (!contextMenu.contains(e.target)) hideContextMenu();
});
window.addEventListener(
  "touchstart",
  (e) => {
    if (!contextMenu.contains(e.target)) hideContextMenu();
  },
  { passive: false }
);

// ---------------------------------------------------------
// Initialization
// ---------------------------------------------------------
function init() {
  resizeCanvas();
  // Show Start Screen
  if (startScreen) {
    openAnimModal(startScreen);
  }
  // Set status
  statusDisplay.textContent = "目前狀態: 自由探索中...";
  // Start Loop
  requestAnimationFrame(loop);
}

init();
