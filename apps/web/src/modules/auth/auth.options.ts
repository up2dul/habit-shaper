import {
  mutationOptions,
  type QueryClient,
  queryOptions,
} from "@tanstack/react-query";

import { getCurrentUser, login, logout, register } from "./auth.api";

export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "current-user"] as const,
};

export const authQueries = {
  currentUser: () =>
    queryOptions({
      queryKey: authKeys.currentUser(),
      queryFn: getCurrentUser,
      staleTime: 30_000,
    }),
};

export const authMutations = {
  register: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: register,
      onSuccess: (user) => {
        queryClient.setQueryData(authKeys.currentUser(), user);
      },
    }),
  login: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: login,
      onSuccess: (user) => {
        queryClient.setQueryData(authKeys.currentUser(), user);
      },
    }),
  logout: (queryClient: QueryClient) =>
    mutationOptions({
      mutationFn: logout,
      onSuccess: () => {
        queryClient.setQueryData(authKeys.currentUser(), null);
      },
    }),
};
