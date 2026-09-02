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
  loader: ({ context }) => context.queryClient.query(habitQueries.list()),
  component: TodayPage,
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
