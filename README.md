# StudyPing

**Find your study people today.**

A simple, responsive Yale study-group prototype built for a one-minute hackathon demo. Find a session in your course, see what the group is doing, and join even if you do not already know the host. Make a plan for now or later today.

## Run locally

Use Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The app opens as **Perryn Chang** with a populated Yale campus demo. No account, credentials, or backend setup is required.

```bash
npm run build
npm test
npm run preview
```

The production build is written to `dist/` and can be deployed to a static host. Fonts and illustrations are bundled locally for reliable recording.

## Explore the app

- **Campus:** sessions in your selected courses are grouped into **Now** and **Later today**. Search by task, course, or location, or use the course filter. **Map** shows approximate buildings for sessions happening now.
- **My courses:** select or change your study interests from Campus or your profile/settings. These are self-selected courses; the app does not verify enrollment.
- **Classmates welcome:** join an available group spot without a friend request. Nora’s **Organic Chemistry · Exam practice, together** session demonstrates this with a host who is not Perryn’s friend. **Friends only** sessions remain limited to accepted friends and existing participants.
- **Start studying:** choose a course, **Quiet study** or **Work together**, a location, and **Now** or **Later today**. New sessions default to **Classmates welcome**, one hour, and four people including the host. **Additional options** contains duration, group size, task/note, and optional friend invitations; no friends are selected automatically. Use **Start session** or **Schedule session** to confirm.
- **Session view:** see the time, meeting location, people, and available spots. Joining saves a group spot; leaving releases it. **Chat** is available to attending participants. **Joined** and **On the way** describe commitments, not verified physical attendance.
- **Sessions:** return to the groups you host or participate in. Scheduling a non-overlapping later session preserves an ongoing one.
- **Friends:** explore your circle and manage friend requests. A friend network is optional for joining matching open sessions.
- **Focus:** use the 25- or 50-minute timer. **Sample study history** contains labeled example metrics.

Group capacity includes the host. Pending invitations and “maybe” replies do not reserve spots. A group spot does **not** reserve an actual library seat or room. The Campus links **Find a study space** and **Reserve a room** open [Yale’s study-space guide](https://www.library.yale.edu/visit-and-study) and [official room reservations](https://schedule.yale.edu/).

All “today” scheduling uses New Haven time (`America/New_York`), including daylight-saving changes. The form offers future times today; close to midnight, only **Now** may be available. Scheduled sessions become current when their start time arrives, and expired or ended sessions cannot be joined.

## Record the demo

Open your profile/settings and choose **Reset demo** before recording. This restores the sample courses, people, sessions, invitations, and timer with fresh relative times. The footer’s **Demo guide** also includes a reset action.

The main story is **find Nora’s welcoming group → Join → confirm the time and place → schedule your own group for Later today**. See [the 60-second demo script](./DEMO_SCRIPT.md).

For an optional invitation demonstration, select friends under **Additional options** before creating a session. **Send demo reply** then simulates an invited friend’s response in your hosted session; it is explicitly labeled as demo behavior.

## What is implemented

The app uses React, TypeScript, and Vite. Course selection, session creation and scheduling, capacity, audience rules, replies, chat, friend changes, and preferences update local state. Data persists in this browser and synchronizes between tabs on the same origin. Older saved demos migrate without discarding Perryn’s profile or session history; their existing sessions retain friends-only visibility.

Every screen is part of a local interactive prototype. Sample people, sessions, activity, and replies are fictional. Pings and messages do not reach real people or devices. Course selection is unverified. Audience and capacity rules run in the local application, not a trusted server. The map uses approximate, selected building locations and does not track GPS or live occupancy.

The sample course catalog and building details were checked against Yale’s published information. The five sample courses are CHEM 2200, ART 1732, MATH 2220, CPSC 2010, and ENGL 1023. This is a small curated catalog, not a live Yale course or enrollment integration.

## Path to a student pilot

Start with approximately **20–30 students in one course**, after a short usability test with six Yale students, including students without established study groups. Check whether students can find and join a suitable session within a minute and explain when, where, and with whom they will meet.

Before inviting real pilot users, implement Yale email verification, a shared backend with server-enforced audience and capacity rules, reliable updates, and blocking/reporting. These capabilities are **not built in this prototype**. Email verification would establish control of a Yale address, not verify course enrollment. Evaluate actual meetups and repeat participation through brief feedback.

The original proposal recommends Expo and Supabase for a production mobile app. This version uses a responsive browser interface to keep the hackathon experience accessible and easy to record. Recurring calendars, automatic partner matching, and AI tutoring are outside this iteration.

## Dependency audit

As checked on November 17, 2026, `npm audit --omit=dev` reports no production dependency vulnerabilities. The full audit reports four development dependency entries caused by the same [picomatch advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) through Vite. The latest published picomatch version is 4.0.7 and no patched version is available; `npm audit fix` cannot yet resolve it. Recheck before a production launch.

## Project

```text
src/
  components/    Interface components and campus illustration
  lib/           Typed demo data, session rules, and persistent local state
```

The original product proposal is included as `StudyPing_Product_Plan.pdf`.
