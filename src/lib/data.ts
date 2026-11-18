import type {
  Course,
  Location,
  Person,
  StudySession,
  StudyState,
} from "./types";
import { laterTodaySlots } from "./sessions";

export const courses: Course[] = [
  {
    id: "orgo",
    name: "Organic Chemistry",
    code: "CHEM 2200",
    emoji: "🧪",
    color: "#eaf0e3",
  },
  {
    id: "design",
    name: "Introduction to Graphic Design",
    code: "ART 1732",
    emoji: "✳️",
    color: "#f4e8f0",
  },
  {
    id: "math",
    name: "Linear Algebra with Applications",
    code: "MATH 2220",
    emoji: "📐",
    color: "#e8edf8",
  },
  {
    id: "cs",
    name: "Introduction to Computer Science",
    code: "CPSC 2010",
    emoji: "💻",
    color: "#fff0d9",
  },
  {
    id: "writing",
    name: "Introduction to Creative Writing",
    code: "ENGL 1023",
    emoji: "✍️",
    color: "#f8e7df",
  },
];

export const locations: Location[] = [
  {
    id: "bass",
    name: "Bass Library",
    detail: "110 Wall Street · Courtyard and lower-level study spaces",
    x: 39,
    y: 38,
  },
  {
    id: "sterling",
    name: "Sterling Library",
    detail: "120 High Street · Reading rooms and study spaces",
    x: 67,
    y: 31,
  },
  {
    id: "tsai",
    name: "Tsai CITY",
    detail: "17 Prospect Street · Flexible workspaces",
    x: 77,
    y: 68,
  },
  {
    id: "atticus",
    name: "Atticus Bookstore Café",
    detail: "1082 Chapel Street · Bookstore and café",
    x: 27,
    y: 76,
  },
];

export const demoIdentity = {
  name: "Perryn Chang",
  username: "perrynchang",
  avatar: "PC",
};

export const people: Person[] = [
  {
    id: "alex",
    ...demoIdentity,
    color: "#d6ddc7",
    courseIds: ["orgo", "math", "cs"],
    status: "free",
  },
  {
    id: "maya",
    name: "Maya Chen",
    username: "mayac",
    avatar: "MC",
    color: "#f1cfb8",
    courseIds: ["orgo", "math"],
    status: "studying",
    location: "Bass Library",
  },
  {
    id: "jordan",
    name: "Jordan Lee",
    username: "jordlee",
    avatar: "JL",
    color: "#d6d9ee",
    courseIds: ["design", "cs"],
    status: "studying",
    location: "Tsai CITY",
  },
  {
    id: "sam",
    name: "Sam Rivera",
    username: "samr",
    avatar: "SR",
    color: "#cbdac3",
    courseIds: ["orgo", "writing"],
    status: "studying",
    location: "Bass Library",
  },
  {
    id: "priya",
    name: "Priya Shah",
    username: "priyas",
    avatar: "PS",
    color: "#e7c9d3",
    courseIds: ["math", "orgo"],
    status: "studying",
    location: "Sterling Library",
  },
  {
    id: "leo",
    name: "Leo Park",
    username: "leop",
    avatar: "LP",
    color: "#c5dbe4",
    courseIds: ["cs", "math"],
    status: "free",
  },
  {
    id: "emma",
    name: "Emma Wilson",
    username: "emw",
    avatar: "EW",
    color: "#e5d5a9",
    courseIds: ["design", "writing"],
    status: "studying",
    location: "Tsai CITY",
  },
  {
    id: "theo",
    name: "Theo Brooks",
    username: "theob",
    avatar: "TB",
    color: "#d7c8b8",
    courseIds: ["math", "cs"],
    status: "free",
  },
  {
    id: "zoe",
    name: "Zoe Adams",
    username: "zoead",
    avatar: "ZA",
    color: "#c9d8cc",
    courseIds: ["cs", "orgo"],
    status: "free",
  },
  {
    id: "mika",
    name: "Mika Davis",
    username: "mikad",
    avatar: "MD",
    color: "#d9cde7",
    courseIds: ["design", "writing", "orgo"],
    status: "studying",
    location: "Bass Library",
  },
  {
    id: "nora",
    name: "Nora Patel",
    username: "norap",
    avatar: "NP",
    color: "#e8d0b8",
    courseIds: ["orgo", "math"],
    status: "studying",
    location: "Bass Library",
  },
];

const minute = 60_000;

