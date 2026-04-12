const uploadInput = document.getElementById("uploadInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const canvasWrap = document.getElementById("canvasWrap");
const cropRectEl = document.getElementById("cropRect");

const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const lockAspect = document.getElementById("lockAspect");
const qualityInput = document.getElementById("qualityInput");
const targetSizeInput = document.getElementById("targetSizeInput");
const targetSizeUnit = document.getElementById("targetSizeUnit");
const cropAspect = document.getElementById("cropAspect");
const sizeInfo = document.getElementById("sizeInfo");

const controls = {
  brightness: document.getElementById("brightness"),
  contrast: document.getElementById("contrast"),
  saturation: document.getElementById("saturation"),
  blur: document.getElementById("blur"),
  sharpen: document.getElementById("sharpen")
};

const state = {
  originalBlobSize: 0,
  imageLoaded: false,
  aspectRatio: 1,
  crop: null,
  dragging: false,
  startX: 0,
  startY: 0,
  history: [],
  applyingHistory: false
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function parseAspectRatio(value) {
  if (!value || value === "free") {
    return null;
  }
  const [w, h] = value.split(":").map(Number);
  if (!w || !h) return null;
  return w / h;
}

function updateSizeInfo(message) {
  if (message) {
    sizeInfo.textContent = message;
    return;
  }
  if (!state.imageLoaded) {
    sizeInfo.textContent = "Select an image to begin.";
    return;
  }
  const pixels = canvas.width * canvas.height;
  const estimatedPngKb = Math.round((pixels * 4) / 1024);
  sizeInfo.textContent = `Canvas: ${canvas.width}x${canvas.height}px | Approx raw size: ${estimatedPngKb} KB | Original upload: ${Math.round(state.originalBlobSize / 1024)} KB`;
}

function captureHistory() {
  if (!state.imageLoaded || state.applyingHistory) return;

  const snapshot = {
    dataUrl: canvas.toDataURL("image/png"),
    width: canvas.width,
    height: canvas.height,
    aspectRatio: state.aspectRatio
  };

  const last = state.history[state.history.length - 1];
  if (last && last.dataUrl === snapshot.dataUrl) return;

  state.history.push(snapshot);
  if (state.history.length > 15) {
    state.history.shift();
  }
}

function restoreSnapshot(snapshot) {
  state.applyingHistory = true;
  const img = new Image();
  img.onload = () => {
    canvas.width = snapshot.width;
    canvas.height = snapshot.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    widthInput.value = canvas.width;
    heightInput.value = canvas.height;
    state.aspectRatio = snapshot.aspectRatio || (canvas.width / canvas.height);
    state.imageLoaded = true;
    clearCropVisual();
    updateSizeInfo();
    state.applyingHistory = false;
  };
  img.src = snapshot.dataUrl;
}

function commitState() {
  captureHistory();
}

function drawImageToCanvas(img) {
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0);

  widthInput.value = canvas.width;
  heightInput.value = canvas.height;
  state.aspectRatio = canvas.width / canvas.height;
  state.imageLoaded = true;
  state.history = [];
  captureHistory();
  clearCropVisual();
  updateSizeInfo();
}

uploadInput.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  state.originalBlobSize = file.size;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => drawImageToCanvas(img);
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
});

widthInput.addEventListener("input", () => {
  if (!lockAspect.checked || !state.aspectRatio) return;
  const w = Number(widthInput.value);
  if (!w) return;
  heightInput.value = Math.max(1, Math.round(w / state.aspectRatio));
});

heightInput.addEventListener("input", () => {
  if (!lockAspect.checked || !state.aspectRatio) return;
  const h = Number(heightInput.value);
  if (!h) return;
  widthInput.value = Math.max(1, Math.round(h * state.aspectRatio));
});

function replaceCanvas(newCanvas) {
  canvas.width = newCanvas.width;
  canvas.height = newCanvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(newCanvas, 0, 0);
  widthInput.value = canvas.width;
  heightInput.value = canvas.height;
  state.aspectRatio = canvas.width / canvas.height;
  updateSizeInfo();
}

