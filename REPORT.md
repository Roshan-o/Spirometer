# BreathNote: A Smart Incentive Spirometer

**Course Project Report — Semester 7**

| | |
|---|---|
| **Team Members** | K. Roshan Lal (2023102010) · P. Deepak (2023101109) |
| **Project Title** | Sensor-Based Smart Incentive Spirometer with Carnatic Music Feedback |
| **Submission Date** | October 2026 |

---

## Abstract

Incentive spirometry is a clinically prescribed lung rehabilitation exercise that requires patients to sustain consistent daily effort. However, the repetitive and monotonous nature of conventional spirometers leads to poor patient adherence and makes it difficult to track long-term progress.

This project presents **BreathNote**, a smart incentive spirometer that replaces the mechanical device with a sensor-integrated web application. The system uses a pressure sensor and Arduino microcontroller to capture the user's real-time breathing effort, which is visualized as an animated virtual ball rising through predefined levels on a browser interface. As the user crosses each pressure threshold, the application rewards them with level-based Carnatic music — replacing the traditional silence with culturally resonant, motivating audio feedback.

All exercise data is securely stored in a cloud database against individual user accounts, enabling a personalized progress dashboard that tracks metrics such as peak pressure, sustain duration, session count, and improvement trends over time.

---

## 1. Motivation

Conventional incentive spirometers provide minimal feedback — a floating ball that rises when the user blows, and drops when they stop. This design:

- Provides no **historical tracking** of the patient's effort or improvement.
- Offers no **motivational stimulus** beyond the visual of the ball.
- Cannot be used to **compare sessions** or set progressive goals.
- Makes the exercise feel **clinically cold** and repetitive, leading to abandonment.

Our motivation is to address all four of these shortcomings simultaneously:

1. Make the exercise **visually engaging** through a dynamic, animated digital interface.
2. Make it **aurally rewarding** through Carnatic music feedback tied to effort levels.
3. Make it **measurable** by recording and surfacing session data in a dashboard.
4. Make it **personalized** so each user sees only their own progress.

---

## 2. System Architecture

The system is composed of four interconnected layers:

```
┌────────────────────┐        USB / Serial        ┌──────────────────────┐
│  Hardware Layer    │ ─────────────────────────► │  Browser Layer       │
│                    │                             │                      │
│  Blow Pipe         │    Raw pressure integers    │  Web Serial API      │
│  Pressure Sensor   │    (e.g., 0–1023)           │  React State Update  │
│  Arduino Uno       │                             │  Ball Animation      │
└────────────────────┘                             │  Audio Engine        │
                                                   └──────────┬───────────┘
                                                              │
                                                    Session ends (POST)
                                                              │
                                                   ┌──────────▼───────────┐
                                                   │  Application Layer   │
                                                   │                      │
                                                   │  Next.js (App Router)│
                                                   │  Server Actions      │
                                                   │  Prisma ORM          │
                                                   └──────────┬───────────┘
                                                              │
                                                   ┌──────────▼───────────┐
                                                   │  Data Layer          │
                                                   │                      │
                                                   │  Neon (PostgreSQL)   │
                                                   │  users               │
                                                   │  exercise_sessions   │
                                                   │  repetitions         │
                                                   └──────────────────────┘
```

---

## 3. Methodology

### 3.1 Breathing Exercise
The user blows through a tube attached to a pressure sensor. The generated air pressure is proportional to their breathing effort.

### 3.2 Pressure Sensing
A pressure sensor (e.g., MPX5010) measures the blow pressure. The Arduino reads the analog output at approximately 60 samples per second and transmits values over USB Serial.

### 3.3 Real-Time Data Acquisition
The web browser uses the **Web Serial API** to read the Arduino's USB output directly. This bypasses the need for a backend server in the data loop, eliminating latency and enabling smooth, frame-rate-level animation updates.

### 3.4 Virtual Ball Display
The raw sensor value (0–1023) is mapped to a height percentage (0–100%) on a stylized virtual spirometer tube. As pressure increases, the ball rises. Each of the five defined levels corresponds to a pressure threshold:

| Level | Name (Carnatic) | Pressure Threshold |
|---|---|---|
| 1 | Sa | ≥ 0.5 kPa |
| 2 | Ri | ≥ 1.0 kPa |
| 3 | Ga | ≥ 1.5 kPa |
| 4 | Ma | ≥ 2.0 kPa |
| 5 | Pa | ≥ 2.5 kPa |

### 3.5 Level-Based Audio Feedback
The audio engine operates as a state machine. When the ball crosses a threshold:

- **Below Level 1:** A soft encouragement sound plays.
- **Levels 1–5:** A Carnatic note or musical phrase corresponding to that level begins playing, crossfading smoothly from the previous state.

The use of Carnatic music is intentional — it provides culturally familiar, structured, and progressively rewarding audio cues that motivate the user to push harder and sustain longer.

### 3.6 Data Storage
At the conclusion of each session, the application aggregates the collected data and performs a single `POST` request to the Next.js backend, which saves the following to the database:

- `start_time` and `end_time`
- `duration_seconds`
- `max_pressure_achieved`
- `max_level_reached`
- `max_level_hold_duration`
- `number_of_repetitions`
- Individual `repetitions` records for granular analysis

### 3.7 Progress Dashboard
The dashboard is generated server-side on each load by querying the user's historical session data. It presents:

