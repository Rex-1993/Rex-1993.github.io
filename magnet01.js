const canvas = document.getElementById("magnet-canvas");
const ctx = canvas.getContext("2d");
const statusDisplay = document.getElementById("status-display");
const clearBtn = document.getElementById("clear-btn");
const homeBtn = document.getElementById("home-btn");

// ---------------------------------------------------------
// Game State
// ---------------------------------------------------------
let components = [];

// Interaction State
let isDragging = false;
let draggedComponent = null;
let dragOffset = { x: 0, y: 0 };
let selectedComponent = null;

// Physics Constants
const MAGNETIC_CONSTANT = 15000; 
const DRAG = 0.90; // Linear damping
const ANGULAR_DRAG = 0.80; // Angular damping
const MAX_SPEED = 15;
const FIELD_LINE_DENSITY = 16; // Lines per pole (Doubled again)

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
  cross: (v1, v2) => v1.x * v2.y - v1.y * v2.x, // 2D cross product magnitude
  rotate: (v, angle) => ({
    x: v.x * Math.cos(angle) - v.y * Math.sin(angle),
    y: v.x * Math.sin(angle) + v.y * Math.cos(angle),
  }),
};

// ---------------------------------------------------------
// Components
// ---------------------------------------------------------
class Component {
  constructor(type, x, y) {
    this.id = Date.now() + Math.random();
    this.type = type;
    this.x = x;
    this.y = y;
    this.rotation = 0; // Radians
    
    // Physics Bodies
    this.vx = 0;
    this.vy = 0;
    this.angV = 0;
    this.mass = 1;
    this.momentInertia = 1000;
    this.isStatic = false; // For dragged items
    this.needleAngle = 0; // For compass needle independent rotation

    this.setSize();
  }

  setSize() {
    // Default size
    this.width = 60;
    this.height = 60;
    this.mass = 1;

    if (this.type === "bar_magnet") {
      this.width = 80;
      this.height = 40;
      this.mass = 10; // Much Heavier
    } else if (this.type === "iron_nail") {
      this.width = 80;
      this.height = 20;
      this.mass = 0.5;
    } else if (this.type === "compass") {
        this.width = 60;
        this.height = 60;
        this.mass = 1; // Lighter than magnet
    } else if (this.type === "key") {
        this.width = 60;
        this.height = 30;
        this.mass = 0.2; // Very Light
    } else if (this.type === "eraser") {
        this.width = 50;
        this.height = 30;
        this.mass = 0.5;
    } else if (this.type === "coin") {
        this.width = 40;
        this.height = 40;
        this.mass = 0.2; // Very Light
    }
  }

  // Get 4 corner points in world space
  getCorners() {
    const hw = this.width / 2;
    const hh = this.height / 2;
    
    // Local corners
    const corners = [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh }
    ];

