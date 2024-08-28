export interface Level {
  id: string;
  cycles: [gold: number, silver: number, bronze: number];
  program: number[];
  labels: string[];
}

/**
 * Array of all the levels in the game.
 */
export let levels: Level[] = [
  {
    // Introduces the player to moving the debugger.
    id: "tutorial/movement",
    cycles: [10, 12, 15],
    labels: [],
    program:
      // prettier-ignore
      [0,1,95,1,0,402,1,1,0,3,1,1,0,3,1,1,0,7,11,1,0,3,1,1,0,39,1,1,0,11,1,1,0,39,1,1,0,3,1,1,0,3,1,1,0,3,1,1,0,171],
  },
  {
    // Introduces the player to directional instructions.
    id: "tutorial/directional_instructions",
    cycles: [10, 12, 15],
    labels: [],
    program:
      // prettier-ignore
      [0,1,94,1,0,398,1,1,0,3,1,1,0,2,2,1,11,1,0,3,1,1,0,43,1,1,0,7,1,1,0,43,1,1,0,3,1,1,0,3,1,1,0,183],
  },
  {
    // Introduces the player to conditional instructions.
    id: "tutorial/conditional_instructions",
    cycles: [10, 11, 12],
    labels: [],
    program:
      // prettier-ignore
      [0,1,58,1,0,254,1,1,0,51,1,1,0,43,1,1,0,3,1,1,0,2,4,1,1,1,0,43,2,1,1,1,0,6,1,1,0,43,1,1,0,3,1,1,0,3,7,1,1,1,0,50,1,1,0,51,11,1,0,131],
  },
];
