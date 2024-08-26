import { clear, draw, resize, Sprite, write } from "./canvas";
import * as sprites from "./sprites";
import { pick, random } from "./utils";
import {
  GET,
  SET,
  SWP,
  ADD,
  SUB,
  TEQ,
  TLT,
  TGT,
  SND,
  END,
  DBG,
  DAT,
  STK,
  UP,
  DOWN,
  LEFT,
  RIGHT,
  PROGRAM_COLS,
  PROGRAM_ROWS,
  INSTR_OPCODE,
  INSTR_OPERAND,
  INSTR_MODE,
  INSTR_DIRS,
  NIL,
  exec,
  NOP,
  ADDRESS_MODE,
  IMMEDIATE_MODE,
  memory,
  CYC,
  IP,
  SP,
  STACK_LENGTH,
  PROGRAM_SIZE,
  INSTR_WIDTH,
  PRG,
  jump,
  fetch,
  dump,
  load,
  cycle,
} from "./vm";

// RENDERING
const CELL_SIZE_PIXELS = 19;
const WHITE = "white";
const RED_1 = "#541828";
const RED_2 = "#931c31";
const GREEN_1 = "#18544c";
const GREEN_2 = "#3e9379";
const BLUE_1 = "#1d2040";
const BLUE_2 = "#1e409f";
const GRAY_1 = "#303030";
const GRAY_2 = "#747474";
const PURPLE_1 = "#541847";
const PURPLE_2 = "#813e93";
const YELLOW_1 = "#684817";
const YELLOW_2 = "#d7a12c";

/**
 * Snapshots of all previous memories.
 */
let history: Uint8ClampedArray[] = [];

/**
 * The position of the mouse cursor onscreen.
 */
let cursor: { x: number; y: number } | undefined;

/**
 * Opcode info lookup.
 */
let OPCODES: {
  [opcode: string]: { label: string; hint: string } | undefined;
} = {
  [GET]: { label: "LOD", hint: "READ VALUE INTO DEBUGGER" },
  [SET]: { label: "MOV", hint: "WRITE VALUE FROM DEBUGGER" },
  [SWP]: { label: "SWP", hint: "SWAP VALUE WITH DEBUGGER" },
  [ADD]: { label: "ADD", hint: "ADD VALUE TO DEBUGGER" },
  [SUB]: { label: "SUB", hint: "SUB VALUE FROM DEBUGGER" },
  [TEQ]: { label: "TEQ", hint: "TEST IF DEBUGGER IS EQUAL" },
  [TLT]: { label: "TLT", hint: "TEST IF DEBUGGER IS LESS THAN" },
  [TGT]: { label: "TGT", hint: "TEST IF DEBUGGER IS GREATER THAN" },
  [SND]: { label: "SND", hint: "SEND VALUE" },
  [END]: { label: "END", hint: "END PROGRAM" },
};

/**
 * Register info lookup.
 */
let REGISTERS: {
  [name: string]: { label: string; hint: string } | undefined;
} = {
  [DAT]: { label: "DAT", hint: "" },
  [STK]: { label: "STK", hint: "" },
};

/**
 * Get the instruction address under a given point.
 */
function lookup(x: number, y: number): number | undefined {
  // TODO: Handle OOB properly.
  let gridX = (x / CELL_SIZE_PIXELS) | 0;
  let gridY = (y / CELL_SIZE_PIXELS) | 0;
  return gridX + gridY * PROGRAM_COLS;
}

/**
 * Draw a cell on the grid.
 */
function drawCell(
  x: number,
  y: number,
  sprite: Sprite,
  spriteColor: string,
  label: string,
  labelColor: string,
  value: string | number | undefined,
  valueColor: string,
  arrows?: number,
  arrowColor?: string,
) {
  let dx = x * CELL_SIZE_PIXELS;
  let dy = y * CELL_SIZE_PIXELS;

  draw(sprite, dx, dy, spriteColor);

  if (label) {
    write(dx + 4, dy + 4, label, labelColor);
  }

  if (value === "DAT") valueColor = YELLOW_2;
  if (value === "STK") valueColor = PURPLE_2;

  if (value !== undefined) {
    write(dx + 4, dy + 10, value.toString().padStart(3), valueColor);
  }

  if (arrows) {
    if (arrows & UP) draw(sprites.arrow_up, dx + 8, dy, arrowColor);
    if (arrows & DOWN) draw(sprites.arrow_down, dx + 8, dy + 16, arrowColor);
    if (arrows & LEFT) draw(sprites.arrow_left, dx, dy + 8, arrowColor);
    if (arrows & RIGHT) draw(sprites.arrow_right, dx + 16, dy + 8, arrowColor);
  }
}

/**
 * Draw a specific instruction.
 */
