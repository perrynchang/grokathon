import { useEffect, useRef, useId } from "react";
import type { ReactNode, CSSProperties } from "react";
import {
  X,
  Check,
  MapPin,
  Clock3,
  ArrowUpRight,
  Radio,
  Sparkles,
  BookOpen,
  FlaskConical,
  Palette,
  Sigma,
  Code2,
  PenLine,
  Headphones,
  Users,
  LockKeyhole,
} from "lucide-react";
import type { Person, StudySession, Course, Location } from "../lib/types";
import {
  formatYaleTime,
  getAttendeeCount,
  getSpotsLeft,
} from "../lib/sessions";
import "./session-card.css";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand">
      <span className="brand-mark">
        <svg viewBox="0 0 38 38" fill="none">
          <path
            d="M9 11h13c6 0 10 3 10 8s-4 8-10 8h-6l-6 5v-9h12c3 0 5-1 5-4s-2-4-5-4H9z"
            fill="currentColor"
          />
          <path
            d="m6 6 3 2M3 13h4m-2 7 3-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
      {!compact && (
        <span>
          study<span className="brand-word">ping</span>
          <span className="brand-dot">.</span>
        </span>
      )}
    </div>
  );
}

export function Avatar({
  person,
  size = 40,
  status = false,
}: {
  person?: Pick<Person, "id" | "name" | "color" | "status">;
  size?: number;
  status?: boolean;
}) {
  const seed = (person?.id || "a")
    .split("")
    .reduce((a, x) => a + x.charCodeAt(0), 0);
  const skin = ["#e9b296", "#c98d69", "#f2c6a5", "#d49a77", "#b57a58"][
    seed % 5
  ];
  const hair = ["#382b24", "#41372b", "#302d2b", "#7c5236"][seed % 4];
  const shirt = ["#4f675a", "#a96749", "#737da6", "#c3a349", "#4a7277"][
    seed % 5
  ];
  return (
    <span
      className="avatar"
      style={
        {
          "--avatar-size": `${size}px`,
          background: person?.color || "#e2e6dc",
        } as CSSProperties
      }
      title={person?.name || "You"}
    >
      <svg viewBox="0 0 60 60" aria-hidden="true">
        <path d="M6 64c1-17 10-22 24-22s23 5 24 22" fill={shirt} />
        <path d="M25 38h10v11c-3 4-7 4-10 0" fill={skin} />
        {seed % 2 === 0 && (
          <path d="M14 42V23C14 3 46 3 46 23v23z" fill={hair} />
        )}
        <ellipse cx="30" cy="28" rx="13" ry="17" fill={skin} />
        <path
          d={
            seed % 3 === 0
              ? "M17 26C10 4 43 4 44 22c-10 1-18-3-20-9-1 9-4 12-7 13"
              : "M16 25C9 1 49 3 44 25l-5-10c-8 6-16 3-20 4z"
          }
          fill={hair}
        />
        <path
          d="M23 28h2m10 0h2"
          stroke={hair}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M27 36q3 3 6 0"
          stroke="#985943"
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
        />
        {seed % 4 === 0 && (
          <>
            <circle
              cx="23"
              cy="28"
              r="5"
              stroke={hair}
              fill="none"
              strokeWidth="1.3"
            />
            <circle
              cx="36"
              cy="28"
              r="5"
              stroke={hair}
              fill="none"
              strokeWidth="1.3"
            />
            <path d="M28 28h3" stroke={hair} />
          </>
        )}
      </svg>
      {status && (
        <span className={`avatar-status ${person?.status || "offline"}`} />
      )}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 3,
  size = 30,
}: {
  people: Person[];
  max?: number;
  size?: number;
}) {
  return (
    <span className="avatar-stack">
      {people.slice(0, max).map((p) => (
        <Avatar key={p.id} person={p} size={size} />
      ))}
      {people.length > max && (
        <span className="avatar-more" style={{ width: size, height: size }}>
          +{people.length - max}
        </span>
      )}
    </span>
  );
}

