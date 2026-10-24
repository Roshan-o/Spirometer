import fs from "fs";
import path from "path";
import yaml from "yaml";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import ExerciseClient from "./ExerciseClient";

export default async function ExercisePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const yamlPath = path.join(process.cwd(), "levels.yaml");
  let config = { easy: 1.0, medium: 2.0, hard: 3.0, target_peak: 3.0, target_exhale_hold: 8.0, target_inhale_hold: 5.0 };
  try {
    const file = fs.readFileSync(yamlPath, "utf8");
    config = yaml.parse(file);
  } catch (e) {
    console.warn("Failed to load levels.yaml, using defaults", e);
  }
  return <ExerciseClient userName={user.name} config={config} />;
}
