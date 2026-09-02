import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  HeadContent,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { RouteError, RoutePending } from "@/components/route-feedback";
import { AuthForm } from "@/modules/auth/auth-form";
import { authQueries } from "@/modules/auth/auth.options";
import { goalQueries } from "@/modules/habits/goals.options";
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
  head: () => ({
    meta: [
      {
        title: "Habit Shaper",
      },
      {
        name: "description",
        content:
          "Shape your days by building habits you keep and breaking the ones you do not.",
      },
    ],
  }),
  component: () => (
    <>
      <HeadContent />
      <a
        href="#main-content"
        className="bg-primary text-primary-foreground focus-visible:ring-ring fixed top-3 left-3 z-50 -translate-y-20 rounded-lg px-4 py-3 font-medium transition-transform focus-visible:translate-y-0 focus-visible:ring-3"
      >
        Skip to main content
      </a>
      <Outlet />
    </>
  ),
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
  head: () => ({
    meta: [{ title: "Sign in | Habit Shaper" }],
  }),
  component: () => <AuthForm mode="login" />,
});
const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  beforeLoad: redirectAuthenticated,
  head: () => ({
    meta: [{ title: "Create account | Habit Shaper" }],
  }),
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
  head: () => ({
    meta: [{ title: "Today | Habit Shaper" }],
  }),
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
  head: () => ({
    meta: [{ title: "Progress | Habit Shaper" }],
  }),
  component: () => <ProgressPage search={progressRoute.useSearch()} />,
});

const createHabitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/new",
  beforeLoad: requireAuthentication,
  head: () => ({
    meta: [{ title: "Create habit | Habit Shaper" }],
  }),
  component: CreateHabitPage,
});

const habitDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/habits/$habitId",
  beforeLoad: requireAuthentication,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.query(habitQueries.detail(params.habitId)),
      context.queryClient.query(goalQueries.list(params.habitId)),
    ]),
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `${loaderData?.[0]?.name ?? "Habit"} | Habit Shaper`,
      },
    ],
  }),
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
  head: ({ loaderData }) => ({
    meta: [
      {
        title: `Edit ${loaderData?.name ?? "habit"} | Habit Shaper`,
      },
    ],
  }),
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
export const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPendingComponent: RoutePending,
  defaultErrorComponent: RouteError,
  defaultPendingMs: 150,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
