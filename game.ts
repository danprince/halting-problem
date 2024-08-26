import { clear, draw, label, rect, resize, Sprite, write } from "./renderer";
import * as sprites from "./sprites";
import { pick, random } from "./utils";

// REGISTERS
const IP = 1; // Instruction pointer
const SP = 2; // Stack pointer
const CYC = 3; // Cycles register
const DBG = 4; // Debug register
const DAT = 5; // Data register

// OFFSETS
const STK = 10; // Stack starts at this address
const PRG = 24; // Program starts at this address

// OPCODES
const NIL = 0x0; // Nothing here
const NOP = 0x1; // Do nothing
const GET = 0x2; // Move a value into DBG
const SET = 0x3; // Move DBG into a register
const SWP = 0x4; // Swap DBG with a register
const ADD = 0x5; // Add a value to DBG
const SUB = 0x6; // Sub a value from DBG
const TEQ = 0x7; // Test if DBG is equal to a value
const TLT = 0x8; // Test if DBG is less than a value
const TGT = 0x9; // Test if DBG is greater than a value
const SND = 0xa; // Send DBG into a port
const END = 0xb; // Halt the program

// DIRECTIONS
const RIGHT = 0b0001;
const DOWN = 0b0010;
const LEFT = 0b0100;
const UP = 0b1000;

// MODES
const IMMEDIATE_MODE = 0; // Operand will be treated as a value
const ADDRESS_MODE = 1; // Operand will be treated as an address

// OFFSETS / SIZES
const INSTR_WIDTH = 4; // Width of instructions
const INSTR_OPCODE = 0; // Offset of instruction opcode
const INSTR_OPERAND = 1; // Offset of instruction operand
const INSTR_MODE = 2; // Offset of instruction mode
const INSTR_DIRS = 3; // Offset of instruction directions
const STACK_LENGTH = 13; // Max number of values
const PROGRAM_COLS = 14; // Number of columns in a program
const PROGRAM_ROWS = 6; // Number of rows in a program
const PROGRAM_LENGTH = PROGRAM_COLS * PROGRAM_ROWS; // Number of instructions
const PROGRAM_SIZE = PROGRAM_LENGTH * INSTR_WIDTH; // Number of bytes
const MEMORY_SIZE = PRG + PROGRAM_SIZE;

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
 * Virtual machines have the following memory layout.
 *
 * ```txt
 * | 0 | 0xD | Magic number
 * | 1 | IP  | Instruction pointer
 * | 2 | SP  | Stack pointer
 * | 3 | DBG | Value of the DBG register
 * | 4 | DAT | Value of the DAT register
 * | 5 |     | (reserved)
 * | 6 |     | (reserved)
 * | 7 |     | (reserved)
 * | 8 |     | (reserved)
 * | 9 |     | (reserved)
 * (Stack starts here)
 * | 10 |     | (value)
 * | 11 |     | (value)
 * | .. |     | (value)
 * | 22 |     | (value)
 * | 23 |     | (value)
 * (Program starts here)
 * | 24 |     | The opcode
 * | 25 |     | The operand
 * | 26 |     | The operand mode
 * | 27 |     | The instruction direction
 * | .. | ... | ...
 * ```
 */
let memory = new Uint8ClampedArray(MEMORY_SIZE);

/**
 * Snapshots of all previous memories.
 */
let history: Uint8ClampedArray[] = [];

/**
 * Peek at the value on top of the stack.
 */
function peek(): number {
  return memory[STK + memory[SP] - 1];
}

/**
 * Push a value onto the top of the stack.
 */
function push(value: number): void {
  memory[STK + memory[SP]] = value;
  memory[SP] += 1;
}

/**
 * Pop a value from the top of the stack.
 */
function pop(): number {
  let value = memory[STK + memory[SP] - 1];
  memory[SP] -= 1;
  return value;
}

/**
 * Fetch a part of an instruction.
 */
function fetch(ptr: number, offset: number): number {
  return memory[PRG + ptr * INSTR_WIDTH + offset];
}

/**
 * Execute an instruction.
 */
function exec(ptr: number): boolean {
  let opcode = fetch(ptr, INSTR_OPCODE);
  let operand = fetch(ptr, INSTR_OPERAND);
  let mode = fetch(ptr, INSTR_MODE);
  let value = operand;

  if (mode === ADDRESS_MODE) {
    if (value === STK) {
      value = peek() ?? 0;
    } else {
      value = memory[value];
    }
  }

  switch (opcode) {
    case NIL:
      return false;

    case NOP:
      return true;

    case GET:
      memory[DBG] = value;
      return true;

    case SET: {
      if (operand === STK) {
        push(memory[DBG]);
      } else {
        memory[operand] = value;
      }
      return true;
    }

    case SWP: {
      if (operand === STK) {
        let tmp = pop();
        push(memory[DBG]);
        memory[DBG] = tmp;
      } else {
        let tmp = memory[operand];
        memory[operand] = memory[DBG];
        memory[DBG] = tmp;
      }
      return true;
    }

    case ADD:
      memory[DBG] += value;
      return true;

    case SUB:
      memory[DBG] -= value;
      return true;

    case TEQ:
      return memory[DBG] === value;

    case TLT:
      return memory[DBG] < value;

    case TGT:
      return memory[DBG] > value;

    case SND:
      return true; // TODO
  }

  return false;
}

