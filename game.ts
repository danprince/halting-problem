import {
  clear,
  draw,
  frame,
  label,
  LINE_HEIGHT,
  rect,
  resize,
  Sprite,
  write,
} from "./canvas";
import { Level, levels } from "./levels";
import * as sprites from "./sprites";
import { cycle, runLengthDecode, runLengthEncode } from "./utils";
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
  reset,
  store,
  STA,
  HALTED,
  RUNNING,
  TXT,
  PROGRAM_LENGTH,
} from "./vm";

// RENDERING
const CELL_SIZE_PIXELS = 19;
const BLACK = "#000000";
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

const REGISTERS_ROW = 14;
const STACK_ROW = 15;

let currentLevel: Level =
  // Try to find the current level ID from localstorage
  levels.find((level) => level.id === localStorage.currentLevelId) ??
  // Fall back to starting at the first level
  levels[0];

function goToNextLevel() {
  let nextLevel = levels[levels.indexOf(currentLevel) + 1] ?? levels[0];

  if (nextLevel) {
    localStorage.currentLevelId = nextLevel.id;
    currentLevel = nextLevel;
  }
}

/**
 * Snapshots of all previous memories.
 */
let history: Uint8ClampedArray[] = [];

/**
 * The position of the mouse cursor onscreen.
 */
let cursor: { x: number; y: number } | undefined;

/**
 * The pointer to the instruction we're editing, whilst in edit mode.
 */
let editPointer: number = 0;

/**
 * Whether we're currently editing the grid or a specific cell or not editing
 * at all.
 */
let editingMode: "grid" | undefined;

/**
 * Register where instructions are "yanked" to, during edit mode.
 */
let editYankRegister = new Uint8Array(4);

/**
 * Opcode info lookup.
 */
let OPCODES: {
  [opcode: string]: { label: string } | undefined;
} = {
  [GET]: { label: "LOD" },
  [SET]: { label: "MOV" },
  [SWP]: { label: "SWP" },
  [ADD]: { label: "ADD" },
  [SUB]: { label: "SUB" },
  [TEQ]: { label: "TEQ" },
  [TLT]: { label: "TLT" },
  [TGT]: { label: "TGT" },
  [SND]: { label: "SND" },
  [END]: { label: "END" },
  [TXT]: { label: "TXT" },
};

/**
 * Register info lookup.
 */
let REGISTERS: {
  [name: string]: { label: string } | undefined;
} = {
  [DAT]: { label: "DAT" },
  [STK]: { label: "STK" },
  [CYC]: { label: "CYC" },
  [IP]: { label: "IP" },
  [SP]: { label: "SP" },
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

  // TXT instructions have very specific rendering
  if (opcode === TXT) {
    return drawTxtInstruction(x, y);
  }

  let color = GRAY_1;

  // Add a flashing border if we're editing this instruction
  let t = performance.now();
  let highlight = editingMode && ptr === editPointer && t % 400 > 200;

  let sprite = sprites.cell;

  if (opcode >= TEQ && opcode <= TGT) {
    color = exec(ptr) ? GREEN_1 : RED_1;
  } else if (opcode === END) {
    color = BLUE_1;
  }

  if (highlight) {
    color = GRAY_2;
  }

  // In edit mode we need to be able to see NIL instructions
  if (editingMode && opcode === NIL && ptr === editPointer) {
    drawCell(x, y, sprites.cell, color, "", "", "", "");
  }

  // NIL instructions are invisible (can't enter them)
  if (opcode === NIL) return;

  let opcodeInfo = OPCODES[opcode];
  let operandInfo = REGISTERS[operand];
  let name = opcodeInfo?.label;
  let value: string | number | undefined;

  if (opcode === END) {
    sprite = sprites.cell_halt;
  }

  if (opcode === NOP || opcode === SND) {
    value = "";
  } else if (opcode === END) {
    value = "0xD";
  } else if (mode === ADDRESS_MODE || opcode === SWP || opcode === SET) {
    value = operandInfo?.label;
  } else if (mode === IMMEDIATE_MODE) {
    value = operand;
  }

  let labelColor = opcode === END ? BLUE_2 : GRAY_2;
  let valueColor = opcode === END ? BLUE_1 : WHITE;

  drawCell(
    x,
    y,
    sprite,
    color,
    name!,
    labelColor,
    value,
    valueColor,
    dirs,
    "gray",
  );
}

