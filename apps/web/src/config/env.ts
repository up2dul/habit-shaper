import { z } from "zod";

type EnvironmentSource = Record<string, string | undefined>;

const webInputSchema = z.object({
  VITE_API_URL: z
    .url()
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "must use the http or https protocol",
    })
    .optional(),
});

export function parseWebEnv(source: EnvironmentSource, mode: string) {
  const result = webInputSchema.safeParse(source);
  const issues = result.success ? [] : [...result.error.issues];

  if (mode === "production" && source.VITE_API_URL === undefined) {
    issues.push({
      code: "custom",
      path: ["VITE_API_URL"],
      message: "is required in production",
      input: undefined,
    });
  }

  if (issues.length > 0) {
    const details = issues
      .map(
        (issue) =>
          `- ${issue.path.join(".") || "environment"}: ${issue.message}`
      )
      .join("\n");

    throw new Error(`Invalid web environment:\n${details}`);
  }

  return {
    apiUrl: result.data?.VITE_API_URL ?? "http://localhost:3000",
  } as const;
}

export const webEnv = parseWebEnv(import.meta.env, import.meta.env.MODE);
