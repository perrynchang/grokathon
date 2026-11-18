import assert from "node:assert/strict";
import { test } from "node:test";
import { formatYaleTime, isSameYaleDay, laterTodaySlots } from "./sessions";

const at = (date: string) => new Date(date).getTime();
const minute = 60_000;

test("today follows Yale's timezone instead of UTC or the browser timezone", () => {
  assert.equal(
    isSameYaleDay(at("2026-11-17T23:00:00-05:00"), at("2026-11-18T00:30:00Z")),
    true,
  );
  assert.equal(
    isSameYaleDay(
      at("2026-11-17T23:59:00-05:00"),
      at("2026-11-18T00:00:00-05:00"),
    ),
    false,
  );
  assert.equal(formatYaleTime(at("2026-11-17T18:30:00-05:00")), "6:30 PM");
  assert.equal(isSameYaleDay(Number.NaN, Date.now()), false);
});

test("later-today slots are at least fifteen minutes away and stop before midnight", () => {
  const now = at("2026-11-17T10:07:20-05:00");
  const slots = laterTodaySlots(now);
  assert.equal(formatYaleTime(slots[0]), "10:30 AM");
  assert.equal(formatYaleTime(slots.at(-1)!), "11:45 PM");
  assert.ok(
    slots.every((t) => t >= now + 15 * minute && isSameYaleDay(now, t)),
  );
  assert.deepEqual(laterTodaySlots(at("2026-11-17T23:31:00-05:00")), []);
  assert.deepEqual(laterTodaySlots(Number.NaN), []);
});

test("spring-forward skips nonexistent local times and fall-back preserves unique timestamps", () => {
  const spring = laterTodaySlots(at("2026-03-08T01:30:00-05:00"));
  assert.equal(formatYaleTime(spring[0]), "1:45 AM");
  assert.equal(formatYaleTime(spring[1]), "3:00 AM");
  const fall = laterTodaySlots(at("2026-11-01T00:45:00-04:00"));
  assert.equal(new Set(fall).size, fall.length);
  assert.ok(
    fall.every(
      (value, index) => index === 0 || value - fall[index - 1] === 15 * minute,
    ),
  );
  assert.equal(fall.filter((t) => formatYaleTime(t) === "1:30 AM").length, 2);
  assert.equal(formatYaleTime(fall.at(-1)!), "11:45 PM");
});
