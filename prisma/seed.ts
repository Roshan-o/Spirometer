import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clean up existing data
  await prisma.repetition.deleteMany()
  await prisma.exerciseSession.deleteMany()
  await prisma.user.deleteMany()

  // Create a demo user
  const passwordHash = await bcrypt.hash('password123', 10)
  const user = await prisma.user.create({
    data: {
      name: 'Deepak',
      email: 'deepak@example.com',
      passwordHash,
    },
  })
  console.log('✅ Created user:', user.email)

  // Helper to generate a date N days ago
  const daysAgo = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d
  }

  // Session data: 14 days of sessions
  const sessionsData = [
    { daysBack: 13, pressure: 1.05, level: 1, reps: 3, hold: 1200, duration: 200 },
    { daysBack: 12, pressure: 1.15, level: 1, reps: 4, hold: 1400, duration: 220 },
    { daysBack: 11, pressure: 1.30, level: 2, reps: 4, hold: 1600, duration: 240 },
    { daysBack: 10, pressure: 1.45, level: 2, reps: 5, hold: 1800, duration: 260 },
    { daysBack: 9,  pressure: 1.60, level: 2, reps: 5, hold: 2000, duration: 256 },
    { daysBack: 8,  pressure: 1.75, level: 3, reps: 5, hold: 2200, duration: 270 },
    { daysBack: 7,  pressure: 1.85, level: 3, reps: 6, hold: 2400, duration: 256 },
    { daysBack: 6,  pressure: 1.98, level: 3, reps: 6, hold: 2600, duration: 246 },
    { daysBack: 5,  pressure: 2.10, level: 4, reps: 6, hold: 2800, duration: 232 },
    { daysBack: 4,  pressure: 2.18, level: 4, reps: 7, hold: 3000, duration: 212 },
    { daysBack: 3,  pressure: 2.25, level: 4, reps: 7, hold: 3200, duration: 250 },
    { daysBack: 2,  pressure: 2.30, level: 4, reps: 8, hold: 3500, duration: 392 },
    { daysBack: 1,  pressure: 2.34, level: 5, reps: 8, hold: 3800, duration: 266 },
    { daysBack: 0,  pressure: 2.40, level: 5, reps: 8, hold: 4000, duration: 252 },
  ]

  for (const s of sessionsData) {
    const start = daysAgo(s.daysBack)
    start.setHours(18, 0, 0, 0)
    const end = new Date(start.getTime() + s.duration * 1000)

    const session = await prisma.exerciseSession.create({
      data: {
        userId: user.id,
        startTime: start,
        endTime: end,
        durationSeconds: s.duration,
        maxPressureAchieved: s.pressure,
        maxLevelReached: s.level,
        maxLevelHoldDuration: s.hold,
        numberOfRepetitions: s.reps,
      },
    })

    // Create individual repetitions for each session
    const repData = Array.from({ length: s.reps }, (_, i) => ({
      sessionId: session.id,
      timestamp: new Date(start.getTime() + i * 30000),
      maxPressure: parseFloat((s.pressure * (0.8 + Math.random() * 0.25)).toFixed(2)),
      levelReached: Math.max(1, s.level - (i === 0 ? 1 : 0)),
      holdDuration: Math.floor(s.hold * (0.7 + Math.random() * 0.3)),
    }))

    await prisma.repetition.createMany({ data: repData })
  }

  console.log(`✅ Created ${sessionsData.length} sessions with repetitions`)
  console.log('\n🎉 Seeding complete!')
  console.log('\n📋 Login credentials:')
  console.log('   Email:    deepak@example.com')
  console.log('   Password: password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
