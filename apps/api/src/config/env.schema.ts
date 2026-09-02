import { z } from "zod";

type EnvironmentSource = Record<string, string | undefined>;

const httpUrl = z
  .url()
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "must use the http or https protocol",
  });

const port = z.coerce.number().int().min(1).max(65_535);
const nonEmpty = z.string().trim().min(1, "must not be empty");
const productionDatabaseFields = [
  "DATABASE_HOST",
  "DATABASE_PORT",
  "DATABASE_USER",
  "DATABASE_PASSWORD",
  "DATABASE_NAME",
] as const;

const databaseInputSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_HOST: nonEmpty.optional(),
    DATABASE_PORT: port.optional(),
    DATABASE_USER: nonEmpty.optional(),
    DATABASE_PASSWORD: nonEmpty.optional(),
    DATABASE_NAME: nonEmpty.optional(),
  })
  .superRefine(requireInProduction(productionDatabaseFields));

const apiInputSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: port.optional(),
    DATABASE_HOST: nonEmpty.optional(),
    DATABASE_PORT: port.optional(),
    DATABASE_USER: nonEmpty.optional(),
    DATABASE_PASSWORD: nonEmpty.optional(),
    DATABASE_NAME: nonEmpty.optional(),
    WEB_ORIGIN: httpUrl.optional(),
  })
  .superRefine(
    requireInProduction([...productionDatabaseFields, "PORT", "WEB_ORIGIN"])
  );

export function parseApiEnv(source: EnvironmentSource) {
  const value = parseEnvironment(apiInputSchema, source, "API");

  return {
    nodeEnv: value.NODE_ENV,
    port: value.PORT ?? 3_000,
    webOrigin: value.WEB_ORIGIN ?? "http://localhost:5173",
    database: withDatabaseDefaults(value),
  } as const;
}

export function parseDatabaseEnv(source: EnvironmentSource) {
  const value = parseEnvironment(databaseInputSchema, source, "database");

  return withDatabaseDefaults(value);
}

function withDatabaseDefaults(value: {
  DATABASE_HOST?: string;
  DATABASE_PORT?: number;
  DATABASE_USER?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_NAME?: string;
}) {
  return {
    host: value.DATABASE_HOST ?? "localhost",
    port: value.DATABASE_PORT ?? 3_306,
    user: value.DATABASE_USER ?? "habit_shaper",
    password: value.DATABASE_PASSWORD ?? "habit_shaper",
    name: value.DATABASE_NAME ?? "habit_shaper",
  } as const;
}

function requireInProduction<const TField extends string>(
  fields: readonly TField[]
) {
  return (
    value: { NODE_ENV: "development" | "test" | "production" } & Partial<
      Record<TField, unknown>
    >,
    context: z.RefinementCtx
  ) => {
    if (value.NODE_ENV !== "production") return;

    for (const field of fields) {
      if (value[field] === undefined) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "is required in production",
        });
      }
    }
  };
}

function parseEnvironment<TSchema extends z.ZodType>(
  schema: TSchema,
  source: EnvironmentSource,
  label: string
): z.output<TSchema> {
  const result = schema.safeParse(source);

  if (result.success) return result.data;

  const details = result.error.issues
    .map(
      (issue) => `- ${issue.path.join(".") || "environment"}: ${issue.message}`
    )
    .join("\n");

  throw new Error(`Invalid ${label} environment:\n${details}`);
}
