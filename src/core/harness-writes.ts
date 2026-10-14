let count = 0;

export function noteHarnessWrite(): void {
  count++;
}

export function harnessWrites(): number {
  return count;
}
