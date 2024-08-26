export function random(max: number): number {
  return (Math.random() * max) | 0;
}

export function pick<T>(...values: T[]): T {
  return values[(Math.random() * values.length) | 0];
}