/**
 * Jump to the instruction at this address.
 */
function jump(ptr: number): boolean {
  let ok = exec(ptr);
  if (ok) memory[IP] = ptr;
  return ok;
}

/**
 * The position of the mouse cursor onscreen.
 */
let cursor: { x: number; y: number } | undefined;

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

let OPERANDS: {
  [name: string]: { label: string; hint: string } | undefined;
} = {
  [DBG]: { label: "", hint: "" },
  [DAT]: { label: "DAT", hint: "" },
  [STK]: { label: "STK", hint: "" },
};

function drawCell(
  x: number,
  y: number,
  label: string,
  labelColor: string,
  value: string | number | undefined,
  valueColor: string,
  arrows: number | undefined,
  arrowColor: string,
  sprite: Sprite,
  spriteColor: string,
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

function render() {
  clear();

  // Instructions
  for (let x = 0; x < PROGRAM_COLS; x++) {
    for (let y = 0; y < PROGRAM_ROWS; y++) {
      renderInstruction(x, y);
    }
  }

  // Registers
  renderRegisters();

  // Debugger
  renderDebugger();

  // Cursor
  if (cursor) {
    draw(sprites.cursor, cursor.x, cursor.y);
  }
}

function renderInstruction(x: number, y: number) {
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
  let operandInfo = OPERANDS[operand];
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
    name!,
    labelColor,
    value,
    "white",
    dirs,
    "gray",
    sprite,
    color,
  );
}

function renderRegisters() {
  drawCell(
    0,
    7,
    "DAT",
    YELLOW_1,
    memory[DAT],
    YELLOW_2,
    0,
    "",
    sprites.cell_register,
    YELLOW_1,
  );

  drawCell(
    0,
    8,
    "CYC",
    GRAY_2,
    memory[CYC],
    WHITE,
    0,
    "",
    sprites.cell_register,
    GRAY_1,
  );

  drawCell(
    1,
    8,
    "IP",
    GRAY_2,
    memory[IP],
    WHITE,
    0,
    "",
    sprites.cell_register,
    GRAY_1,
  );

  drawCell(
    2,
    8,
    "SP",
    GRAY_2,
    memory[SP],
    WHITE,
    0,
    "",
    sprites.cell_register,
    GRAY_1,
  );

  drawCell(
    3,
    8,
    "DBG",
    GRAY_2,
    memory[DBG],
    WHITE,
    0,
    "",
    sprites.cell_register,
    GRAY_1,
  );

  let sp = memory[SP];

  for (let i = 0; i < STACK_LENGTH; i++) {
    let value = memory[STK + i];
    drawCell(
      1 + i,
      7,
      sp === i ? "STK" : i.toString().padStart(3),
      sp === i ? PURPLE_2 : PURPLE_1,
      value,
      PURPLE_2,
      0,
      "",
      sprites.cell_register,
      PURPLE_1,
    );
  }
}

// TODO: Better name, move away
function anim(duration: number, frames: number) {
  let t = performance.now();
  return ((t / duration) | 0) % frames;
}

function renderDebugger() {
  let ip = memory[IP];
  let x = ip % PROGRAM_COLS;
  let y = (ip / PROGRAM_COLS) | 0;

  let dx = x * CELL_SIZE_PIXELS;
  let dy = y * CELL_SIZE_PIXELS;
  let hop = anim(250, 2);
  let sprite = hop ? sprites.pointer : sprites.pointer_idle;
  let value = memory[DBG].toString().padStart(3);
  draw(sprite, dx, dy);
  write(dx + 4, dy - hop + 10, value);
}

function getAddressUnderCursor(): number | undefined {
  if (cursor) {
    let x = (cursor.x / CELL_SIZE_PIXELS) | 0;
    let y = (cursor.y / CELL_SIZE_PIXELS) | 0;
    return x + y * PROGRAM_COLS;
  }
}

let renderIsScheduled = false;

function refresh() {
  if (!renderIsScheduled) {
    renderIsScheduled = true;
    requestAnimationFrame(() => {
      render();
      renderIsScheduled = false;
    });
  }
}

function snapshot() {
  return memory.slice();
}

function undo() {
  if (history.length) {
    memory = history.pop()!;
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

function start() {
  init();
  resize();
  refresh();
}

setInterval(() => {
  refresh();
}, 100);

onresize = () => {
  resize();
  refresh();
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

  refresh();
};

onkeydown = ({ key }) => {
  let temp = snapshot();
  let ok = false;

  if (key === "h") ok = jump(memory[IP] - 1);
  if (key === "j") ok = jump(memory[IP] + PROGRAM_COLS);
  if (key === "k") ok = jump(memory[IP] - PROGRAM_COLS);
  if (key === "l") ok = jump(memory[IP] + 1);
  if (key === " ") ok = jump(getAddressUnderCursor() ?? memory[IP]);

  if (key === "Backspace" || key === "z") {
    undo();
  }

  if (ok) {
    history.push(temp);
    memory[CYC] += 1;
  }

  refresh();
};

start();