function getTargetBytes() {
  const amount = Number(targetSizeInput.value);
  if (!amount || amount <= 0) return null;
  return targetSizeUnit.value === "MB" ? amount * 1024 * 1024 : amount * 1024;
}

function exportImage(mime, quality, fileName) {
  if (!state.imageLoaded) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  }, mime, quality);
}

async function exportAtTargetSize() {
  if (!state.imageLoaded) return;

  const targetBytes = getTargetBytes();
  if (!targetBytes) {
    exportImage("image/jpeg", Number(qualityInput.value), "pankaj-edited-photo.jpg");
    return;
  }

  let low = 0.2;
  let high = 1;
  let bestBlob = null;
  let bestDiff = Infinity;

  for (let i = 0; i < 8; i += 1) {
    const quality = (low + high) / 2;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob) break;

    const diff = Math.abs(blob.size - targetBytes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestBlob = blob;
    }

    if (blob.size > targetBytes) high = quality;
    else low = quality;
  }

  if (!bestBlob) {
    exportImage("image/jpeg", Number(qualityInput.value), "pankaj-edited-photo.jpg");
    return;
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(bestBlob);
  const suffix = targetSizeUnit.value === "MB" ? `${Number(targetSizeInput.value)}mb` : `${Number(targetSizeInput.value)}kb`;
  link.download = `pankaj-edited-photo-${suffix}.jpg`;
  link.click();
  URL.revokeObjectURL(link.href);
}

document.getElementById("applyResize").addEventListener("click", () => {
  if (!state.imageLoaded) return;

  const targetW = clamp(Number(widthInput.value) || canvas.width, 32, 4000);
  const targetH = clamp(Number(heightInput.value) || canvas.height, 32, 4000);

  const temp = document.createElement("canvas");
  temp.width = targetW;
  temp.height = targetH;
  const tctx = temp.getContext("2d");
  tctx.drawImage(canvas, 0, 0, targetW, targetH);
  replaceCanvas(temp);
  commitState();
});

document.getElementById("downloadBtn").addEventListener("click", () => {
  exportImage("image/png", 1, "pankaj-edited-photo.png");
});

document.getElementById("downloadJpg").addEventListener("click", () => {
  exportImage("image/jpeg", Number(qualityInput.value), "pankaj-edited-photo.jpg");
});

document.getElementById("downloadTarget").addEventListener("click", exportAtTargetSize);

document.getElementById("undoBtn").addEventListener("click", () => {
  if (state.history.length < 2) return;
  state.history.pop();
  const snapshot = state.history[state.history.length - 1];
  if (snapshot) restoreSnapshot(snapshot);
});

function clearCropVisual() {
  state.crop = null;
  cropRectEl.classList.add("hidden");
  cropRectEl.style.width = "0px";
  cropRectEl.style.height = "0px";
}

function renderCropRect() {
  if (!state.crop) {
    clearCropVisual();
    return;
  }

  const { x, y, w, h } = state.crop;
  if (w < 1 || h < 1) return;

  const rect = canvas.getBoundingClientRect();
  const left = (x / canvas.width) * rect.width;
  const top = (y / canvas.height) * rect.height;
  const cw = (w / canvas.width) * rect.width;
  const ch = (h / canvas.height) * rect.height;

  const wrapRect = canvasWrap.getBoundingClientRect();
  cropRectEl.style.left = `${left + (rect.left - wrapRect.left)}px`;
  cropRectEl.style.top = `${top + (rect.top - wrapRect.top)}px`;
  cropRectEl.style.width = `${cw}px`;
  cropRectEl.style.height = `${ch}px`;
  cropRectEl.classList.remove("hidden");
}

function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x: clamp(x, 0, canvas.width), y: clamp(y, 0, canvas.height) };
}

canvas.addEventListener("pointerdown", (event) => {
  if (!state.imageLoaded) return;
  state.dragging = true;
  canvas.setPointerCapture(event.pointerId);
  const p = getCanvasCoords(event);
  state.startX = p.x;
  state.startY = p.y;
  state.crop = { x: p.x, y: p.y, w: 0, h: 0 };
  renderCropRect();
});