export function Modal({
  children,
  title,
  eyebrow,
  onClose,
  wide = false,
  className = "",
}: {
  children: ReactNode;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  wide?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const nodes = ref.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), a[href], input, select, textarea, [tabindex="0"]',
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === ref.current)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handler);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`modal ${wide ? "modal-wide" : ""} ${className}`}
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="modal-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={titleId}>{title}</h2>
          </div>
          <button
            className="icon-button close-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function SessionCard({
  session,
  course,
  location,
  people,
  meId,
  onOpen,
  onJoin,
}: {
  session: StudySession;
  course: Course;
  location: Location;
  people: Person[];
  meId: string;
  onOpen: () => void;
  onJoin: () => void;
}) {
  const host = people.find((person) => person.id === session.hostId);
  const joined = session.participants.some(
    (person) =>
      person.userId === meId && ["joined", "on_way"].includes(person.status),
  );
  const participants = session.participants
    .filter((person) => ["joined", "on_way"].includes(person.status))
    .map((person) => people.find((item) => item.id === person.userId))
    .filter(Boolean) as Person[];
  const upcoming = session.startsAt > Date.now();
  const remaining = Math.max(
    1,
    Math.ceil((session.expiresAt - Date.now()) / 60000),
  );
  const spots = getSpotsLeft(session);
  const attendeeCount = getAttendeeCount(session);
  const StyleIcon = session.studyStyle === "quiet" ? Headphones : Users;
  const SubjectIcon =
    (
      {
        orgo: FlaskConical,
        design: Palette,
        math: Sigma,
        cs: Code2,
        writing: PenLine,
      } as Record<string, typeof BookOpen>
    )[course.id] || BookOpen;

  return (
    <article className={`clean-session-card course-${course.id}`}>
      <button
        className="clean-session-heading"
        onClick={onOpen}
        aria-label={`View ${course.name} session with ${host?.name || "your classmates"}`}
      >
        <span className="clean-session-icon">
          <SubjectIcon size={21} strokeWidth={1.7} />
        </span>
        <span className="clean-session-title">
          <strong title={course.name}>{course.name}</strong>
          <span>
            {course.code}
            <i>·</i>
            {session.hostId === meId
              ? "Your session"
              : `With ${host?.name.split(" ")[0] || "classmates"}`}
          </span>
        </span>
        <ArrowUpRight className="clean-session-open" size={17} />
      </button>
      <p className="clean-session-task" title={session.task || session.note}>
        {session.task ||
          session.note ||
          (session.studyStyle === "quiet"
            ? "A little company while you focus"
            : "Bring what you’re working on")}
      </p>
      <div className="clean-session-details">
        <span>
          <MapPin size={15} />
          {location.name}
        </span>
        <span>
          <Clock3 size={14} />
          {upcoming
            ? formatYaleTime(session.startsAt)
            : `Now · ${remaining}m left`}
        </span>
      </div>
      <div className="clean-session-context">
        <span>
          <StyleIcon size={14} />
          {session.studyStyle === "quiet" ? "Quiet study" : "Work together"}
        </span>
        <span>
          {session.audience === "friends" ? (
            <LockKeyhole size={12} />
          ) : (
            <span className="clean-session-welcome-dot" />
          )}
          {session.audience === "friends"
            ? "Friends only"
            : "Classmates welcome"}
        </span>
      </div>
      <div className="clean-session-footer">
        <span className="clean-session-people">
          <AvatarStack people={participants} max={2} size={27} />
          <span>
            {attendeeCount} joined
            <span className="clean-session-spots">
              {spots
                ? `${spots} ${spots === 1 ? "spot" : "spots"} left`
                : "Group is full"}
            </span>
          </span>
        </span>
        <button
          className={`clean-session-join${joined ? " clean-session-joined" : ""}`}
          onClick={joined ? onOpen : onJoin}
          disabled={!joined && spots === 0}
          aria-label={
            joined
              ? `Open your ${course.name} session`
              : spots
                ? `Join ${course.name} session with ${host?.name || "classmates"}, ${spots} spots available`
                : `${course.name} session is full`
          }
        >
          {joined ? (
            <>
              <Check size={15} />
              Joined
            </>
          ) : spots ? (
            <>
              Join
              <ArrowUpRight size={15} />
            </>
          ) : (
            "Full"
          )}
        </button>
      </div>
    </article>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Radio size={30} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function SmallSparkle() {
  return (
    <span className="small-sparkle">
      <Sparkles size={14} />
    </span>
  );
}
