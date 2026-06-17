import './style.css';

/* ============================================
   SCROLL-DRIVEN CANVAS ANIMATION ENGINE
   + INTERACTIVE HOVER OVERLAY
   ============================================ */

// --- Configuration ---
const FRAME_COUNT = 121;
const FRAME_PATH  = '/assets/scroll-frames/';
const FRAME_EXT   = '.png';

// --- DOM references ---
const canvas          = document.getElementById('heroCanvas');
const ctx             = canvas.getContext('2d');
const heroSection     = document.getElementById('hero');

// Overlay DOM
const overlayContainer = document.getElementById('heroOverlayInteractive');
const imgBase          = document.getElementById('imgBase');
const imgMeat          = document.getElementById('imgMeat');
const imgCatering      = document.getElementById('imgCatering');
const imgRestaurant    = document.getElementById('imgRestaurant');
const hoverGrid        = document.getElementById('hoverGrid');

// --- State ---
const frames       = new Array(FRAME_COUNT);
let currentFrame   = 0;
let targetFrame    = 0;
let isReady        = false;
let needsRender    = false;
let rafScheduled   = false;

// Interactive overlay state
let animationEnded  = false;
let hoveredSection  = null;

// Image map for quick lookup
const sectionImages = {
  meat:       imgMeat,
  catering:   imgCatering,
  restaurant: imgRestaurant,
};

/* -------------------------------------------
   1. BUILD FRAME FILE PATH
   ------------------------------------------- */
function frameSrc(index) {
  const padded = String(index).padStart(3, '0');
  return `${FRAME_PATH}Scroll${padded}${FRAME_EXT}`;
}

/* -------------------------------------------
   2. PRELOAD ALL FRAMES
   ------------------------------------------- */
function preloadFrames() {
  return new Promise((resolve) => {
    let loaded = 0;

    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.src   = frameSrc(i);

      img.onload = () => {
        frames[i] = img;
        loaded++;

        if (i === 0 && canvas.width > 0) {
          currentFrame = 0;
          drawFrame(0);
        }

        if (loaded === FRAME_COUNT) {
          isReady = true;
          resolve();
        }
      };

      img.onerror = () => {
        loaded++;
        if (loaded === FRAME_COUNT) {
          isReady = true;
          resolve();
        }
      };
    }
  });
}

/* -------------------------------------------
   3. SIZE CANVAS TO VIEWPORT (retina-aware)
   ------------------------------------------- */
function sizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = window.innerWidth  * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width  = window.innerWidth  + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.scale(dpr, dpr);

  drawFrame(currentFrame);
}

/* -------------------------------------------
   4. DRAW A FRAME — cover-fit
   ------------------------------------------- */
function drawFrame(index) {
  const img = frames[index];
  if (!img) return;

  const cw = canvas.width  / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);

  const imgRatio    = img.width / img.height;
  const canvasRatio = cw / ch;

  let drawW, drawH, offsetX, offsetY;

  if (canvasRatio > imgRatio) {
    drawW   = cw;
    drawH   = cw / imgRatio;
    offsetX = 0;
    offsetY = (ch - drawH) / 2;
  } else {
    drawH   = ch;
    drawW   = ch * imgRatio;
    offsetX = (cw - drawW) / 2;
    offsetY = 0;
  }

  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
}

/* -------------------------------------------
   5. rAF RENDER LOOP
   ------------------------------------------- */
function renderLoop() {
  rafScheduled = false;

  if (needsRender) {
    needsRender = false;

    if (targetFrame !== currentFrame && frames[targetFrame]) {
      currentFrame = targetFrame;
      drawFrame(currentFrame);
    }
  }
}

function scheduleRender() {
  if (!rafScheduled) {
    rafScheduled = true;
    requestAnimationFrame(renderLoop);
  }
}

/* -------------------------------------------
   6. OVERLAY STATE — setAnimationEnded
   Base image is locked at opacity-1 via CSS,
   so we only toggle the container visibility.
   ------------------------------------------- */
function setAnimationEnded(ended) {
  if (animationEnded === ended) return;
  animationEnded = ended;

  if (ended) {
    overlayContainer.classList.add('hero-overlay-interactive--active');
  } else {
    overlayContainer.classList.remove('hero-overlay-interactive--active');
    setHoveredSection(null);
  }
}

/* -------------------------------------------
   7. OVERLAY STATE — setHoveredSection
   Only highlights transition. When null, all
   highlights are opacity-0 → base shows through.
   ------------------------------------------- */
function setHoveredSection(section) {
  if (hoveredSection === section) return;
  hoveredSection = section;

  // Clear all highlights
  Object.values(sectionImages).forEach((el) => {
    el.classList.remove('hero-overlay-interactive__img--highlight-active');
  });

  // Activate the hovered highlight (if any)
  if (section !== null) {
    const targetImg = sectionImages[section];
    if (targetImg) {
      targetImg.classList.add('hero-overlay-interactive__img--highlight-active');
    }
  }
}

/* -------------------------------------------
   8. SCROLL HANDLER
   ------------------------------------------- */
const scrollIndicator = document.getElementById('scrollIndicator');

function onScroll() {
  const heroRect    = heroSection.getBoundingClientRect();
  const scrollTop   = -heroRect.top;
  const scrollRange = heroSection.offsetHeight - window.innerHeight;

  const progress = Math.min(Math.max(scrollTop / scrollRange, 0), 1);

  const frameIndex = Math.min(
    Math.floor(progress * (FRAME_COUNT - 1)),
    FRAME_COUNT - 1
  );

  if (frameIndex !== targetFrame) {
    targetFrame = frameIndex;
    needsRender = true;
    scheduleRender();
  }

  // Fade out scroll indicator on scroll
  if (progress > 0.02) {
    scrollIndicator.classList.add('hero-scroll-indicator--hidden');
  } else {
    scrollIndicator.classList.remove('hero-scroll-indicator--hidden');
  }

  // Activate overlay when scroll animation completes
  setAnimationEnded(progress >= 0.98);
}

/* -------------------------------------------
   9. HOVER GRID EVENT LISTENERS
   ------------------------------------------- */
function initHoverGrid() {
  const zones = hoverGrid.querySelectorAll('.hero-overlay-interactive__zone');

  zones.forEach((zone) => {
    const section = zone.dataset.section;

    zone.addEventListener('mouseenter', () => {
      if (animationEnded) {
        setHoveredSection(section);
      }
    });

    zone.addEventListener('mouseleave', () => {
      setHoveredSection(null);
    });
  });
}

/* -------------------------------------------
   10. BOOT SEQUENCE
   ------------------------------------------- */
async function init() {
  sizeCanvas();
  preloadFrames();

  window.addEventListener('scroll', onScroll, { passive: true });

  window.addEventListener('resize', () => {
    sizeCanvas();
    onScroll();
  });

  onScroll();
  initHoverGrid();
}

// --- Go ---
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
