const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealItems = document.querySelectorAll(".reveal");
const progressBar = document.querySelector(".scroll-progress-bar");
let progressFrame = 0;

const updateScrollProgress = () => {
  if (!progressBar) return;

  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  progressBar.style.transform = `scaleX(${Math.min(Math.max(progress, 0), 1)})`;
  progressFrame = 0;
};

const requestScrollProgressUpdate = () => {
  if (progressFrame) return;
  progressFrame = window.requestAnimationFrame(updateScrollProgress);
};

if ("IntersectionObserver" in window && !reducedMotion.matches) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.08, rootMargin: "0px 0px -4% 0px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
  document.documentElement.classList.add("motion-ready");
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

window.addEventListener("scroll", requestScrollProgressUpdate, { passive: true });
window.addEventListener("resize", requestScrollProgressUpdate);
requestScrollProgressUpdate();

const initializeHeroWave = () => {
  const hero = document.querySelector(".hero-section");
  const canvas = hero?.querySelector(".hero-wave");
  const context = canvas?.getContext("2d");
  if (!hero || !canvas || !context) return;

  let width = 1;
  let height = 1;
  let ratio = 1;
  let columns = 0;
  let rows = 0;
  let xPositions = [];
  let depths = [];
  let vertices = new Float32Array(0);
  let elapsed = 0;
  let previousFrame = null;
  let frame = null;
  let isVisible = hero.getBoundingClientRect().bottom > 0 &&
    hero.getBoundingClientRect().top < window.innerHeight;
  let disposed = false;
  let intersectionObserver;

  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    previousFrame = null;
  };

  const draw = (time) => {
    context.clearRect(0, 0, width, height);
    const focalLength = Math.min(width * 0.9, height * 1.05);
    const nearDepth = 1.8;
    const horizon = height * 0.29;
    const halfWidth = width * 0.9 * nearDepth / focalLength;

    for (let row = 0; row < rows; row += 1) {
      const depthProgress = row / (rows - 1);
      const depth = depths[row];
      const perspective = focalLength / depth;

      for (let column = 0; column < columns; column += 1) {
        const x = xPositions[column];
        const normalizedX = x / halfWidth;
        const wave = Math.sin(normalizedX * 5.8 + time * 0.55 + depthProgress * 3.1) * 0.11 +
          Math.sin(normalizedX * 3.2 - time * 0.36 + depthProgress * 5.4) * 0.05;
        const horizontalWave = Math.sin(normalizedX * 2.6 - time * 0.24 + depthProgress * 4.2) * 0.018;
        const index = (row * columns + column) * 2;
        vertices[index] = width * 0.5 + (x + horizontalWave) * perspective;
        vertices[index + 1] = horizon + (0.9 + wave) * perspective;
      }
    }

    context.lineWidth = 0.75;
    context.strokeStyle = "#5795f5";
    for (let row = 0; row < rows; row += 1) {
      context.globalAlpha = 0.1 + (1 - row / (rows - 1)) * 0.12;
      context.beginPath();
      for (let column = 0; column < columns; column += 1) {
        const index = (row * columns + column) * 2;
        if (column === 0) context.moveTo(vertices[index], vertices[index + 1]);
        else context.lineTo(vertices[index], vertices[index + 1]);
      }
      context.stroke();
    }

    context.globalAlpha = 0.16;
    for (let column = 0; column < columns; column += 1) {
      context.beginPath();
      for (let row = 0; row < rows; row += 1) {
        const index = (row * columns + column) * 2;
        if (row === 0) context.moveTo(vertices[index], vertices[index + 1]);
        else context.lineTo(vertices[index], vertices[index + 1]);
      }
      context.stroke();
    }
    context.globalAlpha = 1;
  };

  const start = () => {
    if (disposed || frame !== null || !isVisible || document.hidden || reducedMotion.matches) return;
    previousFrame = null;
    frame = window.requestAnimationFrame(animate);
  };

  const animate = (now) => {
    frame = null;
    if (disposed || !isVisible || document.hidden || reducedMotion.matches) return;
    if (previousFrame !== null) elapsed += (now - previousFrame) / 1000;
    previousFrame = now;
    draw(elapsed);
    frame = window.requestAnimationFrame(animate);
  };

  const resize = () => {
    const bounds = hero.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    ratio = Math.min(window.devicePixelRatio || 1, width < 600 ? 1.25 : 1.5);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    columns = width < 600 ? 17 : width < 900 ? 23 : 31;
    rows = width < 600 ? 9 : 13;
    xPositions = new Array(columns);
    depths = new Array(rows);
    vertices = new Float32Array(columns * rows * 2);

    const focalLength = Math.min(width * 0.9, height * 1.05);
    const nearDepth = 1.8;
    const halfWidth = width * 0.9 * nearDepth / focalLength;
    for (let column = 0; column < columns; column += 1) {
      xPositions[column] = ((column / (columns - 1)) * 2 - 1) * halfWidth;
    }
    for (let row = 0; row < rows; row += 1) {
      const progress = row / (rows - 1);
      depths[row] = nearDepth + (12 - nearDepth) * progress ** 1.65;
    }

    draw(reducedMotion.matches ? 0 : elapsed);
  };

  const handleMotionPreference = () => {
    if (reducedMotion.matches) {
      stop();
      draw(0);
    } else {
      start();
    }
  };

  const handleVisibility = () => {
    if (document.hidden) stop();
    else start();
  };

  const cleanup = () => {
    disposed = true;
    stop();
    intersectionObserver?.disconnect();
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", handleVisibility);
    reducedMotion.removeEventListener("change", handleMotionPreference);
  };

  resize();
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", handleVisibility);
  reducedMotion.addEventListener("change", handleMotionPreference);
  window.addEventListener("pagehide", cleanup, { once: true });

  if ("IntersectionObserver" in window) {
    intersectionObserver = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) start();
      else stop();
    });
    intersectionObserver.observe(hero);
  } else {
    start();
  }
  if (reducedMotion.matches) stop();
};

