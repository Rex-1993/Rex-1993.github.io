/**
 * 小小酸鹼科學家 - 紫高麗菜汁互動實驗遊戲核心邏輯
 * 快樂學習_自然PWA 單元
 */

// ---------------------------------------------------------
// 1. 溶液資料定義 (Solution Data Definition)
// ---------------------------------------------------------
const SOLUTIONS = {
  lemon: {
    id: "lemon",
    name: "檸檬汁",
    icon: "🍋",
    ph: 2,
    baseColor: "rgba(254, 254, 200, 0.4)", // 微微淡黃色透明
    targetColor: "rgba(255, 63, 52, 0.85)", // 強酸：亮紅色
    type: "acid",
    typeName: "強酸性",
    typeBadge: "badge-acid",
    desc: "檸檬汁富含檸檬酸，pH 值約為 2，使花青素變為紅色的陽離子結構。"
  },
  vinegar: {
    id: "vinegar",
    name: "食醋",
    icon: "🍏",
    ph: 3,
    baseColor: "rgba(255, 255, 255, 0.15)", // 完全透明無色
    targetColor: "rgba(255, 94, 87, 0.85)", // 弱酸：粉紅色/紫紅色
    type: "acid",
    typeName: "弱酸性",
    typeBadge: "badge-acid",
    desc: "食醋含有約 3-5% 的醋酸，pH 值約為 3，滴入紫高麗菜汁會呈現亮麗的粉紅色。"
  },
  sprite: {
    id: "sprite",
    name: "無色汽水",
    icon: "🫧",
    ph: 4,
    baseColor: "rgba(240, 255, 240, 0.25)", // 透明微綠，帶氣泡
    targetColor: "rgba(239, 87, 175, 0.85)", // 微酸：粉紫色
    type: "acid",
    typeName: "微酸性",
    typeBadge: "badge-acid",
    hasBubbles: true,
    desc: "無色汽水中溶解了二氧化碳形成碳酸，pH 值通常在 4 左右，會讓指示劑呈現粉紫色。"
  },
  water: {
    id: "water",
    name: "純水",
    icon: "💧",
    ph: 7,
    baseColor: "rgba(255, 255, 255, 0.1)", // 完全透明
    targetColor: "rgba(142, 68, 173, 0.85)", // 中性：紫色
    type: "neutral",
    typeName: "中性",
    typeBadge: "badge-neutral",
    desc: "純水是不含雜質的中性液體，pH 值為 7，滴入紫高麗菜汁仍會維持其原本的深紫色。"
  },
  salt: {
    id: "salt",
    name: "食鹽水",
    icon: "🧂",
    ph: 7,
    baseColor: "rgba(255, 255, 255, 0.12)", // 完全透明
    targetColor: "rgba(142, 68, 173, 0.85)", // 中性：紫色
    type: "neutral",
    typeName: "中性",
    typeBadge: "badge-neutral",
    desc: "食鹽水（氯化鈉溶液）是中性鹽類水溶液，pH 值為 7，不會改變花青素的紫色分子形態。"
  },
  soda: {
    id: "soda",
    name: "小蘇打水",
    icon: "🧼",
    ph: 9,
    baseColor: "rgba(245, 245, 250, 0.5)", // 微濁白色
    targetColor: "rgba(26, 188, 156, 0.85)", // 弱鹼：藍綠色
    type: "base",
    typeName: "弱鹼性",
    typeBadge: "badge-base",
    desc: "碳酸氫鈉（小蘇打）溶於水呈弱鹼性，pH 值約為 9，使花青素轉變為藍綠色的醌式結構。"
  },
  soap: {
    id: "soap",
    name: "肥皂水",
    icon: "🧽",
    ph: 10,
    baseColor: "rgba(240, 242, 245, 0.65)", // 乳白色
    targetColor: "rgba(46, 204, 113, 0.85)", // 中鹼：綠色
    type: "base",
    typeName: "中鹼性",
    typeBadge: "badge-base",
    desc: "肥皂由油脂與強鹼皂化而成，溶於水呈中鹼性，pH 值約為 10，能讓紫高麗菜汁轉化成亮綠色。"
  },
  lime: {
    id: "lime",
    name: "漂白水",
    icon: "🧪",
    ph: 12,
    baseColor: "rgba(224, 242, 255, 0.55)", // 微淡藍色
    targetColor: "rgba(241, 196, 15, 0.85)", // 強鹼：黃綠色/黃色
    type: "base",
    typeName: "強鹼性",
    typeBadge: "badge-base",
    desc: "漂白水（次氯酸鈉溶液）呈強鹼性，pH 值高達 12。它能將紫高麗菜汁中的花青素分子結構破壞，使其褪色或變為鮮黃色。"
  }
};

