# TutorFlow

A full-stack platform for one-to-one online tutoring. Tutors manage their students, run sessions through a strict lifecycle, and use Google Gemini to prepare, review, and analyse each student's progress. Students log in to a read-only dashboard showing their sessions, notes, and AI-generated homework.

**[▶ Live app](https://tutor-flow-peach-kappa.vercel.app)** · [API health check](https://tutorflow-api-cymk.onrender.com/api/health) · test logins in [Test credentials](#test-credentials)

> The API is on Render's free tier and sleeps when idle, so the **first request after a period of inactivity takes 30–60 seconds** while the service wakes. Opening the health check above first is the quickest way to warm it up before signing in.

## At a glance

| | |
|---|---|
| **Stack** | React 19 + Vite + Tailwind CSS · Node.js + Express 5 · PostgreSQL · Google Gemini |
| **Roles** | `tutor` and `student`, enforced server-side on every protected route |
| **Auth** | JWT (Bearer token, 1-day expiry), bcrypt password hashing |
| **Lifecycle** | `SCHEDULED → IN_PROGRESS → COMPLETED → AI_REVIEWED` — strictly sequential, no skipping |
| **AI features** | Session plan, session review, student progress insights — all returned as schema-constrained JSON |
| **Tutor can** | Create students, maintain learning profiles, schedule sessions (double-booking blocked), start/complete sessions, autosave notes, generate AI plan/review, view per-student progress and AI insights |
| **Student can** | View upcoming sessions, read completed session notes, view AI homework and next-session suggestions |

---

## Key features

- **Two-role authentication** — login issues a JWT carrying the user's id and role. Self-registration creates a **tutor** account only; student accounts are always created by their tutor.
- **Student learning profiles** — name, email, subject, current level, learning goals, and free-text weak areas. This profile is the context the AI reads.
- **Session scheduling with clash detection** — a tutor cannot be booked twice at the same scheduled instant. Checked inside a transaction and backed by a unique constraint.
- **Strict session state machine** — transitions are validated on the server against a transition map; invalid jumps are rejected.
- **Session notes with debounced autosave** — the tutor types, the client debounces for 800 ms, then `PATCH`es. The server only accepts note edits while the session is `IN_PROGRESS`.
- **AI session plan** — learning objectives, exactly 4 outline points, and exactly 3 practice questions, generated from the student profile plus previous session reviews.
- **AI session review** — a summary, 2–3 homework tasks, and one next-session suggestion generated from the notes; generating it also advances the session to `AI_REVIEWED`.
- **Progress view + AI insights** — all sessions for a student in chronological order, plus an AI analysis across every past AI review.
- **Student dashboard** — upcoming/past session counts, read-only notes, homework, and next-session suggestions.

---

## User roles and permissions

| Capability | Tutor | Student |
|---|:---:|:---:|
| Log in | ✅ | ✅ |
| Self-register an account | ✅ | ❌ (created by their tutor) |
| Create student accounts and profiles | ✅ | ❌ |
| List own students | ✅ | ❌ |
| Schedule a session | ✅ | ❌ |
| Advance session status | ✅ | ❌ |
| Edit session notes | ✅ (only while `IN_PROGRESS`) | ❌ |
| Generate AI plan / review / insights | ✅ | ❌ |
| View own sessions | ✅ (own sessions only) | ✅ (own sessions only) |
| View another user's data | ❌ | ❌ |

Every tutor route is guarded by `authenticate` + `authorize("tutor")`; every student route by `authenticate` + `authorize("student")`. Beyond the role check, each service query is additionally scoped by `tutor_id` or `student_id` taken from the JWT, so having the right role is never enough to reach another user's rows.

---

## Session lifecycle

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED
    SCHEDULED --> IN_PROGRESS: Start session
    IN_PROGRESS --> COMPLETED: Complete session
    COMPLETED --> AI_REVIEWED: Generate AI review
    AI_REVIEWED --> [*]
```

Rules enforced in [session.service.js](server/src/services/session.service.js):

| Rule | Where |
|---|---|
| Status is never accepted from the client on create — the insert omits the column and takes the database default (`SCHEDULED`) | `createSession` |
| Status may only advance to the single next state defined in the transition map; any other target is rejected with `Invalid transition: X → Y` | `updateSessionStatus` |
| `AI_REVIEWED` is deliberately absent from that map, so it cannot be set through the status endpoint at all — the only path into it is a successful AI review | `updateSessionStatus` / `generateReview` |
| Notes are writable **only** while the session is `IN_PROGRESS` | `updateSessionNotes` |
| An AI plan can only be generated while the session is `SCHEDULED` | `generatePlan` |
| An AI review can only be generated while the session is `COMPLETED`; the review write and the move to `AI_REVIEWED` happen in one guarded `UPDATE ... AND status = 'COMPLETED'` | `generateReview` |

The status shown in the UI is always the status returned by the API after the write, so screen and database cannot drift.

---

## AI features

All three features use the `@google/genai` SDK with the model **`gemini-3.5-flash-lite`**, configured with `responseMimeType: "application/json"` and an explicit `responseSchema`. Implementation: [ai.service.js](server/src/services/ai.service.js).

### 1. AI session plan — `POST /api/sessions/:id/ai-plan`

**Context sent to the model**

- Student profile: name, subject, current level, learning goals, weak areas
- The upcoming session: topic and scheduled time
- Every earlier session for that student (topic, status, and the full previous AI review JSON), fetched in a single query ordered by date

**Response shape**

```json
{
  "learningObjectives": ["..."],
  "outline": ["...", "...", "...", "..."],
  "practiceQuestions": ["...", "...", "..."]
}
```

The service re-validates the parsed response: all three fields must be arrays, `outline` must contain exactly 4 items, and `practiceQuestions` exactly 3. The plan is then stored on the session row.

### 2. AI session review — `POST /api/sessions/:id/ai-review`

**Context sent to the model**

- Student profile (same fields as above)
- The completed session's topic
- The full session notes written by the tutor

**Response shape**

```json
{
  "summary": "...",
  "homework": ["...", "..."],
  "nextSessionSuggestion": "..."
}
```

Validated for correct types and for 2–3 homework items before being persisted. On success the session moves to `AI_REVIEWED`.

### 3. AI progress insights — `POST /api/progress/students/:studentId/ai-insights`

**Context sent to the model**

- Student profile
- Every `AI_REVIEWED` session for that student — session number, topic, date, and the complete stored review JSON

If the student has no AI-reviewed sessions, the request is rejected before any AI call is made.

**Response shape**

```json
{
  "improvementSummary": "...",
  "recurringStruggles": ["..."]
}
```

### Why structured JSON

Each prompt is paired with a `responseSchema`, so the model returns parseable JSON rather than prose. This means the API can store the result directly in a JSON column, the React components can render named fields (`ai_plan.outline`, `ai_review.homework`) instead of parsing text, and a malformed response is caught by an explicit shape check rather than surfacing as a broken screen.

### Failure handling

Every AI call is wrapped in `try/catch`. Empty responses, JSON parse errors, schema mismatches, and SDK or network errors are logged server-side and re-thrown as a descriptive error, which the controller returns as a `400` with a message. Nothing is written to the database when generation fails, so a failed AI call never corrupts session state — the tutor sees an error banner and can retry.

---

## Technology stack

**Frontend**

| Package | Purpose |
|---|---|
| `react` 19, `react-dom` | UI |
| `react-router-dom` 7 | Routing and role-gated routes |
| `axios` | HTTP client with a JWT request interceptor |
| `tailwindcss` 4 + `@tailwindcss/vite` | Styling |
| `vite` 8 | Dev server and build |
| `oxlint` | Linting |

**Backend**

| Package | Purpose |
|---|---|
| `express` 5 | HTTP server and routing |
| `pg` | PostgreSQL driver (connection pool) |
| `bcrypt` | Password hashing |
| `jsonwebtoken` | JWT signing and verification |
| `@google/genai` | Gemini client |
| `cors`, `dotenv` | CORS and environment configuration |
| `nodemon` (dev) | Auto-restart in development |

---

## Architecture overview

```mermaid
flowchart LR
    subgraph Client["React SPA (Vite)"]
        Pages["Pages: Login, Tutor, Student"]
        Auth["AuthContext (localStorage)"]
        Api["axios instance + Bearer interceptor"]
    end

    subgraph Server["Express API"]
        Routes["Routes"]
        MW["authenticate + authorize"]
        Ctrl["Controllers (HTTP + validation)"]
        Svc["Services (business rules, SQL)"]
        AI["ai.service.js"]
    end

    DB[("PostgreSQL")]
    Gemini["Google Gemini"]

    Pages --> Api --> Routes --> MW --> Ctrl --> Svc
    Svc --> DB
    Svc --> AI --> Gemini
```

Responsibilities are separated by layer:

- **React frontend** — renders screens, holds the JWT and user in `localStorage` via `AuthContext`, gates routes with a `ProtectedRoute` wrapper, and handles loading and error states per page. Frontend gating is a UX convenience only; the real check is on the server.
- **Routes** — declare the path, the HTTP verb, and the middleware chain.
- **Middleware** — `authenticate` verifies the Bearer token and attaches `req.user`; `authorize(...roles)` rejects mismatched roles with `403`.
- **Controllers** — validate request input, translate service errors into status codes, and shape the JSON response. No SQL lives here.
- **Services** — own all business rules (state machine, clash detection, ownership scoping) and all SQL. Multi-statement writes run inside `BEGIN`/`COMMIT` with `ROLLBACK` on error.
- **AI service** — the only module that talks to Gemini. It builds prompts, sets the response schema, validates the parsed output, and never touches the database.
- **PostgreSQL** — accessed through a single shared `pg.Pool`.

---

## Project structure

```
tutorflow/
├── client/                          # React + Vite SPA
│   └── src/
│       ├── context/AuthContext.jsx  # Login, logout, persisted session
│       ├── routes/AppRoutes.jsx     # Route table + ProtectedRoute
│       ├── services/api.js          # axios instance + JWT interceptor
│       └── pages/
│           ├── Login.jsx
│           ├── Signup.jsx           # Tutor self-registration
│           ├── tutor/
│           │   ├── TutorDashboard.jsx
│           │   ├── AddStudent.jsx
│           │   ├── ScheduleSession.jsx
│           │   ├── SessionDetails.jsx     # Lifecycle, notes autosave, AI plan + review
│           │   └── StudentProgress.jsx    # Session history + AI insights
│           └── student/StudentDashboard.jsx
│
└── server/                          # Express API
    └── src/
        ├── app.js                   # Express setup, route mounting, /api/health
        ├── config/db.js             # pg connection pool
        ├── middleware/
        │   ├── auth.middleware.js   # JWT verification
        │   └── role.middleware.js   # Role authorization
        ├── routes/                  # auth, students, sessions, student-dashboard, progress
        ├── controllers/             # Request validation + responses
        └── services/                # Business rules, SQL, Gemini integration
```

---

## Database design

PostgreSQL, three tables.

```mermaid
erDiagram
    USERS ||--o| STUDENT_PROFILES : "profile of student (user_id)"
    USERS ||--o{ STUDENT_PROFILES : "owns as tutor (tutor_id)"
    USERS ||--o{ SESSIONS : "teaches (tutor_id)"
    USERS ||--o{ SESSIONS : "attends (student_id)"
```

### `users`

One row per person, tutor or student. Passwords are stored only as bcrypt hashes; the login query reads `id, name, email, password_hash, role`.

| Column | Notes |
|---|---|
| `id` | Primary key |
| `name` | Display name |
| `email` | Login identifier, must be unique |
| `password_hash` | bcrypt hash — plaintext is never stored |
| `role` | `'tutor'` or `'student'` |

### `student_profiles`

The learning profile for a student, and the link that makes a student belong to a tutor.

| Column | Notes |
|---|---|
| `id` | Primary key |
| `user_id` | → `users.id`, the student |
| `tutor_id` | → `users.id`, the owning tutor. Every tutor-side query joins through this column — it is what isolates one tutor's students from another's |
| `subject` | Fed to the AI |
| `current_level` | Fed to the AI |
| `learning_goals` | Fed to the AI |
| `weak_areas` | Free text, fed to the AI |
| `created_at` | Timestamp |

### `sessions`

One tutoring session.

| Column | Notes |
|---|---|
| `id` | Primary key |
| `tutor_id` | → `users.id` |
| `student_id` | → `users.id` |
| `topic` | Session topic |
| `scheduled_at` | `timestamptz`, so the stored instant is timezone-correct regardless of client locale (inserts cast explicitly with `$n::timestamptz`) |
| `status` | `SCHEDULED`, `IN_PROGRESS`, `COMPLETED`, or `AI_REVIEWED`. The insert omits this column, so it needs a default of `'SCHEDULED'` |
| `notes` | The tutor's autosaved free text |
| `ai_plan` | Structured AI plan — written with `JSON.stringify` and read back as an object, i.e. a `json`/`jsonb` column |
| `ai_review` | Structured AI review — same JSON handling |
| `created_at` | Timestamp |

**Constraints the application relies on**

- A unique constraint named `sessions_tutor_scheduled_at_unique` on `sessions (tutor_id, scheduled_at)` — `createSession` catches PostgreSQL error `23505` on this constraint and converts it into a `409 Conflict`.
- Email uniqueness for `users.email` is enforced in application code (a lookup inside the create-student transaction). A database-level unique index is recommended as a backstop.

> **Note:** the repository contains no migration or seed files. The schema above is the exact shape the application's queries require; the tables must be created in your database before running the server. See [Local development setup](#local-development-setup).

---

## Authentication and authorization

| Mechanism | Implementation |
|---|---|
| Password storage | `bcrypt.hash(password, 10)` on student creation; `bcrypt.compare` on login. Plaintext passwords are never stored or returned. |
| Token issuance | On successful login a JWT is signed with `JWT_SECRET` containing `{ id, role }` and expiring in `1d`. |
| Token transport | The client stores the token in `localStorage`; an axios interceptor attaches `Authorization: Bearer <token>` to every request. |
| Authentication | `authenticate` rejects a missing or malformed header and an invalid or expired token with `401`, and attaches the decoded payload to `req.user`. |
| Role authorization | `authorize(...allowedRoles)` compares `req.user.role` against the allowed roles and returns `403` otherwise. |
| Ownership checks | Services never trust an id from the URL alone. Session reads and writes are filtered by `AND tutor_id = $n`; progress queries verify the student belongs to the requesting tutor before returning anything. |
| Student data isolation | Student endpoints resolve everything from `req.user.id`, and `getSessionById` filters by `AND s.student_id = $2`, so a student requesting another student's session id gets a `404`. |
| Server-side enforcement | The React `ProtectedRoute` only hides UI. Every rule above runs on the API, so calling an endpoint directly with the wrong role or a foreign resource id fails regardless of the frontend. |
| Role can never be self-assigned | `POST /api/auth/register` writes the literal `'tutor'` into the insert and ignores any `role` in the request body, so a caller cannot register as anything else. Student rows are created only by `POST /api/students`, which is tutor-authenticated and stamps the student with that tutor's id. |
| Registration input validation | Name, email, and password are required; the password must be at least 8 characters; a duplicate email is rejected before any write. |
| CORS | Restricted to the origin in `CLIENT_URL` when that variable is set; it falls back to `*` so local development needs no configuration. A deployment should always set it. |

---

## Scheduling and double-booking protection

`POST /api/sessions` runs inside a transaction and applies three checks in order:

1. **Ownership** — the target student must exist, have role `student`, and have a `student_profiles` row whose `tutor_id` is the requesting tutor. Otherwise: `Student not found`.
2. **Clash detection** — a query looks for any existing session for this tutor at the same `scheduled_at::timestamptz`. If one exists, the request fails with **`409 Conflict`**.
3. **Insert** — the session is created with `scheduled_at` cast to `timestamptz`.

A race between two concurrent requests is caught by the database: a `23505` unique violation on `sessions_tutor_scheduled_at_unique` is translated into the same `409`.

**Validation**

- Server: `studentId`, `topic`, and `scheduledAt` are all required; `scheduledAt` must match a strict ISO-8601 pattern *with* a UTC offset or `Z`, and must parse to a valid date. Anything else is a `400` with an explicit message.
- Client: the schedule form requires all three fields, restricts the date picker to future times via `min`, and converts the local `datetime-local` value with `toISOString()` before sending.

---

## Session notes autosave

Implemented in [SessionDetails.jsx](client/src/pages/tutor/SessionDetails.jsx) and [session.service.js](server/src/services/session.service.js).

- Each keystroke updates local state and resets a `setTimeout` held in a `useRef`. The `PATCH /api/sessions/:id/notes` request fires **800 ms** after typing stops, so a burst of typing produces one request, not one per character.
- A pending timer is cleared on unmount, so no request fires against an unmounted component.
- The UI shows a live `Saving...` / `Saved` indicator, and a failed save surfaces the server's error message.
- Because notes are persisted server-side, closing and reopening the tab restores them from the database.
- The server independently rejects note edits unless the session is `IN_PROGRESS`, and the textarea is disabled in every other state — so completed sessions are read-only in both layers.

---

## API overview

Base URL: `/api`. All responses are JSON with a `success` boolean. Every route except `/api/health` and `/api/auth/login` requires a Bearer token.

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/health` | API and database connectivity check | Public |
| `POST` | `/api/auth/login` | Log in, returns JWT + user | Public |
| `POST` | `/api/auth/register` | Create a **tutor** account, returns JWT + user | Public |
| `POST` | `/api/students` | Create a student account + learning profile | Tutor |
| `GET` | `/api/students` | List the tutor's own students with profiles | Tutor |
| `POST` | `/api/sessions` | Schedule a session (clash-checked) | Tutor |
| `GET` | `/api/sessions` | List the tutor's sessions with student details | Tutor |
| `GET` | `/api/sessions/:id` | Get one owned session | Tutor |
| `PATCH` | `/api/sessions/:id/status` | Advance to the next lifecycle state | Tutor |
| `PATCH` | `/api/sessions/:id/notes` | Save notes (only while `IN_PROGRESS`) | Tutor |
| `POST` | `/api/sessions/:id/ai-plan` | Generate the AI session plan (only while `SCHEDULED`) | Tutor |
| `POST` | `/api/sessions/:id/ai-review` | Generate the AI review and move to `AI_REVIEWED` (only from `COMPLETED`) | Tutor |
| `GET` | `/api/progress/students/:studentId` | Student profile + all their sessions | Tutor |
| `POST` | `/api/progress/students/:studentId/ai-insights` | AI analysis across all AI-reviewed sessions | Tutor |
| `GET` | `/api/student/me` | The logged-in student's own profile | Student |
| `GET` | `/api/student/sessions` | The student's own sessions, with tutor details | Student |
| `GET` | `/api/student/sessions/:id` | One of the student's own sessions | Student |

**Status codes in use:** `200` OK, `201` Created, `400` validation or business-rule failure, `401` missing/invalid token or bad credentials, `403` wrong role, `404` not found or not owned, `409` scheduling clash, `500` unexpected failure.

---

## Environment variables

Both halves are configured entirely through environment variables, so the same build runs locally and on a host. Names only — never commit real values. `.env` is gitignored; each side ships a committed `.env.example`.

### Server — `server/.env` (loaded with `dotenv`)

```env
PORT=
DATABASE_URL=
JWT_SECRET=
GEMINI_API_KEY=
CLIENT_URL=
```

| Variable | Required | Used by |
|---|---|---|
| `PORT` | No — defaults to `5000` | `app.js` |
| `DATABASE_URL` | Yes | `config/db.js` — PostgreSQL connection string |
| `JWT_SECRET` | Yes | Signing and verifying JWTs |
| `GEMINI_API_KEY` | Yes, for all AI features | `services/ai.service.js` |
| `CLIENT_URL` | No locally; **yes in production** | `app.js` — the single origin allowed by CORS. Unset means `*` |

`server/.env.example` lists all five names with empty values.

### Client — `client/.env` (read by Vite at build time)

```env
VITE_API_URL=
```

| Variable | Required | Used by |
|---|---|---|
| `VITE_API_URL` | No locally; **yes in production** | [api.js](client/src/services/api.js) — the axios `baseURL`. Falls back to `http://localhost:5000/api` when unset |

`client/.env.example` ships with the localhost default, so copying it is enough for local work. Vite inlines `VITE_*` variables **at build time**, so a deployed frontend must have `VITE_API_URL` set before `npm run build` runs — changing it afterwards requires a rebuild, not just a restart.

---

## Local development setup

**Prerequisites**

- Node.js 18+ and npm
- A PostgreSQL database (local or hosted)
- A Google Gemini API key

**1. Clone and install**

```bash
git clone <repository-url>
cd tutorflow

cd server && npm install
cd ../client && npm install
```

**2. Configure environment variables**

Create `server/.env`:

```env
PORT=5000
DATABASE_URL=postgresql://user:password@host:5432/tutorflow
JWT_SECRET=your-secret
GEMINI_API_KEY=your-gemini-key
CLIENT_URL=http://localhost:5173
```

`CLIENT_URL` is optional locally — leave it out and CORS allows any origin. If you do set it, it must match the Vite dev server origin exactly (`http://localhost:5173` by default), or the browser will block every API call.

Then create `client/.env` by copying the example:

```bash
cd client && cp .env.example .env
```

The default `VITE_API_URL=http://localhost:5000/api` is correct for local development.

**3. Create the database schema**

The repository contains no migration files, so create the tables described in [Database design](#database-design) before the first run: `users`, `student_profiles`, and `sessions`, including

- a default of `'SCHEDULED'` on `sessions.status`,
- `sessions.scheduled_at` as `timestamptz`,
- `ai_plan` and `ai_review` as JSON columns,
- a unique constraint on `sessions (tutor_id, scheduled_at)` **named** `sessions_tutor_scheduled_at_unique` (the name is matched in code to return a `409`).

Once the tables exist you can create the first tutor from the app itself at `/signup` — no manual row insertion or hand-generated bcrypt hash is needed. Every student account is then created from inside the app by that logged-in tutor.

**4. Run the backend**

```bash
cd server
npm run dev     # nodemon src/app.js
# or
npm start       # node src/app.js
```

Verify with `GET http://localhost:5000/api/health` — it returns the current database time on success.

**5. Run the frontend**

```bash
cd client
npm run dev     # Vite dev server
```

Other client scripts: `npm run build`, `npm run preview`, `npm run lint` (oxlint).

The client calls whatever `VITE_API_URL` points at, so keep the server on port `5000` in development or change that value in `client/.env` and restart Vite.

---

## Test credentials

Use these accounts to review the app:

| Role | Email | Password |
|---|---|---|
| Tutor | `tutor@test.com` | `password123` |
| Student | `student@test.com` | `password123` |

The credentials live here rather than on the login screen. The repository contains no seed script, so the matching rows must already exist in the database that `DATABASE_URL` points at — alternatively, create your own tutor at `/signup` and add a student from the dashboard.

---

## Testing / verification

There are **no automated tests** in this repository. The following manual checklist covers every implemented flow.

**Authentication and roles**

- [ ] Sign up at `/signup` → a tutor account is created and you land on `/tutor` already logged in.
- [ ] `POST /api/auth/register` with `"role": "student"` in the body → the created account is still a tutor; the field is ignored.
- [ ] Sign up with an email that already exists → `Email already registered`.
- [ ] Sign up with a password shorter than 8 characters → rejected by the form, and by the API if posted directly.
- [ ] Visit `/signup` while logged in → redirected to your own dashboard.
- [ ] Log in as the tutor → redirected to `/tutor`.
- [ ] Log in as the student → redirected to `/student`.
- [ ] Wrong password → `Invalid email or password`.
- [ ] As a student, open `/tutor` → redirected away from the tutor screen.
- [ ] With a student token, call `GET /api/students` directly → `403 Access denied` (proves the check is server-side, not just UI).
- [ ] Call any protected endpoint with no `Authorization` header → `401`.
- [ ] Reload the page while logged in → the session persists from `localStorage`.

**Students**

- [ ] Create a student with name, email, password, subject, level, goals, and weak areas → appears on the tutor dashboard.
- [ ] Create a second student with the same email → `Email already registered`, and the transaction rolls back.
- [ ] Log in as the newly created student → their own dashboard loads.

**Scheduling and double-booking**

- [ ] Schedule a session → success, listed as `SCHEDULED`.
- [ ] Schedule a second session at the **same** date and time → rejected with `409` and a clash message.
- [ ] Schedule at a different time → succeeds.
- [ ] Submit the form with a missing field → blocked by client validation; sending an incomplete body directly returns `400`.
- [ ] Send `scheduledAt` without a timezone offset → `400` with the ISO-8601 message.

**Lifecycle**

- [ ] `SCHEDULED` → **Start Session** → `IN_PROGRESS`.
- [ ] `IN_PROGRESS` → **Complete Session** → `COMPLETED`.
- [ ] `COMPLETED` → **Generate AI Review** → `AI_REVIEWED`.
- [ ] `PATCH /api/sessions/:id/status` with `COMPLETED` on a `SCHEDULED` session → `Invalid transition: SCHEDULED → COMPLETED`.
- [ ] `PATCH /api/sessions/:id/status` with `AI_REVIEWED` on a `COMPLETED` session → rejected; the state is unreachable except through the review endpoint.
- [ ] The badge on screen matches the row in the database after each transition.

**Notes autosave**

- [ ] While `IN_PROGRESS`, type continuously → only one request fires ~800 ms after you stop (check the Network tab).
- [ ] Reload the page → the notes are still there.
- [ ] Once `COMPLETED`, the textarea is disabled, and a direct `PATCH .../notes` is rejected.

**AI**

- [ ] On a `SCHEDULED` session, generate a plan → objectives, exactly 4 outline points, exactly 3 practice questions.
- [ ] Confirm the plan reflects the student's weak areas and subject.
- [ ] On a `COMPLETED` session with notes, generate a review → summary, 2–3 homework tasks, one next-session suggestion.
- [ ] Try to generate a plan on a non-`SCHEDULED` session → rejected.
- [ ] Open a student's progress page after at least one AI-reviewed session → **Generate Insights** returns an improvement summary and recurring struggles.
- [ ] Request insights for a student with no AI-reviewed sessions → clear message, and no AI call is made.
- [ ] Set an invalid `GEMINI_API_KEY` and generate → the app shows an error banner and stays usable; the session state is unchanged.

**Data isolation**

- [ ] With tutor A's token, request tutor B's session id → `404`.
- [ ] With a student's token, request another student's session id → `404`.
- [ ] A tutor only sees students whose `student_profiles.tutor_id` matches them.

---

## AI prompt design approach

Each prompt is written to give the model everything it needs about *this* student and nothing else, and to constrain the output shape so the API never has to parse prose.

1. **Role framing.** Each prompt opens by casting the model as an expert one-to-one tutoring assistant (or progress analyst), so the output is pitched at a tutor rather than at a classroom.
2. **The full student profile, always.** Name, subject, current level, learning goals, and weak areas are interpolated into every prompt, with `"Not specified"` substituted for empty fields so the model is never handed a dangling label.
3. **History, not just the current moment.** The planning prompt embeds every earlier session with its stored AI review JSON, so the plan builds on what has already been taught. The insights prompt embeds every past review in date order.
4. **Explicit, countable requirements.** "Provide exactly 4 outline points", "exactly 3 practice questions", "exactly 2 or 3 homework tasks". Countable instructions are then re-checked in code, so a violation is caught rather than rendered.
5. **Grounding.** The review prompt says to base the review *only* on the information given; the insights prompt says not to invent anything absent from the reviews. This is what keeps the output tied to real notes instead of plausible-sounding filler.
6. **Schema-constrained output.** Every call sets `responseMimeType: "application/json"` with a `responseSchema` listing required properties, so the structure is enforced by the model API and validated again after parsing.

**Why this beats a bare "generate a lesson plan":** a generic prompt ignores the level the student is at, the goals they set, the weaknesses the tutor recorded, and everything covered in previous sessions. Those are exactly the fields TutorFlow already stores, so feeding them in costs nothing extra and produces a plan for *this* student rather than a template.

---

## Limitations

An honest account of what the current implementation does and does not do.

- **Clash detection matches exact timestamps.** Sessions have no duration field, so two sessions ten minutes apart are both allowed; only an identical `scheduled_at` for the same tutor is blocked.
- **No database migrations or seed script.** The schema must be created manually before the first run, and the test accounts must exist in the database already.
- **Hosting is dashboard-configured, not infrastructure-as-code.** Apart from [`client/vercel.json`](client/vercel.json), which is required for SPA routing, there is no `render.yaml`, Dockerfile, or CI pipeline committed — build settings and environment variables live in the Vercel and Render dashboards, so the deployment cannot be reproduced from the repository alone.
- **The API runs on Render's free tier** and sleeps when idle, so the first request after inactivity takes 30–60 seconds.
- **No refresh tokens.** The JWT lasts one day; when it expires the user logs in again. There is no server-side token invalidation — logout clears client storage only.
- **The token is stored in `localStorage`,** which is convenient but not XSS-proof. Moving to `httpOnly` cookies would also require CSRF protection and cross-site cookie configuration, which was judged not worth the risk at this scope.
- **Tutor registration is open.** Anyone who can reach `/signup` can create a tutor account — there is no invite code, email verification, or approval step. This is acceptable here because a new tutor starts with no students and no sessions and therefore cannot see anyone else's data, but a real deployment would gate it.
- **Student profiles are create-only.** There is no endpoint to edit a profile, or to reschedule, cancel, or delete a session.
- **AI availability is external.** Generation depends on the Gemini API being reachable and within quota. Failures are handled gracefully but are not retried automatically.
- **No email notifications** are sent when a session is scheduled.
- **No automated test suite,** and no structured logging or monitoring — errors go to `console.error`.
- **`GET /api/student/me` and `GET /api/student/sessions/:id`** are implemented and secured but not yet consumed by the student UI, which renders everything from the sessions list.

---

## Future improvements

Not implemented — candidates for the next iteration.

- **Session duration and true overlap detection**, replacing exact-timestamp clash checks with interval overlap, plus tutor availability windows.
- **Email notifications** to the student when a session is scheduled, rescheduled, or reviewed.
- **Recurring sessions** and calendar integration (Google Calendar / iCal).
- **Refresh tokens** alongside short-lived access tokens, stored in `httpOnly` cookies.
- **Editable student profiles**, plus rescheduling and cancelling sessions.
- **Richer analytics** — progress over time, topic coverage, homework completion tracking.
- **Automated tests** — unit tests for the state machine and clash detection, integration tests for the role and ownership guards, and a mocked AI layer.
- **Production observability** — structured logging, request tracing, error reporting, and rate limiting on the AI endpoints.
- **Database migrations and a seed script** so the schema and demo data are reproducible.

---

## Deployment

The three tiers are deployed independently and wired together entirely through environment variables — nothing is hard-coded to a host.

| Tier | Platform | URL |
|---|---|---|
| Frontend | Vercel | https://tutor-flow-peach-kappa.vercel.app |
| API | Render | https://tutorflow-api-cymk.onrender.com |
| Database | Neon (managed PostgreSQL) | — |

### Frontend — Vercel

| Setting | Value |
|---|---|
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Build-time variable | `VITE_API_URL` = `https://tutorflow-api-cymk.onrender.com/api` |

Vite inlines `VITE_*` at build time, so changing `VITE_API_URL` requires a **redeploy**, not just a restart.

[`client/vercel.json`](client/vercel.json) rewrites all paths to `index.html`. This is required, not cosmetic: the app uses `BrowserRouter`, so without the rewrite every URL except `/` returns a 404 from Vercel's static host — the app would work while you click around, then break the moment anyone refreshed or opened a link directly.

### API — Render

| Setting | Value |
|---|---|
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `npm start` (`node src/app.js`) |
| Runtime variables | `DATABASE_URL`, `JWT_SECRET`, `GEMINI_API_KEY`, `CLIENT_URL` |

`CLIENT_URL` must be the frontend origin **exactly** — scheme and host, no trailing slash and no path — because its value is echoed into `Access-Control-Allow-Origin` and the browser compares it to the request's `Origin` as a plain string. A trailing slash is the classic way to get a preflight failure that looks like the variable was never set. `PORT` is injected by Render; the server reads it and falls back to `5000`.

The free tier sleeps after inactivity, so the first request can take 30–60 seconds.

### Database — Neon

Point `DATABASE_URL` at the Neon connection string (it includes `sslmode=require`, which `pg` honours without extra configuration) and create the schema described in [Database design](#database-design) before first use — the repository has no migration files, so the tables are created by hand.

### Order of operations

Deploy the API first and take its URL; build the client with `VITE_API_URL` pointing at it; then set `CLIENT_URL` on the API to the client's URL and redeploy the API so CORS matches. Verify the API independently with `GET /api/health`, which returns the current database time and so confirms the connection string as well as the process.

Note that a green health check does **not** prove the schema exists — it runs `SELECT NOW()`, which succeeds against an empty database. The first request that touches a real table is where a missing schema surfaces.

---

## Implementation notes

A few decisions worth calling out for a reviewer:

- **Tutor-only self-registration — a deliberate, narrowed deviation from the brief.** The brief says "There is no public sign up. Tutors create student accounts." Taken literally that leaves no way to create the *first* tutor except hand-inserting a row with a pre-computed bcrypt hash, which makes the app impossible to bootstrap on a fresh database. `POST /api/auth/register` therefore exists, but it can only ever produce a tutor: the role is a literal in the SQL and any `role` field in the request body is ignored. The half of the rule that carries the actual security weight — students are created by their tutor, and are bound to that tutor by `student_profiles.tutor_id` — is untouched, so no student can exist without an owner and the isolation guarantees are unchanged.
- **Controllers stay thin.** Input validation and status-code mapping live in controllers; every business rule — state transitions, ownership, clash detection — lives in services, which is why the same rule cannot be bypassed through a different route.
- **Transactions where multiple rows are involved.** Creating a student writes to `users` and `student_profiles` inside `BEGIN`/`COMMIT` with a `ROLLBACK` on failure, so a duplicate email can never leave an orphan user row.
- **No queries inside loops.** Past sessions, session lists, and progress histories are each fetched with a single joined or ordered query; the progress-insights feature filters already-fetched rows in memory rather than re-querying per session.
- **`timestamptz` for `scheduled_at`.** An earlier version stored a naive timestamp and shifted times across timezones. The API now requires an ISO-8601 string with an offset and casts explicitly to `timestamptz`.
- **The AI review write is guarded.** The final `UPDATE` includes `AND status = 'COMPLETED'`, so two concurrent review requests cannot both advance the session.
- **Loading and error states everywhere.** Each page tracks its own `loading` and `error` state, and long-running AI actions get their own flags (`generatingPlan`, `generatingReview`, `generatingInsights`) so the right button shows the right progress text.

### What I would build next

If I had another day, I would start with session duration and real overlap checks, because exact-timestamp clash detection is the weakest part of the scheduling model and tutors think in hour-long slots, not instants. I would then commit migrations and a seed script, since the schema and the demo accounts are now the only part of the system that still has to be built by hand rather than reproduced from the repository. Next I would add email notifications on scheduling, which is the smallest change that makes the product feel like it exists outside the browser tab. After that I would allow rescheduling and cancelling sessions and editing student profiles, because a tutor's calendar changes constantly and today nothing can be corrected once it is created. Finally I would write tests around the state machine and the ownership guards, because those are the two places where a regression would be invisible in the UI but serious in production.
