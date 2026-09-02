import { z } from "zod";

const targetSuccessfulDays = z.number().int().positive();

export const habitGoalParamsSchema = z.strictObject({
  habitId: z.uuid(),
});

export const goalParamsSchema = habitGoalParamsSchema.extend({
  goalId: z.uuid(),
});

export const createGoalSchema = z.strictObject({ targetSuccessfulDays });
export const updateGoalSchema = z.strictObject({ targetSuccessfulDays });

export type CreateGoalInput = z.output<typeof createGoalSchema>;
export type UpdateGoalInput = z.output<typeof updateGoalSchema>;
