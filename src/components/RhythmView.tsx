import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import type { Person, StudySession } from "../lib/types";
import "./rhythm.css";

type FocusState = {
  duration: number;
  remaining: number;
  endsAt: number | null;
  completed: boolean;
};
const TIMER_KEY = "studyping-focus-v1";
const freshTimer = (duration = 25): FocusState => ({
  duration,
  remaining: duration * 60_000,
  endsAt: null,
  completed: false,
});

function readTimer(): FocusState {
  try {
    const value = JSON.parse(
      localStorage.getItem(TIMER_KEY) || "null",
    ) as FocusState | null;
    if (
      !value ||
      ![25, 50].includes(value.duration) ||
      typeof value.remaining !== "number" ||
      value.remaining < 0 ||
      value.remaining > value.duration * 60_000 ||
      (value.endsAt !== null && typeof value.endsAt !== "number")
    )
      return freshTimer();
    if (value.endsAt !== null && value.endsAt <= Date.now())
      return { ...value, remaining: 0, endsAt: null, completed: true };
    return value;
  } catch {
    return freshTimer();
  }
}

const week = [
  { day: "Mon", minutes: 90 },
  { day: "Tue", minutes: 120 },
  { day: "Wed", minutes: 75 },
  { day: "Thu", minutes: 105 },
  { day: "Fri", minutes: 0 },
  { day: "Sat", minutes: 0 },
  { day: "Sun", minutes: 0 },
];
function durationText(minutes: number) {
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ""}`
    : `${minutes}m`;
}

export default function RhythmView({
  onStart,
}: {
  sessions: StudySession[];
  people: Person[];
  meId: string;
  onStart: () => void;
}) {
  const [timer, setTimer] = useState<FocusState>(readTimer);
  const [now, setNow] = useState(Date.now);
  const [selectedDay, setSelectedDay] = useState(3);
  useEffect(() => {
    try {
      localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
    } catch {
      /* The timer still works when browser storage is unavailable. */
    }
  }, [timer]);
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setTimer((previous) =>
        previous.endsAt !== null && previous.endsAt <= time
          ? { ...previous, remaining: 0, endsAt: null, completed: true }
          : previous,
      );
    };
    tick();
    const interval = window.setInterval(tick, 500);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const remaining =
    timer.endsAt === null ? timer.remaining : Math.max(0, timer.endsAt - now);
  const seconds = Math.ceil(remaining / 1000);
  const timeText = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const progress = 1 - remaining / (timer.duration * 60_000);
  const running = timer.endsAt !== null;
  const toggleTimer = () => {
    const currentTime = Date.now();
    setNow(currentTime);
    setTimer((previous) => {
      if (previous.endsAt !== null)
        return {
          ...previous,
          remaining: Math.max(0, previous.endsAt - currentTime),
          endsAt: null,
        };
      const ms =
        previous.completed || previous.remaining <= 0
          ? previous.duration * 60_000
          : previous.remaining;
      return {
        ...previous,
        remaining: ms,
        endsAt: currentTime + ms,
        completed: false,
      };
    });
  };

  return (
    <div className="rhythm-view">
      <header className="rhythm-heading">
        <h1>Focus</h1>
        <p>A little time to get things done.</p>
      </header>

      <section className="rhythm-focus" aria-label="Focus timer">
        <div className="rhythm-duration" aria-label="Focus duration">
          {[25, 50].map((duration) => (
            <button
              key={duration}
              className={
                timer.duration === duration ? "rhythm-duration-active" : ""
              }
              onClick={() => setTimer(freshTimer(duration))}
              aria-pressed={timer.duration === duration}
            >
              {duration} min
            </button>
          ))}
        </div>
        <div className="rhythm-timer-ring">
          <svg viewBox="0 0 180 180" aria-hidden="true">
            <circle className="rhythm-timer-track" cx="90" cy="90" r="80" />
            <circle
              className="rhythm-timer-progress"
              cx="90"
              cy="90"
              r="80"
              strokeDasharray={2 * Math.PI * 80}
              strokeDashoffset={2 * Math.PI * 80 * (1 - progress)}
            />
          </svg>
          <div className="rhythm-clock">
            <span
              role="timer"
              aria-label={`${Math.floor(seconds / 60)} minutes ${seconds % 60} seconds remaining`}
            >
              {timeText}
            </span>
            <small>
              {timer.completed
                ? "Time for a break"
                : running
                  ? "Focus time"
                  : remaining < timer.duration * 60_000
                    ? "Paused"
                    : "Ready when you are"}
            </small>
          </div>
        </div>
        <div className="rhythm-focus-actions">
          <button className="rhythm-focus-start" onClick={toggleTimer}>
            {running ? (
              <Pause size={16} fill="currentColor" />
            ) : timer.completed ? (
              <Check size={16} />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            {running
              ? "Pause"
              : timer.completed
                ? "Start again"
                : remaining < timer.duration * 60_000
                  ? "Resume"
                  : "Start focus"}
          </button>
          <button
            className="rhythm-focus-reset"
            onClick={() => setTimer(freshTimer(timer.duration))}
            aria-label="Reset focus timer"
            title="Reset timer"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <span className="rhythm-sr-only" role="status">
          {timer.completed ? "Focus session complete. Time for a break." : ""}
        </span>
      </section>

      <div className="rhythm-company">
        <span>Better with company</span>
        <button onClick={onStart}>
          Start studying <ArrowUpRight size={16} />
        </button>
      </div>

      <details className="rhythm-history">
        <summary>
          <span>Sample study history</span>
          <ChevronDown size={16} />
        </summary>
        <div className="rhythm-history-content">
          <p className="rhythm-demo-label">This week · demo data</p>
          <div className="rhythm-stats">
            <div>
              <strong>6.5</strong>
              <span>Hours</span>
            </div>
            <div>
              <strong>4</strong>
              <span>Sessions</span>
            </div>
            <div>
              <strong>3</strong>
              <span>Study buddies</span>
            </div>
          </div>
          <div
            className="rhythm-chart"
            aria-label="Example study history: Monday 90 minutes, Tuesday 120, Wednesday 75, Thursday 105, Friday through Sunday zero"
          >
            {week.map((day, index) => (
              <button
                key={day.day}
                className={`rhythm-bar-button ${selectedDay === index ? "rhythm-bar-selected" : ""}`}
                onClick={() => setSelectedDay(index)}
                aria-pressed={selectedDay === index}
                aria-label={`${day.day}: ${day.minutes ? durationText(day.minutes) : "no sessions"} in demo history`}
              >
                <span className="rhythm-bar-space">
                  <span
                    className="rhythm-bar"
                    style={{
                      height: `${Math.max(3, (day.minutes / 120) * 100)}%`,
                    }}
                  />
                </span>
                <span className="rhythm-day">{day.day}</span>
              </button>
            ))}
          </div>
          <p className="rhythm-chart-caption" aria-live="polite">
            {week[selectedDay].day} · {durationText(week[selectedDay].minutes)}{" "}
            of focus
          </p>
        </div>
      </details>
    </div>
  );
}