window.addEventListener("pointermove", (event) => {
  if (!state.dragging || !state.crop) return;
  const p = getCanvasCoords(event);

  let x = Math.min(state.startX, p.x);
  let y = Math.min(state.startY, p.y);
  let w = Math.abs(p.x - state.startX);
  let h = Math.abs(p.y - state.startY);

  const ratio = parseAspectRatio(cropAspect.value);
  if (ratio) {
    if (w / Math.max(1, h) > ratio) {
      w = h * ratio;
    } else {
      h = w / ratio;
    }

    if (p.x < state.startX) x = state.startX - w;
    if (p.y < state.startY) y = state.startY - h;

    x = clamp(x, 0, canvas.width - w);
    y = clamp(y, 0, canvas.height - h);
  }

  state.crop = { x, y, w, h };
  renderCropRect();
});

window.addEventListener("pointerup", () => {
  state.dragging = false;
});

function createCenterCrop() {
  if (!state.imageLoaded) return;
  const ratio = parseAspectRatio(cropAspect.value);

  let w = Math.round(canvas.width * 0.7);
  let h = Math.round(canvas.height * 0.7);

  if (ratio) {
    if (canvas.width / canvas.height > ratio) {
      h = Math.round(canvas.height * 0.75);
      w = Math.round(h * ratio);
    } else {
      w = Math.round(canvas.width * 0.75);
      h = Math.round(w / ratio);
    }
  }

  w = clamp(w, 10, canvas.width);
  h = clamp(h, 10, canvas.height);

  state.crop = {
    x: Math.round((canvas.width - w) / 2),
    y: Math.round((canvas.height - h) / 2),
    w,
    h
  };
  renderCropRect();
}

document.getElementById("centerCrop").addEventListener("click", createCenterCrop);

document.getElementById("applyCrop").addEventListener("click", () => {
  if (!state.imageLoaded || !state.crop) return;
  const { x, y, w, h } = state.crop;
  if (w < 8 || h < 8) return;

  const temp = document.createElement("canvas");
  temp.width = Math.round(w);
  temp.height = Math.round(h);
  const tctx = temp.getContext("2d");
  tctx.drawImage(canvas, x, y, w, h, 0, 0, temp.width, temp.height);
  replaceCanvas(temp);
  commitState();
  clearCropVisual();
});

document.getElementById("clearCrop").addEventListener("click", clearCropVisual);

function nudgeCrop(dx, dy) {
  if (!state.crop) {
    updateSizeInfo("Create crop selection first, then use arrow buttons.");
    return;
  }

  state.crop.x = clamp(state.crop.x + dx, 0, Math.max(0, canvas.width - state.crop.w));
  state.crop.y = clamp(state.crop.y + dy, 0, Math.max(0, canvas.height - state.crop.h));
  renderCropRect();
}

document.getElementById("cropUp").addEventListener("click", () => nudgeCrop(0, -5));
document.getElementById("cropDown").addEventListener("click", () => nudgeCrop(0, 5));
document.getElementById("cropLeft").addEventListener("click", () => nudgeCrop(-5, 0));
document.getElementById("cropRight").addEventListener("click", () => nudgeCrop(5, 0));

