import assert from "node:assert/strict";
import { test } from "node:test";
import { createDemoState } from "./data";
import { createStudyStore, STORAGE_KEY } from "./store";
import {
  canViewSession,
  getAttendeeCount,
  getSpotsLeft,
  isSessionLive,
} from "./sessions";
import type { StudyState } from "./types";

const START = 1_800_000_000_000;
const minute = 60_000;

function fixture(change?: (state: StudyState) => void) {
  let time = START;
  const records = new Map<string, string>();
  const storage = {
    getItem: (key: string) => records.get(key) ?? null,
    setItem: (key: string, value: string) => {
      records.set(key, value);
    },
  };
  const initialState = createDemoState(time);
  change?.(initialState);
  const store = createStudyStore({
    initialState,
    storage,
    now: () => time,
  });
  return {
    ...store,
    storage,
    records,
    now: () => time,
    advance: (milliseconds: number) => {
      time += milliseconds;
    },
  };
}

test("creating a session persists it, hosts once, and only pings accepted friends once", () => {
  const store = fixture();
  const sessionId = store.actions.createSession({
    courseId: "orgo",
    locationId: "bass",
    note: "  Exam prep!  ",
    durationMinutes: 90,
    inviteeIds: ["maya", "maya", "alex", "nora", "missing"],
  });
  const session = store
    .getState()
    .sessions.find((item) => item.id === sessionId)!;
  assert.equal(session.note, "Exam prep!");
  assert.equal(session.expiresAt, START + 90 * minute);
  assert.deepEqual(
    session.participants.map((person) => person.userId),
    ["alex"],
  );
  assert.deepEqual(
    store
      .getState()
      .pings.filter((ping) => ping.sessionId === sessionId)
      .map((ping) => ping.toUserId),
    ["maya"],
  );
  const reloaded = createStudyStore({ storage: store.storage });
  assert.equal(reloaded.getState().sessions[0].id, sessionId);
});

test("overlapping hosted sessions are rejected and later sessions preserve the current one", () => {
  const store = fixture();
  const first = store.actions.createSession({
    courseId: "orgo",
    locationId: "bass",
    durationMinutes: 60,
    inviteeIds: [],
  });
  store.advance(minute);
  assert.throws(
    () =>
      store.actions.createSession({
        courseId: "math",
        locationId: "sterling",
        durationMinutes: 60,
        inviteeIds: [],
      }),
    /already hosting/,
  );
  const second = store.actions.createSession({
    courseId: "math",
    locationId: "sterling",
    durationMinutes: 60,
    inviteeIds: [],
    startsAt: START + 60 * minute,
  });
  assert.equal(
    store.getState().sessions.find((session) => session.id === first)
      ?.expiresAt,
    START + 60 * minute,
  );
  assert.equal(
    store.getState().sessions.find((session) => session.id === second)
      ?.participants.length,
    1,
  );
});

test("quick replies update the participant and incoming ping atomically without duplicates", () => {
  const store = fixture();
  store.actions.respondToPing("ping-maya", "on_way");
  store.actions.respondToPing("ping-maya", "joined");
  const state = store.getState();
  const participants = state.sessions
    .find((session) => session.id === "session-orgo")!
    .participants.filter((person) => person.userId === "alex");
  assert.equal(participants.length, 1);
  assert.equal(participants[0].status, "joined");
  assert.equal(
    state.pings.find((ping) => ping.id === "ping-maya")?.response,
    "joined",
  );
  assert.equal(
    state.pings.find((ping) => ping.id === "ping-maya")?.respondedAt,
    START,
  );
  assert.equal(
    state.people.find((person) => person.id === "alex")?.status,
    "studying",
  );
});

test("join is idempotent and leaving removes only the local participant", () => {
  const store = fixture();
  store.actions.joinSession("session-orgo");
  const afterJoin = store.getState();
  store.actions.joinSession("session-orgo");
  assert.equal(store.getState(), afterJoin);
  store.actions.leaveSession("session-orgo");
  const session = store
    .getState()
    .sessions.find((item) => item.id === "session-orgo")!;
  assert.equal(session.participants.length, 3);
  assert.ok(session.participants.every((person) => person.userId !== "alex"));
  assert.equal(
    store.getState().people.find((person) => person.id === "alex")?.status,
    "free",
  );
});

