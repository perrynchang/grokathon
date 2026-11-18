import { useSyncExternalStore } from "react";
import { createDemoState, demoIdentity, courses, locations } from "./data";
import {
  canViewSession,
  getAttendeeCount,
  getSpotsLeft,
  isSameYaleDay,
  isSessionLive,
  formatYaleTime,
} from "./sessions";
import type {
  ParticipantStatus,
  Ping,
  StudyActions,
  StudySession,
  StudyState,
} from "./types";

export const STORAGE_KEY = "studyping-demo-v1";
const SCHEMA_VERSION = 2;
const statuses = new Set<ParticipantStatus>([
  "joined",
  "on_way",
  "maybe",
  "declined",
]);
const attending = (status: ParticipantStatus) =>
  status === "joined" || status === "on_way";

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function id(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function readState(storage?: StorageAdapter): StudyState | undefined {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return;
    const saved = JSON.parse(raw);
    const state = saved.state as StudyState;
    if (
      ![1, SCHEMA_VERSION].includes(saved.version) ||
      !state ||
      !Array.isArray(state.people) ||
      !Array.isArray(state.sessions) ||
      !Array.isArray(state.courses) ||
      !Array.isArray(state.locations) ||
      !Array.isArray(state.pings) ||
      !Array.isArray(state.friendIds) ||
      !Array.isArray(state.friendRequests) ||
      !Array.isArray(state.activity) ||
      !state.preferences ||
      !state.people.some((person) => person.id === state.meId)
    )
      return;
    // Older local demos may not yet have outgoing requests.
    state.outgoingFriendRequests ??= [];
    if (
      !state.sessions.every(
        (session) =>
          Number.isFinite(session.startsAt) &&
          Number.isFinite(session.expiresAt) &&
          Array.isArray(session.participants) &&
          Array.isArray(session.messages) &&
          state.people.some((person) => person.id === session.hostId) &&
          state.courses.some((course) => course.id === session.courseId) &&
          state.locations.some(
            (location) => location.id === session.locationId,
          ),
      )
    )
      return;
    if (saved.version === 1) {
      // Never broaden a previously private session during an upgrade.
      state.sessions = state.sessions.map((session) => ({
        ...session,
        audience: "friends",
        studyStyle: "together",
        task: "",
        capacity: Math.max(4, getAttendeeCount(session)),
      }));
    }
    if (
      !state.sessions.every(
        (session) =>
          ["friends", "classmates"].includes(session.audience) &&
          ["quiet", "together"].includes(session.studyStyle) &&
          typeof session.task === "string" &&
          Number.isInteger(session.capacity) &&
          session.capacity >= 2 &&
          session.capacity >= getAttendeeCount(session),
      )
    )
      return;
    if (!state.people.every((person) => Array.isArray(person.courseIds)))
      return;
    // Catalog descriptions are curated app content, not student-authored data.
    state.courses = state.courses.map((course) => ({
      ...course,
      ...courses.find((current) => current.id === course.id),
    }));
    state.locations = state.locations.map((location) => ({
      ...location,
      ...locations.find((current) => current.id === location.id),
    }));
    // Personalize existing recordings without resetting sessions or messages.
    state.people = state.people.map((person) =>
      person.id === state.meId && person.name === "Alex Kim"
        ? { ...person, ...demoIdentity }
        : person,
    );
    return state;
  } catch {
    // A blocked browser storage API or an old/corrupt demo should never break the app.
    return;
  }
}