// 根據 pH 值動態計算紅高麗菜汁顏色的輔助函數 (用於酸鹼中和溶液)
function getCabbageColorByPH(ph) {
  // 對應色標的漸變差值
  if (ph <= 2) return "rgba(255, 63, 52, 0.85)"; // 紅色
  if (ph < 3) {
    const r = Math.round(255);
    const g = Math.round(63 + (94 - 63) * (ph - 2));
    const b = Math.round(52 + (87 - 52) * (ph - 2));
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  if (ph < 4) { // 3 ~ 4 粉紅到粉紫
    const percent = ph - 3;
    const r = Math.round(255 - (255 - 239) * percent);
    const g = Math.round(94 - (94 - 87) * percent);
    const b = Math.round(87 + (175 - 87) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  if (ph < 7) { // 4 ~ 7 粉紫到中性深紫
    const percent = (ph - 4) / 3;
    const r = Math.round(239 - (239 - 142) * percent);
    const g = Math.round(87 - (87 - 68) * percent);
    const b = Math.round(175 + (173 - 175) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  if (ph < 9) { // 7 ~ 9 深紫到藍綠
    const percent = (ph - 7) / 2;
    const r = Math.round(142 - (142 - 26) * percent);
    const g = Math.round(68 + (188 - 68) * percent);
    const b = Math.round(173 - (173 - 156) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  if (ph < 10) { // 9 ~ 10 藍綠到鮮綠
    const percent = ph - 9;
    const r = Math.round(26 + (46 - 26) * percent);
    const g = Math.round(188 + (204 - 188) * percent);
    const b = Math.round(156 - (156 - 113) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  if (ph <= 12) { // 10 ~ 12 鮮綠到黃綠/黃
    const percent = (ph - 10) / 2;
    const r = Math.round(46 + (241 - 46) * percent);
    const g = Math.round(204 - (204 - 196) * percent);
    const b = Math.round(113 - (113 - 15) * percent);
    return `rgba(${r}, ${g}, ${b}, 0.85)`;
  }
  return "rgba(241, 196, 15, 0.85)"; // >12 黃色
}

// 根據 pH 獲取酸鹼性文字與樣式
function getPHDetails(ph) {
  if (ph < 4) return { typeName: "強酸性", typeBadge: "badge-acid", type: "acid" };
  if (ph < 7) return { typeName: "弱酸性", typeBadge: "badge-acid", type: "acid" };
  if (ph === 7) return { typeName: "中性", typeBadge: "badge-neutral", type: "neutral" };
  if (ph < 10) return { typeName: "弱鹼性", typeBadge: "badge-base", type: "base" };
  return { typeName: "強鹼性", typeBadge: "badge-base", type: "base" };
}

// ---------------------------------------------------------
// 2. Web Audio API 音效合成器 (Sound Effects Synthesizer)
// ---------------------------------------------------------
const AudioContext = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!AudioContext) return null;
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// 合成水滴落下或吸水聲 (Water drop / Dropper sound)
function playDropperSound(isSqueeze) {
  const ctx = initAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  if (isSqueeze) {
    // 釋放水滴：頻率向下快速滑動 (plop)
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.12);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } else {
    // 吸取溶液：頻率向上滑動 (shloop)
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, ctx.currentTime + 0.18);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }
}

// 合成氣泡滋滋聲 (Fizzing / Chemical bubble sound)
function playChemicalFizzSound() {
  const ctx = initAudio();
  if (!ctx) return;

  // 建立短暫的白噪音
  const bufferSize = ctx.sampleRate * 0.4; // 0.4 seconds
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 2500;
  filter.Q.value = 3.0;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.4);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  noise.start();
}

// 合成答對音效 (Success chime)
function playChimeSound() {
  const ctx = initAudio();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);
    
    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.08 + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.30);
  });
}

// 合成答錯音效 (Fail buzzer)
function playBuzzerSound() {
  const ctx = initAudio();
  if (!ctx) return;

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc1.frequency.setValueAtTime(130, ctx.currentTime); // Low detuned buzz
  osc2.type = "square";
  osc2.frequency.setValueAtTime(133, ctx.currentTime);

  gain.gain.setValueAtTime(0, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 600;

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start();
  osc2.start();
  osc1.stop(ctx.currentTime + 0.35);
  osc2.stop(ctx.currentTime + 0.35);
}

// 合成完美通關煙火聲 (Firework boom)
function playBoomSound() {
  const ctx = initAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.4);

  gain.gain.setValueAtTime(0.6, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);

  // Lowpass filter for deep thud
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 200;

  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc.start();
  osc.stop(ctx.currentTime + 0.6);
}

// ---------------------------------------------------------
// 3. 實驗室狀態管理 (Laboratory State Management)
// ---------------------------------------------------------
const rackSlots = [null, null, null, null, null, null]; // 試管架 6 個插槽，儲存試管物件
let selectedSlotIdx = null; // 當前點擊選中的試管插槽索引
let currentMode = "normal"; // normal (自由探索) 或 challenge (挑戰)
let activeTool = null; // "dropper" 或 "probe" (點擊套用模式)

// 拖曳狀態變數
let draggingType = null; // "solution", "dropper", "probe"
let draggedData = null; // 攜帶的解決方案 ID 或者是物件

// 氣泡粒子陣列 (汽水試管用)
let bubbleIntervals = {};

// 彈出視窗動畫支援 (與 Magnet PWA 保持一致，解決模糊卡死問題)
function openAnimModal(element) {
  if (!element) return;
  element.classList.remove("hidden");
  element.classList.remove("anim-close");
  // 強制重繪
  void element.offsetWidth;
  element.classList.add("anim-open");
}

function closeAnimModal(element) {
  if (!element) return;
  element.classList.remove("anim-open");
  element.classList.add("anim-close");

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

  // 備用定時器安全機制
  setTimeout(() => {
    if (element.classList.contains("anim-close")) {
      element.classList.add("hidden");
      element.classList.remove("anim-close");
    }
  }, 350);
}

// ---------------------------------------------------------
// 4. UI 元素抓取與綁定
// ---------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  setupEventHandlers();
  resetWorkbench();
  // 註冊滴管與探針的觸控支援
  setupTouchControls();
  
  // 以優質動畫載入首頁開始畫面
  const ss = document.getElementById("start-screen");
  if (ss) {
    openAnimModal(ss);
  }
});

