# 🫁 BreathNote — Smart Incentive Spirometer


A sensor-based smart incentive spirometer that captures real-time breathing effort from an Arduino pressure sensor, displays it as an animated virtual ball on a web application, rewards the user with level-based Carnatic music, and tracks all exercise data in a personalized progress dashboard.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🎯 **Virtual Spirometer** | Real-time animated ball that rises with pressure |
| 🎵 **Carnatic Music Feedback** | Level-based audio rewards as the user blows harder |
| 📊 **Progress Dashboard** | Charts and stats to track improvement over time |
| 🔐 **User Authentication** | Secure signup/login with JWT session cookies |
| 🗄️ **Session History** | Every exercise session stored and queryable |
| 📡 **Live Arduino Data** | Web Serial API reads sensor data directly in browser |

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Charts** | Recharts |
| **Backend** | Next.js Server Actions & API Routes |
| **ORM** | Prisma ORM v5 |
| **Database** | Neon (Serverless PostgreSQL) |
| **Auth** | bcryptjs (password hashing) + jose (JWT) |
| **Hardware** | Arduino + Pressure Sensor (Web Serial API) |

---

## 📁 Project Structure

```
spirometer/
├── app/
│   ├── actions/
│   │   └── auth.ts          # Server Actions: signup, login, logout
│   ├── dashboard/
│   │   ├── page.tsx         # Server Component — fetches real DB data
│   │   └── DashboardClient.tsx  # Client Component — renders charts & UI
│   ├── exercise/
│   │   └── page.tsx         # Live spirometer view (Web Serial API)
│   ├── login/
│   │   └── page.tsx         # Login + Signup UI
│   └── globals.css
├── lib/
│   └── db.ts                # Prisma client singleton
├── prisma/
│   ├── schema.prisma        # Database models
│   ├── seed.ts              # Dummy data seeder
│   └── migrations/          # (if using migrate instead of db push)
├── public/
│   └── audio/               # Carnatic music level audio files
├── schema.sql               # Raw SQL schema (for reference)
└── .env                     # Environment variables
```

---

## 🗄️ Database Schema

### `users`
Stores individual user accounts.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key (auto-generated) |
| `name` | `VARCHAR(255)` | Display name |
| `email` | `VARCHAR(255)` | Unique login email |
| `password_hash` | `VARCHAR(255)` | bcrypt hashed password |
| `created_at` | `TIMESTAMPTZ` | Account creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | Last update timestamp |

---

### `exercise_sessions`
One record per exercise session (a single sitting at the spirometer).

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `user_id` | `UUID` | FK → `users.id` |
| `start_time` | `TIMESTAMPTZ` | When the session began |
| `end_time` | `TIMESTAMPTZ` | When the session ended |
| `duration_seconds` | `INTEGER` | Total session time in seconds |
| `max_pressure_achieved` | `DECIMAL(10,2)` | Highest pressure (kPa) in session |
| `max_level_reached` | `INTEGER` | Highest ball level (1–5+) reached |
| `max_level_hold_duration` | `INTEGER` | Time (ms) held at the max level |
| `number_of_repetitions` | `INTEGER` | Total number of blows |
| `created_at` | `TIMESTAMPTZ` | Record insert time |

---

### `repetitions`
One record per individual breath/blow within a session.

| Column | Type | Description |
|---|---|---|
| `id` | `UUID` | Primary key |
| `session_id` | `UUID` | FK → `exercise_sessions.id` |
| `timestamp` | `TIMESTAMPTZ` | When this breath occurred |
| `max_pressure` | `DECIMAL(10,2)` | Peak pressure for this single blow |
| `level_reached` | `INTEGER` | Level achieved in this blow |
| `hold_duration` | `INTEGER` | Time (ms) held above the level threshold |

---

### Entity Relationship Diagram

```
users
 └──< exercise_sessions
            └──< repetitions
```

---

## 🔌 API Reference (Next.js Server Actions)

All backend logic runs as **Next.js Server Actions** in `app/actions/auth.ts`.
They are called directly from Client Components — no separate REST endpoints needed.

---

### `signup(formData: FormData)`

Registers a new user account.

**Input Fields (FormData):**
| Field | Type | Required |
|---|---|---|
| `name` | string | ✅ |
| `email` | string | ✅ |
| `password` | string | ✅ |