    // Rotate and Translate
    return corners.map(p => {
        const rotated = Vec2.rotate(p, this.rotation);
        return { x: this.x + rotated.x, y: this.y + rotated.y };
    });
  }

  // Get Physics Poles (relative to center)
  getPoles() {
      // Return array of { type: 'N'|'S'|'I' (Induced), pos: {x,y}, strength }
      // Pos is WORLD coordinates
      if (this.type === "bar_magnet") {
          const hw = this.width / 2;
          // N is local Left (-x), S is local Right (+x) based on SVG
          const nPos = Vec2.rotate({ x: -hw + 10, y: 0 }, this.rotation);
          const sPos = Vec2.rotate({ x: hw - 10, y: 0 }, this.rotation);
          return [
              { type: 'N', pos: Vec2.add({x:this.x, y:this.y}, nPos), strength: 1 },
              { type: 'S', pos: Vec2.add({x:this.x, y:this.y}, sPos), strength: 1 }
          ];
      }
      return [];
  }
  
  getMaterialInfo() {
      switch(this.type) {
          case "bar_magnet": return "永久磁鐵";
          case "compass": return "磁性指針";
          case "iron_nail": return "鐵 (磁性物質)";
          case "key": return "鐵 (磁性物質)";
          case "coin": return "銅 (非磁性)";
          case "eraser": return "橡膠 (非磁性)";
          default: return "未知";
      }
  }

  applyForce(force, worldPoint) {
      if (this.isStatic) return;

      // F = ma -> a = F/m (Directly add to velocity for simplicity in loop)
      this.vx += force.x / this.mass;
      this.vy += force.y / this.mass;

      // Torque = r x F
      const r = Vec2.sub(worldPoint, {x: this.x, y: this.y});
      const torque = r.x * force.y - r.y * force.x;
      this.angV += torque / this.momentInertia;
  }

  draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);
    // Draw visual items
    ctx.rotate(this.rotation);

    if (this.type === "bar_magnet") {
        const w = this.width;
        const h = this.height;
        const hw = w/2;
        const hh = h/2;

        ctx.strokeStyle = "#2c3e50";
        ctx.lineWidth = 2;

        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.1)";
        ctx.fillRect(-hw + 3, -hh + 3, w, h);

        // N Pole (Left half)
        ctx.fillStyle = "#ff4757";
        ctx.fillRect(-hw, -hh, hw, h);
        
        // S Pole (Right half)
        ctx.fillStyle = "#3498db";
        ctx.fillRect(0, -hh, hw, h);
        
        ctx.strokeRect(-hw, -hh, w, h);

        // Text
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        // To ensure text is upright relative to the magnet body (so it rotates with it)
        // Draw N
        ctx.save();
        ctx.translate(-w/4, 0); 
        // If we want text to always be upright relative to screen, we counter-rotate
        // ctx.rotate(-this.rotation); 
        // But user asked to fix "text overflow", implying static text inside box is preferred.
        // Let's keep text attached to block.
        ctx.fillText("N", 0, 0);
        ctx.restore();

        ctx.save();
        ctx.translate(w/4, 0);
        ctx.fillText("S", 0, 0);
        ctx.restore();

    } else if (this.type === "compass") {
        // Body
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, Math.PI * 2);
        ctx.fillStyle = "#f5f6fa";
        ctx.fill();
        ctx.strokeStyle = "#7f8c8d";
        ctx.lineWidth = 4;
        ctx.stroke();

        // Needle
        ctx.save();
        // Rotate needle to absolute field direction
        // We are currently in body local space (rotated by this.rotation)
        // We want needle to be at this.needleAngle
        // So we rotate by (needleAngle - bodyRotation)
        
        // However, this.needleAngle is absolute angle.
        // Current context rotation is this.rotation.
        // So we rotate by:
        const relAngle = this.needleAngle - this.rotation;
        ctx.rotate(relAngle);
        
        // N tip (Red) points to Local Right (+x) which corresponds to Angle 0
        // S tip points to Local Left (-x)
        
        ctx.beginPath();
        ctx.moveTo(25, 0);
        ctx.lineTo(-5, 10);
        ctx.lineTo(-5, -10);
        ctx.fillStyle = "#ff4757"; // N
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(-25, 0);
        ctx.lineTo(5, 10);
        ctx.lineTo(5, -10);
        ctx.fillStyle = "#bdc3c7"; // S
        ctx.fill();
        
        ctx.fillStyle = "#c0392b";
        ctx.beginPath();
        ctx.arc(0,0,3,0,Math.PI*2);
        ctx.fill();
        
        ctx.restore();

        // Glass reflection
        ctx.rotate(-this.rotation); // Reset rotation for light source consistency? No, keep it simple.
        ctx.beginPath();
        ctx.arc(-8, -8, 8, 0, Math.PI*2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();

    } else if (this.type === "iron_nail") {
        const w = this.width;
        // Simple shape
        ctx.fillStyle = "#95a5a6";
        ctx.fillRect(-w/2, -4, w, 8); // Shaft
        ctx.fillRect(-w/2, -8, 6, 16); // Head
        ctx.beginPath();
        ctx.moveTo(w/2, -4);
        ctx.lineTo(w/2 + 10, 0);
        ctx.lineTo(w/2, 4);
        ctx.fill();

    } else if (this.type === "key") {
       ctx.fillStyle = "#bdc3c7";
       ctx.beginPath();
       ctx.arc(-20, 0, 15, 0, Math.PI*2); // Head
       ctx.rect(-10, -4, 40, 8); // Shaft
       ctx.rect(15, 4, 6, 8); // Teeth
       ctx.rect(25, 4, 6, 6);
       ctx.fill();
       // Hole
       ctx.globalCompositeOperation = "destination-out";
       ctx.beginPath();
       ctx.arc(-20, 0, 5, 0, Math.PI*2);
       ctx.fill();
       ctx.globalCompositeOperation = "source-over";

    } else if (this.type === "coin") {
      // Gold Coin - Radial Gradient
      const coinGrad = ctx.createRadialGradient(-10, -10, 5, 0, 0, 25);
      coinGrad.addColorStop(0, "#f1c40f"); // Light gold
      coinGrad.addColorStop(0.7, "#f39c12"); // Darker gold
      coinGrad.addColorStop(1, "#d35400"); // Edge
      
      ctx.beginPath();
      ctx.arc(0, 0, 25, 0, Math.PI * 2);
      ctx.fillStyle = coinGrad;
      ctx.fill();
      ctx.strokeStyle = "#d35400";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner Grove
      ctx.beginPath();
      ctx.arc(0, 0, 20, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(0,0,0,0.1)";
      ctx.stroke();

      // Value
      ctx.fillStyle = "#d35400";
      ctx.font = "bold 20px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$50", 0, 1);
    } else if (this.type === "eraser") {
        ctx.fillStyle = "white";
        ctx.fillRect(-25, -15, 50, 30);
        ctx.strokeStyle = "#bdc3c7";
        ctx.strokeRect(-25, -15, 50, 30);
        ctx.fillStyle = "#3498db";
        ctx.fillRect(-25, -15, 20, 30); // Sleeve
    }

    ctx.restore();
  }
}