function drawTxtInstruction(x: number, y: number) {
  let ptr = x + y * PROGRAM_COLS;
  let operand = fetch(ptr, INSTR_OPERAND);

  // The first 4 bits are the index of the label.
  let index = operand & 0b1111;
  // TODO: Do the other label behaviours later
  // The next 4 bits specify the label's alignment.
  //let align = (operand >> 4) & 0b1111;
  // The next 4 bits specify the label's trigger.
  //let trigger = (operand >> 8) & 0b1111;

  let text = currentLevel.labels[index];
  let missing = !text;
  if (missing) text = "Text is missing from level definition";

  if (missing) {
    drawCell(x, y, sprites.cell, GRAY_1, "TXT", RED_2, "ERR", RED_1);
  } else {
    let serial = index.toString().padStart(3, "0");
    drawCell(x, y, sprites.cell, GRAY_1, "TXT", BLUE_2, serial, BLUE_1);
  }

  // If the debugger is on the label, show its text
  if (memory[IP] === ptr) {
    let dx = (x + 0.5) * CELL_SIZE_PIXELS;
    let dy = (y - 0.5) * CELL_SIZE_PIXELS;
    label(dx, dy, text, WHITE, missing ? RED_2 : BLUE_2, "center");
  }
}

/**
 * Draw the current state of the stack.
 */
function drawStack() {
  let sprite = sprites.cell;

  for (let i = 0; i < STACK_LENGTH; i++) {
    let value = memory[STK + i];
    let label = i === memory[SP] ? "STK" : i.toString().padStart(3);
    drawCell(
      i,
      STACK_ROW,
      sprite,
      PURPLE_1,
      label,
      PURPLE_1,
      value,
      PURPLE_2,
      i === memory[SP] ? UP | DOWN : 0,
      PURPLE_2,
    );
  }
}

/**
 * Draw the states of the registers.
 */
function drawRegisters() {
  let sprite = sprites.cell_register;
  let y = REGISTERS_ROW;
  drawCell(0, y, sprite, YELLOW_1, "DAT", YELLOW_1, memory[DAT], YELLOW_2);
  drawCell(1, y, sprite, GRAY_1, "CYC", GRAY_2, memory[CYC], WHITE);
  drawCell(2, y, sprite, GRAY_1, "IP", GRAY_2, memory[IP], WHITE);
  drawCell(3, y, sprite, GRAY_1, "SP", GRAY_2, memory[SP], WHITE);
  drawCell(4, y, sprite, GRAY_1, "DBG", GRAY_2, memory[DBG], WHITE);
}

/**
 * Draw the character (the debugger).
 */