function setupEventHandlers() {
  // 開始畫面按鈕
  document.getElementById("btn-normal-mode").addEventListener("click", () => {
    currentMode = "normal";
    document.body.classList.remove("in-challenge");
    closeAnimModal(document.getElementById("start-screen"));
    document.getElementById("challenge-hud").classList.add("hidden");
    document.getElementById("detail-ph-val").textContent = "-";
    document.getElementById("detail-type-badge").className = "info-badge badge-empty";
    document.getElementById("detail-type-badge").textContent = "未測量";
    updateStatusText("自由探索實驗室中... 點擊或拖曳溶液到試管架中吧！");
  });

  document.getElementById("btn-challenge-mode").addEventListener("click", () => {
    currentMode = "challenge";
    document.body.classList.add("in-challenge");
    closeAnimModal(document.getElementById("start-screen"));
    document.getElementById("challenge-hud").classList.remove("hidden");
    challengeManager.start(5);
  });

  document.getElementById("btn-open-instructions").addEventListener("click", () => {
    openAnimModal(document.getElementById("instructions-screen"));
  });

  document.getElementById("btn-close-instructions").addEventListener("click", () => {
    closeAnimModal(document.getElementById("instructions-screen"));
  });

  document.getElementById("sidebar-instructions-btn").addEventListener("click", () => {
    openAnimModal(document.getElementById("instructions-screen"));
  });

  // 清除全部按鈕
  document.getElementById("clear-btn").addEventListener("click", () => {
    showConfirmModal("清除桌面", "您確定要清空所有的試管並重置實驗桌面嗎？", () => {
      resetWorkbench();
      updateStatusText("實驗桌面已清空。");
    });
  });

  // 回到首頁與結算頁按鈕
  document.getElementById("home-btn").addEventListener("click", () => {
    initAudio();
    showConfirmModal("回到起始畫面", "您確定要結束當前的實驗，回到遊戲首頁嗎？", () => {
      document.body.classList.remove("in-challenge");
      document.getElementById("challenge-hud").classList.add("hidden");
      resetWorkbench();
      openAnimModal(document.getElementById("start-screen"));
    });
  });
  document.getElementById("btn-results-home").addEventListener("click", () => {
    initAudio();
    closeAnimModal(document.getElementById("results-screen"));
    document.body.classList.remove("in-challenge");
    document.getElementById("challenge-hud").classList.add("hidden");
    resetWorkbench();
    openAnimModal(document.getElementById("start-screen"));
  });
  document.getElementById("btn-results-to-normal").addEventListener("click", () => {
    closeAnimModal(document.getElementById("results-screen"));
    currentMode = "normal";
    document.body.classList.remove("in-challenge");
    document.getElementById("challenge-hud").classList.add("hidden");
    resetWorkbench();
    updateStatusText("自由探索實驗室中...");
  });
  document.getElementById("btn-restart-challenge").addEventListener("click", () => {
    closeAnimModal(document.getElementById("results-screen"));
    currentMode = "challenge";
    document.body.classList.add("in-challenge");
    document.getElementById("challenge-hud").classList.remove("hidden");
    resetWorkbench();
    challengeManager.start(5);
  });

  // 行動端頂部導覽列按鈕事件安全綁定
  const mobInstBtn = document.getElementById("mobile-instructions-btn");
  if (mobInstBtn) {
    mobInstBtn.addEventListener("click", () => {
      openAnimModal(document.getElementById("instructions-screen"));
    });
  }

  const mobClearBtn = document.getElementById("mobile-clear-btn");
  if (mobClearBtn) {
    mobClearBtn.addEventListener("click", () => {
      showConfirmModal("清除桌面", "您確定要清空所有的試管並重置實驗桌面嗎？", () => {
        resetWorkbench();
        updateStatusText("實驗桌面已清空。");
      });
    });
  }

  const mobHomeBtn = document.getElementById("mobile-home-btn");
  if (mobHomeBtn) {
    mobHomeBtn.addEventListener("click", () => {
      initAudio();
      showConfirmModal("回到起始畫面", "您確定要結束當前的實驗，回到遊戲首頁嗎？", () => {
        document.body.classList.remove("in-challenge");
        document.getElementById("challenge-hud").classList.add("hidden");
        resetWorkbench();
        openAnimModal(document.getElementById("start-screen"));
      });
    });
  }

  // 拖曳元素綁定
  // 待測溶液拖曳
  const solutionItems = document.querySelectorAll(".toolbox .component-item");
  solutionItems.forEach(item => {
    item.addEventListener("dragstart", (e) => {
      draggingType = "solution";
      draggedData = e.target.getAttribute("data-type");
      e.dataTransfer.setData("text/plain", draggedData);
      e.dataTransfer.effectAllowed = "copy";
    });
    
    // 行動裝置與雙擊直接添加
    item.addEventListener("dblclick", () => {
      const type = item.getAttribute("data-type");
      const freeIdx = rackSlots.indexOf(null);
      if (freeIdx !== -1) {
        addTubeToSlot(freeIdx, type);
        playDropperSound(false);
      } else {
        showCustomAlert("試管架滿了！", "請先清空一些插槽才能放置新試管。");
      }
    });
  });

  // 指示劑滴管拖曳與點擊 (PC 瀏覽器原生 drag 與點擊套用模式)
  const dropperBtn = document.getElementById("dropper-reagent");
  dropperBtn.addEventListener("dragstart", (e) => {
    draggingType = "dropper";
    e.dataTransfer.setData("text/plain", "indicator");
    e.dataTransfer.effectAllowed = "move";
    activeTool = null;
    dropperBtn.classList.remove("active-tool");
    probeBtn.classList.remove("active-tool");
  });
  dropperBtn.addEventListener("click", () => {
    initAudio();
    if (activeTool === "dropper") {
      activeTool = null;
      dropperBtn.classList.remove("active-tool");
      updateStatusText("已取消滴管工具。");
    } else {
      activeTool = "dropper";
      dropperBtn.classList.add("active-tool");
      probeBtn.classList.remove("active-tool");
      updateStatusText("已啟用滴管工具！點擊試管架上的任意試管可直接滴加紫高麗菜汁。");
    }
  });

  // pH 探針拖曳與點擊 (PC 瀏覽器原生 drag 與點擊套用模式)
  const probeBtn = document.getElementById("probe-tool");
  probeBtn.addEventListener("dragstart", (e) => {
    draggingType = "probe";
    e.dataTransfer.setData("text/plain", "probe");
    e.dataTransfer.effectAllowed = "move";
    activeTool = null;
    dropperBtn.classList.remove("active-tool");
    probeBtn.classList.remove("active-tool");
  });
  probeBtn.addEventListener("click", () => {
    initAudio();
    if (activeTool === "probe") {
      activeTool = null;
      probeBtn.classList.remove("active-tool");
      updateStatusText("已取消 pH 探針工具。");
    } else {
      activeTool = "probe";
      probeBtn.classList.add("active-tool");
      dropperBtn.classList.remove("active-tool");
      updateStatusText("已啟用 pH 探針工具！點擊試管架上的任意試管可直接測量 pH 值。");
    }
  });

  // 試管架插槽事件
  const slots = document.querySelectorAll(".tube-slot");
  slots.forEach((slot, idx) => {
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      slot.classList.add("hovered");
    });

    slot.addEventListener("dragleave", () => {
      slot.classList.remove("hovered");
    });

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("hovered");

      if (draggingType === "solution") {
        const type = e.dataTransfer.getData("text/plain") || draggedData;
        addTubeToSlot(idx, type);
      } else if (draggingType === "dropper") {
        dropIndicatorToSlot(idx);
      } else if (draggingType === "probe") {
        measureSlotPH(idx);
      }
      
      // 重置拖曳狀態
      draggingType = null;
      draggedData = null;
    });

    // 試管點擊選中、混合或點擊套用工具
    slot.addEventListener("click", () => {
      initAudio();
      
      if (rackSlots[idx]) {
        if (activeTool === "dropper") {
          dropIndicatorToSlot(idx);
        } else if (activeTool === "probe") {
          measureSlotPH(idx);
        } else {
          // 一般點擊選中試管
          selectSlot(idx);
        }
      } else {
        // 如果插槽為空，且當前有選中的試管，可以將選中的試管倒入該空插槽（轉移/中和）
        if (selectedSlotIdx !== null && selectedSlotIdx !== idx && rackSlots[selectedSlotIdx]) {
          pourAndNeutralize(selectedSlotIdx, idx);
        }
      }
    });

    // 處理滑鼠右鍵/手機長按刪除試管
    slot.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (rackSlots[idx]) {
        deleteTubeAtSlot(idx);
      }
    });
  });

  // 挑戰模式按鈕
  document.getElementById("btn-submit-quest").addEventListener("click", () => {
    if (currentMode === "challenge") {
      challengeManager.checkAnswer();
    }
  });

  // 通用對話框按鈕
  document.getElementById("modal-btn-confirm").addEventListener("click", () => {
    closeAnimModal(document.getElementById("generic-modal"));
    if (window.modalCallback) {
      window.modalCallback();
      window.modalCallback = null;
    }
  });
  document.getElementById("modal-btn-cancel").addEventListener("click", () => {
    closeAnimModal(document.getElementById("generic-modal"));
    window.modalCallback = null;
  });
}