test("expired sessions reject joins, replies, pings, and messages", () => {
  const store = fixture();
  store.advance(5 * 60 * minute);
  store.actions.expireSessions();
  const expiredState = store.getState();
  assert.throws(() => store.actions.joinSession("session-orgo"), /ended/);
  assert.throws(
    () => store.actions.respondToPing("ping-maya", "joined"),
    /ended/,
  );
  assert.throws(() => store.actions.sendPing("session-orgo", ["sam"]), /ended/);
  assert.throws(
    () => store.actions.sendMessage("session-orgo", "Too late"),
    /ended/,
  );
  assert.equal(store.getState(), expiredState);
  assert.equal(
    store.getState().people.filter((person) => person.status === "studying")
      .length,
    0,
  );
});

test("only the host can end a session and only attending participants can chat", () => {
  const store = fixture();
  const before = store.getState();
  store.actions.endSession("session-orgo");
  assert.throws(
    () => store.actions.sendMessage("session-orgo", "I have not joined"),
    /Join this session/,
  );
  assert.equal(store.getState(), before);
  store.actions.joinSession("session-orgo", "on_way");
  store.actions.sendMessage("session-orgo", "  Be there in 15!  ");
  assert.equal(
    store
      .getState()
      .sessions.find((session) => session.id === "session-orgo")!
      .messages.at(-1)?.text,
    "Be there in 15!",
  );
  store.actions.sendMessage("session-orgo", "   ");
  assert.equal(
    store.getState().sessions.find((session) => session.id === "session-orgo")!
      .messages.length,
    3,
  );
});

test("outgoing friend requests do not grant access before mutual acceptance", () => {
  const store = fixture();
  store.actions.addFriend("nora");
  store.actions.addFriend("nora");
  assert.deepEqual(store.getState().outgoingFriendRequests, ["nora"]);
  assert.ok(!store.getState().friendIds.includes("nora"));
  store.actions.acceptFriend("nora");
  assert.ok(!store.getState().friendIds.includes("nora"));
  store.actions.acceptFriend("mika");
  assert.ok(store.getState().friendIds.includes("mika"));
  assert.ok(!store.getState().friendRequests.includes("mika"));
});

test("ping throttling prevents duplicate sends for one minute", () => {
  const store = fixture();
  store.actions.sendPing("session-orgo", ["sam", "sam"]);
  const firstCount = store.getState().pings.length;
  store.actions.sendPing("session-orgo", ["sam"]);
  assert.equal(store.getState().pings.length, firstCount);
  store.advance(minute);
  store.actions.sendPing("session-orgo", ["sam"]);
  assert.equal(store.getState().pings.length, firstCount + 1);
});

test("demo responses require a real local invitation and an active locally hosted session", () => {
  const store = fixture();
  const sessionId = store.actions.createSession({
    courseId: "math",
    locationId: "bass",
    durationMinutes: 60,
    inviteeIds: ["maya"],
  });
  store.actions.simulateReply(sessionId, "sam", "joined");
  assert.equal(store.getState().sessions[0].participants.length, 1);
  store.actions.simulateReply(sessionId, "maya", "on_way");
  assert.equal(store.getState().sessions[0].participants.length, 2);
  assert.equal(
    store.getState().pings.find((ping) => ping.toUserId === "maya")?.response,
    "on_way",
  );
});

test("inviting from a friend’s session does not grant permission to simulate replies as its host", () => {
  const store = fixture();
  store.actions.joinSession("session-orgo");
  store.actions.sendPing("session-orgo", ["emma"]);
  const invitedState = store.getState();
  store.actions.simulateReply("session-orgo", "emma", "on_way");
  assert.equal(store.getState(), invitedState);
  assert.ok(
    !store
      .getState()
      .sessions.find((session) => session.id === "session-orgo")!
      .participants.some((person) => person.userId === "emma"),
  );
});

