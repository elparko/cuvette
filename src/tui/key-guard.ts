const clock = { prev: 0, last: 0, since: 0, armed: true };

const quietMs = () => Number(process.env.CUVETTE_CARD_GUARD_MS ?? 400);

export function guardNoteKey() {
  clock.prev = clock.last;
  clock.last = Date.now();
}

export function guardCardOpened() {
  clock.since = Date.now();
  clock.armed = false;
}

export function guardPass(): boolean {
  if (clock.armed) return true;
  if (Date.now() - Math.max(clock.since, clock.prev) < quietMs()) return false;
  clock.armed = true;
  return true;
}
