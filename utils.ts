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

export function runLengthEncode(array: number[]): number[] {
  let run = array[0];
  let len = 1;
  let encoded: number[] = [];

  for (let i = 1; i < array.length; i++) {
    let val = array[i];

    if (val === run) {
      len += 1;
    } else {
      encoded.push(run, len);
      run = val;
      len = 1;
    }
  }

  encoded.push(run, len);

  return encoded;
}

export function runLengthDecode(array: number[]): number[] {
  let decoded: number[] = [];

  for (let i = 0; i < array.length; i += 2) {
    let val = array[i];
    let len = array[i + 1];
    for (let j = 0; j < len; j++) decoded.push(val);
  }

  return decoded;
}