// ---------------------------------------------------------
// Physics Engine (Rigid Body + Magnetic + Collision)
// ---------------------------------------------------------
function updatePhysics() {
    // 1. Reset Dragged Object
    // If dragging, we control position directly, so zero velocity
    if (draggedComponent) {
        draggedComponent.isStatic = true;
        draggedComponent.vx = 0;
        draggedComponent.vy = 0;
        draggedComponent.angV = 0;
    }

    // 2. Identify Magnets and Magnetic Objects
    const magnets = components.filter(c => c.type === "bar_magnet");
    const magneticObjects = components.filter(c => 
        ["bar_magnet", "iron_nail", "key", "compass"].includes(c.type)
    );

    // 3. Magnetic Forces
    // We treat 'bar_magnet' as having hard poles. 
    // Iron/Key treated as induced dipoles.
    // Compass: NO FORCE on body, just update needle angle.

    // 3a. Update Compass Needles
    const compasses = components.filter(c => c.type === "compass");
    compasses.forEach(comp => {
        let B = {x: 0, y: 0};
        // Sum field from all magnets
        magnets.forEach(m => {
            if (m === comp) return;
            const poles = m.getPoles();
            poles.forEach(p => {
                const r = Vec2.sub({x:comp.x, y:comp.y}, p.pos);
                const dSq = r.x*r.x + r.y*r.y;
                const d = Math.sqrt(dSq);
                if (d < 10) return;
                
                // Field points AWAY from N, TOWARDS S
                // B = k * q / r^2 * r_hat
                const q = p.type === 'N' ? 1 : -1;
                const dir = Vec2.scale(r, 1/d);
                const mag = (q * MAGNETIC_CONSTANT) / dSq;
                B = Vec2.add(B, Vec2.scale(dir, mag));
            });
        });
        
        // If B is significant, align needle
        if (Vec2.mag(B) > 0.1) {
            comp.needleAngle = Math.atan2(B.y, B.x);
        }
    });

    magnets.forEach(magnet => {
        const mPoles = magnet.getPoles(); // [N, S]

        magneticObjects.forEach(obj => {
            if (magnet === obj) return;
            if (obj.type === "compass") return; // Skip compass physics interaction

            // Define points on the object to apply force
            let points = []; 
            if (obj.type === "bar_magnet") {
                 // Permanent Dipoles
                 // Compass logic handled above separately
                 const objPoles = obj.getPoles();
                
                 mPoles.forEach(p1 => {
                     objPoles.forEach(p2 => {
                         // Force between p1 (source) and p2 (target)
                         const r = Vec2.sub(p1.pos, p2.pos);
                         const distSq = r.x*r.x + r.y*r.y;
                         let dist = Math.sqrt(distSq);
                         
                         // Fix Singularity: Clamp Minimum Distance
                         // Instead of returning 0 force (which causes oscillation), hold max force.
                         dist = Math.max(dist, 15); 
                         const clampedDistSq = dist * dist;

                         if (dist > 300) return; // Optimization range

                         // Coulomb-like force
                         const q1 = p1.type === 'N' ? 1 : -1;
                         const q2 = p2.type === 'N' ? 1 : -1;
                         const strength = MAGNETIC_CONSTANT; 

                         let forceMag = (q1 * q2 * strength) / clampedDistSq;
                         
                         // Force Drop-off (Soft Equilibrium)
                         // Ramp force down to 0 at contact (15px) to prevent fighting collision solver
                         // Range: 15px (0%) to 40px (100%)
                         if (dist < 40) {
                            let ramp = (dist - 15) / 25;
                            if (ramp < 0) ramp = 0;
                            forceMag *= ramp;
                         }

                         // Clamp Maximum Force (Prevent Explosion)
                         const MAX_FORCE = 2000;
                         if (forceMag > MAX_FORCE) forceMag = MAX_FORCE;
                         if (forceMag < -MAX_FORCE) forceMag = -MAX_FORCE;

                         const dir = Vec2.norm(Vec2.sub(p2.pos, p1.pos)); // Away vector
                         
                         const force = Vec2.scale(dir, forceMag);
                         
                         obj.applyForce(force, p2.pos);
                         // Newton's 3rd law: Apply opposite force to magnet?
                         // Yes, if magnet is not static (dragged).
                         if (!magnet.isStatic) {
                             // Dampen reaction if object is much lighter than magnet (prevent nail pushing magnet)
                             const massRatio = obj.mass / magnet.mass;
                             let reactionScale = 1.0;
                             if (massRatio < 0.1) reactionScale = 0.0; // DISBALED: Light objects don't move heavy magnets

                             if (reactionScale > 0) {
                                magnet.applyForce(Vec2.scale(force, -1 * reactionScale), p1.pos);
                             }
                         }
                     });
                 });

            } else { // Iron/Key
                // Soft Magnetic Materials (Nail, Key)
                // Just attracted to both poles of the magnet
                // Attract center or ends? Ends allow rotation/alignment.
                // Let's simulate 2 points at ends of the nail
                const len = obj.width / 2;
                const end1 = Vec2.add({x:obj.x, y:obj.y}, Vec2.rotate({x:-len, y:0}, obj.rotation));
                const end2 = Vec2.add({x:obj.x, y:obj.y}, Vec2.rotate({x:len, y:0}, obj.rotation));
                
                [end1, end2].forEach(pt => {
                    mPoles.forEach(pole => {
                        const r = Vec2.sub(pt, pole.pos); // Vector from Pole to Point
                        const distSq = r.x*r.x + r.y*r.y;
                        if (distSq < 100 || distSq > 60000) return;
                        
                        // Always attraction
                        const forceMag = -1 * (MAGNETIC_CONSTANT * 0.5) / distSq; // Negative = Towards pole
                        const dir = Vec2.norm(Vec2.sub(pt, pole.pos)); // Away vector
                        const force = Vec2.scale(dir, forceMag);
                        
                        obj.applyForce(force, pt);
                    });
                });
            }
        });
    });

    // 4. Update Motion
    components.forEach(c => {
        if (c.isStatic) return;

        // Static Friction Simulation (Aggressive damping at low speeds)
        const currentSpeed = Math.sqrt(c.vx*c.vx + c.vy*c.vy);
        if (currentSpeed < 2.0) {
             c.vx *= 0.80; // Stronger drag (Static friction feel)
             c.vy *= 0.80;
             c.angV *= 0.80;
        } else {
             c.vx *= DRAG;
             c.vy *= DRAG;
             c.angV *= ANGULAR_DRAG;
        }

        // Sleep Threshold (Prevent Jitter)
        let speed = Math.sqrt(c.vx*c.vx + c.vy*c.vy);
        if (speed < 0.2 && Math.abs(c.angV) < 0.05) {
            c.vx = 0;
            c.vy = 0;
            c.angV = 0;
        }

        // Cap speed
        speed = Math.sqrt(c.vx*c.vx + c.vy*c.vy);
        if (speed > MAX_SPEED) {
            c.vx = (c.vx / speed) * MAX_SPEED;
            c.vy = (c.vy / speed) * MAX_SPEED;
        }

        c.x += c.vx;
        c.y += c.vy;
        c.rotation += c.angV;
        
        // Bounds Check (Bounce off walls)
        const margin = 20;
        if (c.x < margin) { c.x = margin; c.vx *= -0.5; }
        if (c.x > canvas.width - margin) { c.x = canvas.width - margin; c.vx *= -0.5; }
        if (c.y < margin) { c.y = margin; c.vy *= -0.5; }
        if (c.y > canvas.height - margin) { c.y = canvas.height - margin; c.vy *= -0.5; }
    });

    // 5. Check Collisions (Iterative Impulse Solver or Positional Correction)
    // Using SAT (Separating Axis Theorem) for OBBs
    const iterations = 2; // Stability
    for(let k=0; k<iterations; k++) {
        for (let i = 0; i < components.length; i++) {
            for (let j = i + 1; j < components.length; j++) {
                resolveCollision(components[i], components[j]);
            }
        }
    }
}

