import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";

import {
  createHabit,
  deleteHabit,
  getHabit,
  getHabitHistory,
  listHabits,
  listTodayHabits,
  markCompletion,
  recordRelapse,
  undoCompletion,
  undoRelapse,
  updateHabit,
} from "./habits.api";

export const habitKeys = {
  all: ["habits"] as const,
  lists: () => [...habitKeys.all, "list"] as const,
  list: () => [...habitKeys.lists()] as const,
  today: () => [...habitKeys.all, "today"] as const,
  details: () => [...habitKeys.all, "detail"] as const,
  detail: (habitId: string) => [...habitKeys.details(), habitId] as const,
  histories: () => [...habitKeys.all, "history"] as const,
  history: (month: string, habitId?: string) =>
    [...habitKeys.histories(), month, habitId ?? "all"] as const,
};

export const habitQueries = {
  list: () => queryOptions({ queryKey: habitKeys.list(), queryFn: listHabits }),
  today: () =>
    queryOptions({ queryKey: habitKeys.today(), queryFn: listTodayHabits }),
  detail: (habitId: string) =>
    queryOptions({
      queryKey: habitKeys.detail(habitId),
      queryFn: () => getHabit(habitId),
    }),
  history: (month: string, habitId?: string) =>
    queryOptions({
      queryKey: habitKeys.history(month, habitId),
      queryFn: () =>
        getHabitHistory({ month, ...(habitId ? { habitId } : {}) }),
    }),
};

export const habitMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: createHabit,
      onSuccess: (habit) => {
        queryClient.setQueryData(habitKeys.detail(habit.id), habit);
        return invalidateHabitCollections(queryClient);
      },
    }),
  update: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: updateHabit,
      onSuccess: (habit) => {
        queryClient.setQueryData(habitKeys.detail(habit.id), habit);
        return invalidateHabitCollections(queryClient);
      },
    }),
  delete: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: deleteHabit,
      onSuccess: (_, habitId) => {
        queryClient.removeQueries({ queryKey: habitKeys.detail(habitId) });
        return invalidateHabitCollections(queryClient);
      },
    }),
  markCompletion: (queryClient: QueryClient) =>
    trackingMutation(queryClient, markCompletion),
  undoCompletion: (queryClient: QueryClient) =>
    trackingMutation(queryClient, undoCompletion),
  recordRelapse: (queryClient: QueryClient) =>
    trackingMutation(queryClient, recordRelapse),
  undoRelapse: (queryClient: QueryClient) =>
    trackingMutation(queryClient, undoRelapse),
};

function trackingMutation(
  queryClient: QueryClient,
  mutationFn: (input: { habitId: string; date: string }) => Promise<void>
) {
  return mutationOptions({
    mutationFn,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: habitKeys.today() }),
        queryClient.invalidateQueries({ queryKey: habitKeys.histories() }),
        queryClient.invalidateQueries({ queryKey: ["goals"] }),
      ]),
  });
}

function invalidateHabitCollections(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: habitKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: habitKeys.today() }),
    queryClient.invalidateQueries({ queryKey: habitKeys.histories() }),
    queryClient.invalidateQueries({ queryKey: ["goals"] }),
  ]);
}
