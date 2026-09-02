import { z } from "zod";

export const weekdaySchema = z.number().int().min(0).max(6);
const scheduleDays = z
  .array(weekdaySchema)
  .min(1)
  .max(7)
  .transform(uniqueSorted);

const habitFields = {
  name: z.string().trim().min(1).max(255),
  description: z.string().trim().max(2_000).nullable().optional(),
  startDate: z.iso.date(),
};

export const createHabitSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...habitFields, type: z.literal("BUILD"), scheduleDays }),
  z.strictObject({ ...habitFields, type: z.literal("BREAK") }),
]);

export const updateHabitSchema = z
  .strictObject({
    name: habitFields.name.optional(),
    description: habitFields.description,
    startDate: habitFields.startDate.optional(),
    scheduleDays: scheduleDays.optional(),
  })
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field is required",
  });

export const habitIdSchema = z.strictObject({
  habitId: z.uuid(),
});

export type CreateHabitInput = z.output<typeof createHabitSchema>;
export type UpdateHabitInput = z.output<typeof updateHabitSchema>;
export type Weekday = z.output<typeof weekdaySchema>;

function uniqueSorted(days: Weekday[]): Weekday[] {
  return [...new Set(days)].sort((a, b) => a - b);
}