test("all four reply states remain distinct and maybe or declined does not mark a person studying", () => {
  const store = fixture();
  for (const status of ["joined", "on_way", "maybe", "declined"] as const) {
    store.actions.joinSession("session-orgo", status);
    const state = store.getState();
    assert.equal(
      state.sessions
        .find((session) => session.id === "session-orgo")!
        .participants.find((person) => person.userId === "alex")?.status,
      status,
    );
    assert.equal(
      state.people.find((person) => person.id === "alex")?.status,
      status === "joined" || status === "on_way" ? "studying" : "free",
    );
  }
});

test("corrupt or inaccessible storage falls back to a usable demo", () => {
  const corrupt = createStudyStore({
    storage: { getItem: () => "{broken", setItem: () => {} },
  });
  assert.equal(corrupt.getState().meId, "alex");
  const inaccessible = createStudyStore({
    storage: {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    },
  });
  inaccessible.actions.updatePreferences({ quietMode: true });
  assert.equal(inaccessible.getState().preferences.quietMode, true);
});

test("another tab can adopt persisted changes without writing a notification loop", () => {
  const first = fixture();
  const second = createStudyStore({ storage: first.storage });
  let notifications = 0;
  const unsubscribe = second.subscribe(() => {
    notifications++;
  });
  first.actions.updatePreferences({ quietMode: true });
  second.syncFromStorage();
  assert.equal(second.getState().preferences.quietMode, true);
  assert.equal(notifications, 1);
  unsubscribe();
  assert.ok(first.records.has(STORAGE_KEY));
});

test("reset provides fresh sessions, original friends, preferences, and incoming pings", () => {
  const store = fixture();
  store.actions.joinSession("session-orgo");
  store.actions.updatePreferences({ quietMode: true });
  store.advance(24 * 60 * minute);
  store.actions.resetDemo();
  const fresh = createDemoState(store.now());
  assert.deepEqual(store.getState(), fresh);
  assert.equal(
    store.getState().pings.filter((ping) => !ping.respondedAt).length,
    2,
  );
  assert.equal(store.getState().preferences.quietMode, false);
  assert.equal(
    store
      .getState()
      .sessions.flatMap((session) => session.participants)
      .filter((person) => person.userId === "alex").length,
    0,
  );
});

test("a student with zero friends can join a matching classmate session", () => {
  const store = fixture((state) => {
    state.friendIds = [];
    const session = state.sessions.find((s) => s.id === "session-orgo")!;
    session.audience = "classmates";
  });
  const session = store
    .getState()
    .sessions.find((s) => s.id === "session-orgo")!;
  assert.ok(canViewSession(store.getState(), session));
  store.actions.joinSession(session.id);
  assert.equal(
    getSpotsLeft(store.getState().sessions.find((s) => s.id === session.id)!),
    0,
  );
  assert.equal(store.getState().friendIds.length, 0);
});

test("unrelated private sessions cannot be discovered or changed through actions", () => {
  const store = fixture((state) => {
    state.friendIds = [];
    state.sessions.find((s) => s.id === "session-orgo")!.audience = "friends";
  });
  const before = store.getState();
  const session = before.sessions.find((s) => s.id === "session-orgo")!;
  assert.equal(canViewSession(before, session), false);
  assert.throws(
    () => store.actions.joinSession(session.id),
    /not available to you/,
  );
  assert.throws(
    () => store.actions.respondToPing("ping-maya", "joined"),
    /not available to you/,
  );
  assert.throws(
    () => store.actions.sendMessage(session.id, "hello"),
    /not available to you/,
  );
  assert.throws(
    () => store.actions.sendPing(session.id, ["sam"]),
    /not available to you/,
  );
  assert.equal(store.getState(), before);
});

test("course selection controls classmate access while existing commitments remain visible", () => {
  const store = fixture((state) => {
    state.friendIds = [];
    state.sessions.find((s) => s.id === "session-orgo")!.audience =
      "classmates";
  });
  const session = () =>
    store.getState().sessions.find((s) => s.id === "session-orgo")!;
  store.actions.updateCourses(["cs", "missing", "cs"]);
  assert.deepEqual(
    store.getState().people.find((p) => p.id === "alex")!.courseIds,
    ["cs"],
  );
  assert.equal(canViewSession(store.getState(), session()), false);
  assert.throws(
    () => store.actions.joinSession(session().id),
    /not available to you/,
  );
  store.actions.updateCourses(["orgo"]);
  store.actions.joinSession(session().id);
  store.actions.updateCourses([]);
  assert.ok(canViewSession(store.getState(), session()));
  store.actions.leaveSession(session().id);
  assert.equal(canViewSession(store.getState(), session()), false);
});

