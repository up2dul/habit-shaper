import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  CheckIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";

import { ThemeToggle } from "@/components/theme-toggle";
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
import { toast } from "@/components/ui/toast";
import { authMutations, authQueries } from "@/modules/auth/auth.options";

import { GoalManager } from "./goal-manager";
import { HabitForm } from "./habit-form";
import { currentMonth, HabitHistoryPanel } from "./habit-history";
import type { TodayHabit } from "./habits.api";
import { habitMutations, habitQueries } from "./habits.options";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function TodayPage() {
  const { data: habits } = useSuspenseQuery(habitQueries.today());
  const { data: user } = useSuspenseQuery(authQueries.currentUser());
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logout = useMutation(authMutations.logout(queryClient));
  return (
    <Page
      title="Today"
      action={
        <div className="flex flex-wrap items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="outline" />}>
              Sign out
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sign out?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to sign out?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={logout.isPending}
                  onClick={async () => {
                    try {
                      await logout.mutateAsync();
                      await navigate({ to: "/login" });
                    } catch (error) {
                      toast.add({
                        title: "Couldn’t sign out",
                        description:
                          error instanceof Error ? error.message : "Try again.",
                        type: "error",
                      });
                    }
                  }}
                >
                  Sign out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button render={<Link to="/habits/new" />}>
            <PlusIcon data-icon="inline-start" />
            New habit
          </Button>
        </div>
      }
    >
      <p className="text-muted-foreground">
        Hello, {user?.name}. Here&apos;s how your habits are going today.
      </p>
      {habits.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>Nothing to track today</EmptyTitle>
            <EmptyDescription>
              Enjoy the clear space, or create another habit to shape your day.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button render={<Link to="/habits/new" />}>
              Create your first habit
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          <TodaySection
            title="Build"
            description="Habits to complete today."
            habits={habits.filter((habit) => habit.type === "BUILD")}
          />
          <TodaySection
            title="Break"
            description="Habits to avoid today."
            habits={habits.filter((habit) => habit.type === "BREAK")}
          />
        </div>
      )}
    </Page>
  );
}

function TodaySection({
  title,
  description,
  habits,
}: {
  title: string;
  description: string;
  habits: TodayHabit[];
}) {
  if (habits.length === 0) return null;
  return (
    <section className="flex flex-col gap-3" aria-labelledby={`${title}-title`}>
      <div className="flex flex-col gap-1">
        <h2 id={`${title}-title`} className="text-lg font-medium">
          {title}
        </h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      {habits.map((habit) => (
        <TodayHabitCard key={habit.id} habit={habit} />
      ))}
    </section>
  );
}

