export function random(max: number): number {
  return (Math.random() * max) | 0;
}

export function pick<T>(...values: T[]): T {
  return values[(Math.random() * values.length) | 0];
}

export function cycle<T>(array: T[], current: T, step: number = 1): T {
  let index = array.indexOf(current);

  if (index < 0) {
    return array[0];
  }

  return array[(index + step + array.length) % array.length];
}