test("full groups reject joins and ping acceptance without reserving maybe responses", () => {
  const store = fixture((state) => {
    const session = state.sessions.find((s) => s.id === "session-orgo")!;
    session.capacity = 3;
  });
  const before = store.getState();
  assert.throws(
    () => store.actions.joinSession("session-orgo"),
    /group is full/,
  );
  assert.throws(
    () => store.actions.respondToPing("ping-maya", "on_way"),
    /group is full/,
  );
  assert.equal(store.getState(), before);
  store.actions.respondToPing("ping-maya", "maybe");
  const session = store
    .getState()
    .sessions.find((s) => s.id === "session-orgo")!;
  assert.equal(getAttendeeCount(session), 3);
  assert.equal(getSpotsLeft(session), 0);
  assert.equal(
    session.participants.find((p) => p.userId === "alex")?.status,
    "maybe",
  );
});

test("existing attendees can change replies when full and leaving releases a spot", () => {
  const store = fixture();
  store.actions.joinSession("session-orgo");
  const session = () =>
    store.getState().sessions.find((s) => s.id === "session-orgo")!;
  assert.equal(getSpotsLeft(session()), 0);
  store.actions.joinSession("session-orgo", "on_way");
  assert.equal(getAttendeeCount(session()), 4);
  store.actions.leaveSession("session-orgo");
  assert.equal(getSpotsLeft(session()), 1);
  store.actions.respondToPing("ping-maya", "joined");
  assert.equal(getAttendeeCount(session()), 4);
});

test("pending invites never reserve capacity and demo replies respect the same limit", () => {
  const store = fixture();
  const id = store.actions.createSession({
    courseId: "orgo",
    locationId: "bass",
    durationMinutes: 60,
    capacity: 2,
    inviteeIds: ["maya", "sam"],
  });
  const session = () => store.getState().sessions.find((s) => s.id === id)!;
  assert.equal(getSpotsLeft(session()), 1);
  store.actions.simulateReply(id, "maya", "maybe");
  assert.equal(getSpotsLeft(session()), 1);
  store.actions.simulateReply(id, "sam", "on_way");
  assert.equal(getSpotsLeft(session()), 0);
  assert.throws(
    () => store.actions.simulateReply(id, "maya", "joined"),
    /group is full/,
  );
});

test("future commitments become active only at start time and cancelled plans never activate", () => {
  const store = fixture();
  const startsAt = START + 30 * minute;
  const id = store.actions.createSession({
    courseId: "orgo",
    locationId: "bass",
    durationMinutes: 60,
    startsAt,
    inviteeIds: [],
  });
  const me = () => store.getState().people.find((p) => p.id === "alex")!;
  assert.equal(me().status, "free");
  assert.equal(
    isSessionLive(
      store.getState().sessions.find((s) => s.id === id)!,
      store.now(),
    ),
    false,
  );
  store.advance(30 * minute);
  store.actions.expireSessions();
  assert.equal(me().status, "studying");
  store.actions.endSession(id);
  assert.equal(me().status, "free");
  assert.match(store.getState().activity[0].text, /wrapped up/);
  const cancelled = store.actions.createSession({
    courseId: "math",
    locationId: "bass",
    durationMinutes: 30,
    startsAt: store.now() + 30 * minute,
    inviteeIds: [],
  });
  store.actions.endSession(cancelled);
  assert.match(store.getState().activity[0].text, /cancelled/);
  store.advance(45 * minute);
  store.actions.expireSessions();
  assert.equal(me().status, "free");
  assert.throws(() => store.actions.joinSession(cancelled), /ended/);
});

