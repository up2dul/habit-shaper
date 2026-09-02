import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";

import { createGoal, deleteGoal, listGoals, updateGoal } from "./goals.api";

export const goalKeys = {
  all: ["goals"] as const,
  lists: () => [...goalKeys.all, "list"] as const,
  list: (habitId: string) => [...goalKeys.lists(), habitId] as const,
};

export const goalQueries = {
  list: (habitId: string) =>
    queryOptions({
      queryKey: goalKeys.list(habitId),
      queryFn: () => listGoals(habitId),
    }),
};

export const goalMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: createGoal,
      onSuccess: (_, { habitId }) => invalidateGoals(queryClient, habitId),
    }),
  update: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: updateGoal,
      onSuccess: (_, { habitId }) => invalidateGoals(queryClient, habitId),
    }),
  delete: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: deleteGoal,
      onSuccess: (_, { habitId }) => invalidateGoals(queryClient, habitId),
    }),
};

function invalidateGoals(queryClient: QueryClient, habitId: string) {
  return queryClient.invalidateQueries({ queryKey: goalKeys.list(habitId) });
}
