const uploadInput = document.getElementById("uploadInput");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d", { willReadFrequently: true });
const canvasWrap = document.getElementById("canvasWrap");
const cropRectEl = document.getElementById("cropRect");
const emptyText = document.getElementById("emptyText");

const widthInput = document.getElementById("widthInput");
const heightInput = document.getElementById("heightInput");
const lockAspect = document.getElementById("lockAspect");
const qualityInput = document.getElementById("qualityInput");
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
  startY: 0
};

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function updateSizeInfo() {
  if (!state.imageLoaded) {
    sizeInfo.textContent = "Upload an image to see size details.";
    return;
  }
  const pixels = canvas.width * canvas.height;
  const estimatedPngKb = Math.round((pixels * 4) / 1024);
  sizeInfo.textContent = `Canvas: ${canvas.width}x${canvas.height}px | Approx raw size: ${estimatedPngKb} KB | Original upload: ${Math.round(state.originalBlobSize / 1024)} KB`;
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
  emptyText.classList.add("hidden");
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
});

function downloadCanvas(mime, quality, fileName) {
  if (!state.imageLoaded) return;
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
    },
    mime,
    quality
  );
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  downloadCanvas("image/png", 1, "pankaj-edited-photo.png");
});

document.getElementById("downloadJpg").addEventListener("click", () => {
  const quality = Number(qualityInput.value);
  downloadCanvas("image/jpeg", quality, "pankaj-edited-photo.jpg");
});

function clearCropVisual() {
  state.crop = null;
  cropRectEl.classList.add("hidden");
}

function getCanvasCoords(event) {
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
  const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
  return { x: clamp(x, 0, canvas.width), y: clamp(y, 0, canvas.height) };
}

canvas.addEventListener("mousedown", (event) => {
  if (!state.imageLoaded) return;
  state.dragging = true;
  const p = getCanvasCoords(event);
  state.startX = p.x;
  state.startY = p.y;
  state.crop = { x: p.x, y: p.y, w: 0, h: 0 };
  cropRectEl.classList.remove("hidden");
});

window.addEventListener("mousemove", (event) => {
  if (!state.dragging || !state.crop) return;
  const p = getCanvasCoords(event);

  const x = Math.min(state.startX, p.x);
  const y = Math.min(state.startY, p.y);
  const w = Math.abs(p.x - state.startX);
  const h = Math.abs(p.y - state.startY);

  state.crop = { x, y, w, h };

  const rect = canvas.getBoundingClientRect();
  const left = (x / canvas.width) * rect.width;
  const top = (y / canvas.height) * rect.height;
  const cw = (w / canvas.width) * rect.width;
  const ch = (h / canvas.height) * rect.height;

  cropRectEl.style.left = `${left}px`;
  cropRectEl.style.top = `${top}px`;
  cropRectEl.style.width = `${cw}px`;
  cropRectEl.style.height = `${ch}px`;
});

window.addEventListener("mouseup", () => {
  state.dragging = false;
});

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
  clearCropVisual();
});

document.getElementById("clearCrop").addEventListener("click", clearCropVisual);

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
}

document.getElementById("rotateLeft").addEventListener("click", () => rotateCanvas(-90));
document.getElementById("rotateRight").addEventListener("click", () => rotateCanvas(90));

function flipCanvas(horizontal) {
  if (!state.imageLoaded) return;
  const temp = document.createElement("canvas");
  temp.width = canvas.width;
  temp.height = canvas.height;
  const tctx = temp.getContext("2d");

  tctx.save();
  if (horizontal) {
    tctx.translate(temp.width, 0);
    tctx.scale(-1, 1);
  } else {
    tctx.translate(0, temp.height);
    tctx.scale(1, -1);
  }
  tctx.drawImage(canvas, 0, 0);
  tctx.restore();

  replaceCanvas(temp);
}

document.getElementById("flipH").addEventListener("click", () => flipCanvas(true));
document.getElementById("flipV").addEventListener("click", () => flipCanvas(false));

function sampleEdgeColor() {
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const picks = [];

  for (let x = 0; x < canvas.width; x += Math.max(1, Math.floor(canvas.width / 80))) {
    picks.push((0 * canvas.width + x) * 4);
    picks.push(((canvas.height - 1) * canvas.width + x) * 4);
  }
  for (let y = 0; y < canvas.height; y += Math.max(1, Math.floor(canvas.height / 80))) {
    picks.push((y * canvas.width + 0) * 4);
    picks.push((y * canvas.width + (canvas.width - 1)) * 4);
  }

  let r = 0;
  let g = 0;
  let b = 0;
  picks.forEach((idx) => {
    r += img[idx];
    g += img[idx + 1];
    b += img[idx + 2];
  });

  return { r: r / picks.length, g: g / picks.length, b: b / picks.length };
}

function removeBackground() {
  if (!state.imageLoaded) return;

  const threshold = Number(document.getElementById("bgStrength").value);
  const edge = sampleEdgeColor();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const dr = data[i] - edge.r;
    const dg = data[i + 1] - edge.g;
    const db = data[i + 2] - edge.b;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);

    if (dist < threshold) {
      data[i + 3] = 0;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

document.getElementById("removeBg").addEventListener("click", removeBackground);

function softenTransparentEdges() {
  if (!state.imageLoaded) return;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for (let y = 1; y < canvas.height - 1; y += 1) {
    for (let x = 1; x < canvas.width - 1; x += 1) {
      const i = (y * canvas.width + x) * 4;
      if (data[i + 3] === 0) continue;

      let transparentNeighbors = 0;
      for (let oy = -1; oy <= 1; oy += 1) {
        for (let ox = -1; ox <= 1; ox += 1) {
          const ni = ((y + oy) * canvas.width + (x + ox)) * 4;
          if (data[ni + 3] === 0) transparentNeighbors += 1;
        }
      }

      if (transparentNeighbors >= 3) {
        data[i + 3] = Math.max(30, data[i + 3] - transparentNeighbors * 18);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

document.getElementById("softBg").addEventListener("click", softenTransparentEdges);

document.getElementById("resetBtn").addEventListener("click", () => {
  uploadInput.value = "";
  state.imageLoaded = false;
  state.originalBlobSize = 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  canvas.width = 900;
  canvas.height = 600;
  emptyText.classList.remove("hidden");
  clearCropVisual();

  widthInput.value = "";
  heightInput.value = "";

  Object.values(controls).forEach((slider) => {
    slider.value = 0;
  });
  qualityInput.value = 0.92;
  document.getElementById("bgStrength").value = 32;
  updateSizeInfo();
});

updateSizeInfo();
