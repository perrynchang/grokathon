import { useEffect, useId, useState } from "react";
import type { FormEvent } from "react";
import { Check, ChevronDown, Clock3, Headphones, Users } from "lucide-react";
import { useStudyStore } from "../lib/store";
import { formatYaleTime, laterTodaySlots } from "../lib/sessions";
import { Avatar, Modal } from "./ui";
import "./create-session.css";

type CreateSessionModalProps = {
  initialCourseId?: string;
  initialWhen?: "now" | "later";
  onClose: () => void;
  onCreate: (id: string) => void;
  notify: (text: string, type?: "success" | "info") => void;
};

export default function CreateSessionModal({
  initialCourseId,
  initialWhen = "now",
  onClose,
  onCreate,
  notify,
}: CreateSessionModalProps) {
  const { state, actions } = useStudyStore();
  const fieldId = useId();
  const me = state.people.find((person) => person.id === state.meId)!;
  const latest = state.sessions
    .filter((session) => session.hostId === state.meId)
    .sort((a, b) => b.startsAt - a.startsAt)[0];
  const initialCourse = state.courses.some(
    (course) => course.id === initialCourseId,
  )
    ? initialCourseId!
    : latest && me.courseIds.includes(latest.courseId)
      ? latest.courseId
      : me.courseIds.find((id) =>
          state.courses.some((course) => course.id === id),
        ) ||
        state.courses[0]?.id ||
        "";
  const [courseId, setCourseId] = useState(initialCourse);
  const [locationId, setLocationId] = useState(
    state.locations.some((location) => location.id === latest?.locationId)
      ? latest!.locationId
      : state.locations[0]?.id || "",
  );
  const [studyStyle, setStudyStyle] = useState<"quiet" | "together">(
    "together",
  );
  const [audience, setAudience] = useState<"classmates" | "friends">(
    "classmates",
  );
  const [clock, setClock] = useState(Date.now());
  const slots = laterTodaySlots(clock);
  const [when, setWhen] = useState<"now" | "later">(
    initialWhen === "later" && slots.length > 0 ? "later" : "now",
  );
  const [startsAt, setStartsAt] = useState<number | undefined>(
    when === "later" ? slots[0] : undefined,
  );
  const [duration, setDuration] = useState(60);
  const [capacity, setCapacity] = useState(4);
  const [task, setTask] = useState("");
  const [note, setNote] = useState("");
  const [showOptions, setShowOptions] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const validTime =
    when === "now" || (startsAt !== undefined && slots.includes(startsAt));
  const friends = state.people
    .filter((person) => state.friendIds.includes(person.id))
    .filter(
      (person) => audience === "friends" || person.courseIds.includes(courseId),
    )
    .sort(
      (a, b) =>
        Number(b.courseIds.includes(courseId)) -
        Number(a.courseIds.includes(courseId)),
    );
  const selectedLocation = state.locations.find(
    (location) => location.id === locationId,
  );

  useEffect(() => {
    const timer = setInterval(() => setClock(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  function chooseCourse(id: string) {
    setCourseId(id);
    if (audience === "classmates") {
      setSelected((ids) =>
        ids.filter((personId) =>
          state.people.some(
            (person) => person.id === personId && person.courseIds.includes(id),
          ),
        ),
      );
    }
  }

  function chooseAudience(next: "classmates" | "friends") {
    setAudience(next);
    if (next === "classmates") {
      setSelected((ids) =>
        ids.filter((personId) =>
          state.people.some(
            (person) =>
              person.id === personId && person.courseIds.includes(courseId),
          ),
        ),
      );
    }
  }

  function chooseLater() {
    const available = laterTodaySlots(Date.now());
    setClock(Date.now());
    if (!available.length) return;
    setWhen("later");
    setStartsAt((previous) =>
      previous !== undefined && available.includes(previous)
        ? previous
        : available[0],
    );
  }

  function toggleFriend(id: string) {
    setSelected((previous) =>
      previous.includes(id)
        ? previous.filter((personId) => personId !== id)
        : [...previous, id],
    );
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    if (
      when === "later" &&
      (startsAt === undefined ||
        !laterTodaySlots(Date.now()).includes(startsAt))
    ) {
      setClock(Date.now());
      notify("Choose a new start time at least 15 minutes from now.", "info");
      return;
    }
    setSubmitting(true);
    try {
      const id = actions.createSession({
        courseId,
        locationId,
        studyStyle,
        audience,
        capacity,
        task: task.trim(),
        note: note.trim(),
        durationMinutes: duration,
        inviteeIds: selected,
        startsAt: when === "later" ? startsAt : undefined,
      });
      onCreate(id);
    } catch (error) {
      notify((error as Error).message, "info");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Start studying"
      onClose={onClose}
      className="simple-create-modal"
    >
      <form className="simple-create-form" onSubmit={submit}>
        <div className="simple-create-fields">
          <div className="simple-create-field">
            <label htmlFor={`${fieldId}-course`}>Course</label>
            <div className="simple-create-select">
              <select
                id={`${fieldId}-course`}
                value={courseId}
                onChange={(event) => chooseCourse(event.target.value)}
              >
                {state.courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.code} · {course.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
          </div>

          <fieldset className="simple-create-choice">
            <legend>Study style</legend>
            <div className="simple-create-segments">
              <button
                type="button"
                aria-pressed={studyStyle === "quiet"}
                onClick={() => setStudyStyle("quiet")}
              >
                <Headphones size={15} />
                Quiet study
              </button>
              <button
                type="button"
                aria-pressed={studyStyle === "together"}
                onClick={() => setStudyStyle("together")}
              >
                <Users size={15} />
                Work together
              </button>
            </div>
          </fieldset>

          <div className="simple-create-field">
            <label htmlFor={`${fieldId}-location`}>Location</label>
            <div className="simple-create-select">
              <select
                id={`${fieldId}-location`}
                value={locationId}
                onChange={(event) => setLocationId(event.target.value)}
                aria-describedby={`${fieldId}-location-detail`}
              >
                {state.locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} aria-hidden="true" />
            </div>
            <p className="simple-create-hint" id={`${fieldId}-location-detail`}>
              {selectedLocation?.detail}
            </p>
          </div>

          <fieldset className="simple-create-choice">
            <legend>When</legend>
            <div className="simple-create-time-row">
              <div className="simple-create-segments">
                <button
                  type="button"
                  aria-pressed={when === "now"}
                  onClick={() => setWhen("now")}
                >
                  Now
                </button>
                <button
                  type="button"
                  aria-pressed={when === "later"}
                  onClick={chooseLater}
                  disabled={!slots.length}
                >
                  Later today
                </button>
              </div>
              {when === "later" && (
                <div className="simple-create-select simple-create-time-select">
                  <select
                    value={startsAt ?? ""}
                    onChange={(event) =>
                      setStartsAt(Number(event.target.value))
                    }
                    aria-label="Start time, New Haven time"
                  >
                    {!validTime && (
                      <option value={startsAt ?? ""} disabled>
                        Choose a new time
                      </option>
                    )}
                    {slots.map((slot) => (
                      <option key={slot} value={slot}>
                        {formatYaleTime(slot)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={15} aria-hidden="true" />
                </div>
              )}
            </div>
            {when === "later" && (
              <p className="simple-create-hint">
                {validTime
                  ? "New Haven time."
                  : "That time is too soon. Choose a new time or start now."}
              </p>
            )}
            {!slots.length && (
              <p className="simple-create-hint">
                No later start times remain today. You can still start now.
              </p>
            )}
          </fieldset>

          <fieldset className="simple-create-choice simple-create-audience">
            <legend>Who can join?</legend>
            <div className="simple-create-segments">
              <button
                type="button"
                aria-pressed={audience === "classmates"}
                onClick={() => chooseAudience("classmates")}
              >
                Classmates welcome
              </button>
              <button
                type="button"
                aria-pressed={audience === "friends"}
                onClick={() => chooseAudience("friends")}
              >
                Friends only
              </button>
            </div>
            <p className="simple-create-hint">
              {audience === "classmates"
                ? "Anyone who selects this course can join. No invite needed."
                : "Only your accepted friends can join."}
            </p>
          </fieldset>

          <button
            className="simple-create-disclosure"
            type="button"
            aria-expanded={showOptions}
            aria-controls={`${fieldId}-options`}
            onClick={() => setShowOptions((previous) => !previous)}
          >
            Additional options
            <ChevronDown size={15} className={showOptions ? "is-open" : ""} />
          </button>
          {showOptions && (
            <div id={`${fieldId}-options`} className="simple-create-options">
              <div className="simple-create-options-row">
                <div className="simple-create-field">
                  <label htmlFor={`${fieldId}-duration`}>Duration</label>
                  <div className="simple-create-select">
                    <select
                      id={`${fieldId}-duration`}
                      value={duration}
                      onChange={(event) =>
                        setDuration(Number(event.target.value))
                      }
                    >
                      {[30, 60, 120, 180].map((minutes) => (
                        <option key={minutes} value={minutes}>
                          {minutes < 60
                            ? `${minutes} minutes`
                            : `${minutes / 60} ${minutes === 60 ? "hour" : "hours"}`}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </div>
                </div>
                <div className="simple-create-field">
                  <label htmlFor={`${fieldId}-capacity`}>Group size</label>
                  <div className="simple-create-select">
                    <select
                      id={`${fieldId}-capacity`}
                      value={capacity}
                      onChange={(event) =>
                        setCapacity(Number(event.target.value))
                      }
                    >
                      {[2, 4, 6].map((count) => (
                        <option key={count} value={count}>
                          {count} people
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} aria-hidden="true" />
                  </div>
                </div>
              </div>
              <p className="simple-create-hint simple-create-capacity-hint">
                Includes you. Group spots don’t reserve seats or a room.
              </p>
              <div className="simple-create-field">
                <label htmlFor={`${fieldId}-task`}>
                  What are you working on? <span>Optional</span>
                </label>
                <input
                  id={`${fieldId}-task`}
                  className="simple-create-text"
                  value={task}
                  onChange={(event) => setTask(event.target.value)}
                  maxLength={80}
                  placeholder="Exam practice, problem set 4…"
                />
              </div>
              <div className="simple-create-field">
                <label htmlFor={`${fieldId}-note`}>
                  Meeting note <span>Optional</span>
                </label>
                <textarea
                  id={`${fieldId}-note`}
                  className="simple-create-text"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={180}
                  placeholder="Where to find you, or anything to bring."
                  rows={2}
                />
              </div>
              <section
                className="simple-create-invites"
                aria-label="Invite friends"
              >
                <div className="simple-create-section-label">
                  <span>
                    Invite friends <span>Optional</span>
                  </span>
                  <span aria-live="polite">{selected.length} selected</span>
                </div>
                {friends.length > 0 ? (
                  <>
                    <p className="simple-create-hint">
                      {audience === "classmates"
                        ? "Friends who have selected this course."
                        : "Send a direct invite with your session."}
                    </p>
                    <div className="simple-create-friends">
                      {friends.map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          aria-pressed={selected.includes(person.id)}
                          onClick={() => toggleFriend(person.id)}
                        >
                          <Avatar person={person} size={27} />
                          <span>{person.name}</span>
                          <span
                            className="simple-create-checkbox"
                            aria-hidden="true"
                          >
                            {selected.includes(person.id) && (
                              <Check size={12} />
                            )}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="simple-create-hint">
                    {audience === "classmates"
                      ? "No friends in this course yet. Classmates can still discover your session."
                      : "No friends to invite yet. Add friends so they can find your session."}
                  </p>
                )}
              </section>
            </div>
          )}
        </div>
        <footer className="simple-create-footer">
          <p>
            <Clock3 size={14} />
            {duration < 60
              ? `${duration} min`
              : `${duration / 60} ${duration === 60 ? "hour" : "hours"}`}
            <span>·</span>
            {capacity} people
            {selected.length > 0 && (
              <span className="simple-create-invite-count">
                {" "}
                · {selected.length} invited
              </span>
            )}
          </p>
          <button
            type="submit"
            disabled={submitting || !validTime || !courseId || !locationId}
          >
            {submitting
              ? "Creating…"
              : when === "later"
                ? "Schedule session"
                : "Start session"}
          </button>
        </footer>
      </form>
    </Modal>
  );
}