- **Peak Pressure Trend** — a 14-day line chart showing improvement.
- **Consistency Calendar** — a visual grid showing days with completed, partial, or missed sessions.
- **Week-over-week statistics** — with percentage changes for key metrics.
- **Recent Sessions List** — the last 4 sessions with duration and pressure.

---

## 4. Database Schema

### `users`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Display name |
| `email` | VARCHAR(255) | Unique, used for login |
| `password_hash` | VARCHAR(255) | bcrypt hashed (10 rounds) |
| `created_at` | TIMESTAMPTZ | Auto-set on insert |
| `updated_at` | TIMESTAMPTZ | Auto-updated on change |

### `exercise_sessions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → `users.id` (CASCADE DELETE) |
| `start_time` | TIMESTAMPTZ | Session start |
| `end_time` | TIMESTAMPTZ | Session end |
| `duration_seconds` | INTEGER | Total active time |
| `max_pressure_achieved` | DECIMAL(10,2) | Peak pressure in kPa |
| `max_level_reached` | INTEGER | Highest level crossed (1–5) |
| `max_level_hold_duration` | INTEGER | Time held at max level (ms) |
| `number_of_repetitions` | INTEGER | Total blow count |
| `created_at` | TIMESTAMPTZ | Record insert time |

### `repetitions`

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK → `exercise_sessions.id` (CASCADE DELETE) |
| `timestamp` | TIMESTAMPTZ | Time of this individual blow |
| `max_pressure` | DECIMAL(10,2) | Peak pressure for this blow (kPa) |
| `level_reached` | INTEGER | Level achieved in this blow |
| `hold_duration` | INTEGER | Time held above threshold (ms) |

---

## 5. Authentication & Security

- Passwords are hashed using **bcryptjs** with 10 salt rounds before storage. Plain-text passwords are never stored.
- On successful login or signup, a **JWT (JSON Web Token)** is signed using a secret key and stored as an `httpOnly` cookie. This prevents JavaScript-based access to the token, mitigating XSS attacks.
- JWTs expire after **7 days**. Subsequent requests are validated server-side before any database query is executed.
- All database connections use **SSL** (`sslmode=require`) via the Neon connection string.

---

## 6. Technology Justification

| Choice | Alternative Considered | Reason for Selection |
|---|---|---|
| **Next.js** (full-stack) | Python (FastAPI) + React | Eliminates a separate backend process; Server Actions keep API logic co-located with UI |
| **Neon DB** (Serverless PostgreSQL) | Firebase Firestore | Relational schema is a natural fit; free tier is very generous (9GB+) |
| **Prisma ORM** | Raw SQL / Drizzle | Auto-generated TypeScript types eliminate runtime data-shape errors |
| **Web Serial API** | WebSocket via Python bridge | Direct browser-to-Arduino connection with zero latency overhead |
| **jose** (JWT) | NextAuth.js | Lightweight; full control over session claims without OAuth complexity |
| **Carnatic music** | Generic beeps / Western music | Culturally resonant for the target demographic; structured raga system maps naturally to levels |

---

## 7. Results

The seeded dataset (14 days, 1 session/day) demonstrates the following measurable progression:

| Metric | Day 1 | Day 14 | Improvement |
|---|---|---|---|
| Peak Pressure | 1.05 kPa | 2.40 kPa | **+128%** |
| Max Level Reached | 1 | 5 | **+4 levels** |
| Hold Duration | 1,200 ms | 4,000 ms | **+233%** |
| Repetitions / Session | 3 | 8 | **+167%** |

The dashboard correctly computes week-over-week deltas, displays the trend line, and marks the consistency calendar — validating the full data pipeline from Arduino → Browser → Neon → Dashboard.

---

## 8. Limitations & Future Work

| Limitation | Proposed Solution |
|---|---|
| Web Serial API is Chrome/Edge only | Ship a companion Electron or Tauri desktop app for broader browser support |
| No clinician portal | Add a `doctors` table and role-based access control (RBAC) for physicians to review patient data |
| Single-pressure sensor | Add flow-rate sensor (spirometry standard) for FEV1 / FVC measurement |
| Audio files are static | Procedurally generate Carnatic raga phrases using the Web Audio API for infinite musical variety |
| No mobile app | Expose a REST API layer and build a React Native companion app |

---

## 9. Setup & Reproduction

```bash
# 1. Clone and install
npm install

# 2. Configure environment
cp .env.example .env
# Add your DATABASE_URL and JWT_SECRET

# 3. Initialise database
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma

# 4. Optional: seed with demo data
npx ts-node --project tsconfig.seed.json prisma/seed.ts

# 5. Run development server
npm run dev
```

Open **http://localhost:3000** in Google Chrome (required for Web Serial API).

Demo login after seeding:
- **Email:** `deepak@example.com`
- **Password:** `password123`

---

## 10. References

1. American Association for Respiratory Care. *Clinical Practice Guideline: Incentive Spirometry.* Respiratory Care, 2011.
2. Next.js Documentation — App Router & Server Actions. https://nextjs.org/docs
3. Web Serial API Specification. W3C. https://wicg.github.io/serial/
4. Prisma ORM Documentation. https://www.prisma.io/docs
5. Neon Serverless PostgreSQL. https://neon.tech/docs
6. Sambamurthy, P. *A Dictionary of South Indian Music and Musicians.* The Indian Music Publishing House, 1984.
