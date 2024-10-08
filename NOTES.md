# Halting Problem

Play as a programmer trying to debug an innovative new two dimensional instruction set, in order to find a condition where the program will halt.

Each cell in the grid represents a single instruction within a program. As the debugger moves into the cell, the instruction is executed. The aim of the game is to find a way to move into an END instruction, in order to progress to the next program.

## D13 Virtual Machine

The debugger itself has an internal register which acts as one operand for every instruction (internally this is named `DBG`). For example:

- `MOV 10` can be read as `MOV 10 DBG` (move the literal value 10 to the `DBG` register).
- `ADD DAT` can be read as `ADD DAT DBG` (add the value in the `DAT` register to the value in `DBG` and store the result in the `DBG` register).
- `TEQ 10` can be read as `TEQ 10 DBG` (test if the value in the `DBG` register is equal to `10`).

The debugger can't jump to conditional instructions unless their condition is true. For example:

- `TEQ 10` (the debugger won't be able to jump here unless `DBG` is `10`)
- `TLT DAT` (the debugger won't be able to jump here unless `DBG < DAT`)

In addition to the general purpose `DAT` register, programs also have access to a stack. The stack can be addressed as though it was a register, through `STK`.

- `MOV STK` (push the value from `DBG` onto the stack)
- `LOD STK` (set `DBG` to the value on top of the stack and pop it)

The stack can have 13 items but there are no safety checks to ensure that the stack does not overflow.

If the stack overflows, then the stack pointer will now be pointing at the program in memory, meaning that the player will be able to edit the individual instructions at runtime.

## Undo

Each instruction should produce a command which has an undo and a redo, so that the player can ctrl-z back through their actions.

## Macros

Allow reducing tedious repetitions by recording a macro.

- <kbd>@</kbd> starts recording a macro
- <kbd>@</kbd> stops recording a macro
- <kbd> </kbd> plays the last macro

## Story

Game starts at a terminal where the user can type commands (beginning with a prompt that steers them in the rough direction).

- `help` shows help text
- `ls` shows all programs
- `zebug [file]` opens a program for debugging
- `zedit [file]` opens a program for editing

Should the TXT instructions left in the levels serve as direct tutorials or more like as comments left by the programmer?

## Manual

Make a Zachtronics-esque manual to explain the instruction set and the memory layout.

## Levels

Levels and programs should be distinct. A program is just the memory you load up and play in, whereas a level should have a bunch of extra metadata.

- A file name for the level
- Labels that can correspond to `LBL` instructions which show information.
- The goal number of cycles to complete the level within.

Rough game structure:

- Introduce basic movement (start the player on a TXT tile with controls)
- Introduce directional instructions
- Introduce undo mechanics with a trap
- Introduce conditional instructions

## Ideas

- Include a way to turn on vision for all instructions (including NILs and NOPs).
- SND outputs the current stack to connected "device"
- TSC (Test Stack Correctness) checks stack against expected values
- Make things work with clicks/taps as well as arrow keys
- Animate the instructions falling into place
- Tween the debugger between moves
- Particle effects when executing instructions
- Per-level music generated from a seed. Level can come with a seed or be randomly generated.

### Lobby

Dynamically generate a program which can serve as a virtual hub, where each level is accessible. Figure out which level is which by putting a directional `LOD N` instruction infront of the halt. Can use TXT instructions to show the name of each level and the cycles goals + personal bests.

Could also include a link to a reference level which has a reference for every opcode.