// SAT Collision Resolver
function resolveCollision(c1, c2) {
    if (c1.isStatic && c2.isStatic) return; // Both locked (dragging 2 things? multiple touch?)

    const poly1 = c1.getCorners();
    const poly2 = c2.getCorners();

    const result = satTest(poly1, poly2);
    if (result) {
        // Collision detected
        // result = { overlap, axis (normalized) }
        // Seperate them based on mass
        // If one is static (dragged), move the other fully.
        // Seperate them based on mass
        // If one is static (dragged), move the other fully.
        const totalMass = (c1.isStatic ? 10000 : c1.mass) + (c2.isStatic ? 10000 : c2.mass);
        
        let m1Ratio = c1.isStatic ? 0 : c2.mass / totalMass; 
        let m2Ratio = c2.isStatic ? 0 : c1.mass / totalMass;

        // Infinite Mass Logic (Positional)
        // If c1 is heavy, m1Ratio -> 0
        if (c1.mass / c2.mass > 10 && !c1.isStatic) { m1Ratio = 0; m2Ratio = 1; }
        if (c2.mass / c1.mass > 10 && !c2.isStatic) { m2Ratio = 0; m1Ratio = 1; }

        // Separation Vector
        const sep = Vec2.scale(result.axis, result.overlap);
        
        // Direction check: Axis points from poly2 to poly1? SAT impl dependent.
        // We need to ensure we push them APART.
        const centerDiff = Vec2.sub({x: c1.x, y: c1.y}, {x: c2.x, y: c2.y});
        if (Vec2.dot(sep, centerDiff) < 0) {
            // Sep vector is pointing opposite to center diff, flip it
            sep.x *= -1;
            sep.y *= -1;
        }

        // Soft Positional Correction (Baumgarte Stabilization)
        // If welding (relSpeed < 3.0), DISABLE separation to allow equilibrium
        const approxRelSpeed = Vec2.mag(Vec2.sub({x: c1.vx, y: c1.vy}, {x: c2.vx, y: c2.vy}));
        let correctionFactor = 1.0;
        if (approxRelSpeed < 3.0) correctionFactor = 0.0; // Zero separation for welds (Stop Jitter)

        if (!c1.isStatic) {
            c1.x += sep.x * m1Ratio * correctionFactor;
            c1.y += sep.y * m1Ratio * correctionFactor;
        }
        if (!c2.isStatic) {
            c2.x -= sep.x * m2Ratio * correctionFactor;
            c2.y -= sep.y * m2Ratio * correctionFactor;
        }

        // --- Impulse Resolution (Momentum) ---
        const normal = Vec2.norm(sep);
        
        // Relative velocity
        const rv = Vec2.sub(
            {x: c1.vx, y: c1.vy},
            {x: c2.vx, y: c2.vy}
        );

        // Velocity along normal
        const velAlongNormal = Vec2.dot(rv, normal);

        // --- Velocity Weld (Magnetic Locking) ---
        // If relative velocity is low (contact/sticking), force common velocity to stop jitter
        const relSpeed = Vec2.mag(rv);
        if (relSpeed < 3.0) {
            // Calculate Common Velocity (Weighted by Mass)
            // Enforce Infinite Mass in Velocity Calculation too
            const m1 = c1.isStatic ? 100000 : c1.mass;
            const m2 = c2.isStatic ? 100000 : c2.mass;
            
            let commonVx, commonVy;

            // Strict dominance for heavy objects
            if (m1 / m2 > 10) {
                commonVx = c1.vx;
                commonVy = c1.vy;
            } else if (m2 / m1 > 10) {
                commonVx = c2.vx;
                commonVy = c2.vy;
            } else {
                // Weighted Average
                const totalM = m1 + m2;
                commonVx = (c1.vx * m1 + c2.vx * m2) / totalM;
                commonVy = (c1.vy * m1 + c2.vy * m2) / totalM;
            }

            if (!c1.isStatic) {
                // If c1 is heavy, commonV is c1.vx, so this changes nothing (good)
                // If c1 is light, it sets c1 to c2's speed (good)
                c1.vx = commonVx;
                c1.vy = commonVy;
                c1.angV = 0; // Kill rotation to lock
            }
            if (!c2.isStatic) {
                c2.vx = commonVx;
                c2.vy = commonVy;
                c2.angV = 0; // Kill rotation to lock
            }
            return; // Skip standard bounce/friction
        }

        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return;

        // Restitution (bounciness)
        let e = 0.2; 
        
        // Adaptive Restitution (Stop micro-bouncing)
        if (velAlongNormal > -1.0) {
            e = 0;
        } 
        
        // Impulse scalar
        let j = -(1 + e) * velAlongNormal; 
        
        // Inverse mass sum
        let invMass1 = c1.isStatic ? 0 : 1 / c1.mass;
        let invMass2 = c2.isStatic ? 0 : 1 / c2.mass;
        
        // Infinite Mass Logic (Hard Constraint for Heavy vs Light)
        const ratio = c1.mass / c2.mass;
        if (ratio > 10) invMass1 = 0; // c1 is much heavier, treat as static relative to c2
        if (ratio < 0.1) invMass2 = 0; // c2 is much heavier, treat as static relative to c1

        // Avoid divide by zero if both static (should be handled start of function, but safe check)
        if (invMass1 + invMass2 === 0) return;

        j /= (invMass1 + invMass2);

        // Apply impulse
        const impulse = Vec2.scale(normal, j);
        
        // --- Friction Impulse (Tangential) ---
        // Tangent vector: Perpendicular to normal
        let tangent = Vec2.sub(rv, Vec2.scale(normal, Vec2.dot(rv, normal)));
        tangent = Vec2.norm(tangent);

        // Solve for tangent impulse magnitude
        let jt = -Vec2.dot(rv, tangent);
        jt /= (invMass1 + invMass2);

        // Coulomb's Law: Friction cannot exceed normal Force * mu
        const mu = 0.3; // Friction coefficient
        if (Math.abs(jt) < j * mu) {
            // Static friction case (stick) - not fully handled here, treat as dynamic
             // jt = jt;
        } else {
            // Dynamic friction (slide)
             jt = -j * mu;
        }
        
        // Total Impulse including Friction
        // Apply Normal Impulse
        if (!c1.isStatic) {
            c1.vx += impulse.x * invMass1;
            c1.vy += impulse.y * invMass1;
        }
        if (!c2.isStatic) {
            c2.vx -= impulse.x * invMass2;
            c2.vy -= impulse.y * invMass2;
        }

        // Apply Friction Impulse
        const frictionImpulse = Vec2.scale(tangent, jt * 0.5); // Tune factor
         if (!c1.isStatic) {
            c1.vx += frictionImpulse.x * invMass1;
            c1.vy += frictionImpulse.y * invMass1;
        }
        if (!c2.isStatic) {
            c2.vx -= frictionImpulse.x * invMass2;
            c2.vy -= frictionImpulse.y * invMass2;
        }
    }
}