// ---------------------------------------------------------
// 5. 行動端觸控支援 (Touch Controls - Highly Premium)
// ---------------------------------------------------------
function setupTouchControls() {
  const dropperBtn = document.getElementById("dropper-reagent");
  const probeBtn = document.getElementById("probe-tool");
  
  const touchState = {
    activeElement: null,
    visualFollower: null,
    type: null
  };

  const startDragTouch = (e, type, followerId) => {
    // 阻止預設捲動
    e.preventDefault();
    initAudio(); // 行動裝置使用者點擊啟動音訊

    draggingType = type;
    touchState.type = type;
    touchState.visualFollower = document.getElementById(followerId);
    touchState.visualFollower.style.display = "block";
    
    const touch = e.touches[0];
    updateFollowerPosition(touch.clientX, touch.clientY);
  };

  const moveDragTouch = (e) => {
    if (!touchState.visualFollower) return;
    e.preventDefault();
    const touch = e.touches[0];
    updateFollowerPosition(touch.clientX, touch.clientY);

    // 檢測當前滑過的插槽
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotElement = element ? element.closest(".tube-slot") : null;

    document.querySelectorAll(".tube-slot").forEach(s => s.classList.remove("hovered"));
    if (slotElement) {
      slotElement.classList.add("hovered");
    }
  };

  const endDragTouch = (e) => {
    if (!touchState.visualFollower) return;
    e.preventDefault();
    touchState.visualFollower.style.display = "none";
    
    // 獲取最後釋放點觸及的元素
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotElement = element ? element.closest(".tube-slot") : null;

    if (slotElement) {
      slotElement.classList.remove("hovered");
      const idx = parseInt(slotElement.getAttribute("data-slot"));
      
      if (touchState.type === "dropper") {
        dropIndicatorToSlot(idx);
      } else if (touchState.type === "probe") {
        measureSlotPH(idx);
      }
    }

    touchState.visualFollower = null;
    touchState.type = null;
    draggingType = null;
  };

  const updateFollowerPosition = (clientX, clientY) => {
    if (touchState.visualFollower) {
      touchState.visualFollower.style.left = clientX + "px";
      touchState.visualFollower.style.top = clientY + "px";
    }
  };

  // 滴管觸控事件
  dropperBtn.addEventListener("touchstart", (e) => startDragTouch(e, "dropper", "dragged-dropper"), { passive: false });
  dropperBtn.addEventListener("touchmove", moveDragTouch, { passive: false });
  dropperBtn.addEventListener("touchend", endDragTouch, { passive: false });

  // 探針觸控事件
  probeBtn.addEventListener("touchstart", (e) => startDragTouch(e, "probe", "dragged-probe"), { passive: false });
  probeBtn.addEventListener("touchmove", moveDragTouch, { passive: false });
  probeBtn.addEventListener("touchend", endDragTouch, { passive: false });

  // 待測溶液櫃觸控支持：雙模觸控系統 (雙擊/點擊直加 + 觸控手勢拖曳)
  const solutionItems = document.querySelectorAll(".toolbox .component-item");
  const draggedSol = document.getElementById("dragged-solution");
  
  solutionItems.forEach(item => {
    let touchStartPos = { x: 0, y: 0 };
    let touchStartTime = 0;
    let isDragging = false;
    let type = "";
    let icon = "";

    item.addEventListener("touchstart", (e) => {
      // 記錄起始狀態
      const touch = e.touches[0];
      touchStartPos = { x: touch.clientX, y: touch.clientY };
      touchStartTime = Date.now();
      isDragging = false;
      type = item.getAttribute("data-type");
      
      const iconEl = item.querySelector(".icon");
      icon = iconEl ? iconEl.textContent : "🧪";
      
      initAudio(); // 啟動音訊
    }, { passive: true });

    item.addEventListener("touchmove", (e) => {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.x;
      const dy = touch.clientY - touchStartPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 如果移動距離大於 12px，且為垂直主導的滑動（代表想要往上拖進試管架），才啟動拖曳
      if (dist > 12 && !isDragging) {
        const isVertical = Math.abs(dy) > Math.abs(dx) * 1.15;
        if (isVertical) {
          isDragging = true;
          draggingType = "solution";
          draggedData = type;
          if (draggedSol) {
            draggedSol.textContent = icon;
            draggedSol.style.display = "block";
          }
        }
      }

      if (isDragging) {
        // 防止拖曳時瀏覽器背景捲動
        if (e.cancelable) e.preventDefault();
        
        if (draggedSol) {
          draggedSol.style.left = touch.clientX + "px";
          draggedSol.style.top = touch.clientY + "px";
        }

        // 偵測滑過的插槽
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slotElement = element ? element.closest(".tube-slot") : null;

        document.querySelectorAll(".tube-slot").forEach(s => s.classList.remove("hovered"));
        if (slotElement) {
          slotElement.classList.add("hovered");
        }
      }
    }, { passive: false });

    item.addEventListener("touchend", (e) => {
      const touch = e.changedTouches[0];
      
      if (isDragging) {
        if (draggedSol) {
          draggedSol.style.display = "none";
        }
        
        const element = document.elementFromPoint(touch.clientX, touch.clientY);
        const slotElement = element ? element.closest(".tube-slot") : null;

        if (slotElement) {
          slotElement.classList.remove("hovered");
          const idx = parseInt(slotElement.getAttribute("data-slot"));
          addTubeToSlot(idx, type);
          playDropperSound(false);
        }

        document.querySelectorAll(".tube-slot").forEach(s => s.classList.remove("hovered"));
        isDragging = false;
        draggingType = null;
        draggedData = null;
      } else {
        // 快速單擊 (且移動距離必須小於 10px，防止橫向捲動抽屜放開時誤判為點擊添加)
        const dx = touch.clientX - touchStartPos.x;
        const dy = touch.clientY - touchStartPos.y;
        const currentDist = Math.sqrt(dx * dx + dy * dy);
        
        const duration = Date.now() - touchStartTime;
        if (duration < 250 && currentDist < 10) {
          const freeIdx = rackSlots.indexOf(null);
          if (freeIdx !== -1) {
            addTubeToSlot(freeIdx, type);
            playDropperSound(false);
          } else {
            showCustomAlert("試管架滿了！", "請先清空一些插槽才能放置新試管。");
          }
        }
      }
    }, { passive: true });
  });
}

// ---------------------------------------------------------
// 6. 實驗室操作業務邏輯
// ---------------------------------------------------------

// 試管架重置
function resetWorkbench() {
  for (let i = 0; i < 6; i++) {
    removeTubeFromDOM(i);
    rackSlots[i] = null;
  }
  selectedSlotIdx = null;
  document.getElementById("detail-name").textContent = "無 (請點擊選中試管)";
  document.getElementById("detail-indicator").textContent = "無";
  document.getElementById("detail-type-badge").className = "info-badge badge-empty";
  document.getElementById("detail-type-badge").textContent = "未測量";
  document.getElementById("detail-ph-val").textContent = "-";
  document.getElementById("spect-marker").style.display = "none";
  document.getElementById("marker-ph-label").textContent = "";
}

// 添加試管至插槽
function addTubeToSlot(slotIdx, solutionId) {
  // 如果該插槽已有試管，執行酸鹼中和倒入混合
  if (rackSlots[slotIdx]) {
    pourAndNeutralize(draggingType === "solution" ? null : selectedSlotIdx, slotIdx, solutionId);
    return;
  }

  const solDef = SOLUTIONS[solutionId];
  if (!solDef) return;

  const tubeObj = {
    solutionId: solutionId,
    name: solDef.name,
    originalPH: solDef.ph,
    currentPH: solDef.ph,
    originalColor: solDef.baseColor,
    currentColor: solDef.baseColor,
    addedIndicator: false,
    hasBubbles: solDef.hasBubbles || false,
    mixedList: [solutionId] // 用於中和追蹤混合的溶液列表
  };

  rackSlots[slotIdx] = tubeObj;
  renderTubeAtDOM(slotIdx, tubeObj);
  selectSlot(slotIdx);
  updateStatusText(`已在插槽 ${slotIdx + 1} 放置了 ${solDef.name}。請使用紫高麗菜汁滴管進行檢測！`);
}