test("an invitation cannot bypass classmate visibility after a friend removes the course", () => {
  const store = fixture();
  const id = store.actions.createSession({
    courseId: "orgo",
    locationId: "bass",
    durationMinutes: 60,
    audience: "classmates",
    inviteeIds: ["maya"],
  });
  const changed = {
    ...store.getState(),
    people: store
      .getState()
      .people.map((person) =>
        person.id === "maya" ? { ...person, courseIds: [] } : person,
      ),
  };
  const updatedStore = createStudyStore({
    initialState: changed,
    now: store.now,
  });
  const before = updatedStore.getState();
  assert.throws(
    () => updatedStore.actions.simulateReply(id, "maya", "joined"),
    /can no longer join/,
  );
  assert.equal(updatedStore.getState(), before);
  assert.equal(
    updatedStore.getState().sessions.find((session) => session.id === id)!
      .participants.length,
    1,
  );
  assert.equal(
    updatedStore
      .getState()
      .pings.find((ping) => ping.sessionId === id && ping.toUserId === "maya")
      ?.respondedAt,
    undefined,
  );
});

test("scheduled creation rejects past, another Yale day, invalid capacity and conflicting intervals", () => {
  const store = fixture();
  const input = {
    courseId: "orgo",
    locationId: "bass",
    durationMinutes: 60,
    inviteeIds: [],
  };
  for (const startsAt of [
    START - minute,
    START + 24 * 60 * minute,
    Number.NaN,
  ]) {
    assert.throws(
      () => store.actions.createSession({ ...input, startsAt }),
      /later today/,
    );
  }
  assert.throws(
    () => store.actions.createSession({ ...input, capacity: 3 }),
    /group size/,
  );
  store.actions.createSession({ ...input, startsAt: START + 60 * minute });
  assert.throws(
    () =>
      store.actions.createSession({ ...input, startsAt: START + 30 * minute }),
    /already hosting/,
  );
  store.actions.createSession(input); // Adjacent boundary is allowed.
  assert.equal(
    store.getState().sessions.filter((s) => s.hostId === "alex").length,
    2,
  );
});

test("v1 migration preserves identity, chats, friends and privacy even for oversized groups", () => {
  const legacy = createDemoState(START);
  legacy.courses.find((course) => course.id === "cs")!.code = "CPSC 201";
  legacy.locations.find((location) => location.id === "bass")!.detail =
    "Old sample meeting point";
  legacy.people.find((p) => p.id === "alex")!.name = "Alex Kim";
  const session = legacy.sessions.find((s) => s.id === "session-orgo")!;
  session.participants = ["maya", "sam", "priya", "jordan", "leo"].map(
    (userId) => ({ userId, status: "joined" as const, joinedAt: START }),
  );
  for (const item of legacy.sessions) {
    delete (item as Partial<typeof item>).audience;
    delete (item as Partial<typeof item>).studyStyle;
    delete (item as Partial<typeof item>).task;
    delete (item as Partial<typeof item>).capacity;
  }
  let saved = JSON.stringify({ version: 1, state: legacy });
  const store = createStudyStore({
    storage: {
      getItem: () => saved,
      setItem: (_key, value) => {
        saved = value;
      },
    },
    now: () => START,
  });
  const migrated = store.getState();
  assert.equal(
    migrated.courses.find((course) => course.id === "cs")!.code,
    "CPSC 2010",
  );
  assert.equal(
    migrated.locations.find((location) => location.id === "bass")!.detail,
    createDemoState(START).locations.find((location) => location.id === "bass")!
      .detail,
  );
  assert.equal(
    migrated.people.find((p) => p.id === "alex")!.name,
    "Perryn Chang",
  );
  assert.deepEqual(migrated.friendIds, legacy.friendIds);
  const migratedSession = migrated.sessions.find(
    (s) => s.id === "session-orgo",
  )!;
  assert.equal(migratedSession.capacity, 5);
  assert.equal(migratedSession.audience, "friends");
  assert.equal(migratedSession.studyStyle, "together");
  assert.equal(migratedSession.task, "");
  assert.deepEqual(migratedSession.messages, session.messages);
  assert.ok(migrated.sessions.every((s) => s.audience === "friends"));
  store.actions.updateCourses(["cs"]);
  assert.equal(JSON.parse(saved).version, 2);
  assert.equal(
    createStudyStore({
      storage: { getItem: () => saved, setItem: () => {} },
      now: () => START,
    })
      .getState()
      .sessions.find((s) => s.id === session.id)!.capacity,
    5,
  );
});