// Separating Axis Theorem Implementation
function satTest(poly1, poly2) {
    let overlap = Infinity;
    let bestAxis = null;

    // Get axes to test (normals of all edges)
    const axes = [...getAxes(poly1), ...getAxes(poly2)];

    for (let axis of axes) {
        const p1Proj = project(poly1, axis);
        const p2Proj = project(poly2, axis);

        if (!overlaps(p1Proj, p2Proj)) {
            return null; // Separating axis found, no collision
        } else {
            // Check overlap amount
            const o = getOverlap(p1Proj, p2Proj);
            if (o < overlap) {
                overlap = o;
                bestAxis = axis;
            }
        }
    }
    return { overlap, axis: bestAxis };
}

function getAxes(poly) {
    const axes = [];
    for (let i = 0; i < poly.length; i++) {
        const p1 = poly[i];
        const p2 = poly[(i + 1) % poly.length];
        const edge = Vec2.sub(p2, p1);
        const normal = Vec2.norm({ x: -edge.y, y: edge.x }); // Perpendicular
        axes.push(normal);
    }
    return axes;
}

function project(poly, axis) {
    let min = Infinity;
    let max = -Infinity;
    for (let p of poly) {
        const dot = Vec2.dot(p, axis);
        if (dot < min) min = dot;
        if (dot > max) max = dot;
    }
    return { min, max };
}