function drawDebugger() {
  // Don't render the debugger if we're editing the instruction its on.
  if (editingMode && editPointer === memory[IP]) return;

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

function drawEditorInfo() {
  if (!editingMode) return;
  // Don't show anything if the pointer is out of bounds
  if (editPointer < 0 || editPointer >= PROGRAM_LENGTH) return;

  let opcode = fetch(editPointer, INSTR_OPCODE);
  let operand = fetch(editPointer, INSTR_OPERAND);
  let mode = fetch(editPointer, INSTR_MODE);
  let dirs = fetch(editPointer, INSTR_DIRS);
  let hex = (n: number) => `0x${n.toString(16).padStart(2, "0")}`;

  // Raw instruction hex values for debugging
  let text = `${hex(opcode)} ${hex(operand)} ${hex(mode)} ${hex(dirs)}`;
  let y = c.height - 50;

  // Address
  label(2, y, hex(editPointer), GRAY_2, GRAY_1);
  // Raw instruction
  label(24, y, text, GRAY_2, GRAY_1);
}

function getScore(level: Level, cycles: number): 0 | 1 | 2 | 3 {
  if (cycles <= level.cycles[0]) return 0;
  if (cycles <= level.cycles[1]) return 1;
  if (cycles <= level.cycles[2]) return 2;
  return 3;
}

const statuses = [
  ["Excellence", BLUE_2],
  ["Pretty Good", GREEN_2],
  ["Acceptable", YELLOW_2],
  ["Not Very Impressive", RED_2],
] as const;

function drawDebugStats() {
  let w = 200;
  let h = 80;
  let x = (c.width / 2 - w / 2) | 0;
  let y = (c.height / 2 - h / 2) | 0;
  let shadow = 10;

  // Shadow
  rect(x - shadow, y - shadow, w + shadow * 2, h + shadow * 2, "#00000050");
  // Background
  rect(x, y, w, h, BLACK);
  frame(x, y, w, h, WHITE);

  let cycles = memory[CYC];
  let level = currentLevel;
  let score = getScore(level, cycles);
  let [statusText, statusColor] = statuses[score];

  let tx = x + 5;
  let ty = y + 5;

  // Level name
  write(tx, ty, level.id);
  ty += LINE_HEIGHT * 3;
  write(tx, ty, statusText, statusColor);
  ty += LINE_HEIGHT * 2;
  write(tx, ty, `Halt found in ${memory[CYC]} cycles`);
  ty += LINE_HEIGHT * 3;
  write(tx, ty, `Press enter to continue`, GRAY_2);
  ty += LINE_HEIGHT * 2;
  write(tx, ty, `Press R to restart`, GRAY_1);
}

function render() {
  clear();

  // Instructions
  for (let y = 0; y < PROGRAM_ROWS; y++) {
    for (let x = 0; x < PROGRAM_COLS; x++) {
      drawInstruction(x, y);
    }
  }

  drawStack();
  drawRegisters();
  drawDebugger();
  drawEditorInfo();

  // Cursor
  if (cursor) {
    draw(sprites.cursor, cursor.x, cursor.y);
  }

  if (memory[STA] === HALTED) {
    drawDebugStats();
  }
}

function undo() {
  if (history.length) {
    load(history.pop()!);
  }
}

function move(
  direction: typeof UP | typeof DOWN | typeof LEFT | typeof RIGHT,
): boolean {
  // Direction checks are too awkward with random programs
  let dirs = fetch(memory[IP], INSTR_DIRS);
  if (dirs > 0 && (dirs & direction) === 0) return false;

  if (direction === LEFT) return jump(memory[IP] - 1);
  if (direction === UP) return jump(memory[IP] - PROGRAM_COLS);
  if (direction === DOWN) return jump(memory[IP] + PROGRAM_COLS);
  if (direction === RIGHT) return jump(memory[IP] + 1);

  return false;
}

function dispatch(command: number) {
  let snapshot = dump();
  let ok = false;

  if (command === LEFT) ok = move(LEFT);
  if (command === UP) ok = move(UP);
  if (command === DOWN) ok = move(DOWN);
  if (command === RIGHT) ok = move(RIGHT);

  if (ok) {
    history.push(snapshot);
    memory[CYC] += 1;
  }
}

function init() {
  let program = runLengthDecode(currentLevel.program);
  load(program);
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

onpointermove = (event) => {
  let bounds = c.getBoundingClientRect();
  let canvasX = event.clientX - bounds.x;
  let canvasY = event.clientY - bounds.y;
  let scaleX = c.width / bounds.width;
  let scaleY = c.height / bounds.height;
  let x = (canvasX * scaleX) | 0;
  let y = (canvasY * scaleY) | 0;
  cursor = { x, y };
};

onkeydown = (event) => {
  let { key } = event;

  // r to restart the current level
  if (key === "r") {
    init();
  }

  // Check whether we've finished the level
  if (memory[STA] === HALTED) {
    // Enter to advance to the next level after completion
    if (key === "Enter") {
      goToNextLevel();
      init();
    } else {
      return;
    }
  }

  // Export the current program to the console
  if (key === "e") {
    let snapshot = dump();
    snapshot[CYC] = 0; // reset cycles
    snapshot[STA] = RUNNING; // reset halt state
    navigator.clipboard.writeText(
      JSON.stringify(runLengthEncode([...snapshot])),
    );
    console.groupCollapsed("📋 Program copied to clipboard!");
    console.log(snapshot);
    console.groupEnd();
  }

  // Forward all other events to editor during edit mode.
  if (editingMode) {
    return editor(event);
  }

  // i to enter grid editing mode
  if (key === "i") {
    editingMode = "grid";
    editPointer = memory[IP];
  }

  if (key === "h" || key === "ArrowLeft") dispatch(LEFT);
  if (key === "j" || key === "ArrowDown") dispatch(DOWN);
  if (key === "k" || key === "ArrowUp") dispatch(UP);
  if (key === "l" || key === "ArrowRight") dispatch(RIGHT);
  if (key === "Backspace" || key === "z") undo();

  // Jump directly to cursor (useful for debugging)
  if (key === " " && cursor) {
    memory[IP] = lookup(cursor.x, cursor.y) ?? memory[IP];
  }
};

/**
 * Logic for editing a D13 program for building levels.
 */
export function editor(event: KeyboardEvent) {
  // Read metadata from the event
  let { key, ctrlKey: ctrl, shiftKey: shift } = event;

  // Decode the current instruction
  let opcode = fetch(editPointer, INSTR_OPCODE);
  let operand = fetch(editPointer, INSTR_OPERAND);
  let mode = fetch(editPointer, INSTR_MODE);
  let dirs = fetch(editPointer, INSTR_DIRS);

  // shift+x to reset the memory
  if (key === "X") reset();

  // shift+direction toggles directions in all modes (prevent accidentally
  // editing NIL/END instructions because we're never entering/exiting them).
  if (opcode !== NIL && opcode !== END) {
    if (key === "H") store(editPointer, INSTR_DIRS, dirs ^ LEFT);
    if (key === "L") store(editPointer, INSTR_DIRS, dirs ^ RIGHT);
    if (key === "J") store(editPointer, INSTR_DIRS, dirs ^ DOWN);
    if (key === "K") store(editPointer, INSTR_DIRS, dirs ^ UP);
  }

  // y or x to yank the current instruction
  if (key === "y" || (key === "x" && !ctrl)) {
    editYankRegister[INSTR_OPCODE] = opcode;
    editYankRegister[INSTR_OPERAND] = operand;
    editYankRegister[INSTR_MODE] = mode;
    editYankRegister[INSTR_DIRS] = dirs;

    // If cutting, then also reset the current instruction
    if (key === "x") {
      store(editPointer, INSTR_OPCODE, NIL);
      store(editPointer, INSTR_OPERAND, 0);
      store(editPointer, INSTR_MODE, IMMEDIATE_MODE);
      store(editPointer, INSTR_DIRS, 0);
    }
  }

  // p to paste the yanked instruction
  if (key === "p") {
    store(editPointer, INSTR_OPCODE, editYankRegister[INSTR_OPCODE]);
    store(editPointer, INSTR_OPERAND, editYankRegister[INSTR_OPERAND]);
    store(editPointer, INSTR_MODE, editYankRegister[INSTR_MODE]);
    store(editPointer, INSTR_DIRS, editYankRegister[INSTR_DIRS]);
  }

  // @ to move the debugger here
  if (key === "@") memory[IP] = editPointer;

  // escape to leave editing mode
  if (key === "Escape") editingMode = undefined;

  // hjkl move the editing cursor in grid mode
  if (key === "h") editPointer -= 1;
  if (key === "l") editPointer += 1;
  if (key === "j") editPointer += PROGRAM_COLS;
  if (key === "k") editPointer -= PROGRAM_COLS;

  // space toggles instructions between on/off
  if (key === " ") store(editPointer, INSTR_OPCODE, opcode === NIL ? NOP : NIL);

  // arrow keys to edit the stack
  if (key === "ArrowLeft") memory[SP] -= 1;
  if (key === "ArrowRight") memory[SP] += 1;
  if (key === "ArrowUp") memory[STK + memory[SP]] += shift ? 10 : 1;
  if (key === "ArrowDown") memory[STK + memory[SP]] -= shift ? 10 : 1;

  // + and - to edit DAT
  if (key === "-" || key === "_") memory[DAT] -= shift ? 10 : 1;
  if (key === "+" || key === "=") memory[DAT] += shift ? 10 : 1;

  // < and > to edit DBG
  if (key === "<" || key === ",") memory[DBG] -= shift ? 10 : 1;
  if (key === ">" || key === ".") memory[DBG] += shift ? 10 : 1;

  // ctrl-p and ctrl+n change opcode
  if (ctrl && (key === "p" || key === "n")) {
    let step = key === "p" ? -1 : 1;
    let codes = [NOP, GET, SET, SWP, ADD, SUB, TEQ, TLT, TGT, SND, TXT, END];
    let code = cycle(codes, opcode, step);
    store(editPointer, INSTR_OPCODE, code);
  }

  // Prevent accidentally editing operands/modes for commands that don't
  // support them.
  if (opcode === NIL || opcode === NOP || opcode === SWP || opcode === SND)
    return;

  // ctrl-a and ctrl-x change operand in immediate mode
  if (mode === IMMEDIATE_MODE) {
    if (ctrl && key === "a") store(editPointer, INSTR_OPERAND, operand + 1);
    if (ctrl && key === "x") store(editPointer, INSTR_OPERAND, operand - 1);
    if (ctrl && key === "A") store(editPointer, INSTR_OPERAND, operand + 10);
    if (ctrl && key === "X") store(editPointer, INSTR_OPERAND, operand - 10);
  }

  // ctrl-a and ctrl-x change register in address mode
  if (mode === ADDRESS_MODE) {
    if ((ctrl && key === "a") || (ctrl && key === "x")) {
      let step = key === "a" ? -1 : 1;
      let addr = cycle([DAT, STK, CYC, IP, SP], operand, step);
      store(editPointer, INSTR_OPERAND, addr);
    }
  }

  // m toggles the mode of the current instruction
  if (key === "m") {
    let newMode = mode === ADDRESS_MODE ? IMMEDIATE_MODE : ADDRESS_MODE;
    let operand = newMode === ADDRESS_MODE ? DAT : 0;
    store(editPointer, INSTR_MODE, newMode);
    store(editPointer, INSTR_OPERAND, operand);
  }
}

start();
