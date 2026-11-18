export type ParticipantStatus = "joined" | "on_way" | "maybe" | "declined";
export type SessionAudience = "classmates" | "friends";
export type StudyStyle = "quiet" | "together";

export interface Person {
  id: string;
  name: string;
  username: string;
  avatar: string;
  color: string;
  courseIds: string[];
  status: "studying" | "free" | "offline";
  location?: string;
}

export interface Course {
  id: string;
  name: string;
  code: string;
  emoji: string;
  color: string;
}

export interface Location {
  id: string;
  name: string;
  detail: string;
  /** Percentage coordinates on the illustrated campus map. */
  x: number;
  y: number;
}

export interface Participant {
  userId: string;
  status: ParticipantStatus;
  joinedAt: number;
}

export interface SessionMessage {
  id: string;
  userId: string;
  text: string;
  createdAt: number;
}

export interface StudySession {
  id: string;
  hostId: string;
  courseId: string;
  locationId: string;
  title: string;
  note: string;
  audience: SessionAudience;
  studyStyle: StudyStyle;
  task: string;
  /** Group capacity including the host, not reserved library seating. */
  capacity: number;
  startsAt: number;
  expiresAt: number;
  participants: Participant[];
  messages: SessionMessage[];
}

export interface Ping {
  id: string;
  sessionId: string;
  fromUserId: string;
  toUserId: string;
  createdAt: number;
  respondedAt?: number;
  response?: ParticipantStatus;
}

export interface Preferences {
  quietMode: boolean;
  quietHours: boolean;
  sounds: boolean;
}

export interface Activity {
  id: string;
  text: string;
  createdAt: number;
}

export interface StudyState {
  meId: string;
  people: Person[];
  courses: Course[];
  locations: Location[];
  sessions: StudySession[];
  pings: Ping[];
  /** Incoming request IDs; outgoing requests are tracked separately. */
  friendRequests: string[];
  outgoingFriendRequests: string[];
  friendIds: string[];
  preferences: Preferences;
  activity: Activity[];
}

export interface CreateSessionInput {
  courseId: string;
  locationId: string;
  note?: string;
  durationMinutes: number;
  inviteeIds: string[];
  audience?: SessionAudience;
  studyStyle?: StudyStyle;
  task?: string;
  capacity?: number;
  startsAt?: number;
}

export interface StudyActions {
  createSession(input: CreateSessionInput): string;
  respondToPing(pingId: string, status: ParticipantStatus): void;
  joinSession(sessionId: string, status?: ParticipantStatus): void;
  leaveSession(sessionId: string): void;
  endSession(sessionId: string): void;
  sendPing(sessionId: string, userIds: string[]): void;
  sendMessage(sessionId: string, text: string): void;
  addFriend(personId: string): void;
  acceptFriend(personId: string): void;
  updatePreferences(patch: Partial<Preferences>): void;
  updateCourses(courseIds: string[]): void;
  resetDemo(): void;
  expireSessions(): void;
  simulateReply(
    sessionId: string,
    personId: string,
    status: ParticipantStatus,
  ): void;
}
