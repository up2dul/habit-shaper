import {
  QueryClient,
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from "@tanstack/react-router";

import { Button } from "@/components/ui/button";
import { AuthForm } from "@/modules/auth/auth-form";
import { authMutations, authQueries } from "@/modules/auth/auth.options";

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
  component: HomePage,
});

function HomePage() {
  const { data: user } = useSuspenseQuery(authQueries.currentUser());
  const client = useQueryClient();
  const mutation = useMutation(authMutations.logout(client));
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium">Today</h1>
          <p className="text-muted-foreground">Hello, {user?.name}.</p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            await mutation.mutateAsync();
            await router.navigate({ to: "/login" });
          }}
          disabled={mutation.isPending}
        >
          Sign out
        </Button>
      </header>
      <section className="bg-card rounded-xl border p-6">
        <h2 className="text-lg font-medium">Your habits will live here</h2>
        <p className="text-muted-foreground">
          Authentication is ready. Habit creation arrives in Phase 4.
        </p>
      </section>
    </main>
  );
}

const routeTree = rootRoute.addChildren([
  indexRoute,
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