/** Fresh relative times make the recording demo useful whenever it is reset. */
export function createDemoState(now = Date.now()): StudyState {
  const laterSlots = laterTodaySlots(now);
  const laterStart = laterSlots[Math.min(3, laterSlots.length - 1)];
  const secondStart = laterSlots[Math.min(7, laterSlots.length - 1)];
  const laterSessions: StudySession[] =
    laterStart === undefined
      ? []
      : [
          {
            id: "session-cs",
            hostId: "leo",
            courseId: "cs",
            locationId: "bass",
            title: "Introduction to Computer Science",
            audience: "classmates",
            studyStyle: "together",
            task: "Recursion practice",
            capacity: 4,
            note: "Let’s talk through practice problems. Come with a question or just listen.",
            startsAt: laterStart,
            expiresAt: laterStart + 60 * minute,
            participants: [
              { userId: "leo", status: "joined", joinedAt: now - 7 * minute },
            ],
            messages: [
              {
                id: "message-5",
                userId: "leo",
                text: "Let’s meet at the Bass entrance and find a table together.",
                createdAt: now - 6 * minute,
              },
            ],
          },
          {
            id: "session-math-later",
            hostId: "theo",
            courseId: "math",
            locationId: "sterling",
            title: "Linear Algebra with Applications",
            audience: "classmates",
            studyStyle: "quiet",
            task: "An hour to catch up",
            capacity: 4,
            note: "Working independently, with a little company. All levels welcome.",
            startsAt: secondStart,
            expiresAt: secondStart + 60 * minute,
            participants: [
              { userId: "theo", status: "joined", joinedAt: now - 4 * minute },
            ],
            messages: [],
          },
        ];
  return {
    meId: "alex",
    people: people.map((person) => ({
      ...person,
      courseIds: [...person.courseIds],
    })),
    courses: courses.map((course) => ({ ...course })),
    locations: locations.map((location) => ({ ...location })),
    sessions: [
      {
        id: "session-welcome",
        hostId: "nora",
        courseId: "orgo",
        locationId: "bass",
        title: "Organic Chemistry",
        audience: "classmates",
        studyStyle: "together",
        task: "Exam practice, together",
        capacity: 4,
        note: "No need to know anyone. Bring a practice question and we’ll work through it together.",
        startsAt: now - 50 * minute,
        expiresAt: now + 70 * minute,
        participants: [
          { userId: "nora", status: "joined", joinedAt: now - 50 * minute },
          { userId: "mika", status: "joined", joinedAt: now - 30 * minute },
        ],
        messages: [
          {
            id: "message-welcome",
            userId: "nora",
            text: "Welcome! Meet us at the Bass entrance, then we’ll find a table. No prep needed.",
            createdAt: now - 45 * minute,
          },
        ],
      },
      {
        id: "session-orgo",
        hostId: "maya",
        courseId: "orgo",
        locationId: "bass",
        title: "Organic Chemistry",
        audience: "friends",
        studyStyle: "together",
        task: "Reaction mechanisms",
        capacity: 4,
        note: "Tackling reaction mechanisms. Bring your notes, I’ll bring the snacks 🍊",
        startsAt: now - 24 * minute,
        expiresAt: now + 96 * minute,
        participants: [
          { userId: "maya", status: "joined", joinedAt: now - 24 * minute },
          { userId: "sam", status: "joined", joinedAt: now - 15 * minute },
          { userId: "zoe", status: "on_way", joinedAt: now - 2 * minute },
        ],
        messages: [
          {
            id: "message-1",
            userId: "maya",
            text: "Grabbed the big table downstairs. There’s room for you!",
            createdAt: now - 22 * minute,
          },
          {
            id: "message-2",
            userId: "sam",
            text: "I have the practice problems from last week 🙌",
            createdAt: now - 14 * minute,
          },
        ],
      },
      {
        id: "session-design",
        hostId: "jordan",
        courseId: "design",
        locationId: "tsai",
        title: "Introduction to Graphic Design",
        audience: "friends",
        studyStyle: "together",
        task: "Poster feedback",
        capacity: 4,
        note: "A little feedback, a little Figma. Come make something good with us.",
        startsAt: now - 12 * minute,
        expiresAt: now + 108 * minute,
        participants: [
          { userId: "jordan", status: "joined", joinedAt: now - 12 * minute },
          { userId: "emma", status: "joined", joinedAt: now - 8 * minute },
        ],
        messages: [
          {
            id: "message-3",
            userId: "jordan",
            text: "We’re at the round table near the entrance ✳️",
            createdAt: now - 10 * minute,
          },
        ],
      },
      {
        id: "session-math",
        hostId: "priya",
        courseId: "math",
        locationId: "sterling",
        title: "Linear Algebra with Applications",
        audience: "classmates",
        studyStyle: "quiet",
        task: "Independent problem-set work",
        capacity: 4,
        note: "Working independently on eigenvalues. Headphones welcome; no pressure to chat.",
        startsAt: now - 38 * minute,
        expiresAt: now + 82 * minute,
        participants: [
          { userId: "priya", status: "joined", joinedAt: now - 38 * minute },
          { userId: "theo", status: "on_way", joinedAt: now - 3 * minute },
        ],
        messages: [
          {
            id: "message-4",
            userId: "priya",
            text: "Meet by the Sterling entrance and we can find a quiet study space.",
            createdAt: now - 36 * minute,
          },
        ],
      },
      ...laterSessions,
    ],
    pings: [
      {
        id: "ping-maya",
        sessionId: "session-orgo",
        fromUserId: "maya",
        toUserId: "alex",
        createdAt: now - 3 * minute,
      },
      {
        id: "ping-priya",
        sessionId: "session-math",
        fromUserId: "priya",
        toUserId: "alex",
        createdAt: now - 9 * minute,
      },
    ],
    friendIds: ["maya", "jordan", "sam", "priya", "leo", "emma", "theo", "zoe"],
    friendRequests: ["mika"],
    outgoingFriendRequests: [],
    preferences: { quietMode: false, quietHours: true, sounds: false },
    activity: [
      {
        id: "activity-1",
        text: "Maya invited you to study at Bass Library",
        createdAt: now - 3 * minute,
      },
      {
        id: "activity-2",
        text: "Nora welcomed classmates to an Organic Chemistry session",
        createdAt: now - 12 * minute,
      },
      {
        id: "activity-3",
        text: "Sam joined Maya at Bass Library",
        createdAt: now - 15 * minute,
      },
    ],
  };
}
