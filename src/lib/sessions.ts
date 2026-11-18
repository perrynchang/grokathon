import type { StudySession, StudyState } from "./types";

export const YALE_TIMEZONE = "America/New_York";
const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: YALE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: YALE_TIMEZONE,
  hour: "numeric",
  minute: "2-digit",
});

export function isSameYaleDay(a: number, b: number): boolean {
  return (
    Number.isFinite(a) &&
    Number.isFinite(b) &&
    dayFormatter.format(a) === dayFormatter.format(b)
  );
}

export function formatYaleTime(timestamp: number): string {
  return timeFormatter.format(timestamp);
}

export function isSessionLive(
  session: StudySession,
  now = Date.now(),
): boolean {
  return session.startsAt <= now && session.expiresAt > now;
}

export function getAttendeeCount(session: StudySession): number {
  return new Set(
    session.participants
      .filter((p) => p.status === "joined" || p.status === "on_way")
      .map((p) => p.userId),
  ).size;
}

export function getSpotsLeft(session: StudySession): number {
  return Math.max(0, session.capacity - getAttendeeCount(session));
}

/** Course selection is self-reported. Demo visibility is not a server permission boundary. */
export function canViewSession(
  state: StudyState,
  session: StudySession,
  userId = state.meId,
): boolean {
  const person = state.people.find((p) => p.id === userId);
  if (!person) return false;
  if (
    session.hostId === userId ||
    session.participants.some(
      (p) => p.userId === userId && p.status !== "declined",
    )
  )
    return true;
  if (session.audience === "classmates")
    return person.courseIds.includes(session.courseId);
  if (userId === state.meId) return state.friendIds.includes(session.hostId);
  // The demo only knows the current student's accepted friendships.
  return session.hostId === state.meId && state.friendIds.includes(userId);
}

/** Real timestamps avoid ambiguous/nonexistent local times across daylight-saving changes. */
export function laterTodaySlots(now = Date.now()): number[] {
  if (!Number.isFinite(now)) return [];
  const quarterHour = 15 * 60_000;
  const first = Math.ceil((now + quarterHour) / quarterHour) * quarterHour;
  const slots: number[] = [];
  for (let time = first; time < now + 26 * 60 * 60_000; time += quarterHour) {
    if (!isSameYaleDay(now, time)) break;
    slots.push(time);
  }
  return slots;
}
