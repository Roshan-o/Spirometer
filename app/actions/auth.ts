"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const encoder = new TextEncoder();

function isDatabaseUnreachable(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { errorCode?: string; message?: string };
  return candidate.errorCode === "P1001" || candidate.message?.includes("Can't reach database server") === true;
}

export async function signup(formData: FormData) {
  try {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string" || !name.trim() || !email.trim() || !password) {
      return { error: "Missing fields" };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
      },
    });

    // Create token
    const token = await new SignJWT({ id: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(encoder.encode(JWT_SECRET));

    // Set cookie
    (await cookies()).set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Signup error:", error);
    if (isDatabaseUnreachable(error)) {
      return { error: "Can't connect to the database. Check your internet/DNS connection and verify DATABASE_URL in .env." };
    }
    return { error: "Something went wrong during sign up" };
  }
}

export async function login(formData: FormData) {
  try {
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
      return { error: "Missing fields" };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!user) {
      return { error: "Invalid email or password" };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return { error: "Invalid email or password" };
    }

    // Create token
    const token = await new SignJWT({ id: user.id, email: user.email, name: user.name })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(encoder.encode(JWT_SECRET));

    // Set cookie
    (await cookies()).set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: "/",
    });

    return { success: true };
  } catch (error) {
    console.error("Login error:", error);
    if (isDatabaseUnreachable(error)) {
      return { error: "Can't connect to the database. Check your internet/DNS connection and verify DATABASE_URL in .env." };
    }
    return { error: "Something went wrong during login" };
  }
}

export async function logout() {
  (await cookies()).delete("session");
}
