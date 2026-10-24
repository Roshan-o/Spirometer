"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export interface CompletedRepetition {
  maxPressure: number;
  levelReached: number;
  holdDuration: number;
  timestamp: string;
}

export interface CompletedSession {
  startTime: string;
  endTime: string;
  durationSeconds: number;
  repetitions: CompletedRepetition[];
}

export async function saveExerciseSession(input: CompletedSession) {
  const user = await getSessionUser();
  if (!user) return { error: "Your session expired. Please sign in again." };

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);
  const validDate = (date: Date) => Number.isFinite(date.getTime());
  if (!validDate(startTime) || !validDate(endTime) || endTime < startTime) {
    return { error: "The session times are invalid." };
  }
  if (!Number.isInteger(input.durationSeconds) || input.durationSeconds < 0 || input.durationSeconds > 86400) {
    return { error: "The session duration is invalid." };
  }
  if (!Array.isArray(input.repetitions) || input.repetitions.length > 1000) {
    return { error: "The repetition data is invalid." };
  }

  const repetitions = input.repetitions.map((rep) => ({
    maxPressure: Number(rep.maxPressure),
    levelReached: Number(rep.levelReached),
    holdDuration: Number(rep.holdDuration),
    timestamp: new Date(rep.timestamp),
  }));
  if (repetitions.some((rep) =>
    !Number.isFinite(rep.maxPressure) || rep.maxPressure < 0 || rep.maxPressure > 5 ||
    !Number.isInteger(rep.levelReached) || rep.levelReached < 0 || rep.levelReached > 3 ||
    !Number.isInteger(rep.holdDuration) || rep.holdDuration < 0 || rep.holdDuration > 86400000 ||
    !validDate(rep.timestamp) || rep.timestamp < startTime || rep.timestamp > endTime
  )) {
    return { error: "One or more repetition records are invalid." };
  }

  const maxPressure = repetitions.reduce((max, rep) => Math.max(max, rep.maxPressure), 0);
  const maxLevel = repetitions.reduce((max, rep) => Math.max(max, rep.levelReached), 0);
  const maxHold = repetitions.reduce((max, rep) => Math.max(max, rep.holdDuration), 0);

  await prisma.exerciseSession.create({
    data: {
      userId: user.id,
      startTime,
      endTime,
      durationSeconds: input.durationSeconds,
      maxPressureAchieved: maxPressure,
      maxLevelReached: maxLevel,
      maxLevelHoldDuration: maxHold,
      numberOfRepetitions: repetitions.length,
      repetitions: {
        create: repetitions.map((rep) => ({
          timestamp: rep.timestamp,
          maxPressure: rep.maxPressure,
          levelReached: rep.levelReached,
          holdDuration: rep.holdDuration,
        })),
      },
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
