// REGISTERS
export const STA = 0; // Status flag
export const IP = 1; // Instruction pointer
export const SP = 2; // Stack pointer
export const CYC = 3; // Cycles register
export const DBG = 4; // Debug register
export const DAT = 5; // Data register

// OFFSETS
export const STK = 10; // Stack starts at this address
export const PRG = 24; // Program starts at this address

// OPCODES
export const NIL = 0x0; // Nothing here
export const NOP = 0x1; // Do nothing
export const GET = 0x2; // Move a value into DBG
export const SET = 0x3; // Move DBG into a register
export const SWP = 0x4; // Swap DBG with a register
export const ADD = 0x5; // Add a value to DBG
export const SUB = 0x6; // Sub a value from DBG
export const TEQ = 0x7; // Test if DBG is equal to a value
export const TLT = 0x8; // Test if DBG is less than a value
export const TGT = 0x9; // Test if DBG is greater than a value
export const SND = 0xa; // Send DBG into a port
export const END = 0xb; // Halt the program

// STATUSES
export const RUNNING = 0;
export const HALTED = 1;

// DIRECTIONS
export const RIGHT = 0b0001;
export const DOWN = 0b0010;
export const LEFT = 0b0100;
export const UP = 0b1000;

// MODES
export const IMMEDIATE_MODE = 0; // Operand will be treated as a value
export const ADDRESS_MODE = 1; // Operand will be treated as an address

// OFFSETS / SIZES
export const INSTR_WIDTH = 4; // Width of instructions
export const INSTR_OPCODE = 0; // Offset of instruction opcode
export const INSTR_OPERAND = 1; // Offset of instruction operand
export const INSTR_MODE = 2; // Offset of instruction mode
export const INSTR_DIRS = 3; // Offset of instruction directions
export const STACK_LENGTH = 13; // Max number of values
export const PROGRAM_COLS = 13; // Number of columns in a program
export const PROGRAM_ROWS = 13; // Number of rows in a program
export const PROGRAM_LENGTH = PROGRAM_COLS * PROGRAM_ROWS; // Number of instructions
export const PROGRAM_SIZE = PROGRAM_LENGTH * INSTR_WIDTH; // Number of bytes
export const MEMORY_SIZE = PRG + PROGRAM_SIZE;

/**
 * Virtual machines have the following memory layout.
 *
 * ```txt
 * | 0 | STA | Status flag
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
export let memory = new Uint8ClampedArray(MEMORY_SIZE);

/**
 * Take a dump the current memory.
 */
export function dump() {
  return memory.slice();
}

/**
 * Load new memory.
 */
export function load(mem: Uint8ClampedArray) {
  memory = mem;
}

/**
 * Peek at the value on top of the stack.
 */
export function peek(): number {
  return memory[STK + memory[SP] - 1];
}

/**
 * Push a value onto the top of the stack.
 */
export function push(value: number): void {
  memory[STK + memory[SP]] = value;
  memory[SP] += 1;
}

/**
 * Pop a value from the top of the stack.
 */
export function pop(): number {
  let value = memory[STK + memory[SP] - 1];
  memory[SP] -= 1;
  return value;
}

/**
 * Fetch a part of an instruction.
 * @param ptr The index of the instruction.
 * @param offset The field to read from.
 */
export function fetch(ptr: number, field: number): number {
  return memory[PRG + ptr * INSTR_WIDTH + field];
}

/**
 * Write to a field within an instruction.
 * @param ptr The index of the instruction.
 * @param offset The field to write to.
 * @param value The value to write.
 */
export function store(ptr: number, field: number, value: number): void {
  memory[PRG + ptr * INSTR_WIDTH + field] = value;
}

/**
 * Execute an instruction.
 */
export function exec(ptr: number): boolean {
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
    case END:
      memory[STA] = HALTED;
      return true;

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
export function jump(ptr: number): boolean {
  let ok = exec(ptr);
  if (ok) memory[IP] = ptr;
  return ok;
}

/**
 * Increase the cycles.
 */
export function cycle() {
  memory[CYC] += 1;
}