function overlaps(p1, p2) {
    return p1.max >= p2.min && p2.max >= p1.min;
}

function getOverlap(p1, p2) {
    return Math.min(p1.max, p2.max) - Math.max(p1.min, p2.min);
}

// ---------------------------------------------------------
// Field Visualization
// ---------------------------------------------------------
function drawFieldLines(ctx) {
    const magnets = components.filter(c => c.type === "bar_magnet");
    if (magnets.length === 0) return;

    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#7f8c8d";

    magnets.forEach(m => {
        const startPoints = []; // { pos: {x,y}, type: 'N'|'S' }
        const w = m.width, h = m.height;
        
        // N Pole Seeds (Trace Forward)
        for(let i=-2; i<=2; i++) {
            const localY = i * (h/5);
            const pos = Vec2.add({x:m.x, y:m.y}, Vec2.rotate({x: -w/2, y: localY}, m.rotation));
            startPoints.push({ pos, dirMult: 1 });
        }

        // S Pole Seeds (Trace Backward)
        // Ensure lines entering S pole are also drawn
        for(let i=-2; i<=2; i++) {
            const localY = i * (h/5);
            const pos = Vec2.add({x:m.x, y:m.y}, Vec2.rotate({x: w/2, y: localY}, m.rotation));
            startPoints.push({ pos, dirMult: -1 });
        }

        startPoints.forEach(sp => {
            let curr = { ...sp.pos };
            ctx.beginPath();
            ctx.moveTo(curr.x, curr.y);
            
            // Trace line
            for(let step=0; step<100; step++) {
                // Calculate Field Vector B at curr
                let B = {x:0, y:0};
                
                // Sum contributions from ALL poles of ALL magnets
                magnets.forEach(m2 => {
                   const pp = m2.getPoles();
                   pp.forEach(pole => {
                       const r = Vec2.sub(curr, pole.pos);
                       const dSq = r.x*r.x + r.y*r.y;
                       const d = Math.sqrt(dSq);
                       if (d < 10) return; // Too close
                       
                       // Field points AWAY from N, TOWARDS S
                       const dir = Vec2.scale(r, 1/d); // Unit vector R
                       const mag = (pole.type === 'N' ? 1 : -1) / dSq;
                       
                       B = Vec2.add(B, Vec2.scale(dir, mag * 20000));
                   });
                });
                
                const bMag = Vec2.mag(B);
                if (bMag < 0.1) break; 
                
                // Direction: Normal for N seeds, Reversed for S seeds
                const dir = Vec2.scale(Vec2.norm(B), sp.dirMult);
                
                curr = Vec2.add(curr, Vec2.scale(dir, 10)); // Step size
                ctx.lineTo(curr.x, curr.y);
                
                // Stop if hitting another magnet body? (Optional)
            }
            ctx.stroke();
        });
    });

    ctx.restore();
}

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
function init() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
  
  // Show Start Screen Anims
  const ss = document.getElementById("start-screen");
  if(ss) openAnimModal(ss);

  requestAnimationFrame(loop);
}

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}