// 酸鹼中和反應邏輯 (Pour & Neutralize - Weighted average simulation)
function pourAndNeutralize(fromSlotIdx, toSlotIdx, directAddSolId = null) {
  const targetTube = rackSlots[toSlotIdx];
  if (!targetTube) return;

  let sourceInfo = null;
  let sourceName = "";

  if (directAddSolId) {
    // 從溶液櫃直接拖曳添加
    sourceInfo = SOLUTIONS[directAddSolId];
    sourceName = sourceInfo.name;
  } else if (fromSlotIdx !== null && fromSlotIdx !== toSlotIdx && rackSlots[fromSlotIdx]) {
    // 試管架上的兩個試管互相混合
    const sourceTube = rackSlots[fromSlotIdx];
    sourceInfo = {
      ph: sourceTube.currentPH,
      name: sourceTube.name,
      mixedList: sourceTube.mixedList
    };
    sourceName = sourceTube.name;
  }

  if (!sourceInfo) return;

  // 計算混合後的 pH 值 (等容量混合，使用酸鹼離子濃度加權平均模擬)
  const ph1 = targetTube.currentPH;
  const ph2 = sourceInfo.ph;

  // 計算氫離子與氫氧根離子濃度
  // [H+] = 10^(-pH), [OH-] = 10^(pH - 14)
  const getHConcentration = (p) => Math.pow(10, -p);
  const getOHConcentration = (p) => Math.pow(10, p - 14);

  const h1 = getHConcentration(ph1);
  const oh1 = getOHConcentration(ph1);
  const h2 = getHConcentration(ph2);
  const oh2 = getOHConcentration(ph2);

  // 混合後的 H+ 與 OH- 平均濃度 (考慮反應抵消)
  let mixedPH = 7;
  const avgH = (h1 + h2) / 2;
  const avgOH = (oh1 + oh2) / 2;

  if (avgH > avgOH) {
    const netH = avgH - avgOH;
    mixedPH = -Math.log10(netH);
  } else if (avgOH > avgH) {
    const netOH = avgOH - avgH;
    mixedPH = 14 + Math.log10(netOH);
  } else {
    mixedPH = 7;
  }

  // 四捨五入至小數點第一位，限制在 [2, 12] 區間
  mixedPH = Math.max(2, Math.min(12, Math.round(mixedPH * 10) / 10));

  // 開始更新目標試管
  targetTube.currentPH = mixedPH;
  targetTube.name = `${targetTube.name} + ${sourceName}`;
  
  if (directAddSolId) {
    targetTube.mixedList.push(directAddSolId);
  } else if (sourceInfo.mixedList) {
    targetTube.mixedList = targetTube.mixedList.concat(sourceInfo.mixedList);
  }

  // 混合後是否有氣泡 (有汽水即有氣泡)
  if (sourceInfo.hasBubbles || targetTube.hasBubbles) {
    targetTube.hasBubbles = true;
  }

  // 混色動畫
  const newColor = targetTube.addedIndicator ? getCabbageColorByPH(mixedPH) : "rgba(230, 230, 230, 0.4)";
  
  // 播放氣泡與中和音效
  playChemicalFizzSound();

  // DOM 渲染更新
  const slotDOM = document.querySelector(`.tube-slot[data-slot="${toSlotIdx}"]`);
  const liquidDOM = slotDOM.querySelector(".tube-liquid");
  
  // 輕微搖晃試管表示中和反應
  const tubeDOM = slotDOM.querySelector(".test-tube");
  tubeDOM.style.transition = "transform 0.1s";
  let shakeCount = 0;
  const shakeInterval = setInterval(() => {
    tubeDOM.style.transform = `translateX(${(shakeCount % 2 === 0 ? 4 : -4)}px) translateY(-5px)`;
    shakeCount++;
    if (shakeCount > 6) {
      clearInterval(shakeInterval);
      tubeDOM.style.transform = "translateY(-8px)";
    }
  }, 100);

  // 逐漸淡入新顏色
  liquidDOM.style.backgroundColor = newColor;
  targetTube.currentColor = newColor;

  // 如果是試管對試管混合，清空來源試管
  if (fromSlotIdx !== null) {
    deleteTubeAtSlot(fromSlotIdx, true);
  }

  // 刷新詳情與對照表
  selectSlot(toSlotIdx);
  updateStatusText(`將 ${sourceName} 倒入混合，發生酸鹼中和！混合液當前 pH 約為 ${mixedPH}。`);

  // 挑戰模式的回呼觸發
  if (currentMode === "challenge") {
    challengeManager.onMixCompleted(toSlotIdx);
  }
}

// 渲染試管至 DOM
function renderTubeAtDOM(slotIdx, tubeObj) {
  const slotDOM = document.querySelector(`.tube-slot[data-slot="${slotIdx}"]`);
  slotDOM.classList.add("has-tube");
  slotDOM.innerHTML = `
    <div class="test-tube" style="transform: translateY(0px)">
      <div class="tube-label">${SOLUTIONS[tubeObj.solutionId].name}</div>
      <div class="tube-liquid" style="background-color: ${tubeObj.currentColor}; height: 60%;">
      </div>
    </div>
  `;

  // 觸發汽水氣泡粒子
  if (tubeObj.hasBubbles) {
    startBubbleParticles(slotIdx);
  }
}

// 移除 DOM 中的試管
function removeTubeFromDOM(slotIdx) {
  stopBubbleParticles(slotIdx);
  const slotDOM = document.querySelector(`.tube-slot[data-slot="${slotIdx}"]`);
  slotDOM.classList.remove("has-tube");
  slotDOM.classList.remove("selected");
  slotDOM.innerHTML = `<div class="slot-bg-icon" style="font-size:1.5rem; opacity:0.25; margin-bottom: 70px;">${slotIdx + 1}</div>`;
}

// 刪除試管插槽
function deleteTubeAtSlot(slotIdx, skipConfirm = false) {
  const tube = rackSlots[slotIdx];
  if (!tube) return;
  
  const proceedDelete = () => {
    removeTubeFromDOM(slotIdx);
    rackSlots[slotIdx] = null;
    if (selectedSlotIdx === slotIdx) {
      selectedSlotIdx = null;
      document.getElementById("detail-name").textContent = "無 (請點擊選中試管)";
      document.getElementById("detail-indicator").textContent = "無";
      document.getElementById("detail-type-badge").className = "info-badge badge-empty";
      document.getElementById("detail-type-badge").textContent = "未測量";
      document.getElementById("detail-ph-val").textContent = "-";
      document.getElementById("spect-marker").style.display = "none";
      document.getElementById("marker-ph-label").textContent = "";
    }
    updateStatusText("已移除了試管。");
  };

  if (skipConfirm) {
    proceedDelete();
  } else {
    showConfirmModal("移除試管", `您確定要將插槽 ${slotIdx + 1} 的 ${tube.name} 倒掉清空嗎？`, proceedDelete);
  }
}

// 選中特定試管
function selectSlot(slotIdx) {
  selectedSlotIdx = slotIdx;
  document.querySelectorAll(".tube-slot").forEach((s, idx) => {
    if (idx === slotIdx) {
      s.classList.add("selected");
    } else {
      s.classList.remove("selected");
    }
  });

  const tube = rackSlots[slotIdx];
  if (!tube) return;

  // 更新詳情面版
  document.getElementById("detail-name").textContent = tube.name;
  document.getElementById("detail-indicator").textContent = tube.addedIndicator ? "已加入紫高麗菜汁" : "尚未加入";
  
  if (tube.addedIndicator) {
    const details = getPHDetails(tube.currentPH);
    document.getElementById("detail-type-badge").className = `info-badge ${details.typeBadge}`;
    document.getElementById("detail-type-badge").textContent = details.typeName;
    document.getElementById("detail-ph-val").textContent = `~ ${tube.currentPH}`;
    
    // 移動 pH 指示卡箭頭標記
    moveSpectrumMarker(tube.currentPH);
  } else {
    document.getElementById("detail-type-badge").className = "info-badge badge-empty";
    document.getElementById("detail-type-badge").textContent = "未測量 (請先加指示劑)";
    document.getElementById("detail-ph-val").textContent = "待測";
    document.getElementById("spect-marker").style.display = "none";
    document.getElementById("marker-ph-label").textContent = "";
  }
}

