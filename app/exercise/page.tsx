import fs from "fs";
import path from "path";
import yaml from "yaml";
import ExerciseClient from "./ExerciseClient";

export default async function ExercisePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const yamlPath = path.join(process.cwd(), "levels.yaml");
  let config = { easy: 1.0, medium: 2.0, hard: 3.0, target_peak: 3.0, target_exhale_hold: 8.0, target_inhale_hold: 5.0 };
  try {
    const file = fs.readFileSync(yamlPath, "utf8");
    config = yaml.parse(file);
  } catch (e) {
    console.warn("Failed to load levels.yaml, using defaults", e);
  }
  return <ExerciseClient demo={params.demo === "1"} dev={params.dev === "1"} config={config} />;
}
