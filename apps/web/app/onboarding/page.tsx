import { redirect } from "next/navigation";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const query = new URLSearchParams();
  query.set("type", "owner");

  for (const [key, value] of Object.entries(params)) {
    if (key !== "type") {
      if (typeof value === "string") {
        query.set(key, value);
      } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === "string") {
        query.set(key, value[0]);
      }
    }
  }

  redirect(`/register?${query.toString()}`);
}