function drawInstruction(x: number, y: number) {
  let ptr = x + y * PROGRAM_COLS;
  let opcode = fetch(ptr, INSTR_OPCODE);
  let operand = fetch(ptr, INSTR_OPERAND);
  let mode = fetch(ptr, INSTR_MODE);
  let dirs = fetch(ptr, INSTR_DIRS);
  let color = GRAY_1;

  if (opcode === NIL) return;

  let sprite = sprites.cell;

  if (opcode >= TEQ && opcode <= TGT) {
    color = exec(ptr) ? GREEN_1 : RED_1;
  } else if (opcode === END) {
    color = BLUE_1;
  }

  let opcodeInfo = OPCODES[opcode];
  let operandInfo = REGISTERS[operand];
  let name = opcodeInfo?.label;
  let value: string | number | undefined;

  if (opcode === NOP || opcode === END || opcode === SND) {
    value = "";
  } else if (mode === ADDRESS_MODE || opcode === SWP || opcode === SET) {
    value = operandInfo?.label;
  } else if (mode === IMMEDIATE_MODE) {
    value = operand;
  }

  let labelColor = opcode === END ? BLUE_2 : GRAY_2;

  drawCell(
    x,
    y,
    sprite,
    color,
    name!,
    labelColor,
    value,
    "white",
    dirs,
    "gray",
  );
}

/**
 * Draw the states of the registers.
 */
function drawRegisters() {
  let sprite = sprites.cell_register;
  drawCell(0, 7, sprite, YELLOW_1, "DAT", YELLOW_1, memory[DAT], YELLOW_2);
  drawCell(0, 8, sprite, GRAY_1, "CYC", GRAY_2, memory[CYC], WHITE);
  drawCell(1, 8, sprite, GRAY_1, "IP", GRAY_2, memory[IP], WHITE);
  drawCell(2, 8, sprite, GRAY_1, "SP", GRAY_2, memory[SP], WHITE);
  drawCell(3, 8, sprite, GRAY_1, "DBG", GRAY_2, memory[DBG], WHITE);

  for (let i = 0; i < STACK_LENGTH; i++) {
    let value = memory[STK + i];
    let label = i === memory[SP] ? "STK" : i.toString().padStart(3);
    drawCell(1 + i, 7, sprite, PURPLE_1, label, PURPLE_1, value, PURPLE_2);
  }
}

/**
 * Draw the character (the debugger).
 */
function drawDebugger() {
  let t = performance.now();
  let ip = memory[IP];
  let x = ip % PROGRAM_COLS;
  let y = (ip / PROGRAM_COLS) | 0;
  let dx = x * CELL_SIZE_PIXELS;
  let dy = y * CELL_SIZE_PIXELS;
  let hop = (t / 250) % 2 | 0;
  let sprite = hop ? sprites.pointer : sprites.pointer_idle;
  let value = memory[DBG].toString().padStart(3);

  draw(sprite, dx, dy);
  write(dx + 4, dy - hop + 10, value);
}

function render() {
  clear();

  // Instructions
  for (let x = 0; x < PROGRAM_COLS; x++) {
    for (let y = 0; y < PROGRAM_ROWS; y++) {
      drawInstruction(x, y);
    }
  }

  // Registers
  drawRegisters();

  // Debugger
  drawDebugger();

  // Cursor
  if (cursor) {
    draw(sprites.cursor, cursor.x, cursor.y);
  }
}

function undo() {
  if (history.length) {
    load(history.pop()!);
  }
}

function init() {
  for (let i = 0; i < PROGRAM_SIZE; i += INSTR_WIDTH) {
    let mode = pick(ADDRESS_MODE, IMMEDIATE_MODE);
    let opcode = pick(NIL, NOP, random(END + 1));
    let operand = mode === ADDRESS_MODE ? pick(DAT, STK) : random(100);
    let dirs = pick(0, UP, LEFT, RIGHT, DOWN);

    let ptr = PRG + i;
    memory[ptr + INSTR_OPCODE] = opcode;
    memory[ptr + INSTR_OPERAND] = operand;
    memory[ptr + INSTR_MODE] = mode;
    memory[ptr + INSTR_DIRS] = dirs;
  }
}

function loop() {
  requestAnimationFrame(loop);
  render();
}

function start() {
  init();
  resize();
  loop();
}

onresize = () => {
  resize();
};

onpointermove = ({ clientX, clientY }) => {
  let bounds = c.getBoundingClientRect();
  let canvasX = clientX - bounds.x;
  let canvasY = clientY - bounds.y;
  let scaleX = c.width / bounds.width;
  let scaleY = c.height / bounds.height;
  let x = (canvasX * scaleX) | 0;
  let y = (canvasY * scaleY) | 0;
  cursor = { x, y };
};

onkeydown = ({ key }) => {
  let temp = dump();
  let ok = false;

  if (key === "h") ok = jump(memory[IP] - 1);
  if (key === "j") ok = jump(memory[IP] + PROGRAM_COLS);
  if (key === "k") ok = jump(memory[IP] - PROGRAM_COLS);
  if (key === "l") ok = jump(memory[IP] + 1);

  if (key === " " && cursor) {
    let ptr = lookup(cursor.x, cursor.y);
    if (ptr !== undefined && ptr !== memory[IP]) {
      ok = jump(ptr);
    }
  }

  if (key === "Backspace" || key === "z") {
    undo();
  }

  if (ok) {
    history.push(temp);
    cycle();
  }
};

start();
