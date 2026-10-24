import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import prisma from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const encoder = new TextEncoder();

export async function getSessionUser() {
  try {
    const token = (await cookies()).get("session")?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, encoder.encode(JWT_SECRET));
    if (typeof payload.id !== "string") return null;

    return await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, name: true, email: true },
    });
  } catch {
    return null;
  }
}
