# 🫁 BreathNote — Smart Incentive Spirometer

A sensor-based smart incentive spirometer web app built with Next.js and Neon DB.

> See [`REPORT.md`](./REPORT.md) for the full project report.

---

## Prerequisites

- Node.js v18+
- Google Chrome (required for Web Serial API)
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

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run seed` | Seed the database with dummy data |
