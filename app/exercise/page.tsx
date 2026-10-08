import ExerciseClient from "./ExerciseClient";

export default async function ExercisePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <ExerciseClient demo={params.demo === "1"} dev={params.dev === "1"} />;
}