function TodayHabitCard({ habit }: { habit: TodayHabit }) {
  const queryClient = useQueryClient();
  const action =
    habit.type === "BUILD"
      ? habit.state === "COMPLETED"
        ? habitMutations.undoCompletion
        : habitMutations.markCompletion
      : habit.state === "RELAPSE"
        ? habitMutations.undoRelapse
        : habitMutations.recordRelapse;
  const mutation = useMutation(action(queryClient));
  const isUndo = habit.state === "COMPLETED" || habit.state === "RELAPSE";
  const label =
    habit.type === "BUILD"
      ? isUndo
        ? "Undo completion"
        : "Done"
      : isUndo
        ? "Undo"
        : "Log relapse";
  const stateLabel =
    habit.state === "COMPLETED"
      ? "Completed"
      : habit.state === "PENDING"
        ? "Pending today"
        : habit.state === "RELAPSE"
          ? "Relapse logged today"
          : "Clean";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <CardTitle className="truncate">
              <Link to="/habits/$habitId" params={{ habitId: habit.id }}>
                {habit.name}
              </Link>
            </CardTitle>
            <CardDescription>{stateLabel}</CardDescription>
          </div>
          <Badge variant={isUndo ? "default" : "secondary"}>{stateLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="text-muted-foreground flex flex-col gap-1 text-sm">
          <span>
            {habit.type === "BUILD"
              ? `${habit.streak}-day streak`
              : `${habit.streak}-day clean streak`}
          </span>
          {habit.type === "BUILD" && (
            <span>
              {habit.scheduleDays.map((day) => weekdayLabels[day]).join(" · ")}
            </span>
          )}
        </div>
        <Button
          className="min-h-11 w-full"
          variant={isUndo ? "outline" : "default"}
          disabled={mutation.isPending}
          onClick={() =>
            mutation.mutate(
              { habitId: habit.id, date: localToday() },
              {
                onSuccess: () =>
                  toast.add({
                    title: isUndo ? "Update undone" : "Today updated",
                    description: `${habit.name}: ${label.toLowerCase()}`,
                    type: "success",
                  }),
              }
            )
          }
        >
          {mutation.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : isUndo ? (
            <ArrowCounterClockwiseIcon data-icon="inline-start" />
          ) : habit.type === "BUILD" ? (
            <CheckIcon data-icon="inline-start" />
          ) : (
            <WarningIcon data-icon="inline-start" />
          )}
          {mutation.isPending ? "Updating…" : label}
        </Button>
        <p
          className="text-destructive text-sm"
          role={mutation.isError ? "alert" : undefined}
        >
          {mutation.isError ? mutation.error.message : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function localToday(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function CreateHabitPage() {
  return (
    <Page title="Create habit" showBack={true} showNavigation={false}>
      <HabitForm />
    </Page>
  );
}

export function EditHabitPage({ habitId }: { habitId: string }) {
  const { data: habit } = useSuspenseQuery(habitQueries.detail(habitId));
  return (
    <Page title="Edit habit" showBack={true} showNavigation={false}>
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
      showBack={true}
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
              Started {formatDate(habit.startDate)}
            </span>
          </div>
          {habit.description && (
            <CardDescription>{habit.description}</CardDescription>
          )}
        </CardHeader>
        {habit.type === "BUILD" && (
          <CardContent>
            <p className="text-sm font-medium">Active days</p>
            <p className="text-muted-foreground">
              {scheduleSummary(habit.scheduleDays)}
            </p>
          </CardContent>
        )}
      </Card>
      <GoalManager habitId={habitId} />
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="text-lg font-medium">History</h2>
          <p className="text-muted-foreground text-sm">
            Review and correct this habit’s calendar record.
          </p>
        </div>
        <HabitHistoryPanel habitId={habitId} />
      </section>
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
                try {
                  await mutation.mutateAsync(habitId);
                  toast.add({
                    title: "Habit deleted",
                    description: `“${habit.name}” and its history were removed.`,
                    type: "success",
                  });
                  await navigate({ to: "/" });
                } catch (error) {
                  toast.add({
                    title: "Couldn’t delete habit",
                    description:
                      error instanceof Error ? error.message : "Try again.",
                    type: "error",
                  });
                }
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
  showBack = false,
  showNavigation = true,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  showBack?: boolean;
  showNavigation?: boolean;
  children: React.ReactNode;
}) {
  return (
    <main
      id="main-content"
      className={`relative mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-4 sm:p-6 ${showNavigation ? "pb-28" : ""}`}
    >
      <ThemeToggle className="absolute top-4 right-4 z-10 sm:hidden" />
      <header className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-1">
          {showBack && (
            <Button
              variant="link"
              className="h-auto justify-start gap-1 p-0"
              render={<Link to="/" />}
            >
              <ArrowLeftIcon /> Back
            </Button>
          )}
          {!showBack && (
            <Button
              variant="link"
              className="h-auto justify-start p-0"
              render={<Link to="/" />}
            >
              Habit Shaper
            </Button>
          )}
          <h1 className="text-2xl font-medium">{title}</h1>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
          {action}
          <ThemeToggle className="hidden sm:inline-flex" />
        </div>
      </header>
      {children}
      {showNavigation && <BottomNavigation />}
    </main>
  );
}

function BottomNavigation() {
  return (
    <nav
      aria-label="Primary navigation"
      className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex justify-center border-t px-4 py-3 shadow-[0_-4px_16px_oklch(0_0_0/0.06)] backdrop-blur sm:px-6"
    >
      <div className="flex w-full max-w-xl gap-2">
        <Button
          className="flex-1"
          variant="ghost"
          render={
            <Link
              to="/"
              activeProps={{
                className: "bg-secondary text-secondary-foreground",
              }}
            />
          }
        >
          Today
        </Button>
        <Button
          className="flex-1"
          variant="ghost"
          render={
            <Link
              to="/progress"
              search={{ month: currentMonth(), type: "ALL" }}
              activeProps={{
                className: "bg-secondary text-secondary-foreground",
              }}
            />
          }
        >
          Progress
        </Button>
      </div>
    </nav>
  );
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
function scheduleSummary(days: number[]): string {
  if (days.length === 7) return "Every day";
  if (days.length === 5 && [1, 2, 3, 4, 5].every((day) => days.includes(day)))
    return "Weekdays";
  if (days.length === 2 && [0, 6].every((day) => days.includes(day)))
    return "Weekends";
  return days.map((day) => weekdayLabels[day]).join(", ");
}
