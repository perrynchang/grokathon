import { useState } from "react";
import { BookOpen, Check, Search } from "lucide-react";
import { Modal } from "./ui";
import { useStudyStore } from "../lib/store";

export default function CoursesModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) {
  const { state, actions } = useStudyStore();
  const me = state.people.find((p) => p.id === state.meId)!;
  const [selected, setSelected] = useState(me.courseIds);
  const [search, setSearch] = useState("");
  const courses = state.courses.filter((c) =>
    `${c.code} ${c.name}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Modal title="My courses" onClose={onClose} className="courses-modal">
      <div className="courses-body">
        <p className="modal-intro">
          Choose your courses to find classmates and study groups.
        </p>
        <label className="friend-search">
          <Search size={16} />
          <input
            aria-label="Search courses"
            placeholder="Search by course or code"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <div className="course-options">
          {courses.map((course) => (
            <label
              className={`course-option ${selected.includes(course.id) ? "is-selected" : ""}`}
              key={course.id}
            >
              <span className="course-option-icon">
                <BookOpen size={19} />
              </span>
              <span>
                <strong>{course.name}</strong>
                <small>{course.code}</small>
              </span>
              <input
                type="checkbox"
                checked={selected.includes(course.id)}
                onChange={() =>
                  setSelected((previous) =>
                    previous.includes(course.id)
                      ? previous.filter((id) => id !== course.id)
                      : [...previous, course.id],
                  )
                }
              />
              <span className="course-option-check" aria-hidden="true">
                {selected.includes(course.id) && <Check size={13} />}
              </span>
            </label>
          ))}
          {!courses.length && (
            <p className="muted-small">No matching courses in this demo.</p>
          )}
        </div>
        <p className="local-mode-note">
          A sample course list for the demo. Courses are self-selected;
          enrollment isn’t verified.
        </p>
      </div>
      <div className="courses-footer">
        <span>{selected.length} selected</span>
        <button
          className="button button-primary"
          onClick={() => {
            actions.updateCourses(selected);
            onSave();
          }}
        >
          Save courses
        </button>
      </div>
    </Modal>
  );
}