function loop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  updatePhysics();

  drawFieldLines(ctx);
  
  components.forEach((c) => c.draw(ctx));

  requestAnimationFrame(loop);
}


// ---------------------------------------------------------
// Interaction Logic
// ---------------------------------------------------------

// Touch State
let dragStartTime = 0;
let longPressTimer = null;
const LONG_PRESS_DURATION = 800; // 0.8 seconds

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
canvas.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  const pos = getEventPos(e);
  const clicked = components
    .slice()
    .reverse()
    .find((c) => isPointInPoly(pos, c.getCorners()));

  if (clicked) {
    showContextMenu(pos.x, pos.y, clicked);
  } else {
    hideContextMenu();
  }
});

function handleStart(e) {
  e.preventDefault();
  const pos = getEventPos(e);
  dragOffset = { x: 0, y: 0 }; // Reset
  
  // Right click handled natively by contextmenu event, but we can also catch it here if we want custom logic
  if (e.button === 2) return; 

  const clicked = components
    .slice()
    .reverse()
    .find((c) => isPointInPoly(pos, c.getCorners()));

  if (clicked) {
    dragStartTime = Date.now();
    dragStartPosition = { ...pos };
    isDragging = true;
    draggedComponent = clicked;
    dragOffset = { x: pos.x - clicked.x, y: pos.y - clicked.y };

    // Move to top
    components = components.filter((c) => c !== clicked);
    components.push(clicked);
    
    // Start Long Press Timer
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = setTimeout(() => {
        // Long press triggered!
        isDragging = false; // Cancel drag
        draggedComponent = null;
        showContextMenu(pos.x, pos.y, clicked);
    }, LONG_PRESS_DURATION);

  } else {
    hideContextMenu();
  }
}

function handleMove(e) {
  e.preventDefault();
  const pos = getEventPos(e);

  // If moved significantly, cancel long press
  if (longPressTimer && isDragging) {
      const dist = Math.hypot(pos.x - dragStartPosition.x, pos.y - dragStartPosition.y);
      if (dist > 10) {
          clearTimeout(longPressTimer);
          longPressTimer = null;
      }
  }

  if (isDragging && draggedComponent) {
    draggedComponent.x = pos.x - dragOffset.x;
    draggedComponent.y = pos.y - dragOffset.y;
    draggedComponent.vx = 0;
    draggedComponent.vy = 0;
  } else {
      // Hover effect logic
      const hover = components
      .slice()
      .reverse()
      .find((c) => isPointInPoly(pos, c.getCorners()));
      canvas.style.cursor = hover ? "grab" : "default";
  }
}

function handleEnd(e) {
  // Cancel long press if it hasn't fired yet
  if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
  }

  isDragging = false;
  
  if (draggedComponent) {
      draggedComponent.isStatic = false; // Physics resumes
      draggedComponent = null;
  }
  
  canvas.style.cursor = "default";

  // Tap Detection logic (if needed for rotation etc)
  const timeDiff = Date.now() - dragStartTime;
  // ... existing tap logic ...
  // Note: We might want to separate tap logic if it conflicts with long press, 
  // but since long press cancels itself on move/up, standard click is fine.
  
  // Determine end position for click detection
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

  if (timeDiff < 300 && dist < 10) {
      // It's a tap
      const clicked = components
        .slice()
        .reverse()
        .find((c) => isPointInPoly(dragStartPosition, c.getCorners()));
       
      if (clicked) {
          clicked.rotation += Math.PI / 4;
      }
  }
}

// ---------------------------------------------------------
// Drag & Drop (Toolbox) - Mouse
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
    components.push(new Component(type, x, y));
  }
});

