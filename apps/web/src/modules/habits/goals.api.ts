import { api, readResponse } from "@/lib/api";

export type Goal = {
  id: string;
  habitId: string;
  targetSuccessfulDays: number;
  successfulDays: number;
  createdAt: string;
  updatedAt: string;
};

export type GoalMutation = {
  habitId: string;
  goalId: string;
};

export async function listGoals(habitId: string): Promise<Goal[]> {
  return readResponse<Goal[]>(
    await api.habits[":habitId"].goals.$get({ param: { habitId } })
  );
}

export async function createGoal(input: {
  habitId: string;
  targetSuccessfulDays: number;
}): Promise<Goal> {
  return readResponse<Goal>(
    await api.habits[":habitId"].goals.$post({
      param: { habitId: input.habitId },
      json: { targetSuccessfulDays: input.targetSuccessfulDays },
    })
  );
}

export async function updateGoal(
  input: GoalMutation & { targetSuccessfulDays: number }
): Promise<Goal> {
  return readResponse<Goal>(
    await api.habits[":habitId"].goals[":goalId"].$patch({
      param: { habitId: input.habitId, goalId: input.goalId },
      json: { targetSuccessfulDays: input.targetSuccessfulDays },
    })
  );
}

export async function deleteGoal(input: GoalMutation): Promise<void> {
  const response = await api.habits[":habitId"].goals[":goalId"].$delete({
    param: input,
  });
  if (!response.ok) await readResponse(response);
}
