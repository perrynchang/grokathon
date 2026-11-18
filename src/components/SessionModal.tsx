import { useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  MapPin,
  MessageCircle,
  Send,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Users,
  VolumeX,
} from "lucide-react";
import { Avatar, Modal } from "./ui";
import { useStudyStore } from "../lib/store";
import {
  canViewSession,
  formatYaleTime,
  getAttendeeCount,
  getSpotsLeft,
} from "../lib/sessions";
import type { ParticipantStatus, StudySession } from "../lib/types";

export const REPLIES = [
  { status: "joined" as const, label: "I’m in", icon: <Check size={15} /> },
  {
    status: "on_way" as const,
    label: "On my way",
    icon: <ArrowUpRight size={15} />,
  },
  {
    status: "maybe" as const,
    label: "Maybe later",
    icon: <Clock3 size={15} />,
  },
  {
    status: "declined" as const,
    label: "Can’t today",
    icon: <Coffee size={15} />,
  },
];

export default function SessionModal({
  session,
  justCreated,
  onClose,
  notify,
}: {
  session: StudySession;
  justCreated: boolean;
  onClose: () => void;
  notify: (text: string, type?: "success" | "info") => void;
}) {
  const { state, actions } = useStudyStore();
  const [tab, setTab] = useState<"people" | "chat">("people");
  const [message, setMessage] = useState("");
  const [pingSelector, setPingSelector] = useState(false);
  const [invitees, setInvitees] = useState<string[]>([]);
  const [ending, setEnding] = useState(false);
  const course = state.courses.find((c) => c.id === session.courseId)!;
  const location = state.locations.find((l) => l.id === session.locationId)!;
  const host = state.people.find((p) => p.id === session.hostId)!;
  const participant = session.participants.find((p) => p.userId === state.meId);
  const isHost = session.hostId === state.meId;
  const joined =
    !!participant && ["joined", "on_way"].includes(participant.status);
  const expired = session.expiresAt <= Date.now();
  const upcoming = session.startsAt > Date.now() && !expired;
  const canChat = joined || isHost;
  const spots = getSpotsLeft(session);
  const participants = session.participants.filter(
    (p) => p.status !== "declined",
  );
  const pendingPings = Array.from(
    new Map(
      state.pings
        .filter(
          (p) =>
            p.sessionId === session.id &&
            !p.respondedAt &&
            p.toUserId !== state.meId &&
            !session.participants.some((x) => x.userId === p.toUserId),
        )
        .map((p) => [p.toUserId, p]),
    ).values(),
  );
  const invitedCount = new Set(
    state.pings
      .filter((p) => p.sessionId === session.id && p.fromUserId === state.meId)
      .map((p) => p.toUserId),
  ).size;
  const eligibleFriends = state.people.filter(
    (p) =>
      state.friendIds.includes(p.id) &&
      !session.participants.some((x) => x.userId === p.id) &&
      canViewSession(state, session, p.id),
  );
  const time = `${upcoming ? "Today, " : ""}${formatYaleTime(session.startsAt)} – ${formatYaleTime(session.expiresAt)}`;
  function respond(status: ParticipantStatus) {
    try {
      const ping = state.pings.find(
        (p) => p.sessionId === session.id && p.toUserId === state.meId,
      );
      if (ping) actions.respondToPing(ping.id, status);
      else actions.joinSession(session.id, status);
      notify(
        status === "joined"
          ? "Your spot is saved."
          : status === "on_way"
            ? "The group knows you’re on the way."
            : "Reply updated.",
      );
    } catch (e) {
      notify((e as Error).message, "info");
    }
  }
  function submitMessage(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    try {
      actions.sendMessage(session.id, message.trim());
      setMessage("");
    } catch (e) {
      notify((e as Error).message, "info");
    }
  }
  return (
    <Modal title={course.name} onClose={onClose} wide className="session-modal">
      <div className="session-context">
        <span>{course.code}</span>
        <span>
          {session.studyStyle === "quiet" ? (
            <VolumeX size={14} />
          ) : (
            <Users size={14} />
          )}{" "}
          {session.studyStyle === "quiet" ? "Quiet study" : "Work together"}
        </span>
        <span>
          {session.audience === "classmates"
            ? "Classmates welcome"
            : "Friends only"}
        </span>
      </div>
      <div className="session-detail-hero">
        <div className="session-detail-location">
          <span>
            <MapPin size={20} />
          </span>
          <div>
            <h3>{location.name}</h3>
            <p>{location.detail}</p>
          </div>
          <span className="session-detail-live">
            {expired ? "Ended" : upcoming ? "Later today" : "Now"}
          </span>
        </div>
        <div className="session-detail-meta">
          <span>
            <Clock3 size={14} />
            {expired ? "Session ended" : time}
          </span>
          <span>
            <Users size={14} />
            {getAttendeeCount(session)}/{session.capacity} joined
          </span>
        </div>
        {!expired && (
          <p className="session-capacity-note">
            {spots
              ? `${spots} ${spots === 1 ? "spot" : "spots"} available in the group`
              : "This group is full"}{" "}
            · Room seating isn’t reserved by StudyPing.
          </p>
        )}
      </div>
      <div className="session-detail-body">
        {session.note ? (
          <details className="session-note-details">
            <summary>
              {session.task || "Meeting note"}
              <ChevronDown size={14} />
            </summary>
            <p>{session.note}</p>
          </details>
        ) : session.task ? (
          <p className="session-task-label">{session.task}</p>
        ) : null}
        {!expired && (justCreated || joined || isHost) && (
          <div className="created-success session-confirmation">
            <span>
              <Check size={17} />
            </span>
            <div>
              <strong>
                {isHost
                  ? justCreated
                    ? upcoming
                      ? "Session scheduled"
                      : "Your group is ready"
                    : "You’re hosting this group"
                  : "Your spot is saved"}
              </strong>
              <p>
                {isHost
                  ? `${session.audience === "classmates" ? "Classmates can join from their course feed." : "Your friends can find this session."}${invitedCount ? ` ${invitedCount} ${invitedCount === 1 ? "invite" : "invites"} sent.` : ""}`
                  : `${upcoming ? `Today at ${formatYaleTime(session.startsAt)}` : "Happening now"} · ${location.name} · Hosted by ${host.name.split(" ")[0]}`}
              </p>
            </div>
          </div>
        )}
        {!expired &&
          !isHost &&
          (joined ? (
            <details className="reply-disclosure">
              <summary>
                <span>
                  <Check size={14} />
                  {participant?.status === "on_way"
                    ? "On your way"
                    : "You’re in"}
                </span>
                Change reply
                <ChevronDown size={14} />
              </summary>
              <div
                className={`ping-replies ${upcoming ? "replies-upcoming" : ""}`}
              >
                {REPLIES.filter((r) => !upcoming || r.status !== "on_way").map(
                  (r) => (
                    <button
                      key={r.status}
                      className={
                        participant?.status === r.status ? "selected" : ""
                      }
                      onClick={() => respond(r.status)}
                    >
                      {r.icon}
                      {r.label}
                    </button>
                  ),
                )}
              </div>
            </details>
          ) : (
            <div className="session-reply-area">
              <div className="field-label">
                <span>Join this group</span>
                <span>
                  {spots
                    ? `${spots} ${spots === 1 ? "spot" : "spots"} left`
                    : "Group full"}
                </span>
              </div>
              <div
                className={`ping-replies ${upcoming ? "replies-upcoming" : ""}`}
              >
                {REPLIES.filter((r) => !upcoming || r.status !== "on_way").map(
                  (r) => (
                    <button
                      key={r.status}
                      disabled={
                        spots === 0 && ["joined", "on_way"].includes(r.status)
                      }
                      className={
                        participant?.status === r.status
                          ? "selected"
                          : r.status === "joined"
                            ? "primary"
                            : ""
                      }
                      onClick={() => respond(r.status)}
                    >
                      {r.icon}
                      {r.status === "joined" ? "Join group" : r.label}
                    </button>
                  ),
                )}
              </div>
            </div>
          ))}
        <div className="session-tabs">
          <button
            className={tab === "people" ? "active" : ""}
            onClick={() => setTab("people")}
          >
            <Users size={16} />
            People<span>{getAttendeeCount(session)}</span>
          </button>
          <button
            className={tab === "chat" ? "active" : ""}
            onClick={() => setTab("chat")}
          >
            <MessageCircle size={16} />
            Chat
            {canChat && session.messages.length > 0 && (
              <span>{session.messages.length}</span>
            )}
          </button>
          {!expired && canChat && eligibleFriends.length > 0 && (
            <button
              className="invite-more"
              onClick={() => setPingSelector(!pingSelector)}
              aria-expanded={pingSelector}
            >
              <UserPlus size={15} />
              Invite
            </button>
          )}
        </div>
        {pingSelector && (
          <div className="inline-invite">
            <p>Invite friends who can join this group</p>
            <div>
              {eligibleFriends.map((p) => (
                <button
                  className={invitees.includes(p.id) ? "selected" : ""}
                  aria-pressed={invitees.includes(p.id)}
                  key={p.id}
                  onClick={() =>
                    setInvitees(
                      invitees.includes(p.id)
                        ? invitees.filter((id) => id !== p.id)
                        : [...invitees, p.id],
                    )
                  }
                >
                  <Avatar person={p} size={26} />
                  {p.name.split(" ")[0]}
                  {invitees.includes(p.id) && <Check size={13} />}
                </button>
              ))}
            </div>
            <button
              className="button button-small button-primary"
              disabled={!invitees.length || expired}
              onClick={() => {
                try {
                  actions.sendPing(session.id, invitees);
                  setInvitees([]);
                  setPingSelector(false);
                  notify("Invites sent.");
                } catch (e) {
                  notify((e as Error).message, "info");
                }
              }}
            >
              Send {invitees.length || ""} invites
            </button>
          </div>
        )}
        {tab === "people" ? (
          <>
            {pendingPings.length > 0 && !expired && isHost && (
              <div className="demo-reply">
                <div>
                  <Sparkles size={16} />
                  <span>
                    Preview a classmate’s reply
                    <small>Simulated · demo only</small>
                  </span>
                </div>
                <button
                  className="button button-small button-outline"
                  disabled={spots === 0}
                  onClick={() => {
                    try {
                      actions.simulateReply(
                        session.id,
                        pendingPings[0].toUserId,
                        upcoming ? "joined" : "on_way",
                      );
                      notify("Demo reply received.");
                    } catch (e) {
                      notify((e as Error).message, "info");
                    }
                  }}
                >
                  Send demo reply
                  <ArrowUpRight size={14} />
                </button>
              </div>
            )}
            <div className="participant-list">
              {participants.map((p) => {
                const person = state.people.find((x) => x.id === p.userId)!;
                return (
                  <div className="participant-row" key={p.userId}>
                    <Avatar person={person} size={38} />
                    <div>
                      <strong>
                        {person.name}
                        {person.id === state.meId ? " (you)" : ""}
                      </strong>
                      <small>
                        {person.id === session.hostId
                          ? "Host"
                          : p.status === "maybe"
                            ? "No spot reserved"
                            : state.friendIds.includes(person.id)
                              ? "Your friend"
                              : "Classmate"}
                      </small>
                    </div>
                    <span className={`participant-status status-${p.status}`}>
                      {p.status === "on_way" ? (
                        <ArrowUpRight size={13} />
                      ) : p.status === "joined" ? (
                        <Check size={13} />
                      ) : (
                        <Clock3 size={13} />
                      )}{" "}
                      {p.status === "on_way"
                        ? "On the way"
                        : p.status === "joined"
                          ? "Joined"
                          : "Maybe"}
                    </span>
                  </div>
                );
              })}
              {pendingPings.map((p) => {
                const person = state.people.find((x) => x.id === p.toUserId)!;
                return (
                  <div
                    className="participant-row participant-pending"
                    key={p.id}
                  >
                    <Avatar person={person} size={38} />
                    <div>
                      <strong>{person.name}</strong>
                      <small>No spot reserved</small>
                    </div>
                    <span className="participant-status">
                      <Send size={12} />
                      Invited
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        ) : !canChat ? (
          <div className="chat-empty">
            <MessageCircle size={25} />
            <p>Say hello once you join</p>
            <span>Only group participants can read and send messages.</span>
          </div>
        ) : (
          <div className="chat-panel">
            <div className="chat-context">
              <ShieldCheck size={12} />
              Only people in this group can chat.
            </div>
            <div className="chat-messages">
              {!session.messages.length && (
                <div className="chat-empty">
                  <MessageCircle size={25} />
                  <p>Break the ice</p>
                  <span>A quick hello makes meeting up easier.</span>
                </div>
              )}
              {session.messages.map((m) => {
                const person = state.people.find((p) => p.id === m.userId)!;
                return (
                  <div
                    className={`chat-message ${m.userId === state.meId ? "own" : ""}`}
                    key={m.id}
                  >
                    <Avatar person={person} size={29} />
                    <div>
                      <span>
                        {person.name.split(" ")[0]}
                        <small>{formatYaleTime(m.createdAt)}</small>
                      </span>
                      <p>{m.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <form className="chat-input" onSubmit={submitMessage}>
              <input
                aria-label="Message your study group"
                disabled={expired}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                placeholder={
                  expired
                    ? "This session has ended"
                    : "Say hello or share a meeting point…"
                }
              />
              <button
                type="submit"
                aria-label="Send message"
                disabled={expired || !message.trim()}
              >
                <Send size={17} />
              </button>
            </form>
          </div>
        )}
        <div className="session-detail-footer">
          <span>
            <ShieldCheck size={13} />
            Demo group
          </span>
          {!expired &&
            (isHost ? (
              <div>
                {ending ? (
                  <>
                    <span className="end-confirm">
                      {upcoming
                        ? "Cancel this plan for everyone?"
                        : "End this session for everyone?"}
                    </span>
                    <button
                      className="text-button"
                      onClick={() => setEnding(false)}
                    >
                      Keep session
                    </button>
                    <button
                      className="text-button danger-text"
                      onClick={() => {
                        try {
                          actions.endSession(session.id);
                          notify(
                            upcoming ? "Session cancelled." : "Session ended.",
                          );
                          onClose();
                        } catch (e) {
                          notify((e as Error).message, "info");
                        }
                      }}
                    >
                      {upcoming ? "Cancel session" : "End session"}
                    </button>
                  </>
                ) : (
                  <button
                    className="text-button"
                    onClick={() => setEnding(true)}
                  >
                    {upcoming ? "Cancel session" : "End session"}
                  </button>
                )}
              </div>
            ) : participant ? (
              <button
                className="text-button"
                onClick={() => {
                  try {
                    actions.leaveSession(session.id);
                    notify(
                      "You left the group. Your spot is available again.",
                      "info",
                    );
                  } catch (e) {
                    notify((e as Error).message, "info");
                  }
                }}
              >
                Leave session
              </button>
            ) : null)}
        </div>
      </div>
    </Modal>
  );
}
