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
    id: "01_tutorial",
    labels: [
      "debugging starts with a single step",
      "decisions...",
      "sometimes a dead end is just a dead end",
    ],
    cycles: [10, 11, 12],
    program:
      // prettier-ignore
      [0,1,122,1,0,2,1,1,0,247,11,1,0,7,13,1,0,3,1,1,0,39,1,1,0,11,1,1,0,39,1,1,0,11,1,1,0,39,11,1,1,1,0,2,1,1,0,3,1,1,0,3,1,1,0,39,1,1,0,51,1,1,0,51,11,1,2,1,0,134],
  },
];
