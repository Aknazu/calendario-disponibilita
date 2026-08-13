# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Calendario Disponibilità: React web app for D&D (or other TTRPG) groups to mark day-by-day availability, let a "Master" confirm session days from the crossed data, and auto-notify a Telegram group. Backend is Firebase (Firestore + Auth). UI text/strings are in Italian.

## Commands

```bash
npm start                    # dev server against real Firebase project, localhost:3000
npm run start:emulator       # dev server against local Firestore/Auth emulators, Make webhook disabled
npm run build                # production build to build/
npm run deploy                # build + publish to GitHub Pages (gh-pages -d build)
npm test                     # react-scripts / jest test runner (CRA)
npm run test:rules           # run firestore.rules.test.mjs against a Firestore emulator (29 cases)
```

To run the emulators for `start:emulator` first: `npx firebase-tools@13 emulators:start --only firestore,auth` in a separate terminal (requires Java 17+; firebase-tools 15+ needs Java 21).

There is no lint script; ESLint runs via CRA's built-in `react-app`/`react-app/jest` config during `npm start`/`npm test`.

## Architecture

Flat structure, no router, no state library — everything is Firebase listeners + React state.

- `src/App.js` — auth gate and shell. Owns `onAuthStateChanged`, first-login nickname assignment, dark mode toggle/persistence (localStorage), and Master-status lookup. Renders `Auth` when logged out, `Calendar` when logged in.
- `src/components/Auth.js` — login/signup screen. On signup, the chosen nickname is stashed in `sessionStorage` under `PENDING_NICKNAME_KEY` (see constants.js) rather than written directly to Firestore; `App.js`'s `onAuthStateChanged` handler is what actually persists it, avoiding a write race between two places touching the same user document.
- `src/components/Calendar.js` — the whole calendar UI (FullCalendar + MUI dialogs), including bulk multi-day selection, swipe navigation (react-swipeable), the crown indicators (4+ "Disponibile" = big crown, 4+ "Disponibile"+"Forse" = small crown), Master-only session-day toggling, Google Calendar link generation, and the Telegram notification triggers. This file is the app's core logic; most feature changes land here.
- `src/firestoreService.js` — all Firestore reads/writes. Real-time data (`events`, `sessionDays`) uses `onSnapshot` subscriptions, not polling. `saveAvailability` batches multi-date writes into one atomic commit. `updateUserNickname` also rewrites the nickname on every past event owned by that user in the same batch.
- `src/telegramService.js` — posts to a single Make.com webhook URL (`REACT_APP_MAKE_WEBHOOK_URL`) with a `type` field (`session_confirmed`, `five_players`, `status_change`) that the Make.com scenario branches on. The app never talks to the Telegram Bot API directly, so no bot token is ever in the frontend bundle.
- `src/firebaseConfig.js` — Firebase app init; switches Firestore/Auth to local emulators when `REACT_APP_USE_EMULATOR=true`.
- `src/constants.js`, `src/theme.js` — shared constants (nickname length, sessionStorage key) and MUI light/dark theme definitions.
- `firestore.rules` — the actual security boundary (all `REACT_APP_*` env vars end up in the public JS bundle, so they carry no secrecy). Master privileges are granted purely server-side by creating a doc with the user's UID in the `masters` collection via the Firebase console — there is no in-app way to grant/write it, and no Master password exists anymore. `firestore.rules.test.mjs` is the test suite for these rules (event ownership, Master permissions, nickname validation) and must stay in sync whenever rules change.

### Data model (Firestore collections)

- `users/{uid}`: `{ nickname, email? }` — one per authenticated user, self-writable only.
- `events/{eventId}`: `{ userId, date, eventType, nickname }` — one per user per date; `eventType` is one of `EVENT_TYPES` in `firestoreService.js` (`Disponibile`/`Forse`/`Assente`), which must stay aligned with `isValidEventType` in `firestore.rules`. `userId`/`date` are immutable after creation (enforced by rules) so an event can't be reassigned to another day/owner.
- `sessionDays/{date}`: doc ID is the `YYYY-MM-DD` date string; existence = that day is confirmed as a session. Writable only by Masters.
- `masters/{uid}`: existence of a doc with a given UID grants Master rights to that user. Write-only from the Firebase console (rules deny all client writes).
- `settings/*`: legacy (old plaintext Master password), now fully locked down — kept only so rules explicitly deny it.

### Telegram notification flow

Three trigger points in `Calendar.js`, all going through `telegramService.js` → Make.com webhook → Telegram group:
1. Master confirms a session day → `session_confirmed`.
2. A date crosses from <5 to ≥5 "Disponibile" players on save → `five_players` (threshold-crossing only, not on every save above it).
3. A player changes/removes their status on a date that had already reached 5 "Disponibile" → `status_change`.

## Environment

`.env` needs `REACT_APP_API_KEY`, `REACT_APP_AUTH_DOMAIN`, `REACT_APP_PROJECT_ID`, `REACT_APP_STORAGE_BUCKET`, `REACT_APP_MESSAGING_SENDER_ID`, `REACT_APP_APP_ID`, `REACT_APP_MAKE_WEBHOOK_URL`. None of these are secret (see rules note above); Firestore rules are the real access control, and changes to `firestore.rules` must be deployed separately (`npx firebase-tools deploy --only firestore:rules`) — they are not part of `npm run build`/`deploy`.
