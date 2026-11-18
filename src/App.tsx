import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Bell,
  BellOff,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronLeft,
  Clock3,
  Compass,
  Copy,
  Heart,
  LayoutGrid,
  Map,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  UserPlus,
  X,
  Zap,
} from "lucide-react";
import { useStudyStore } from "./lib/store";
import {
  canViewSession,
  isSessionLive,
  isSameYaleDay,
  getSpotsLeft,
  formatYaleTime,
} from "./lib/sessions";
import CoursesModal from "./components/CoursesModal";
import SessionModal, { REPLIES } from "./components/SessionModal";
import type { StudySession } from "./lib/types";
import { Logo, Avatar, Modal, SessionCard, EmptyState } from "./components/ui";
import CampusMap from "./components/CampusMap";
import RhythmView from "./components/RhythmView";
import CreateSessionModal from "./components/CreateSessionModal";

type View = "campus" | "sessions" | "friends" | "rhythm";
type Overlay =
  "create" | "pings" | "settings" | "invite" | "guide" | "courses" | null;
export default function App() {
  const { state, actions } = useStudyStore();
  const [view, setView] = useState<View>("campus");
  const [createWhen, setCreateWhen] = useState<"now" | "later">("now");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState("all");
  const [display, setDisplay] = useState<"cards" | "map">("cards");
  const [toast, setToast] = useState<{
    text: string;
    type?: "success" | "info";
  } | null>(null);
  const [newSessionId, setNewSessionId] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [clock, setClock] = useState(Date.now());
  const closeOverlay = useCallback(() => {
    setOverlay(null);
    setCreateWhen("now");
  }, []);
  const closeSession = useCallback(() => {
    setSelectedId(null);
    setNewSessionId(null);
  }, []);
  const notify = useCallback(
    (text: string, type: "success" | "info" = "success") =>
      setToast({ text, type }),
    [],
  );
  const now = Date.now();
  const activeSessions = state.sessions
    .filter((s) => s.expiresAt > now && canViewSession(state, s))
    .sort((a, b) => a.startsAt - b.startsAt);
  const me = state.people.find((p) => p.id === state.meId)!;
  const friendList = state.people.filter((p) => state.friendIds.includes(p.id));
  const incoming = state.pings.filter(
    (p) =>
      p.toUserId === state.meId &&
      !p.respondedAt &&
      activeSessions.some((s) => s.id === p.sessionId),
  );
  const selected = state.sessions.find(
    (s) => s.id === selectedId && canViewSession(state, s),
  );
  const mySessions = activeSessions.filter(
    (s) =>
      s.hostId === state.meId ||
      s.participants.some(
        (p) =>
          p.userId === state.meId &&
          ["joined", "on_way", "maybe"].includes(p.status),
      ),
  );
  const shownSessions = activeSessions.filter((s) => {
    const course = state.courses.find((c) => c.id === s.courseId)!;
    const loc = state.locations.find((l) => l.id === s.locationId)!;
    const host = state.people.find((p) => p.id === s.hostId)!;
    return (
      (courseFilter === "all"
        ? me.courseIds.includes(s.courseId)
        : courseFilter === s.courseId) &&
      (s.startsAt <= now || isSameYaleDay(s.startsAt, now)) &&
      `${course.name} ${course.code} ${loc.name} ${host.name} ${s.task} ${s.note}`
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  });

  const nowSessions = shownSessions.filter((s) => isSessionLive(s, now));
  const laterSessions = shownSessions.filter((s) => s.startsAt > now);

  useEffect(() => {
    const t = setInterval(() => {
      setClock(Date.now());
      actions.expireSessions();
    }, 15000);
    return () => clearInterval(t);
  }, [actions]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4200);
    return () => clearTimeout(t);
  }, [toast]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        document
          .querySelector<HTMLInputElement>(".global-search input")
          ?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  const navigate = (next: View) => {
    setView(next);
    setSearch("");
    setCourseFilter("all");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const join = (id: string) => {
    try {
      actions.joinSession(id);
      setSelectedId(id);
    } catch (e) {
      notify((e as Error).message, "info");
    }
  };
  const openSession = (id: string) => {
    setNewSessionId(null);
    setSelectedId(id);
  };
  const reset = () => {
    try {
      localStorage.removeItem("studyping-focus-v1");
    } catch {}
    actions.resetDemo();
    setClock(Date.now());
    closeOverlay();
    closeSession();
    setView("campus");
    setSearch("");
    setCourseFilter("all");
    setDisplay("cards");
    setTourStep(null);
    notify("Fresh start. Your demo is ready to record.");
  };

  const renderCard = (session: StudySession) => (
    <SessionCard
      key={session.id}
      session={session}
      course={state.courses.find((c) => c.id === session.courseId)!}
      location={state.locations.find((l) => l.id === session.locationId)!}
      people={state.people}
      meId={state.meId}
      onOpen={() => openSession(session.id)}
      onJoin={() => join(session.id)}
    />
  );

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button
            className="brand-button"
            onClick={() => navigate("campus")}
            aria-label="StudyPing home"
          >
            <Logo />
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            {(
              [
                ["campus", "Campus"],
                ["sessions", "Sessions"],
                ["friends", "Friends"],
                ["rhythm", "Focus"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                className={view === id ? "active" : ""}
                aria-current={view === id ? "page" : undefined}
                onClick={() => navigate(id)}
              >
                {label}
                {id === "sessions" && mySessions.length > 0 && (
                  <span className="nav-count">{mySessions.length}</span>
                )}
              </button>
            ))}
          </nav>
          <div className="topbar-actions">
            <button
              className="icon-button notification-button"
              aria-label={`Pings inbox, ${incoming.length} new`}
              onClick={() => setOverlay("pings")}
            >
              <Bell size={20} />
              {incoming.length > 0 && <i />}
            </button>
            <button
              className="header-avatar"
              aria-label="Your profile and settings"
              onClick={() => setOverlay("settings")}
            >
              <Avatar person={me} size={34} />
            </button>
          </div>
        </div>
      </header>
      <div className="main-shell">
        <main className={`main-content view-${view}`}>
          {view === "campus" && (
            <>
              <div className="page-heading">
                <div>
                  <div className="greeting">
                    Hi, {me.name.split(" ")[0]} <span>Yale University</span>
                  </div>
                  <h1>Study better, together.</h1>
                  <p>Find a group in your courses, now or later today.</p>
                </div>
                <button
                  className="button button-primary"
                  onClick={() => setOverlay("create")}
                >
                  <Plus size={17} />
                  Start studying
                </button>
              </div>
              <section
                className="session-feed"
                aria-label="Campus study sessions"
              >
                <div className="discover-tools">
                  <div className="view-toggle" aria-label="Session display">
                    <button
                      className={display === "cards" ? "active" : ""}
                      aria-pressed={display === "cards"}
                      onClick={() => setDisplay("cards")}
                    >
                      <LayoutGrid size={15} />
                      Sessions
                    </button>
                    <button
                      className={display === "map" ? "active" : ""}
                      aria-pressed={display === "map"}
                      onClick={() => setDisplay("map")}
                    >
                      <Map size={15} />
                      Map
                    </button>
                  </div>
                  <div className="discover-filters">
                    <label className="global-search">
                      <Search size={16} />
                      <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search sessions"
                        aria-label="Search sessions"
                      />
                    </label>
                    <div className="subject-filter">
                      <select
                        aria-label="Filter by subject"
                        value={courseFilter}
                        onChange={(e) => setCourseFilter(e.target.value)}
                      >
                        <option value="all">All selected</option>
                        {state.courses
                          .filter((c) => me.courseIds.includes(c.id))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code}
                            </option>
                          ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                    <button
                      className="button button-outline button-small edit-courses"
                      onClick={() => setOverlay("courses")}
                    >
                      <BookOpen size={15} />
                      My courses
                    </button>
                  </div>
                </div>
                {shownSessions.length === 0 ? (
                  <div className="feed-empty">
                    <EmptyState
                      title={
                        !me.courseIds.length
                          ? "Find your classmates"
                          : search
                            ? "No matching sessions"
                            : "Be the first to bring people together"
                      }
                      description={
                        !me.courseIds.length
                          ? "Choose your courses to discover welcoming study groups."
                          : search
                            ? "Try a different task, course, or location."
                            : "Start a group for now or later today. You don’t need to know anyone first."
                      }
                      action={
                        <div className="empty-actions">
                          <button
                            className="button button-primary"
                            onClick={() =>
                              setOverlay(
                                !me.courseIds.length ? "courses" : "create",
                              )
                            }
                          >
                            {!me.courseIds.length
                              ? "Choose my courses"
                              : courseFilter !== "all"
                                ? "Start a session for this course"
                                : "Start a session"}
                          </button>
                          {search && (
                            <button
                              className="text-button"
                              onClick={() => setSearch("")}
                            >
                              Clear search
                            </button>
                          )}
                        </div>
                      }
                    />
                  </div>
                ) : (
                  <>
                    <section
                      className="session-time-group"
                      aria-label="Sessions happening now"
                    >
                      <div className="feed-heading">
                        <h2>
                          <i className="live-dot" />
                          Now <span>{nowSessions.length}</span>
                        </h2>
                        <span>Demo sessions</span>
                      </div>
                      {!nowSessions.length ? (
                        <div className="time-group-empty">
                          <p>No sessions right now.</p>
                          <button
                            className="text-button"
                            onClick={() => setOverlay("create")}
                          >
                            Start one
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      ) : display === "cards" ? (
                        <div className="session-grid">
                          {nowSessions.map(renderCard)}
                        </div>
                      ) : (
                        <div className="expanded-map-wrapper">
                          <CampusMap
                            sessions={nowSessions}
                            people={state.people}
                            locations={state.locations}
                            courses={state.courses}
                            expanded
                            onSessionClick={openSession}
                          />
                          <p>
                            Illustrated campus guide · Locations are
                            approximate.
                          </p>
                        </div>
                      )}
                    </section>
                    <section
                      className="session-time-group"
                      aria-label="Sessions later today"
                    >
                      <div className="feed-heading">
                        <h2>
                          <Clock3 size={15} />
                          Later today <span>{laterSessions.length}</span>
                        </h2>
                        <span>Yale time</span>
                      </div>
                      {laterSessions.length ? (
                        <div className="session-grid">
                          {laterSessions.map(renderCard)}
                        </div>
                      ) : (
                        <div className="time-group-empty">
                          <p>No plans for later yet.</p>
                          <button
                            className="text-button"
                            onClick={() => {
                              setCreateWhen("later");
                              setOverlay("create");
                            }}
                          >
                            Plan a session
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      )}
                    </section>
                  </>
                )}
                <div className="study-space-link">
                  <span>Looking for a place?</span>
                  <a
                    href="https://www.library.yale.edu/visit-and-study"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Find a study space
                    <ArrowUpRight size={13} />
                  </a>
                  <a
                    href="https://schedule.yale.edu/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Reserve a room
                    <ArrowUpRight size={13} />
                  </a>
                </div>
              </section>
            </>
          )}

          {view === "sessions" && (
            <>
              <PageHeading
                title="Your sessions"
                description="Sessions you’re hosting or joining."
                action={
                  <button
                    className="button button-primary"
                    onClick={() => setOverlay("create")}
                  >
                    <Plus size={17} />
                    Start studying
                  </button>
                }
              />
              {mySessions.length ? (
                <div className="session-grid">{mySessions.map(renderCard)}</div>
              ) : (
                <EmptyState
                  title="Nothing planned yet"
                  description="Join a classmate’s session or start your own."
                  action={
                    <button
                      className="button button-outline"
                      onClick={() => navigate("campus")}
                    >
                      Browse sessions
                      <ArrowRight size={16} />
                    </button>
                  }
                />
              )}
              <details className="activity-disclosure">
                <summary>
                  Recent activity<span>{state.activity.length}</span>
                  <ChevronDown size={16} />
                </summary>
                <div className="activity-list">
                  {state.activity.slice(0, 8).map((item) => (
                    <div className="activity-item" key={item.id}>
                      <CheckCheck size={16} />
                      <p>{item.text}</p>
                      <small>
                        {Math.max(
                          1,
                          Math.floor((clock - item.createdAt) / 60000),
                        )}
                        m ago
                      </small>
                    </div>
                  ))}
                  {state.activity.length === 0 && (
                    <p className="muted-small">
                      Your session updates will appear here.
                    </p>
                  )}
                </div>
              </details>
            </>
          )}
          {view === "friends" && (
            <>
              <PageHeading
                title="Friends"
                description="Your study circle, all in one place."
                action={
                  <button
                    className="button button-primary"
                    onClick={() => setOverlay("invite")}
                  >
                    <UserPlus size={17} />
                    Add friends
                  </button>
                }
              />
              {state.friendRequests.length > 0 && (
                <section
                  className="friend-requests"
                  aria-label="Friend requests"
                >
                  {state.friendRequests.map((id) => {
                    const p = state.people.find((x) => x.id === id)!;
                    return (
                      <div className="friend-request" key={id}>
                        <Avatar person={p} size={40} />
                        <div>
                          <strong>{p.name}</strong>
                          <p>Wants to add you as a friend</p>
                        </div>
                        <button
                          className="button button-outline button-small"
                          onClick={() => {
                            actions.acceptFriend(id);
                            notify(
                              `${p.name.split(" ")[0]} added to your friends.`,
                            );
                          }}
                        >
                          Accept
                        </button>
                      </div>
                    );
                  })}
                </section>
              )}
              <div className="friend-toolbar">
                <span>{friendList.length} friends</span>
                <label className="global-search">
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Find a friend"
                    aria-label="Search friends"
                  />
                </label>
              </div>
              <div className="friend-list">
                {friendList
                  .filter((p) =>
                    `${p.name} @${p.username}`
                      .toLowerCase()
                      .includes(search.toLowerCase()),
                  )
                  .map((person) => {
                    const session = activeSessions.find(
                      (s) =>
                        isSessionLive(s, now) &&
                        s.participants.some(
                          (p) =>
                            p.userId === person.id &&
                            ["joined", "on_way"].includes(p.status),
                        ),
                    );
                    return (
                      <article className="friend-row" key={person.id}>
                        <Avatar person={person} size={42} status />
                        <div className="friend-copy">
                          <h3>{person.name}</h3>
                          <p>
                            {session
                              ? `${session.participants.find((p) => p.userId === person.id)?.status === "on_way" ? "On the way to" : "Joined a group at"} ${state.locations.find((l) => l.id === session.locationId)?.name}`
                              : person.status === "free"
                                ? "Available to study"
                                : "Offline"}
                          </p>
                        </div>
                        <button
                          className="button button-outline button-small"
                          onClick={() =>
                            session
                              ? openSession(session.id)
                              : setOverlay("create")
                          }
                        >
                          {session ? "View session" : "Invite"}
                          <ArrowUpRight size={14} />
                        </button>
                      </article>
                    );
                  })}
              </div>
              {friendList.filter((p) =>
                `${p.name} @${p.username}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              ).length === 0 && (
                <EmptyState
                  title="No friends found"
                  description="Try a different name or username."
                />
              )}
            </>
          )}

          {view === "rhythm" && (
            <RhythmView
              sessions={activeSessions}
              people={state.people}
              meId={state.meId}
              onStart={() => setOverlay("create")}
            />
          )}
          <footer className="page-footer">
            <span>
              StudyPing <span>·</span> Demo mode
            </span>
            <button onClick={() => setOverlay("guide")}>
              Demo guide
              <ArrowUpRight size={13} />
            </button>
          </footer>
        </main>
      </div>

      {overlay === "create" && (
        <CreateSessionModal
          initialWhen={createWhen}
          initialCourseId={courseFilter === "all" ? undefined : courseFilter}
          onClose={closeOverlay}
          onCreate={(id) => {
            setOverlay(null);
            setCreateWhen("now");
            setSelectedId(id);
            setNewSessionId(id);
            setClock(Date.now());
          }}
          notify={notify}
        />
      )}
      {overlay === "courses" && (
        <CoursesModal
          onClose={closeOverlay}
          onSave={() => {
            closeOverlay();
            setCourseFilter("all");
            setSearch("");
            navigate("campus");
            notify("Courses updated.");
          }}
        />
      )}
      {selected && (
        <SessionModal
          key={selected.id}
          session={selected}
          justCreated={newSessionId === selected.id}
          onClose={closeSession}
          notify={notify}
        />
      )}
      {overlay === "pings" && (
        <Modal title="Pings" onClose={closeOverlay} wide>
          <div className="pings-content">
            <p className="modal-intro">Study invites from your friends.</p>
            {incoming.length === 0 ? (
              <EmptyState
                title="All caught up."
                description="Your next study invite will land right here."
              />
            ) : (
              incoming.map((ping) => {
                const s = activeSessions.find((x) => x.id === ping.sessionId)!;
                const p = state.people.find((x) => x.id === ping.fromUserId)!;
                const c = state.courses.find((x) => x.id === s.courseId)!;
                const l = state.locations.find((x) => x.id === s.locationId)!;
                return (
                  <article className="ping-card" key={ping.id}>
                    <div className="ping-card-top">
                      <Avatar person={p} size={46} />
                      <div>
                        <h3>
                          {p.name.split(" ")[0]} invited you
                          <Zap size={15} />
                        </h3>
                        <p>
                          {c.name}
                          <span>·</span>
                          {l.name}
                        </p>
                      </div>
                      <span className="ping-new-dot" />
                    </div>
                    <p className="ping-note">
                      {s.task || s.note || "Come study with us."}
                    </p>
                    <p className="ping-schedule">
                      <Clock3 size={13} />
                      {s.startsAt > now
                        ? `Today at ${formatYaleTime(s.startsAt)}`
                        : "Happening now"}{" "}
                      · {getSpotsLeft(s)} spots left
                    </p>
                    <div
                      className={`ping-replies ${s.startsAt > now ? "replies-upcoming" : ""}`}
                    >
                      {REPLIES.filter(
                        (r) => s.startsAt <= now || r.status !== "on_way",
                      ).map((r) => (
                        <button
                          key={r.status}
                          disabled={
                            getSpotsLeft(s) === 0 &&
                            ["joined", "on_way"].includes(r.status) &&
                            !s.participants.some(
                              (p) =>
                                p.userId === state.meId &&
                                ["joined", "on_way"].includes(p.status),
                            )
                          }
                          className={r.status === "joined" ? "primary" : ""}
                          onClick={() => {
                            try {
                              actions.respondToPing(ping.id, r.status);
                              notify(
                                r.status === "joined"
                                  ? "You’re in. See you there!"
                                  : r.status === "on_way"
                                    ? "They know you’re on your way."
                                    : "Reply sent. Your pace, your choice.",
                              );
                              if (
                                r.status === "joined" ||
                                r.status === "on_way"
                              ) {
                                closeOverlay();
                                setSelectedId(s.id);
                              }
                            } catch (e) {
                              notify((e as Error).message, "info");
                            }
                          }}
                        >
                          {r.icon}
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })
            )}
            <div className="private-note">
              <ShieldCheck size={14} />
              Your replies are shared with the session, not your whole circle.
            </div>
          </div>
        </Modal>
      )}
      {overlay === "invite" && (
        <InviteModal onClose={closeOverlay} notify={notify} />
      )}
      {overlay === "settings" && (
        <Modal title="Settings" onClose={closeOverlay}>
          <div className="settings-body">
            <div className="settings-profile">
              <Avatar person={me} size={64} />
              <div>
                <h3>{me.name}</h3>
                <p>@{me.username} · Yale University</p>
                <span className="demo-tag">Demo profile</span>
              </div>
            </div>
            <button
              className="settings-courses"
              onClick={() => setOverlay("courses")}
            >
              <BookOpen size={18} />
              <span>
                <strong>My courses</strong>
                <small>
                  {me.courseIds.length} selected · Edit your study interests
                </small>
              </span>
              <ArrowUpRight size={16} />
            </button>
            <h4>Notifications</h4>
            <SettingToggle
              icon={<BellOff size={19} />}
              title="Quiet mode"
              description="Keep pings in your inbox, without a nudge."
              enabled={state.preferences.quietMode}
              onToggle={() =>
                actions.updatePreferences({
                  quietMode: !state.preferences.quietMode,
                })
              }
            />
            <SettingToggle
              icon={<Clock3 size={19} />}
              title="Quiet hours"
              description="Quiet hours, 10 pm – 8 am."
              enabled={state.preferences.quietHours}
              onToggle={() =>
                actions.updatePreferences({
                  quietHours: !state.preferences.quietHours,
                })
              }
            />
            <div className="settings-privacy">
              <ShieldCheck size={20} />
              <div>
                <strong>Your circle. Your choice.</strong>
                <p>
                  Choose friends-only groups or welcome students who selected
                  the same course. Locations are selected buildings, never your
                  GPS.
                </p>
              </div>
            </div>
            <div className="demo-settings">
              <div>
                <strong>A fresh take?</strong>
                <p>Restore the example sessions, pings, and friends.</p>
              </div>
              <button
                className="button button-outline button-small"
                onClick={reset}
              >
                <RotateCcw size={14} />
                Reset demo
              </button>
            </div>
            <p className="local-mode-note">
              This interactive demo runs in your browser. Pings, messages, and
              friend activity stay on this device.
            </p>
          </div>
        </Modal>
      )}
      {overlay === "guide" && (
        <Modal title="Quick tour" onClose={closeOverlay}>
          <div className="guide-body">
            <p className="modal-intro">See how StudyPing works in a minute.</p>
            {[
              {
                icon: <Compass size={20} />,
                title: "Find your classmates",
                text: "Choose your courses and see groups for today.",
              },
              {
                icon: <BookOpen size={20} />,
                title: "Pull up a chair",
                text: "Classmates welcome means you can join, even if you don’t know the host.",
              },
              {
                icon: <Zap size={20} />,
                title: "Make the first move",
                text: "Choose quiet study or working together, now or later today.",
              },
              {
                icon: <Heart size={20} />,
                title: "Know the plan",
                text: "Save your spot and see the time, place, and people.",
              },
            ].map((x, i) => (
              <div className="guide-step" key={x.title}>
                <span>{x.icon}</span>
                <div>
                  <h3>{x.title}</h3>
                  <p>{x.text}</p>
                </div>
                <small>0{i + 1}</small>
              </div>
            ))}
            <button
              className="button button-primary guide-start"
              onClick={() => {
                closeOverlay();
                setTourStep(0);
                navigate("campus");
              }}
            >
              Show me around
              <ArrowRight size={17} />
            </button>
            <div className="guide-foot">
              <span>Example friends. Real interactions.</span>
              <button className="text-button" onClick={reset}>
                <RotateCcw size={13} />
                Reset demo
              </button>
            </div>
          </div>
        </Modal>
      )}
      {tourStep !== null && (
        <div className="tour-bar">
          <span className="tour-symbol">
            <Sparkles size={19} />
          </span>
          <div>
            <span>THE 60-SECOND TOUR · {tourStep + 1}/4</span>
            <strong>
              {
                [
                  "Choose your courses to find a group for today.",
                  "Join a Classmates welcome group. No friend request needed.",
                  "Start studying, or choose Later today to plan ahead.",
                  "Your spot, time, and meeting place are all in one place.",
                ][tourStep]
              }
            </strong>
          </div>
          <button
            className="icon-button"
            aria-label="Previous tour step"
            disabled={tourStep === 0}
            onClick={() => setTourStep(Math.max(0, tourStep - 1))}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="button button-small button-dark"
            onClick={() => {
              if (tourStep === 3) {
                setTourStep(null);
                notify("You’re ready. Go make a great demo!");
              } else {
                setTourStep(tourStep + 1);
                if (tourStep === 1) {
                  setSelectedId(null);
                  setOverlay("create");
                }
              }
            }}
          >
            {tourStep === 3 ? "Done" : "Next"}
            <ArrowRight size={14} />
          </button>
          <button
            className="icon-button"
            aria-label="Close tour"
            onClick={() => setTourStep(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {toast && (
        <div
          className={`toast ${toast.type === "info" ? "toast-info" : ""}`}
          role="status"
        >
          <span>
            {toast.type === "info" ? <Bell size={17} /> : <Check size={17} />}
          </span>
          {toast.text}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}

function InviteModal({
  onClose,
  notify,
}: {
  onClose: () => void;
  notify: (text: string, type?: "success" | "info") => void;
}) {
  const { state, actions } = useStudyStore();
  const [query, setQuery] = useState("");
  const candidates = state.people.filter(
    (p) =>
      p.id !== state.meId &&
      !state.friendIds.includes(p.id) &&
      `${p.name} @${p.username}`.toLowerCase().includes(query.toLowerCase()),
  );
  const me = state.people.find((p) => p.id === state.meId)!;
  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(`@${me.username}`);
      notify("Your username is copied. Good company starts here.");
    } catch {
      notify(`Your username is @${me.username}`, "info");
    }
  };
  return (
    <Modal title="Add friends" onClose={onClose}>
      <div className="invite-modal-body">
        <p className="modal-intro">Search your campus by name or username.</p>
        <label className="friend-search">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or @username"
            aria-label="Search people"
          />
        </label>
        <div className="invite-candidates">
          {candidates.map((p) => (
            <div className="invite-candidate" key={p.id}>
              <Avatar person={p} size={42} />
              <div>
                <strong>{p.name}</strong>
                <small>@{p.username}</small>
              </div>
              {state.friendRequests.includes(p.id) ? (
                <button
                  className="button button-small button-primary"
                  onClick={() => {
                    actions.acceptFriend(p.id);
                    notify(`${p.name.split(" ")[0]} is in your circle.`);
                  }}
                >
                  Accept
                  <Check size={13} />
                </button>
              ) : state.outgoingFriendRequests.includes(p.id) ? (
                <span className="request-sent">
                  <Check size={13} />
                  Request sent
                </span>
              ) : (
                <button
                  className="button button-small button-outline"
                  onClick={() => {
                    actions.addFriend(p.id);
                    notify(
                      `Friend request sent to ${p.name.split(" ")[0]} · Demo`,
                    );
                  }}
                >
                  <Plus size={13} />
                  Add
                </button>
              )}
            </div>
          ))}
          {candidates.length === 0 && (
            <p className="no-people">
              {query
                ? "No one here by that name. Try another search."
                : "You know everyone here. That’s a good circle."}
            </p>
          )}
        </div>
        <div className="share-username">
          <span>
            <Users size={20} />
          </span>
          <div>
            <strong>Make it easy to find you</strong>
            <p>@{me.username}</p>
          </div>
          <button
            className="icon-button"
            aria-label="Copy your username"
            onClick={copyUsername}
          >
            <Copy size={17} />
          </button>
        </div>
        <p className="local-mode-note">
          Example campus directory. Friend requests stay in this demo.
        </p>
      </div>
    </Modal>
  );
}

function SettingToggle({
  icon,
  title,
  description,
  enabled,
  onToggle,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="setting-row">
      <span className="setting-icon">{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        className={`toggle ${enabled ? "enabled" : ""}`}
        role="switch"
        aria-checked={enabled}
        aria-label={title}
        onClick={onToggle}
      >
        <span />
      </button>
    </div>
  );
}