window.addEventListener("keydown", (event) => {
  if (!state.crop) return;
  if (event.key === "ArrowUp") {
    event.preventDefault();
    nudgeCrop(0, -1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    nudgeCrop(0, 1);
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    nudgeCrop(-1, 0);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    nudgeCrop(1, 0);
  }
});

function applyKernel(kernel, divisor = 1, bias = 0) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const src = imageData.data;
  const out = new Uint8ClampedArray(src.length);
  const side = Math.sqrt(kernel.length);
  const half = Math.floor(side / 2);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      const dstOff = (y * canvas.width + x) * 4;

      for (let ky = 0; ky < side; ky += 1) {
        for (let kx = 0; kx < side; kx += 1) {
          const px = clamp(x + kx - half, 0, canvas.width - 1);
          const py = clamp(y + ky - half, 0, canvas.height - 1);
          const srcOff = (py * canvas.width + px) * 4;
          const wt = kernel[ky * side + kx];
          r += src[srcOff] * wt;
          g += src[srcOff + 1] * wt;
          b += src[srcOff + 2] * wt;
        }
      }

      out[dstOff] = clamp(r / divisor + bias, 0, 255);
      out[dstOff + 1] = clamp(g / divisor + bias, 0, 255);
      out[dstOff + 2] = clamp(b / divisor + bias, 0, 255);
      out[dstOff + 3] = src[dstOff + 3];
    }
  }

  imageData.data.set(out);
  ctx.putImageData(imageData, 0, 0);
}

function applyEnhancements() {
  if (!state.imageLoaded) return;

  const brightness = Number(controls.brightness.value);
  const contrast = Number(controls.contrast.value);
  const saturation = Number(controls.saturation.value);
  const blur = Number(controls.blur.value);
  const sharpen = Number(controls.sharpen.value);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const cFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i] + brightness;
    let g = data[i + 1] + brightness;
    let b = data[i + 2] + brightness;

    r = cFactor * (r - 128) + 128;
    g = cFactor * (g - 128) + 128;
    b = cFactor * (b - 128) + 128;

    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    const satFactor = (saturation + 100) / 100;

    data[i] = clamp(gray + satFactor * (r - gray), 0, 255);
    data[i + 1] = clamp(gray + satFactor * (g - gray), 0, 255);
    data[i + 2] = clamp(gray + satFactor * (b - gray), 0, 255);
  }

  ctx.putImageData(imageData, 0, 0);

  if (blur > 0) {
    const level = Math.round(blur);
    for (let i = 0; i < level; i += 1) {
      applyKernel([1, 2, 1, 2, 4, 2, 1, 2, 1], 16);
    }
  }

  if (sharpen > 0) {
    const level = Math.round(sharpen);
    for (let i = 0; i < level; i += 1) {
      applyKernel([0, -1, 0, -1, 5, -1, 0, -1, 0]);
    }
  }

  commitState();
}

document.getElementById("applyEnhance").addEventListener("click", applyEnhancements);

function rotateCanvas(deg) {
  if (!state.imageLoaded) return;
  const radians = (deg * Math.PI) / 180;
  const swap = Math.abs(deg) % 180 === 90;

  const temp = document.createElement("canvas");
  temp.width = swap ? canvas.height : canvas.width;
  temp.height = swap ? canvas.width : canvas.height;

  const tctx = temp.getContext("2d");
  tctx.translate(temp.width / 2, temp.height / 2);
  tctx.rotate(radians);
  tctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
  replaceCanvas(temp);
  commitState();
}

document.getElementById("rotateLeft").addEventListener("click", () => rotateCanvas(-90));
document.getElementById("rotateRight").addEventListener("click", () => rotateCanvas(90));

function flipCanvas(horizontal) {
  if (!state.imageLoaded) return;
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");
  if (horizontal) {
    tctx.setTransform(-1, 0, 0, 1, temp.width, 0);
  } else {
    tctx.setTransform(1, 0, 0, -1, 0, temp.height);
  }
  tctx.drawImage(canvas, 0, 0);
  replaceCanvas(temp);
  commitState();
}

document.getElementById("flipH").addEventListener("click", () => flipCanvas(true));
document.getElementById("flipV").addEventListener("click", () => flipCanvas(false));

document.getElementById("resetBtn").addEventListener("click", () => {
  uploadInput.value = "";
  state.imageLoaded = false;
  state.originalBlobSize = 0;
  state.history = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 900;
  canvas.height = 600;
  clearCropVisual();

  widthInput.value = "";
  heightInput.value = "";
  targetSizeInput.value = "";

  Object.values(controls).forEach((slider) => {
    slider.value = 0;
  });
  qualityInput.value = 0.92;
  cropAspect.value = "free";
  updateSizeInfo();
});

updateSizeInfo();