// ---------------------------------------------------------
// Drag & Drop (Toolbox) - Touch Polyfill
// ---------------------------------------------------------
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

        // Create Ghost
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

      // Check if dropped inside canvas
      if (
        clientX >= canvasRect.left &&
        clientX <= canvasRect.right &&
        clientY >= canvasRect.top &&
        clientY <= canvasRect.bottom
      ) {
        const x = clientX - canvasRect.left;
        const y = clientY - canvasRect.top;

        if (draggedType) {
          components.push(new Component(draggedType, x, y));
        }
      }
      
      // Cleanup
      if (ghost && ghost.parentNode) ghost.parentNode.removeChild(ghost);
      ghost = null;
      draggedType = null;
    });
  });
}
initToolboxTouch();


// ---------------------------------------------------------
// UI Helper Functions (Animations & Modals)
// ---------------------------------------------------------
function showModal(title, message, type = "info") {
  return new Promise((resolve) => {
    const modal = document.getElementById("generic-modal");
    const titleEl = document.getElementById("modal-title");
    const msgEl = document.getElementById("modal-message");
    const confirmBtn = document.getElementById("modal-btn-confirm");
    const cancelBtn = document.getElementById("modal-btn-cancel");

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

function openAnimModal(element) {
  element.classList.remove("hidden");
  element.classList.remove("anim-close");
  // Force Reflow
  void element.offsetWidth;
  element.classList.add("anim-open");
}

function closeAnimModal(element) {
  element.classList.remove("anim-open");
  element.classList.add("anim-close");

  // Wait for animation to finish before adding hidden
  element.addEventListener(
    "animationend",
    () => {
      if (element.classList.contains("anim-close")) {
        element.classList.add("hidden");
        element.classList.remove("anim-close");
      }
    },
    { once: true }
  );

  // Fallback
  setTimeout(() => {
    if (!element.classList.contains("hidden")) {
      element.classList.add("hidden");
    }
  }, 350);
}

// UI Controls
clearBtn.addEventListener("click", () => {
    showModal("清除確認", "確定要清除所有物品嗎？", "confirm").then((confirmed) => {
        if (confirmed) {
            components = [];
        }
    });
});

if (homeBtn) {
    homeBtn.addEventListener("click", () => {
        window.location.href = "index.html";
    });
}

// Start Screen
const startScreen = document.getElementById("start-screen");
const btnNormalMode = document.getElementById("btn-normal-mode");
const btnOpenInstructions = document.getElementById("btn-open-instructions");
const instructionsScreen = document.getElementById("instructions-screen");
const btnCloseInstructions = document.getElementById("btn-close-instructions");
const btnSidebarInstructions = document.getElementById("sidebar-instructions-btn");

if (btnNormalMode) {
    btnNormalMode.addEventListener("click", () => {
        closeAnimModal(startScreen);
    });
}

function showInstructions() {
    openAnimModal(instructionsScreen);
}

function hideInstructions() {
    closeAnimModal(instructionsScreen);
}

if (btnOpenInstructions) btnOpenInstructions.addEventListener("click", showInstructions);
if (btnCloseInstructions) btnCloseInstructions.addEventListener("click", hideInstructions);
if (btnSidebarInstructions) btnSidebarInstructions.addEventListener("click", showInstructions);

// Context Menu
const contextMenu = document.getElementById("context-menu");
const menuDelete = document.getElementById("menu-delete");
const menuMaterial = document.getElementById("menu-material-info");
let contextMenuTarget = null;

function showContextMenu(x, y, component) {
    contextMenuTarget = component;
    
    // First, show it to get accurate dimensions
    contextMenu.classList.remove("hidden");
    menuMaterial.textContent = "材質: " + component.getMaterialInfo();

    // Calculate dimensions
    const menuWidth = contextMenu.offsetWidth;
    const menuHeight = contextMenu.offsetHeight;
    const containerWidth = canvas.clientWidth;
    const containerHeight = canvas.clientHeight;

    // Adjust X (Horizontal)
    if (x + menuWidth > containerWidth) {
        x -= menuWidth;
    }
    
    // Adjust Y (Vertical) 
    if (y + menuHeight > containerHeight) {
        y -= menuHeight;
    }

    // Apply corrected position
    contextMenu.style.left = x + "px";
    contextMenu.style.top = y + "px";
}

function hideContextMenu() {
    contextMenu.classList.add("hidden");
    contextMenuTarget = null;
}

menuDelete.addEventListener("click", () => {
    if (contextMenuTarget) {
        components = components.filter(c => c !== contextMenuTarget);
        hideContextMenu();
    }
});

window.addEventListener("click", (e) => {
    if (!contextMenu.contains(e.target)) {
        hideContextMenu();
    }
});

init();