// 滴加紫高麗菜汁至插槽試管 (Drop Reagent Indicator - Drops Canvas animation)
function dropIndicatorToSlot(slotIdx) {
  const tube = rackSlots[slotIdx];
  if (!tube) {
    showCustomAlert("滴加失敗", "該插槽上沒有試管！請先放置待測溶液試管。");
    return;
  }

  if (tube.addedIndicator) {
    showCustomAlert("重複添加", "此試管已經加入過指示劑囉！不需重複添加。");
    return;
  }

  // 執行滴水 Canvas 動畫
  const slotDOM = document.querySelector(`.tube-slot[data-slot="${slotIdx}"]`);
  const slotRect = slotDOM.getBoundingClientRect();
  const canvas = document.getElementById("droplet-canvas");
  const canvasRect = canvas.getBoundingClientRect();

  // 計算起點與終點座標 (相對於 Canvas)
  const startX = slotRect.left + slotRect.width / 2 - canvasRect.left;
  const startY = slotRect.top - canvasRect.top + 10;
  const endY = slotRect.top + slotRect.height * 0.7 - canvasRect.top; // 試管液面位置

  // 播放吸水與水滴釋放的聲音
  playDropperSound(true);

  // 滴液落下動畫繪製
  let dropY = startY;
  const dropSpeed = 12;
  const ctx = canvas.getContext("2d");

  function animateDrop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (dropY < endY) {
      // 繪製圓形紫色水滴
      ctx.beginPath();
      ctx.arc(startX, dropY, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#8e44ad";
      ctx.fill();
      
      // 繪製水滴尖端 (雨滴形狀)
      ctx.beginPath();
      ctx.moveTo(startX - 6, dropY);
      ctx.quadraticCurveTo(startX, dropY - 12, startX + 6, dropY);
      ctx.fillStyle = "#8e44ad";
      ctx.fill();

      dropY += dropSpeed;
      requestAnimationFrame(animateDrop);
    } else {
      // 水滴擊中液面！清空 Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 觸發液體混合漸變
      triggerColorBlend(slotIdx);
    }
  }

  // Canvas 寬高自適應
  canvas.width = canvasRect.width;
  canvas.height = canvasRect.height;
  
  animateDrop();
}

// 觸發變色反應 (混色擴散動畫)
function triggerColorBlend(slotIdx) {
  const tube = rackSlots[slotIdx];
  if (!tube) return;

  const solDef = SOLUTIONS[tube.solutionId];
  const targetColor = getCabbageColorByPH(tube.currentPH);
  
  tube.addedIndicator = true;
  tube.currentColor = targetColor;

  const slotDOM = document.querySelector(`.tube-slot[data-slot="${slotIdx}"]`);
  const liquidDOM = slotDOM.querySelector(".tube-liquid");

  // 播放反應滋滋氣泡聲
  playChemicalFizzSound();

  // 液體顏色擴散動畫：利用 CSS 轉變
  liquidDOM.style.transition = "background-color 1.5s cubic-bezier(0.1, 0.8, 0.3, 1)";
  liquidDOM.style.backgroundColor = targetColor;

  // 刷新詳情面版
  setTimeout(() => {
    selectSlot(slotIdx);
    updateStatusText(`滴加指示劑成功！${tube.name} 轉變為對應 pH 值的顯色狀態。`);
    
    // 如果是挑戰模式，觸發判定
    if (currentMode === "challenge") {
      challengeManager.onIndicatorAdded(slotIdx);
    }
  }, 100);
}

// 精準測量試管 pH 值 (Dip Probe Meter)
function measureSlotPH(slotIdx) {
  const tube = rackSlots[slotIdx];
  if (!tube) return;

  initAudio();
  playDropperSound(false);

  // 探針探入，更新狀態欄與 pH 計
  selectSlot(slotIdx);
  
  // 更新狀態列
  const details = getPHDetails(tube.currentPH);
  updateStatusText(`pH 探針精準測量：這是一杯【${details.typeName}】溶液，pH 約為 ${tube.currentPH}。`);

  // 指示卡箭頭標記
  moveSpectrumMarker(tube.currentPH);

  // 探針頭變色動畫效果
  const probeBtn = document.getElementById("probe-tool");
  probeBtn.style.background = tube.currentColor;
}

// 移動 pH 指示卡箭頭
function moveSpectrumMarker(ph) {
  const marker = document.getElementById("spect-marker");
  const label = document.getElementById("marker-ph-label");
  
  // pH 範圍是 2 ~ 12，換算為百分比
  // 2 -> 0%, 12 -> 100%
  const percentage = ((ph - 2) / (12 - 2)) * 100;
  
  marker.style.display = "flex";
  marker.style.left = `${Math.max(0, Math.min(100, percentage))}%`;

  const details = getPHDetails(ph);
  label.textContent = `實測 pH ${ph} (屬於 ${details.typeName})`;
}

