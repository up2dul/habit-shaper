import { PlusIcon, TargetIcon, TrashIcon } from "@phosphor-icons/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { authMutations, authQueries } from "@/modules/auth/auth.options";

import { HabitForm } from "./habit-form";
import { habitMutations, habitQueries } from "./habits.options";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TodayPage() {
  const { data: habits } = useSuspenseQuery(habitQueries.list());
  const { data: user } = useSuspenseQuery(authQueries.currentUser());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation(authMutations.logout(queryClient));
  return (
    <Page
      title="Today"
      action={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={logout.isPending}
            onClick={async () => {
              await logout.mutateAsync();
              await navigate({ to: "/login" });
            }}
          >
            Sign out
          </Button>
          <Button render={<Link to="/habits/new" />}>
            <PlusIcon data-icon="inline-start" />
            New habit
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground">Hello, {user?.name}.</p>
      {habits.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No habits yet</EmptyTitle>
            <EmptyDescription>
              Create a build habit or break a pattern to shape your day.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/habits/new" />}>
              Create your first habit
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <section className="flex flex-col gap-3">
          {habits.map((habit) => (
            <Card key={habit.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <CardTitle>
                      <Link
                        to="/habits/$habitId"
                        params={{ habitId: habit.id }}
                      >
                        {habit.name}
                      </Link>
                    </CardTitle>
                    <CardDescription>
                      {habit.description || `Started ${habit.startDate}`}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {habit.type === "BUILD" ? "Build" : "Break"}
                  </Badge>
                </div>
              </CardHeader>
              {habit.type === "BUILD" && (
                <CardContent className="text-muted-foreground text-sm">
                  {habit.scheduleDays
                    .map((day) => weekdayLabels[day])
                    .join(" · ")}
                </CardContent>
              )}
            </Card>
          ))}
        </section>
      )}
    </Page>
  );
}

export function CreateHabitPage() {
  return (
    <Page title="Create habit">
      <HabitForm />
    </Page>
  );
}

export function EditHabitPage({ habitId }: { habitId: string }) {
  const { data: habit } = useSuspenseQuery(habitQueries.detail(habitId));
  return (
    <Page title="Edit habit">
      <HabitForm habit={habit} />
    </Page>
  );
}

export function HabitDetailPage({ habitId }: { habitId: string }) {
  const { data: habit } = useSuspenseQuery(habitQueries.detail(habitId));
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation(habitMutations.delete(queryClient));
  return (
    <Page
      title={habit.name}
      action={
        <Button
          variant="outline"
          render={<Link to="/habits/$habitId/edit" params={{ habitId }} />}
        >
          Edit
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge>{habit.type === "BUILD" ? "Build" : "Break"}</Badge>
            <span className="text-muted-foreground text-sm">
              Starts {habit.startDate}
            </span>
          </div>
          <CardTitle>{habit.name}</CardTitle>
          {habit.description && (
            <CardDescription>{habit.description}</CardDescription>
          )}
        </CardHeader>
        {habit.type === "BUILD" && (
          <CardContent>
            <p className="text-sm font-medium">Active days</p>
            <p className="text-muted-foreground">
              {habit.scheduleDays.map((day) => weekdayLabels[day]).join(" · ")}
            </p>
          </CardContent>
        )}
      </Card>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          <TrashIcon data-icon="inline-start" />
          Delete habit
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{habit.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the habit and all of its history. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={mutation.isPending}
              onClick={async () => {
                await mutation.mutateAsync(habitId);
                await navigate({ to: "/" });
              }}
            >
              {mutation.isPending && <Spinner data-icon="inline-start" />}Delete
              permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  );
}

function Page({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-4 sm:p-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Button
            variant="link"
            className="h-auto justify-start p-0"
            render={<Link to="/" />}
          >
            Habit Shaper
          </Button>
          <h1 className="text-2xl font-medium">{title}</h1>
        </div>
        {action}
      </header>
      {children}
    </main>
  );
}
