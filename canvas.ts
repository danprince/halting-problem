import spritesUrl from "./sprites.png";

declare global {
  const c: HTMLCanvasElement;
}

const SCALE_MIN = 3.5;
export const GLYPH_WIDTH = 4;
export const GLYPH_HEIGHT = 5;
export const LINE_HEIGHT = 6;

export let sprites = new Image();
sprites.src = spritesUrl;

export let recoloredSprites: Record<string, HTMLCanvasElement> = {};

export interface Sprite {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const ctx = c.getContext("2d")!;

export function alpha(value: number) {
  ctx.globalAlpha = value;
}

export function recolor(color: string): HTMLCanvasElement | HTMLImageElement {
  if (!sprites.complete) {
    return sprites;
  }

  let canvas = recoloredSprites[color];

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = sprites.width;
    canvas.height = sprites.height;
    let ctx = canvas.getContext("2d")!;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "destination-atop";
    ctx.drawImage(sprites, 0, 0);
    recoloredSprites[color] = canvas;
  }

  return canvas;
}

export function resize() {
  let scale = Math.min(SCALE_MIN, innerWidth / c.width, innerHeight / c.height);
  c.style.width = `${c.width * scale}px`;
  c.style.height = `${c.height * scale}px`;
  ctx.imageSmoothingEnabled = false;
}

export function clear() {
  ctx.clearRect(0, 0, c.width, c.height);
}

export function rect(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = "black",
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function frame(
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = "white",
) {
  rect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.strokeRect(x - 0.5, y - 0.5, w + 1, h + 1);
}

export function label(
  x: number,
  y: number,
  text: string,
  color?: string,
  frameColor?: string,
  align: "left" | "center" | "right" = "left",
) {
  let textWidth = text.length * GLYPH_WIDTH;
  let textHeight = GLYPH_HEIGHT;
  let frameWidth = textWidth + 2;
  let frameHeight = textHeight + 2;
  if (align === "center") x -= frameWidth / 2;
  if (align === "right") x -= frameWidth;
  (x |= 0), (y |= 0);
  frame(x, y, frameWidth, frameHeight, frameColor);
  write(x + 1, y + 1, text, color);
}

export function draw(sprite: Sprite, x: number, y: number, color?: string) {
  let image = color ? recolor(color) : sprites;
  let { x: sx, y: sy, w, h } = sprite;
  ctx.drawImage(image, sx, sy, w, h, x | 0, y | 0, w, h);
}

let codepage = Array.from({ length: 122 }).map((_, code: number) => {
  if (code > 123) return code - 65; // {|}~
  if (code > 96) return code - 65; // abc...
  return code - 33;
});

export function write(x: number, y: number, text: string, color?: string) {
  let w = GLYPH_WIDTH;
  let h = GLYPH_HEIGHT;
  let image = color ? recolor(color) : sprites;

  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    let index = codepage[code];
    let sx = index * GLYPH_WIDTH;
    let sy = 0;
    ctx.drawImage(image, sx, sy, w, h, x, y, w, h);
    x += w;
  }
}