// 氣泡粒子特效控制
function startBubbleParticles(slotIdx) {
  if (bubbleIntervals[slotIdx]) return;

  const slotDOM = document.querySelector(`.tube-slot[data-slot="${slotIdx}"]`);
  
  bubbleIntervals[slotIdx] = setInterval(() => {
    const liquidDOM = slotDOM.querySelector(".tube-liquid");
    if (!liquidDOM) return;

    const bubble = document.createElement("div");
    bubble.className = "bubble-particle";
    
    // 隨機大小與位置
    const size = Math.random() * 4 + 2;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 80 + 10}%`;
    bubble.style.bottom = "0px";
    
    liquidDOM.appendChild(bubble);

    // 動畫結束後自動銷毀
    setTimeout(() => {
      if (bubble.parentNode) {
        bubble.parentNode.removeChild(bubble);
      }
    }, 2000);
  }, 350);
}

function stopBubbleParticles(slotIdx) {
  if (bubbleIntervals[slotIdx]) {
    clearInterval(bubbleIntervals[slotIdx]);
    delete bubbleIntervals[slotIdx];
  }
}

// 更新下方狀態提示文字
function updateStatusText(text) {
  document.getElementById("status-display").textContent = text;
}

// ---------------------------------------------------------
// 7. 關卡管理器 (Challenge Quest Manager)
// ---------------------------------------------------------
class ChallengeManager {
  constructor() {
    this.questions = [];
    this.currentIndex = 0;
    this.score = 0;
    this.mistakes = [];
    this.totalQuestions = 5;
    
    // 學力診斷統計
    this.stats = {
      acidIdent: { tries: 0, fails: 0, name: "酸性顯色辨識" },
      neutralIdent: { tries: 0, fails: 0, name: "中性顯色辨識" },
      baseIdent: { tries: 0, fails: 0, name: "鹼性顯色辨識" },
      sortingPH: { tries: 0, fails: 0, name: "pH 排序技能" },
      neutralization: { tries: 0, fails: 0, name: "酸鹼中和實驗技能" }
    };
  }

  start(count) {
    this.totalQuestions = count;
    this.score = 0;
    this.currentIndex = 0;
    this.mistakes = [];
    
    // 重置統計
    Object.keys(this.stats).forEach(k => {
      this.stats[k].tries = 0;
      this.stats[k].fails = 0;
    });

    this.generateQuestions();
    this.loadQuestion();
  }

  generateQuestions() {
    this.questions = [
      {
        id: 1,
        type: "acidIdent",
        text: "【關卡 1：酸性溶液大搜查】請在待測溶液櫃中，拖曳放置『2個不同的酸性溶液』到試管架中，並『都滴加紫高麗菜汁』驗證顯色吧！",
        verify: () => {
          // 檢測試管架上有無兩個滴加了指示劑且是酸性的試管
          let count = 0;
          rackSlots.forEach(t => {
            if (t && t.addedIndicator && getPHDetails(t.currentPH).type === "acid") {
              count++;
            }
          });
          return {
            ok: count >= 2,
            reason: count === 0 ? "沒有找到酸性試管" : (count === 1 ? "您只放置了一支酸性檢測試管，還需要一支喔！" : "")
          };
        }
      },
      {
        id: 2,
        type: "baseIdent",
        text: "【關卡 2：神祕變色液體的解密】我們隨機生成了一支滴加指示劑後呈現【綠色】的神祕液體，請在下方選擇，它屬於以下哪一種酸鹼性？它可能是哪一種日常溶液？",
        isMCQ: true, // 選擇題模式
        setup: () => {
          // 在插槽 2 放置一杯已變色的肥皂水 (pH 10，變綠)
          resetWorkbench();
          const soapSol = SOLUTIONS.soap;
          rackSlots[2] = {
            solutionId: "soap",
            name: "神祕變色溶液",
            originalPH: soapSol.ph,
            currentPH: soapSol.ph,
            originalColor: soapSol.baseColor,
            currentColor: soapSol.targetColor,
            addedIndicator: true,
            mixedList: ["soap"]
          };
          renderTubeAtDOM(2, rackSlots[2]);
          selectSlot(2);
        },
        choices: [
          { text: "酸性；檸檬汁", isCorrect: false },
          { text: "中性；食鹽水", isCorrect: false },
          { text: "鹼性；肥皂水", isCorrect: true },
          { text: "鹼性；汽水", isCorrect: false }
        ]
      },
      {
        id: 3,
        type: "neutralIdent",
        text: "【關卡 3：中性溶液的探索】請找到一個『中性』的溶液放置在試管架，並『滴入紫高麗菜汁』觀察其顏色，然後選中它測量 pH 值。",
        verify: () => {
          let hasNeutral = false;
          rackSlots.forEach(t => {
            if (t && t.addedIndicator && getPHDetails(t.currentPH).type === "neutral") {
              hasNeutral = true;
            }
          });
          return { ok: hasNeutral, reason: "尚未放置或滴加指示劑驗證中性溶液（純水或鹽水）" };
        }
      },
      {
        id: 4,
        type: "sortingPH",
        text: "【關卡 4：pH值顯色配對題】如果紫高麗菜汁變色狀態為：試管A呈現【紅色】，試管B呈現【紫色】，試管C呈現【黃綠色】。請由 pH 值從小到大（酸到鹼）進行強度排序！",
        isMCQ: true,
        setup: () => {
          resetWorkbench();
          // 渲染 A, B, C 三支對應試管展示給學生看
          addTubeToSlot(1, "lemon"); // A -> pH 2 紅
          dropIndicatorToSlot(1);
          rackSlots[1].name = "溶液 A";
          document.querySelector(`.tube-slot[data-slot="1"] .tube-label`).textContent = "溶液 A";

          addTubeToSlot(2, "water"); // B -> pH 7 紫
          dropIndicatorToSlot(2);
          rackSlots[2].name = "溶液 B";
          document.querySelector(`.tube-slot[data-slot="2"] .tube-label`).textContent = "溶液 B";

          addTubeToSlot(3, "lime");  // C -> pH 12 黃綠
          dropIndicatorToSlot(3);
          rackSlots[3].name = "溶液 C";
          document.querySelector(`.tube-slot[data-slot="3"] .tube-label`).textContent = "溶液 C";
        },
        choices: [
          { text: "A (pH 2) < B (pH 7) < C (pH 12)", isCorrect: true },
          { text: "B (pH 7) < A (pH 2) < C (pH 12)", isCorrect: false },
          { text: "C (pH 12) < B (pH 7) < A (pH 2)", isCorrect: false }
        ]
      },
      {
        id: 5,
        type: "neutralization",
        text: "【關卡 5：終極酸鹼中和調配師】請在試管 1 中先倒入【檸檬汁】並加指示劑（強酸紅，pH 2），接著倒入【漂白水】（強鹼黃，pH 12）進行酸鹼中和，將混合液 pH 調整中和至中性偏酸/偏鹼的紫色～藍綠色區間 (pH 6~9)！",
        verify: () => {
          // 檢查試管 1 的混合與 pH 值
          const tube = rackSlots[0];
          if (!tube) return { ok: false, reason: "試管 1 竟然是空的！請放入液體進行實驗。" };
          if (!tube.addedIndicator) return { ok: false, reason: "試管 1 還沒有加入指示劑觀察顏色喔！" };
          
          const hasAcid = tube.mixedList.includes("lemon");
          const hasBase = tube.mixedList.includes("lime");

          if (!hasAcid || !hasBase) {
            return { ok: false, reason: "您必須在同一試管中混合『檸檬汁』與『漂白水』來展示中和作用！" };
          }

          const targetPH = tube.currentPH;
          const matched = targetPH >= 6 && targetPH <= 9;
          
          return {
            ok: matched,
            reason: `混合液當前 pH 為 ${targetPH}，${targetPH < 6 ? "依然偏酸性，請加一點點鹼性的漂白水！" : "已經太偏鹼性了，中和過頭了，請倒掉重新微調調配！"}`
          };
        }
      }
    ];
  }

  loadQuestion() {
    const q = this.questions[this.currentIndex];
    
    // 更新統計
    if (this.stats[q.type]) {
      this.stats[q.type].tries++;
    }

    // 重置實驗桌面
    resetWorkbench();
    document.getElementById("score-val").textContent = this.score;
    document.getElementById("total-val").textContent = this.totalQuestions;
    document.getElementById("question-text").innerHTML = `<span class="quest-indicator">Q${this.currentIndex + 1}</span> ${q.text}`;

    // 設定選擇題或實驗題介面
    const choiceContainer = document.getElementById("quiz-choices-container");
    const grid = document.getElementById("quiz-choices-grid");
    const submitBtn = document.getElementById("btn-submit-quest");

    if (q.isMCQ) {
      choiceContainer.classList.remove("hidden");
      submitBtn.classList.add("hidden"); // 選擇題直接點選作答，不需按送出
      
      grid.innerHTML = "";
      q.choices.forEach((choice, cIdx) => {
        const btn = document.createElement("button");
        btn.className = "choice-btn";
        btn.innerHTML = `<span class="choice-badge">${String.fromCharCode(65 + cIdx)}</span> ${choice.text}`;
        btn.addEventListener("click", () => {
          this.submitMCQ(choice.isCorrect);
        });
        grid.appendChild(btn);
      });

      // 調用關卡專屬 setup 函數
      if (q.setup) q.setup();
    } else {
      choiceContainer.classList.add("hidden");
      submitBtn.classList.remove("hidden"); // 實驗題需要手動作答送出驗證

      if (q.setup) q.setup();
    }
  }

  submitMCQ(isCorrect) {
    const q = this.questions[this.currentIndex];
    if (isCorrect) {
      this.score++;
      playChimeSound();
      showCustomAlert("恭喜答對！🎉", "太棒了，您的酸鹼顯色概念非常清晰！").then(() => {
        this.nextQuestion();
      });
    } else {
      this.stats[q.type].fails++;
      this.mistakes.push({ q: q.text, reason: "顯色原理辨識錯誤，或酸鹼度對照不正確。" });
      playBuzzerSound();
      showCustomAlert("答錯了... ❌", "沒關係，再想一想，仔細對照紫高麗菜汁的顏色特徵哦！").then(() => {
        this.nextQuestion();
      });
    }
  }

  checkAnswer() {
    const q = this.questions[this.currentIndex];
    const res = q.verify();

    if (res.ok) {
      this.score++;
      playChimeSound();
      showCustomAlert("挑戰成功！🎉", "您的實驗步驟完美無瑕，完全正確！").then(() => {
        this.nextQuestion();
      });
    } else {
      this.stats[q.type].fails++;
      this.mistakes.push({ q: q.text, reason: res.reason });
      playBuzzerSound();
      showCustomAlert("實驗結果尚未成功 ❌", res.reason);
    }
  }

  // 混合與添加的回呼觸發自動引導
  onMixCompleted(slotIdx) {
    updateStatusText(`[挑戰關卡 ${this.currentIndex + 1}] 已在試管 ${slotIdx + 1} 成功進行混合！`);
  }

  onIndicatorAdded(slotIdx) {
    updateStatusText(`[挑戰關卡 ${this.currentIndex + 1}] 成功加指示劑。請確認是否已達成實驗指標。`);
  }

  nextQuestion() {
    this.currentIndex++;
    if (this.currentIndex >= this.totalQuestions) {
      this.endGame();
    } else {
      this.loadQuestion();
    }
  }

  endGame() {
    document.getElementById("challenge-hud").classList.add("hidden");
    const resScreen = document.getElementById("results-screen");
    openAnimModal(resScreen);

    document.getElementById("final-score-val").textContent = this.score;

    // 通關效果與完美通關煙火
    if (this.score === this.totalQuestions) {
      playBoomSound();
      launchFireworks(3000);
    }

    // 錯題回顧清單
    const list = document.getElementById("mistakes-list");
    list.innerHTML = "";
    if (this.mistakes.length === 0) {
      list.innerHTML = `<div style="color: #2ed573; font-weight:bold; text-align:center; padding: 10px;">🌟 完美大滿貫！沒有任何答錯的關卡，太厲害了！</div>`;
    } else {
      this.mistakes.forEach(m => {
        const item = document.createElement("div");
        item.style.background = "#fff3cd";
        item.style.borderLeft = "4px solid #ffc107";
        item.style.padding = "8px 12px";
        item.style.marginBottom = "8px";
        item.style.borderRadius = "4px";
        item.innerHTML = `
          <div style="font-weight:bold; font-size:0.85rem; color:#856404;">未過關：${m.q.substring(0, 30)}...</div>
          <div style="font-size:0.8rem; color:#666; margin-top:2px;">失敗原因：${m.reason}</div>
        `;
        list.appendChild(item);
      });
    }

    // 學力診斷弱點分析報告
    const wReport = document.getElementById("weakness-report");
    let diagText = "";
    let weaknesses = [];
    let strengths = [];

    Object.keys(this.stats).forEach(k => {
      const s = this.stats[k];
      if (s.tries > 0) {
        if (s.fails === 0) {
          strengths.push(s.name);
        } else {
          weaknesses.push(`${s.name} (錯誤 ${s.fails}/${s.tries} 次)`);
        }
      }
    });

    if (strengths.length > 0) {
      diagText += `👍 <b>優勢技能：</b>您在【${strengths.join("、")}】掌握得非常好，具備紮實的自然科學素養！<br>`;
    }
    if (weaknesses.length > 0) {
      diagText += `⚠️ <b>建議加強：</b>您的【${weaknesses.join("、")}】尚有提升空間，建議回到自由探索實驗室中反覆動手調配測試哦！`;
    } else if (this.score === this.totalQuestions) {
      diagText += `🏅 <b>專家診斷：</b>恭喜！您已具備【小小酸鹼化學家】專家級素養，對酸性、中性、鹼性在紫高麗菜汁下的物理變色與化學中和反應有完美理解！`;
    }

    wReport.innerHTML = diagText;
  }
}

const challengeManager = new ChallengeManager();

// ---------------------------------------------------------
// 8. 完美通關多彩煙火粒子效果 (Particles System - Highly Dynamic)
// ---------------------------------------------------------
class Firework {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.x = Math.random() * canvas.width;
    this.y = canvas.height;
    this.targetY = Math.random() * (canvas.height * 0.4) + (canvas.height * 0.1);
    this.speed = 8 + Math.random() * 6;
    this.angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.3;
    this.exploded = false;
    this.particles = [];
    this.color = `hsl(${Math.random() * 360}, 100%, 60%)`;
  }

  update() {
    if (!this.exploded) {
      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;
      this.speed *= 0.98;

      if (this.y <= this.targetY || this.speed < 1.5) {
        this.explode();
      }
    } else {
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // 重力
        p.life -= 0.025;
      });
      this.particles = this.particles.filter(p => p.life > 0);
    }
  }

  explode() {
    this.exploded = true;
    playBoomSound();
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 4 + 1;
      this.particles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        color: this.color
      });
    }
  }

  draw() {
    if (!this.exploded) {
      this.ctx.fillStyle = this.color;
      this.ctx.beginPath();
      this.ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
      this.ctx.fill();
    } else {
      this.particles.forEach(p => {
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.life;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1.0;
    }
  }

  isDead() {
    return this.exploded && this.particles.length === 0;
  }
}

function launchFireworks(duration = 3000) {
  const fCanvas = document.createElement("canvas");
  fCanvas.style.position = "fixed";
  fCanvas.style.top = "0";
  fCanvas.style.left = "0";
  fCanvas.style.width = "100%";
  fCanvas.style.height = "100%";
  fCanvas.style.pointerEvents = "none";
  fCanvas.style.zIndex = "9999";
  document.body.appendChild(fCanvas);

  const fCtx = fCanvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  fCanvas.width = window.innerWidth * dpr;
  fCanvas.height = window.innerHeight * dpr;
  fCtx.scale(dpr, dpr);

  let fireworks = [];
  let running = true;
  const startTime = Date.now();

  function loop() {
    if (!running) {
      if (fCanvas.parentNode) {
        document.body.removeChild(fCanvas);
      }
      return;
    }

    fCtx.clearRect(0, 0, fCanvas.width / dpr, fCanvas.height / dpr);

    if (Date.now() - startTime < duration) {
      if (Math.random() < 0.04) {
        fireworks.push(new Firework({ width: fCanvas.width / dpr, height: fCanvas.height / dpr }, fCtx));
      }
    } else if (fireworks.length === 0) {
      running = false;
    }

    fireworks.forEach(f => f.update());
    fireworks.forEach(f => f.draw());
    fireworks = fireworks.filter(f => !f.isDead());

    requestAnimationFrame(loop);
  }

  loop();
}

// ---------------------------------------------------------
// 9. 通用彈出視窗對照組輔助函數
// ---------------------------------------------------------
function showCustomAlert(title, message) {
  return new Promise((resolve) => {
    document.getElementById("modal-title").textContent = title;
    document.getElementById("modal-message").innerHTML = message;
    document.getElementById("modal-btn-cancel").classList.add("hidden");
    openAnimModal(document.getElementById("generic-modal"));
    
    window.modalCallback = () => {
      resolve();
    };
  });
}

function showConfirmModal(title, message, onConfirm) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  document.getElementById("modal-btn-cancel").classList.remove("hidden");
  openAnimModal(document.getElementById("generic-modal"));
  
  window.modalCallback = () => {
    onConfirm();
  };
}
