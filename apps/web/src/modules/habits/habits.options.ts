import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";

import {
  createHabit,
  deleteHabit,
  getHabit,
  listHabits,
  updateHabit,
} from "./habits.api";

export const habitKeys = {
  all: ["habits"] as const,
  lists: () => [...habitKeys.all, "list"] as const,
  list: () => [...habitKeys.lists()] as const,
  details: () => [...habitKeys.all, "detail"] as const,
  detail: (habitId: string) => [...habitKeys.details(), habitId] as const,
};

export const habitQueries = {
  list: () => queryOptions({ queryKey: habitKeys.list(), queryFn: listHabits }),
  detail: (habitId: string) =>
    queryOptions({
      queryKey: habitKeys.detail(habitId),
      queryFn: () => getHabit(habitId),
    }),
};

export const habitMutations = {
  create: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: createHabit,
      onSuccess: (habit) => {
        queryClient.setQueryData(habitKeys.detail(habit.id), habit);
        return queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      },
    }),
  update: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: updateHabit,
      onSuccess: (habit) => {
        queryClient.setQueryData(habitKeys.detail(habit.id), habit);
        return queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      },
    }),
  delete: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: deleteHabit,
      onSuccess: (_, habitId) => {
        queryClient.removeQueries({ queryKey: habitKeys.detail(habitId) });
        return queryClient.invalidateQueries({ queryKey: habitKeys.lists() });
      },
    }),
};
