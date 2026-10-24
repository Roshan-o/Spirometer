# 🫁 BreathNote — Smart Incentive Spirometer

A sensor-based smart incentive spirometer web app built with Next.js and Neon DB.

> See [`REPORT.md`](./REPORT.md) for the full project report.

---

## Prerequisites

- Node.js v20+
- A browser that supports WebSockets
- A [Neon](https://neon.tech) PostgreSQL database

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="your-secret-key"
```

### 3. Set up the database
```bash
# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Push schema to Neon (creates all tables)
npx prisma db push --schema=prisma/schema.prisma
```

### 4. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account. The app does not seed demo accounts or session records. The dashboard starts empty and shows measurements from sessions completed with a connected pressure sensor.

Start the serial bridge in a second terminal before opening a breathing session:

```bash
npm run bridge -- --port COM7 --baud 9600 --scale 50000
```

Change the serial port, baud rate, and scale to match the connected board and calibrated sensor. The browser connects to `ws://localhost:8765` by default; set `NEXT_PUBLIC_SENSOR_WS_URL` to override it. If the bridge or sensor is unavailable, the session stays in a connecting/disconnected state and no simulated readings are generated.

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run bridge` | Read pressure samples from the connected serial device and broadcast them to the browser |
