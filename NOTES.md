# Halting Problem

Play as a rogue pointer, trying to find a way to make the program halt.

The memory of each program is a puzzle on a grid where the player has to move the pointer around until they reach a "HALT" instruction.

Each tile in the grid is part of a program.
- Inaccessible memory (can't move here)
- Constant data (copies the value into the pointer)
- Instructions (evaluated on entry)
- Ports (pointer value is _sent_)

The simplest instruction is "INCR" which increments the pointer's value.

A more complex instruction might be something like "IFNZ" (or maybe "JGZ") which is a conditional instruction that the pointer can only enter if its internal value passes.

So a puzzle might start with 10 on the stack and end with a "SUB IFZ END". When the player enters SUB, the value from the stack will be popped off and subtracted. Their internal value needs to be zero to enter the IFZ, so they need to make 10 first.

JEQ (jump if equal to the top of the stack)
JNZ (jump if != 0)

PUT (put onto stack)
POP (pop from stack)
SWP (swap with stack)

INC (increment pointer value)
DEC (decrement pointer value)

ADD (pop stack and add to pointer value)
SUB (pop stack and sub from pointer value)
MUL (pop stack and multiply pointer value)

 (move without control in one direction)
BRK (break out of a loop)

You can sort of setup tests by forcing the pointer to go through a fixed line

```
PUT 30 SWP JEQ END
```

The player can only get through this if they have 30 

Stack overflows at 13

Ideas
- Two modes (value mode and pointer mode). In pointer mode arithemtic operates on the pointer itself.
- Mode where DATA values go straight to the stack
- Selectable registers
- Mode where operations apply to the entire stack

What if the stack is actually part of the program's memory? If the stack pointer somehow went beyond 13, then the player could use that to modify the program at runtime.

Each instruction should produce a command which has an undo and a redo, so that the player can ctrl-z back through their actions.

Registers are cells within memory. If you move into a register, you can store or load a value. Maybe you don't have to move there though? Maybe they're clickable UI. Maybe there are dedicated LOAD and SAVE instructions?

Registers are like data cells, except their values can be changed remotely by executing a SAVE instruction that is associated with that specific register. SAVE will take the value in the pointer and store it in the associated register.
LOAD will take the value in the associated register and store it in the pointer.

Allow reducing cycles by saving a mark and recording a macro, then replaying the macro.

@ starts recording a macro
@ stops recording a macro
" " plays the last macro


Change the grid so that it's just a program. There's no constant data or address cells.

Instead we introduce a register and give each instruction a target.

INC
DEC
END

SET REG (set value from register)
GET REG (get value from register)
ADD REG (add value from register)
SUB REG (sub value from register)

SETI VAL (set value immediately)
GETI VAL (set value immediately)
ADDI VAL (add value immediately)

TEQ DAT (test if equal to DAT register)
ADD STK (add the current value to the stack)
MOV DAT (move the current value to the DAT register)
TEQ STK (test if equal to stack)
SWP REG (swap value with register)

Instructions can also be in immediate mode, where their value register will be interpreted as a literal value instead of the name of a register.

Maybe behind the scenes it should be different instructions?

ADD REG
ADDI VAL

## Story
Game starts at a terminal
- Prompt the user to run `zox tutorial.z`
- Print "Infinite loop detected. Use zebug to resolve"
- User runs `zebug tutorial.z`
- Gameplay begins on the tutorial program
- Open a program in editing mode with `zedit`
- Users can load additional programs `localStorage[name] = new Uint8ClampedArray()`.

Make a manual to explain both the memory layout and the instruction set.
