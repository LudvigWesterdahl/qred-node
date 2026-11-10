export type Clock = {
  now(): Date;
  todayUtc(): string;
};

export function systemClock(): Clock {
  return {
    now: () => new Date(),
    todayUtc: () => new Date().toISOString().slice(0, 10),
  };
}

export function frozenClock(isoDateOrInstant: string): Clock {
  const instant = isoDateOrInstant.includes("T")
    ? new Date(isoDateOrInstant)
    : new Date(`${isoDateOrInstant}T00:00:00.000Z`);

  return {
    now: () => new Date(instant),
    todayUtc: () => instant.toISOString().slice(0, 10),
  };
}