**Process:**
1. Validates all fields are present.
2. Checks if email already exists in `users` table.
3. Hashes the password with `bcrypt` (10 salt rounds).
4. Creates the user in the database.
5. Signs a 7-day JWT with `{ id, email, name }` payload using `jose`.
6. Sets an `httpOnly` session cookie.

**Returns:**
```ts
{ success: true }       // on success → client redirects to /dashboard
{ error: string }       // on failure → client displays error message
```

---

### `login(formData: FormData)`

Authenticates an existing user.

**Input Fields (FormData):**
| Field | Type | Required |
|---|---|---|
| `email` | string | ✅ |
| `password` | string | ✅ |

**Process:**
1. Finds the user by email.
2. Compares the submitted password against the stored bcrypt hash.
3. Signs and sets a new 7-day JWT session cookie.

**Returns:**
```ts
{ success: true }       // on success → client redirects to /dashboard
{ error: string }       // on failure (wrong credentials, etc.)
```

---

### `logout()`

Ends the current session.

**Process:**
1. Deletes the `session` cookie.

**Returns:** `void`

---

## 🖥️ Pages Reference

### `/login`
- Tabbed card with **Login** and **Sign Up** views.
- Calls `login()` or `signup()` server actions on submit.
- Shows inline error messages.
- Redirects to `/dashboard` on success.

---

### `/dashboard`
A **Server Component** that:
1. Reads and verifies the `session` JWT cookie.
2. Fetches the user's last 14 `exercise_sessions` from Neon.
3. Computes stats (peak pressure, sustain duration, weekly counts).
4. Builds consistency calendar and chart data.
5. Passes all data as props to `DashboardClient` for rendering.

**Displayed Stats:**
- Peak Pressure (kPa) — vs last week
- Sustain Duration (s) — avg hold time, vs last week
- Sessions This Week — vs last week
- Recent 4 sessions list
- 14-day pressure trend line chart
- 2-week consistency calendar grid (Completed / Partial / Missed)

---

### `/exercise` *(to be implemented)*
The live exercise interface:
- **Connect Device** button → Web Serial API prompt
- Animated virtual spirometer tube + glowing ball
- Real-time pressure HUD
- Level-based Carnatic music playback
- Hold timer ring
- **Finish Session** → saves data to `exercise_sessions` and `repetitions`

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
# Neon PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"

# Secret key for signing JWT tokens (change in production!)
JWT_SECRET="your-super-secret-jwt-key"
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up the database
```bash
# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Push schema to Neon (creates tables)
npx prisma db push --schema=prisma/schema.prisma
```

### 3. Seed with dummy data (optional)
```bash
npx ts-node --project tsconfig.seed.json prisma/seed.ts
```
Demo credentials after seeding:
- **Email:** `deepak@example.com`
- **Password:** `password123`

### 4. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome (required for Web Serial API).

---

## 🎵 Audio Level System

| Level | Pressure (kPa) | Feedback |
|---|---|---|
| 0 — Below threshold | `< 0.5` | Encouragement sound / low hum |
| 1 — Sa | `0.5 – 1.0` | Carnatic note: **Sa** |
| 2 — Ri | `1.0 – 1.5` | Carnatic note: **Ri** |
| 3 — Ga | `1.5 – 2.0` | Carnatic note: **Ga** |
| 4 — Ma | `2.0 – 2.5` | Carnatic note: **Ma** |
| 5 — Pa | `> 2.5` | Carnatic note: **Pa** (full reward) |

> Audio crossfades smoothly between levels using the Web Audio API.

---

## 📡 Arduino Integration (Hardware)

### Components
- Arduino (Uno / Nano)
- Pressure sensor (e.g., MPX5010 or BMP280)
- Blow pipe / mouthpiece
- Connecting wires + Breadboard

### Arduino → Browser Flow
1. Arduino reads analog pressure sensor values.
2. Outputs values over Serial (USB) at 9600 baud: `e.g., 1024\n`
3. Web Serial API in the browser reads this stream.
4. React state updates 60x/second → smooth ball animation.

### Sample Arduino Sketch
```cpp
void setup() {
  Serial.begin(9600);
}

void loop() {
  int val = analogRead(A0);     // Read pressure sensor
  Serial.println(val);          // Send to browser
  delay(16);                    // ~60 FPS
}
```

---

## 📄 License

MIT — for academic use, Semester 7 project.