initializeHeroWave();

const assembleMonogram = () => {
  const mark = document.querySelector(".hero-mark");
  const letters = mark ? [...mark.querySelectorAll(".hero-monogram span")] : [];
  const canvas = mark?.querySelector(".hero-particles");
  const context = canvas?.getContext("2d");

  if (!mark || letters.length !== 2 || !canvas || !context || reducedMotion.matches) return;

  const bounds = mark.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, bounds.width);
  const height = Math.max(1, bounds.height);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);

  const source = document.createElement("canvas");
  source.width = canvas.width;
  source.height = canvas.height;
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return;

  sourceContext.scale(ratio, ratio);
  sourceContext.fillStyle = "#fff";
  sourceContext.textBaseline = "alphabetic";

  const markBounds = mark.getBoundingClientRect();
  letters.forEach((letter) => {
    const style = getComputedStyle(letter);
    const letterBounds = letter.getBoundingClientRect();
    const fontSize = parseFloat(style.fontSize);
    sourceContext.font = style.font;
    sourceContext.fillText(
      letter.textContent,
      letterBounds.left - markBounds.left,
      letterBounds.top - markBounds.top + fontSize * 0.83
    );
  });

  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const step = Math.max(3, Math.round(4.5 * ratio));
  const particles = [];

  for (let y = 0; y < source.height; y += step) {
    for (let x = 0; x < source.width; x += step) {
      const alpha = pixels[(y * source.width + x) * 4 + 3];
      if (alpha < 90) continue;
      const targetX = x / ratio;
      const targetY = y / ratio;
      particles.push({
        x: targetX + (Math.random() - 0.5) * 118,
        y: targetY + (Math.random() - 0.5) * 88,
        targetX,
        targetY,
        delay: Math.random() * 0.2,
        radius: 0.7 + Math.random() * 0.65,
        alpha: 0.45 + Math.random() * 0.5
      });
    }
  }

  if (!particles.length) return;

  document.documentElement.classList.add("is-assembling");
  const duration = 1280;
  let startTime;
  let hiddenAt;
  let pausedTime = 0;
  let frame = 0;

  const draw = (now) => {
    if (document.hidden) return;
    if (startTime === undefined) startTime = now;

    const elapsed = now - startTime - pausedTime;
    const progress = Math.min(elapsed / duration, 1);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.save();
    context.scale(ratio, ratio);

    particles.forEach((particle) => {
      const localProgress = Math.min(
        Math.max((progress - particle.delay) / (1 - particle.delay), 0),
        1
      );
      const ease = 1 - (1 - localProgress) ** 3;
      const drift = (1 - ease) * Math.sin(now / 140 + particle.targetY) * 3;
      const x = particle.x + (particle.targetX - particle.x) * ease;
      const y = particle.y + (particle.targetY - particle.y) * ease + drift;
      const opacity = particle.alpha * (0.3 + ease * 0.7);

      context.fillStyle = `rgba(242, 242, 240, ${opacity})`;
      context.beginPath();
      context.arc(x, y, particle.radius, 0, Math.PI * 2);
      context.fill();
    });

    context.restore();

    if (progress < 1) {
      frame = window.requestAnimationFrame(draw);
    } else {
      context.clearRect(0, 0, canvas.width, canvas.height);
      document.documentElement.classList.remove("is-assembling");
      document.documentElement.classList.add("is-assembled");
      document.removeEventListener("visibilitychange", handleVisibility);
    }
  };

  const handleVisibility = () => {
    if (document.hidden) {
      hiddenAt = performance.now();
      window.cancelAnimationFrame(frame);
      return;
    }

    if (hiddenAt !== undefined) {
      pausedTime += performance.now() - hiddenAt;
      hiddenAt = undefined;
    }
    frame = window.requestAnimationFrame(draw);
  };

  document.addEventListener("visibilitychange", handleVisibility);
  frame = window.requestAnimationFrame(draw);
};

if (!reducedMotion.matches && document.fonts?.ready) {
  document.fonts.ready.then(assembleMonogram);
}

const phoneTrigger = document.querySelector(".phone-choice-trigger");
const phoneDialog = document.querySelector("#phone-choice-dialog");
const phoneDialogClose = phoneDialog?.querySelector(".phone-choice-close");

if (phoneTrigger && phoneDialog && phoneDialogClose) {
  phoneTrigger.addEventListener("click", () => phoneDialog.showModal());
  phoneDialogClose.addEventListener("click", () => phoneDialog.close());
  phoneDialog.addEventListener("click", (event) => {
    if (event.target === phoneDialog) phoneDialog.close();
  });
  phoneDialog.addEventListener("close", () => phoneTrigger.focus());
}
