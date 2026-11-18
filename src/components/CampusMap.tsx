import { useId } from "react";
import { Avatar } from "./ui";
import type { Person } from "../lib/types";
import "./campus-map.css";

type MapPerson = Pick<Person, "id" | "name" | "color" | "avatar" | "status">;
type MapSession = {
  id: string;
  hostId: string;
  courseId: string;
  locationId: string;
  participants: { userId: string; status: string }[];
};
type MapLocation = {
  id: string;
  name: string;
  detail: string;
  x: number;
  y: number;
};
type MapCourse = {
  id: string;
  name: string;
  code: string;
  emoji: string;
  color: string;
};

type CampusMapProps = {
  sessions: MapSession[];
  people: MapPerson[];
  locations: MapLocation[];
  courses: MapCourse[];
  onSessionClick: (id: string) => void;
  expanded?: boolean;
};

function Building({
  x,
  y,
  width,
  height,
  roof = "#d8c9b4",
  rotate = 0,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  roof?: string;
  rotate?: number;
}) {
  return (
    <g
      transform={`translate(${x} ${y}) rotate(${rotate} ${width / 2} ${height / 2})`}
    >
      <rect
        x="8"
        y="10"
        width={width}
        height={height}
        rx="3"
        fill="#c6bda9"
        opacity=".2"
      />
      <path
        d={`M0 ${height} L6 ${height + 7} L${width + 6} ${height + 7} L${width} ${height}Z`}
        fill="#bbaa91"
      />
      <path
        d={`M${width} 0 L${width + 6} 7 L${width + 6} ${height + 7} L${width} ${height}Z`}
        fill="#c8b99f"
      />
      <rect
        width={width}
        height={height}
        fill={roof}
        rx="2"
        stroke="#b9ad97"
        strokeWidth=".8"
      />
      <rect
        x="5"
        y="5"
        width={width - 10}
        height={height - 10}
        rx="1"
        fill="none"
        stroke="#eee4d3"
        strokeWidth="2"
      />
      <path
        d={`M${width / 2} 6 V${height - 6}`}
        stroke="#bba88c"
        strokeWidth="1"
        opacity=".45"
      />
      {width > 40 && (
        <>
          <rect
            x="11"
            y="9"
            width="9"
            height="4"
            rx="1"
            fill="#a99c86"
            opacity=".65"
          />
          <rect
            x={width - 20}
            y={height - 13}
            width="9"
            height="4"
            rx="1"
            fill="#a99c86"
            opacity=".65"
          />
        </>
      )}
    </g>
  );
}

function Tree({
  x,
  y,
  size = 10,
  warm = false,
}: {
  x: number;
  y: number;
  size?: number;
  warm?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse
        cx="3"
        cy="5"
        rx={size + 2}
        ry={size * 0.8}
        fill="#817d58"
        opacity=".12"
      />
      <circle r={size} fill={warm ? "#d8bd7a" : "#a7b98c"} />
      <circle
        cx={-size * 0.25}
        cy={-size * 0.27}
        r={size * 0.66}
        fill={warm ? "#e5cf94" : "#bccba3"}
      />
      <path
        d={`M0 0 v${size * 0.7}`}
        stroke={warm ? "#bda76d" : "#8da476"}
        strokeWidth="1"
      />
    </g>
  );
}

const trees = [
  [47, 83, 11],
  [69, 115, 9],
  [88, 66, 8],
  [115, 174, 11],
  [153, 74, 8],
  [209, 65, 8],
  [310, 57, 9],
  [340, 96, 8],
  [355, 66, 10],
  [423, 47, 11],
  [462, 174, 10],
  [600, 66, 11],
  [627, 89, 9],
  [655, 122, 12],
  [684, 158, 8],
  [677, 251, 12],
  [640, 243, 9],
  [617, 365, 12],
  [652, 395, 9],
  [590, 410, 8],
  [495, 385, 10],
  [452, 351, 9],
  [416, 405, 11],
  [387, 372, 8],
  [351, 337, 11],
  [331, 281, 8],
  [308, 310, 10],
  [270, 280, 12],
  [246, 318, 9],
  [263, 380, 11],
  [112, 395, 8],
  [64, 356, 10],
  [68, 268, 12],
  [98, 242, 9],
  [165, 229, 8],
  [206, 261, 10],
  [238, 192, 9],
] as const;

