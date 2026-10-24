# 🫁 BreathNote — Smart Incentive Spirometer

A sensor-based smart incentive spirometer web application built with **Next.js**, **Prisma**, and **Neon PostgreSQL**, integrated with an **Arduino + HX710B pressure sensor**.

> For architecture details and database schema design, see [`REPORT.md`](./REPORT.md).

---

## 🛠️ System Overview

The system streams real-time differential pressure from the spirometer tube to the web interface:

```mermaid
graph LR
    A[HX710B Sensor] -->|Pins D2/D3| B[Arduino Uno/Nano]
    B -->|USB Serial @ 9600 baud| C[Node.js Bridge<br/>bridge/bridge.ts]
    C -->|WebSocket @ ws://localhost:8765| D[BreathNote Web App<br/>/exercise]
```

---

## 📋 Prerequisites

- Node.js v18+
- Google Chrome (required for Web Serial API)
- A [Neon](https://neon.tech) PostgreSQL database

---

## 🚀 Quick Start Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
JWT_SECRET="your-secure-secret-key"
```

### 3. Initialize the Database
Generate the Prisma client and push the schema to PostgreSQL:
```bash
# Generate Prisma Client
npx prisma generate

# Create tables in your database
npx prisma db push
```

### 4. Seed with demo data (optional)
```bash
npx ts-node --project tsconfig.seed.json prisma/seed.ts
```

Demo login credentials after seeding:
- **Email:** `deepak@example.com`
- **Password:** `password123`

### 5. Start the development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome.

---

## 📜 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run seed` | Seed the database with dummy data |
