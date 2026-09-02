import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { AuthForm } from "@/modules/auth/auth-form";
import { authQueries } from "@/modules/auth/auth.options";
import {
  currentMonth,
  ProgressPage,
  type ProgressSearch,
} from "@/modules/habits/habit-history";
import {
  CreateHabitPage,
  EditHabitPage,
  HabitDetailPage,
  TodayPage,
} from "@/modules/habits/habits-pages";
import { habitQueries } from "@/modules/habits/habits.options";

type RouterContext = { queryClient: QueryClient };
const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => <Outlet />,
});

async function redirectAuthenticated({ context }: { context: RouterContext }) {
  if (await context.queryClient.query(authQueries.currentUser())) {
    throw redirect({ to: "/" });
  }
}

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  beforeLoad: redirectAuthenticated,
  component: () => <AuthForm mode="login" />,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: redirectAuthenticated,
  component: () => <AuthForm mode="register" />,
});
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: async ({ context }) => {
    if (!(await context.queryClient.query(authQueries.currentUser()))) {
      throw redirect({ to: "/login" });
    }
  },
  loader: ({ context }) => context.queryClient.query(habitQueries.today()),
  component: TodayPage,
});

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  beforeLoad: requireAuthentication,
  validateSearch: (search: Record<string, unknown>): ProgressSearch => ({
    month:
      typeof search.month === "string" &&
      /^\d{4}-(0[1-9]|1[0-2])$/.test(search.month)
        ? search.month
        : currentMonth(),
    type:
      search.type === "BUILD" || search.type === "BREAK" ? search.type : "ALL",
    ...(typeof search.habitId === "string" ? { habitId: search.habitId } : {}),
  }),
  loaderDeps: ({ search }) => ({ month: search.month }),
  loader: ({ context, deps }) =>
    context.queryClient.query(habitQueries.history(deps.month)),
  component: () => <ProgressPage search={progressRoute.useSearch()} />,
});

const createHabitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/new",
  beforeLoad: requireAuthentication,
  component: CreateHabitPage,
});

const habitDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/$habitId",
  beforeLoad: requireAuthentication,
  loader: ({ context, params }) =>
    context.queryClient.query(habitQueries.detail(params.habitId)),
  component: () => {
    const { habitId } = habitDetailRoute.useParams();
    return <HabitDetailPage habitId={habitId} />;
  },
});

const editHabitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/$habitId/edit",
  beforeLoad: requireAuthentication,
  loader: ({ context, params }) =>
    context.queryClient.query(habitQueries.detail(params.habitId)),
  component: () => {
    const { habitId } = editHabitRoute.useParams();
    return <EditHabitPage habitId={habitId} />;
  },
});

async function requireAuthentication({ context }: { context: RouterContext }) {
  if (!(await context.queryClient.query(authQueries.currentUser()))) {
    throw redirect({ to: "/login" });
  }
}

const routeTree = rootRoute.addChildren([
  indexRoute,
  progressRoute,
  createHabitRoute,
  habitDetailRoute,
  editHabitRoute,
  loginRoute,
  registerRoute,
]);
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
export const router = createRouter({ routeTree, context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
