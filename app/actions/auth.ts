"use server";

import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const encoder = new TextEncoder();

export async function signup(formData: FormData) {
  try {
    const name = formData.get("name") as String;
    const email = formData.get("email") as String;
    const password = formData.get("password") as String;

    if (!name || !email || !password) {
      return { error: "Missing fields" };
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toString() },
    });

    if (existingUser) {
      return { error: "User already exists with this email" };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password.toString(), 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.toString(),
        email: email.toString(),
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
    return { error: "Something went wrong during sign up" };
  }
}

export async function login(formData: FormData) {
  try {
    const email = formData.get("email") as String;
    const password = formData.get("password") as String;

    if (!email || !password) {
      return { error: "Missing fields" };
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toString() },
    });

    if (!user) {
      return { error: "Invalid email or password" };
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password.toString(), user.passwordHash);

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
    return { error: "Something went wrong during login" };
  }
}

export async function logout() {
  (await cookies()).delete("session");
}