export function createStudyStore(
  options: {
    initialState?: StudyState;
    storage?: StorageAdapter;
    now?: () => number;
  } = {},
) {
  const now = options.now ?? Date.now;
  let state: StudyState =
    options.initialState ??
    readState(options.storage) ??
    createDemoState(now());
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());

  function commit(next: StudyState) {
    if (next === state) return;
    state = next;
    try {
      options.storage?.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: SCHEMA_VERSION, state }),
      );
    } catch {
      // Continue in memory if the browser is in private mode or the quota is full.
    }
    notify();
  }

  function log(next: StudyState, text: string): StudyState {
    return {
      ...next,
      activity: [
        { id: id("activity"), text, createdAt: now() },
        ...next.activity,
      ].slice(0, 50),
    };
  }

  function findActiveSession(sessionId: string): StudySession | undefined {
    return state.sessions.find(
      (session) => session.id === sessionId && session.expiresAt > now(),
    );
  }

  function canSee(session: StudySession) {
    return canViewSession(state, session);
  }

  function requireSession(sessionId: string): StudySession {
    const session = state.sessions.find((item) => item.id === sessionId);
    if (!session) throw new Error("This session is no longer available.");
    if (!canSee(session))
      throw new Error("This session is not available to you.");
    if (session.expiresAt <= now()) throw new Error("This session has ended.");
    return session;
  }

  function checkCapacity(
    session: StudySession,
    personId: string,
    status: ParticipantStatus,
  ) {
    if (!attending(status)) return;
    const alreadyAttending = session.participants.some(
      (person) => person.userId === personId && attending(person.status),
    );
    if (!alreadyAttending && getSpotsLeft(session) === 0) {
      throw new Error(
        "This group is full. Try another session or start your own.",
      );
    }
  }

  function withPresence(next: StudyState): StudyState {
    return {
      ...next,
      people: next.people.map((person) => {
        const session = next.sessions.find(
          (item) =>
            isSessionLive(item, now()) &&
            item.participants.some(
              (participant) =>
                participant.userId === person.id &&
                attending(participant.status),
            ),
        );
        const location = session
          ? next.locations.find((item) => item.id === session.locationId)?.name
          : undefined;
        if (
          session &&
          (person.status !== "studying" || person.location !== location)
        )
          return { ...person, status: "studying", location };
        if (!session && person.status === "studying")
          return { ...person, status: "free", location: undefined };
        return person;
      }),
    };
  }

  function updateParticipant(
    sessionId: string,
    userId: string,
    status: ParticipantStatus,
    source: StudyState = state,
  ): StudyState {
    return {
      ...source,
      sessions: source.sessions.map((session) =>
        session.id !== sessionId
          ? session
          : {
              ...session,
              participants: [
                ...session.participants.filter(
                  (participant) => participant.userId !== userId,
                ),
                { userId, status, joinedAt: now() },
              ],
            },
      ),
    };
  }

  function pendingPings(
    session: StudySession,
    recipients: string[],
    source = state,
  ): Ping[] {
    return [...new Set(recipients)]
      .filter(
        (personId) =>
          personId !== source.meId && source.friendIds.includes(personId),
      )
      .filter(
        (personId) =>
          session.audience !== "classmates" ||
          source.people.some(
            (person) =>
              person.id === personId &&
              person.courseIds.includes(session.courseId),
          ),
      )
      .filter(
        (personId) =>
          !source.pings.some(
            (ping) =>
              ping.sessionId === session.id &&
              ping.fromUserId === source.meId &&
              ping.toUserId === personId &&
              now() - ping.createdAt < 60_000,
          ),
      )
      .map((personId) => ({
        id: id("ping"),
        sessionId: session.id,
        fromUserId: source.meId,
        toUserId: personId,
        createdAt: now(),
      }));
  }

  // A saved planned session must not make a student look active on first render.
  state = withPresence(state);

  const actions: StudyActions = {
    createSession(input) {
      const course = state.courses.find((item) => item.id === input.courseId);
      const location = state.locations.find(
        (item) => item.id === input.locationId,
      );
      if (!course || !location)
        throw new Error("Choose a subject and a study spot.");
      if (
        !Number.isFinite(input.durationMinutes) ||
        input.durationMinutes < 15 ||
        input.durationMinutes > 480
      )
        throw new Error("Choose a duration between 15 minutes and 8 hours.");
      const createdAt = now();
      const startsAt = input.startsAt ?? createdAt;
      if (
        !Number.isFinite(startsAt) ||
        startsAt < createdAt ||
        !isSameYaleDay(startsAt, createdAt)
      ) {
        throw new Error("Choose now or a time later today at Yale.");
      }
      const expiresAt = startsAt + input.durationMinutes * 60_000;
      const audience = input.audience ?? "classmates";
      const studyStyle = input.studyStyle ?? "together";
      const capacity = input.capacity ?? 4;
      if (
        !["friends", "classmates"].includes(audience) ||
        !["quiet", "together"].includes(studyStyle)
      )
        throw new Error("Choose who can join and how you want to study.");
      if (![2, 4, 6].includes(capacity))
        throw new Error("Choose a group size of 2, 4, or 6, including you.");
      if (
        state.sessions.some(
          (session) =>
            session.hostId === state.meId &&
            session.expiresAt > createdAt &&
            session.startsAt < expiresAt &&
            startsAt < session.expiresAt,
        )
      ) {
        throw new Error(
          "You’re already hosting during that time. Choose another time or end your existing session.",
        );
      }
      const session: StudySession = {
        id: id("session"),
        hostId: state.meId,
        courseId: course.id,
        locationId: location.id,
        title: course.name,
        note: (input.note ?? "").trim().slice(0, 400),
        audience,
        studyStyle,
        task: (input.task ?? "").trim().slice(0, 100),
        capacity,
        startsAt,
        expiresAt,
        participants: [
          { userId: state.meId, status: "joined", joinedAt: now() },
        ],
        messages: [],
      };
      const pings = pendingPings(session, input.inviteeIds);
      commit(
        withPresence(
          log(
            {
              ...state,
              sessions: [session, ...state.sessions],
              pings: [...pings, ...state.pings],
            },
            `You ${startsAt > createdAt ? `planned ${course.name} at ${formatYaleTime(startsAt)}` : `started ${course.name}`} at ${location.name}${pings.length ? ` and pinged ${pings.length} friend${pings.length === 1 ? "" : "s"}` : ""}`,
          ),
        ),
      );
      return session.id;
    },
    joinSession(sessionId, status = "joined") {
      if (!statuses.has(status)) throw new Error("Choose a valid reply.");
      const session = requireSession(sessionId);
      if (session.hostId === state.meId) return;
      checkCapacity(session, state.meId, status);
      if (
        session.participants.some(
          (participant) =>
            participant.userId === state.meId && participant.status === status,
        )
      )
        return;
      let next = updateParticipant(sessionId, state.meId, status);
      next = {
        ...next,
        pings: next.pings.map((ping) =>
          ping.sessionId === sessionId &&
          ping.toUserId === state.meId &&
          !ping.respondedAt
            ? { ...ping, response: status, respondedAt: now() }
            : ping,
        ),
      };
      const verb =
        status === "joined"
          ? "joined"
          : status === "on_way"
            ? "are on your way to"
            : status === "maybe"
              ? "saved for later:"
              : "passed on";
      commit(withPresence(log(next, `You ${verb} ${session.title}`)));
    },
    respondToPing(pingId, status) {
      if (!statuses.has(status)) throw new Error("Choose a valid reply.");
      const ping = state.pings.find(
        (item) => item.id === pingId && item.toUserId === state.meId,
      );
      if (!ping) throw new Error("This invite is no longer available.");
      const session = requireSession(ping.sessionId);
      if (session.hostId === state.meId) return;
      checkCapacity(session, state.meId, status);
      let next = updateParticipant(session.id, state.meId, status);
      next = {
        ...next,
        pings: next.pings.map((item) =>
          item.sessionId === session.id && item.toUserId === state.meId
            ? { ...item, respondedAt: now(), response: status }
            : item,
        ),
      };
      const response = {
        joined: "You’re in",
        on_way: "You’re on your way",
        maybe: "Maybe later",
        declined: "Can’t today",
      }[status];
      commit(withPresence(log(next, `${response} · ${session.title}`)));
    },
    leaveSession(sessionId) {
      const session = findActiveSession(sessionId);
      if (
        !session ||
        session.hostId === state.meId ||
        !session.participants.some((person) => person.userId === state.meId)
      )
        return;
      commit(
        withPresence(
          log(
            {
              ...state,
              sessions: state.sessions.map((item) =>
                item.id === sessionId
                  ? {
                      ...item,
                      participants: item.participants.filter(
                        (person) => person.userId !== state.meId,
                      ),
                    }
                  : item,
              ),
            },
            `You left ${session.title}`,
          ),
        ),
      );
    },
    endSession(sessionId) {
      const session = findActiveSession(sessionId);
      if (!session || session.hostId !== state.meId) return;
      commit(
        withPresence(
          log(
            {
              ...state,
              sessions: state.sessions.map((item) =>
                item.id === sessionId ? { ...item, expiresAt: now() } : item,
              ),
            },
            session.startsAt > now()
              ? `You cancelled ${session.title}.`
              : `You wrapped up ${session.title}. Nice work!`,
          ),
        ),
      );
    },
    sendPing(sessionId, userIds) {
      const session = requireSession(sessionId);
      const pings = pendingPings(session, userIds);
      if (!pings.length) return;
      commit(
        log(
          { ...state, pings: [...pings, ...state.pings] },
          `You pinged ${pings.length} friend${pings.length === 1 ? "" : "s"} to join ${session.title}`,
        ),
      );
    },
    sendMessage(sessionId, text) {
      const cleanText = text.trim().slice(0, 1000);
      if (!cleanText) return;
      const session = requireSession(sessionId);
      if (
        !session.participants.some(
          (participant) =>
            participant.userId === state.meId && attending(participant.status),
        )
      )
        throw new Error("Join this session before sending a message.");
      commit({
        ...state,
        sessions: state.sessions.map((item) =>
          item.id === sessionId
            ? {
                ...item,
                messages: [
                  ...item.messages,
                  {
                    id: id("message"),
                    userId: state.meId,
                    text: cleanText,
                    createdAt: now(),
                  },
                ].slice(-200),
              }
            : item,
        ),
      });
    },
    addFriend(personId) {
      if (
        personId === state.meId ||
        state.friendIds.includes(personId) ||
        state.outgoingFriendRequests.includes(personId) ||
        !state.people.some((person) => person.id === personId)
      )
        return;
      // A pending incoming request needs an explicit acceptance.
      if (state.friendRequests.includes(personId)) return;
      const person = state.people.find((item) => item.id === personId)!;
      commit(
        log(
          {
            ...state,
            outgoingFriendRequests: [...state.outgoingFriendRequests, personId],
          },
          `Friend request sent to ${person.name}`,
        ),
      );
    },
    acceptFriend(personId) {
      if (
        !state.friendRequests.includes(personId) ||
        !state.people.some((person) => person.id === personId)
      )
        return;
      const person = state.people.find((item) => item.id === personId)!;
      commit(
        log(
          {
            ...state,
            friendIds: [...new Set([...state.friendIds, personId])],
            friendRequests: state.friendRequests.filter(
              (item) => item !== personId,
            ),
            outgoingFriendRequests: state.outgoingFriendRequests.filter(
              (item) => item !== personId,
            ),
          },
          `You and ${person.name} are now friends`,
        ),
      );
    },
    updatePreferences(patch) {
      const clean = Object.fromEntries(
        Object.entries(patch).filter(
          ([key, value]) =>
            ["quietMode", "quietHours", "sounds"].includes(key) &&
            typeof value === "boolean",
        ),
      );
      commit({ ...state, preferences: { ...state.preferences, ...clean } });
    },
    updateCourses(courseIds) {
      const courseIdsClean = [...new Set(courseIds)].filter((id) =>
        state.courses.some((course) => course.id === id),
      );
      commit({
        ...state,
        people: state.people.map((person) =>
          person.id === state.meId
            ? { ...person, courseIds: courseIdsClean }
            : person,
        ),
      });
    },
    resetDemo() {
      commit(createDemoState(now()));
    },
    expireSessions() {
      const next = withPresence(state);
      if (next.people.some((person, index) => person !== state.people[index]))
        commit(next);
    },
    simulateReply(sessionId, personId, status) {
      if (
        !statuses.has(status) ||
        personId === state.meId ||
        !state.friendIds.includes(personId)
      )
        return;
      const session = findActiveSession(sessionId);
      if (!session || session.hostId !== state.meId) return;
      const invited = state.pings.some(
        (ping) =>
          ping.sessionId === sessionId &&
          ping.toUserId === personId &&
          ping.fromUserId === state.meId,
      );
      if (!invited) return;
      if (!canViewSession(state, session, personId)) {
        throw new Error("This friend can no longer join this session.");
      }
      checkCapacity(session, personId, status);
      if (
        session.participants.some(
          (person) => person.userId === personId && person.status === status,
        )
      )
        return;
      const person = state.people.find((item) => item.id === personId)!;
      let next = updateParticipant(sessionId, personId, status);
      next = {
        ...next,
        pings: next.pings.map((ping) =>
          ping.sessionId === sessionId && ping.toUserId === personId
            ? { ...ping, respondedAt: now(), response: status }
            : ping,
        ),
      };
      commit(
        withPresence(
          log(
            next,
            `${person.name.split(" ")[0]} ${status === "joined" ? "joined your session" : status === "on_way" ? "is on the way" : status === "maybe" ? "might join later" : "can’t make it today"}`,
          ),
        ),
      );
    },
  };

  return {
    getState: () => state,
    actions,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    /** Called only for a storage event from another browser tab. */
    syncFromStorage() {
      const incoming = readState(options.storage);
      if (incoming) {
        state = withPresence(incoming);
        notify();
      }
    },
  };
}

let localStorage: StorageAdapter | undefined;
try {
  localStorage =
    typeof window === "undefined" ? undefined : window.localStorage;
} catch {
  /* private browser */
}
const store = createStudyStore({ storage: localStorage });
export const actions = store.actions;
export const getStudyState = store.getState;

if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) store.syncFromStorage();
  });
}

export function useStudyStore() {
  const state = useSyncExternalStore(
    store.subscribe,
    store.getState,
    store.getState,
  );
  return { state, actions };
}

export type {
  Activity,
  Course,
  CreateSessionInput,
  Location,
  Participant,
  ParticipantStatus,
  Person,
  Ping,
  Preferences,
  SessionMessage,
  StudyActions,
  StudySession,
  StudyState,
} from "./types";