export default function CampusMap({
  sessions,
  people,
  locations,
  courses,
  onSessionClick,
  expanded = false,
}: CampusMapProps) {
  const uid = useId().replace(/:/g, "");
  return (
    <div
      className={`campus-map${expanded ? " campus-map--expanded" : ""}`}
      aria-label="Illustrated campus map showing study sessions happening now"
    >
      <svg
        className="campus-map-art"
        viewBox="0 0 720 440"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern
            id={`${uid}-grain`}
            patternUnits="userSpaceOnUse"
            width="7"
            height="7"
          >
            <circle cx="1" cy="1" r=".5" fill="#b8ad94" opacity=".15" />
          </pattern>
          <pattern
            id={`${uid}-crosswalk`}
            patternUnits="userSpaceOnUse"
            width="9"
            height="18"
          >
            <rect width="4" height="18" fill="#fffdf5" />
          </pattern>
          <linearGradient id={`${uid}-ground`} x2=".8" y2="1">
            <stop stopColor="#eeeadd" />
            <stop offset="1" stopColor="#e9e5d7" />
          </linearGradient>
        </defs>
        <rect width="720" height="440" fill={`url(#${uid}-ground)`} />
        <rect width="720" height="440" fill={`url(#${uid}-grain)`} />

        {/* The illustrated street plan keeps individual locations approximate. */}
        <path
          d="M-40 195 L760 246 M392 -40 L379 480 M-30 336 L760 384 M129 -40 L124 250"
          fill="none"
          stroke="#d4cebd"
          strokeWidth="34"
        />
        <path
          d="M-40 195 L760 246 M392 -40 L379 480 M-30 336 L760 384 M129 -40 L124 250"
          fill="none"
          stroke="#fbf9ef"
          strokeWidth="28"
        />
        <path
          d="M-30 195 L750 246 M392 -30 L379 470"
          fill="none"
          stroke="#e1d9c6"
          strokeWidth="1"
          strokeDasharray="8 10"
        />
        <path
          d="M-30 98 L125 111 M520 -30 L510 218 M531 254 L522 359 M678 -30 L675 440"
          fill="none"
          stroke="#f9f6eb"
          strokeWidth="15"
        />
        <path
          d="M145 158 L365 174 M209 239 L204 332 M405 307 L509 314"
          fill="none"
          stroke="#f8f5eb"
          strokeWidth="10"
        />

        {/* College courtyards. */}
        <path
          d="M151 18 H356 V146 H151Z"
          fill="#dedfc6"
          stroke="#e7e0cd"
          strokeWidth="6"
        />
        <path d="M169 35 H339 V133 H169Z" fill="#eff0d9" />
        <path
          d="M169 35 L339 133 M339 35 L169 133"
          stroke="#f9f6e7"
          strokeWidth="5"
        />
        <ellipse cx="253" cy="84" rx="26" ry="20" fill="#ccd4ae" />
        <circle
          cx="253"
          cy="84"
          r="8"
          fill="#e8dfc3"
          stroke="#bbbea0"
          strokeWidth="2"
        />

        <path d="M223 247 L359 256 L356 333 L220 324Z" fill="#d5dec0" />
        <path
          d="M223 247 L356 333 M359 256 L220 324"
          stroke="#f8f5e8"
          strokeWidth="6"
        />
        <path
          d="M230 264 L347 272 M230 308 L347 315"
          stroke="#c6d3ac"
          strokeWidth="1"
        />
        <text
          x="292"
          y="293"
          textAnchor="middle"
          fill="#94a17c"
          fontSize="9"
          letterSpacing="2.8"
          transform="rotate(4 292 293)"
        >
          CROSS CAMPUS
        </text>

        <rect x="548" y="264" width="102" height="76" rx="8" fill="#dce0c8" />
        <path
          d="M560 272 L638 330 M638 272 L560 330"
          stroke="#f5f1e0"
          strokeWidth="4"
        />

        <Building
          x={20}
          y={20}
          width={76}
          height={44}
          roof="#dfcfbb"
          rotate={4}
        />
        <Building
          x={18}
          y={126}
          width={66}
          height={49}
          roof="#d3c6b1"
          rotate={4}
        />
        <Building x={158} y={16} width={79} height={28} roof="#cebfaa" />
        <Building x={276} y={16} width={71} height={28} roof="#d5c8b1" />
        <Building x={154} y={46} width={25} height={73} roof="#d6c8b3" />
        <Building x={319} y={48} width={28} height={72} roof="#ccbaa1" />
        <Building x={177} y={116} width={110} height={27} roof="#d0bfa4" />
        <Building
          x={249}
          y={147}
          width={67}
          height={35}
          roof="#d5bf9e"
          rotate={4}
        />
        <Building
          x={156}
          y={172}
          width={51}
          height={23}
          roof="#ded1bc"
          rotate={4}
        />

        {/* Sterling’s characteristic tower and reading-room wings. */}
        <Building x={417} y={67} width={30} height={96} roof="#ccbaa1" />
        <Building x={449} y={67} width={45} height={31} roof="#d5c3a9" />
        <Building x={449} y={136} width={45} height={28} roof="#d8c5aa" />
        <Building x={467} y={102} width={27} height={31} roof="#c6b397" />
        <Building x={421} y={91} width={27} height={34} roof="#bfa586" />
        <path d="M425 95 L435 87 L445 95 L435 104Z" fill="#e4d8c1" />
        <Building
          x={541}
          y={19}
          width={55}
          height={35}
          roof="#d6c8b4"
          rotate={-2}
        />
        <Building
          x={546}
          y={111}
          width={78}
          height={37}
          roof="#d6c6ae"
          rotate={4}
        />
        <Building
          x={546}
          y={155}
          width={49}
          height={49}
          roof="#e0ccb1"
          rotate={4}
        />
        <Building
          x={608}
          y={165}
          width={39}
          height={46}
          roof="#cdbfa9"
          rotate={4}
        />
        <Building x={691} y={30} width={48} height={77} roof="#dacbb6" />
        <Building x={693} y={128} width={48} height={56} roof="#d5c5ac" />

        <Building
          x={18}
          y={239}
          width={37}
          height={68}
          roof="#d8c9b5"
          rotate={4}
        />
        <Building
          x={110}
          y={266}
          width={66}
          height={30}
          roof="#cbb69a"
          rotate={4}
        />
        <Building
          x={105}
          y={307}
          width={65}
          height={25}
          roof="#d3b69a"
          rotate={4}
        />
        <Building
          x={413}
          y={257}
          width={71}
          height={30}
          roof="#cfbfa8"
          rotate={4}
        />
        <Building
          x={418}
          y={326}
          width={79}
          height={23}
          roof="#d6c8b4"
          rotate={4}
        />
        <Building
          x={545}
          y={257}
          width={36}
          height={40}
          roof="#d0bda2"
          rotate={4}
        />
        <Building
          x={586}
          y={307}
          width={64}
          height={29}
          roof="#c7ba9e"
          rotate={4}
        />
        <Building
          x={19}
          y={371}
          width={54}
          height={70}
          roof="#cdbca3"
          rotate={4}
        />
        <Building
          x={149}
          y={378}
          width={87}
          height={42}
          roof="#d6c2a6"
          rotate={4}
        />
        <Building
          x={279}
          y={389}
          width={64}
          height={46}
          roof="#d9cbb4"
          rotate={4}
        />
        <Building
          x={441}
          y={399}
          width={43}
          height={60}
          roof="#d4c4aa"
          rotate={4}
        />
        <Building
          x={528}
          y={399}
          width={45}
          height={34}
          roof="#d7c9b2"
          rotate={4}
        />
        <Building
          x={690}
          y={275}
          width={52}
          height={57}
          roof="#dac9af"
          rotate={4}
        />

        {trees.map(([x, y, size], i) => (
          <Tree key={i} x={x} y={y} size={size} warm={i % 5 === 0} />
        ))}

        <g opacity=".9">
          <rect
            x="354"
            y="210"
            width="21"
            height="27"
            fill={`url(#${uid}-crosswalk)`}
            transform="rotate(4 354 210)"
          />
          <rect
            x="403"
            y="214"
            width="21"
            height="27"
            fill={`url(#${uid}-crosswalk)`}
            transform="rotate(4 403 214)"
          />
          <rect
            x="103"
            y="188"
            width="19"
            height="27"
            fill={`url(#${uid}-crosswalk)`}
            transform="rotate(4 103 188)"
          />
        </g>
        <g
          fill="#aba18c"
          fontFamily="inherit"
          fontSize="8"
          letterSpacing="1.6"
          fontWeight="500"
        >
          <text x="60" y="207" transform="rotate(4 60 207)">
            ELM STREET
          </text>
          <text x="560" y="238" transform="rotate(4 560 238)">
            WALL STREET
          </text>
          <text x="390" y="337" transform="rotate(-88 390 337)">
            COLLEGE ST
          </text>
          <text x="42" y="350" transform="rotate(4 42 350)">
            CHAPEL STREET
          </text>
          <text x="220" y="104" letterSpacing="1.1" fontSize="7">
            OLD CAMPUS
          </text>
        </g>
        <path
          d="M10 0 H710 V440 H10"
          fill="none"
          stroke="#f3efe3"
          strokeWidth="10"
          opacity=".5"
        />
      </svg>

      <div className="campus-live-label">
        <span /> Sessions now{" "}
        <span className="campus-live-count">{sessions.length}</span>
      </div>
      <div className="campus-compass" aria-hidden="true">
        <span>N</span>
        <svg viewBox="0 0 24 24">
          <path d="M12 3 18 21 12 17 6 21Z" fill="#938773" />
          <path d="M12 3V17L6 21Z" fill="#d6cbb7" />
        </svg>
      </div>

      <div className="campus-pins">
        {sessions.map((session, index) => {
          const location = locations.find(
            (item) => item.id === session.locationId,
          );
          const host = people.find((item) => item.id === session.hostId);
          const course = courses.find((item) => item.id === session.courseId);
          if (!location || !host || !course) return null;
          const count = new Set([
            session.hostId,
            ...session.participants
              .filter((person) => ["joined", "on_way"].includes(person.status))
              .map((person) => person.userId),
          ]).size;
          const positionOverlap = sessions
            .slice(0, index)
            .filter((item) => item.locationId === session.locationId).length;
          const x = Math.max(
            10,
            Math.min(90, location.x + positionOverlap * 7),
          );
          const y = Math.max(
            18,
            Math.min(82, location.y + positionOverlap * 5),
          );
          const showLabel = index === 0 || (expanded && index < 3);
          return (
            <button
              key={session.id}
              type="button"
              className={`campus-pin campus-pin--${index % 4}${showLabel ? " campus-pin--featured" : ""}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                animationDelay: `${index * 110}ms`,
              }}
              onClick={() => onSessionClick(session.id)}
              aria-label={`${host.name} is hosting ${course.name} at ${location.name}. Open session.`}
            >
              <span className="campus-pin-pulse" />
              <span
                className="campus-pin-avatar"
                style={{ background: host.color }}
              >
                {/^(https?:|data:|\/)/.test(host.avatar) ? (
                  <img src={host.avatar} alt="" />
                ) : (
                  <Avatar person={host} size={expanded ? 44 : 37} />
                )}
              </span>
              <span className="campus-pin-status" />
              {count > 1 && (
                <span className="campus-pin-number">+{count - 1}</span>
              )}
              <span
                className={`campus-pin-callout${x > 60 ? " campus-pin-callout--left" : ""}`}
              >
                <span className="campus-pin-course">
                  {course.emoji} {course.name}
                </span>
                <span className="campus-pin-location">
                  {location.name} <i>·</i> {count} joined
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="campus-privacy-label">
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect
            x="4"
            y="7"
            width="8"
            height="6"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M5.5 7V4.5a2.5 2.5 0 015 0V7"
            stroke="currentColor"
            strokeWidth="1.2"
          />
        </svg>{" "}
        Selected buildings · No live location tracking
      </div>
      <span className="campus-map-wordmark" aria-hidden="true">
        a little closer, together.
      </span>
    </div>
  );
}
