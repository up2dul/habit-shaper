import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
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
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import type {
  HabitHistory,
  HistoryDay,
  HistoryHabit,
  HabitType,
} from "./habits.api";
import { habitMutations, habitQueries } from "./habits.options";

type ProgressFilter = "ALL" | HabitType;
export type ProgressSearch = {
  month: string;
  type: ProgressFilter;
  habitId?: string;
};

export function ProgressPage({ search }: { search: ProgressSearch }) {
  const navigate = useNavigate();
  const update = (next: Partial<ProgressSearch>) =>
    navigate({ to: "/progress", search: { ...search, ...next } });

  return (
    <main
      id="main-content"
      className="relative mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-4 pb-28 sm:p-6 sm:pb-28"
    >
      <ThemeToggle className="absolute top-4 right-4" />
      <header className="relative flex items-center justify-between gap-4 pr-12">
        <div className="flex flex-col gap-1">
          <Button
            variant="link"
            className="h-auto justify-start p-0"
            render={<Link to="/" />}
          >
            Habit Shaper
          </Button>
          <h1 className="text-2xl font-medium">Progress</h1>
        </div>
      </header>
      <ToggleGroup
        value={[search.type]}
        onValueChange={(value) => {
          const type = value[0] as ProgressFilter | undefined;
          if (type) void update({ type, habitId: undefined });
        }}
        variant="outline"
        spacing={0}
        aria-label="Filter habits by type"
      >
        {(["ALL", "BUILD", "BREAK"] as const).map((value) => (
          <ToggleGroupItem
            key={value}
            value={value}
            aria-label={`Show ${value.toLowerCase()} habits`}
          >
            {value === "ALL" ? "All" : value === "BUILD" ? "Build" : "Break"}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <Suspense fallback={<HistorySkeleton showFilter />}>
        <ProgressHistory search={search} update={update} />
      </Suspense>
      <nav
        aria-label="Primary navigation"
        className="bg-background/95 fixed inset-x-0 bottom-0 z-40 flex justify-center border-t px-4 py-3 shadow-[0_-4px_16px_oklch(0_0_0/0.06)] backdrop-blur sm:px-6"
      >
        <div className="flex w-full max-w-sm gap-2">
          <Button
            className="flex-1"
            variant="ghost"
            render={<Link to="/" />}
            activeProps={{
              className: "bg-secondary text-secondary-foreground",
            }}
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
    </main>
  );
}

function ProgressHistory({
  search,
  update,
}: {
  search: ProgressSearch;
  update: (next: Partial<ProgressSearch>) => void;
}) {
  const { data } = useSuspenseQuery(habitQueries.history(search.month));
  const habits = data.habits.filter(
    (habit) =>
      (search.type === "ALL" || habit.type === search.type) &&
      (!search.habitId || habit.id === search.habitId)
  );
  return (
    <div className="flex flex-col gap-6">
      <Select
        value={search.habitId ?? "ALL"}
        onValueChange={(value) =>
          void update({
            habitId: value === "ALL" ? undefined : String(value),
          })
        }
      >
        <SelectTrigger className="w-full" aria-label="Filter by habit">
          <SelectValue placeholder="All habits" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="ALL">All habits</SelectItem>
            {data.habits
              .filter(
                (habit) => search.type === "ALL" || habit.type === search.type
              )
              .map((habit) => (
                <SelectItem key={habit.id} value={habit.id}>
                  {habit.name}
                </SelectItem>
              ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {habits.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <WarningIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>No habits match these filters</EmptyTitle>
            <EmptyDescription>
              Choose another type or select all habits to see progress.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <HistoryView
          data={{ ...data, habits }}
          onMonthChange={(month) => void update({ month })}
        />
      )}
    </div>
  );
}

export function HabitHistoryPanel({ habitId }: { habitId: string }) {
  const [month, setMonth] = useState(currentMonth);
  return (
    <Suspense fallback={<HistorySkeleton showMetrics />}>
      <HabitHistoryLoaded
        habitId={habitId}
        month={month}
        onMonthChange={setMonth}
      />
    </Suspense>
  );
}

function HabitHistoryLoaded({
  habitId,
  month,
  onMonthChange,
}: {
  habitId: string;
  month: string;
  onMonthChange: (month: string) => void;
}) {
  const { data } = useSuspenseQuery(habitQueries.history(month, habitId));
  return <HistoryView data={data} onMonthChange={onMonthChange} showMetrics />;
}

function HistoryView({
  data,
  onMonthChange,
  showMetrics = false,
}: {
  data: HabitHistory;
  onMonthChange: (month: string) => void;
  showMetrics?: boolean;
}) {
  const [selectedDate, setSelectedDate] = useState(() =>
    data.today.startsWith(data.month) ? data.today : `${data.month}-01`
  );
  useEffect(() => {
    setSelectedDate(
      data.today.startsWith(data.month) ? data.today : `${data.month}-01`
    );
  }, [data.month, data.today]);
  const selected = data.habits.flatMap((habit) => {
    const day = habit.days.find(({ date }) => date === selectedDate);
    return day && day.state !== "NOT_APPLICABLE" ? [{ habit, day }] : [];
  });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => onMonthChange(shiftMonth(data.month, -1))}
        >
          <ArrowLeftIcon />
        </Button>
        <h2 className="font-medium">{monthLabel(data.month)}</h2>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => onMonthChange(shiftMonth(data.month, 1))}
        >
          <ArrowRightIcon />
        </Button>
      </div>
      {showMetrics && data.habits[0] && <Metrics habit={data.habits[0]} />}
      <HistoryCalendar
        data={data}
        selectedDate={selectedDate}
        onSelect={setSelectedDate}
      />
      <section
        className="flex flex-col gap-3"
        aria-labelledby="selected-history-title"
      >
        <div>
          <h2 id="selected-history-title" className="font-medium">
            {longDate(selectedDate)}
          </h2>
          <p className="text-muted-foreground text-sm">
            Habit activity for this date.
          </p>
        </div>
        {selected.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No habits scheduled for this date.
          </p>
        ) : (
          selected.map(({ habit, day }) => (
            <HistoryRecord key={habit.id} habit={habit} day={day} />
          ))
        )}
      </section>
    </div>
  );
}

function HistorySkeleton({
  showFilter = false,
  showMetrics = false,
}: {
  showFilter?: boolean;
  showMetrics?: boolean;
}) {
  return (
    <div className="flex flex-col gap-5" aria-hidden="true">
      {showFilter && <Skeleton className="h-11 w-full rounded-lg" />}
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="size-10 rounded-lg" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="size-10 rounded-lg" />
      </div>
      {showMetrics && (
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      )}
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
      <Skeleton className="h-5 w-40" />
      <div className="flex flex-col gap-3">
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    </div>
  );
}

function HistoryCalendar({
  data,
  selectedDate,
  onSelect,
}: {
  data: HabitHistory;
  selectedDate: string;
  onSelect: (date: string) => void;
}) {
  const dates =
    data.habits[0]?.days.map(({ date }) => date) ??
    monthDateStrings(data.month);
  const leading = (new Date(`${data.month}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  return (
    <div
      className="flex flex-col gap-2"
      role="group"
      aria-label={`Calendar for ${monthLabel(data.month)}`}
    >
      <div className="text-muted-foreground grid grid-cols-7 text-center text-xs">
        {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const).map(
          (day) => (
            <span key={day}>{day}</span>
          )
        )}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {dates.map((date) => {
          const states = data.habits
            .map((habit) => habit.days.find((day) => day.date === date)?.state)
            .filter(isApplicableState);
          const summary = states.length
            ? states.map(stateSymbol).join(" ")
            : "—";
          return (
            <Button
              key={date}
              variant={selectedDate === date ? "default" : "outline"}
              className="h-14 min-w-0 flex-col gap-0 p-1"
              aria-label={`${longDate(date)}: ${states.length ? states.map(stateLabel).join(", ") : "no applicable habits"}`}
              aria-pressed={selectedDate === date}
              onClick={() => onSelect(date)}
            >
              <span>{Number(date.slice(-2))}</span>
              <span aria-hidden="true" className="text-xs">
                {summary}
              </span>
            </Button>
          );
        })}
      </div>
      <p className="text-muted-foreground text-xs">
        ✓ completed or clean · × missed or relapse · • pending · — not scheduled
      </p>
    </div>
  );
}

function HistoryRecord({
  habit,
  day,
}: {
  habit: HistoryHabit;
  day: HistoryDay;
}) {
  const queryClient = useQueryClient();
  const active = day.state === "COMPLETED" || day.state === "RELAPSE";
  const factory =
    habit.type === "BUILD"
      ? active
        ? habitMutations.undoCompletion
        : habitMutations.markCompletion
      : active
        ? habitMutations.undoRelapse
        : habitMutations.recordRelapse;
  const mutation = useMutation(factory(queryClient));
  const actionLabel =
    habit.type === "BUILD"
      ? active
        ? "Undo completion"
        : "Mark completed"
      : active
        ? "Undo relapse"
        : "Log relapse";
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>{habit.name}</CardTitle>
            <CardDescription>
              {habit.type === "BUILD"
                ? `${habit.streak}-day streak`
                : `${habit.streak}-day clean streak`}
            </CardDescription>
          </div>
          <Badge variant="secondary">{stateLabel(day.state)}</Badge>
        </div>
      </CardHeader>
      {day.editable && (
        <CardContent className="flex flex-col gap-2">
          <Button
            variant={active ? "outline" : "default"}
            disabled={mutation.isPending}
            onClick={() =>
              mutation.mutate(
                { habitId: habit.id, date: day.date },
                {
                  onSuccess: () =>
                    toast.add({
                      title: "History updated",
                      description: longDate(day.date),
                      type: "success",
                    }),
                }
              )
            }
          >
            {mutation.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : habit.type === "BUILD" ? (
              <CheckIcon data-icon="inline-start" />
            ) : (
              <WarningIcon data-icon="inline-start" />
            )}
            {mutation.isPending ? "Updating…" : actionLabel}
          </Button>
          <p
            role={mutation.isError ? "alert" : undefined}
            className="text-destructive text-sm"
          >
            {mutation.isError ? mutation.error.message : ""}
          </p>
        </CardContent>
      )}
    </Card>
  );
}

function Metrics({ habit }: { habit: HistoryHabit }) {
  const weekly = habit.weekly;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Card>
        <CardHeader>
          <CardDescription>
            {habit.type === "BUILD" ? "Current streak" : "Clean streak"}
          </CardDescription>
          <CardTitle>{habit.streak}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>Weekly completion</CardDescription>
          <CardTitle>
            {weekly.type === "BUILD"
              ? `${weekly.completed} completed · ${weekly.missed} missed`
              : `${weekly.clean} clean`}
          </CardTitle>
        </CardHeader>
      </Card>
    </div>
  );
}

export function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
function shiftMonth(month: string, amount: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return date.toISOString().slice(0, 7);
}
function monthLabel(month: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00Z`));
}
function longDate(date: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}
function monthDateStrings(month: string): string[] {
  const date = new Date(`${month}-01T00:00:00Z`);
  const result: string[] = [];
  while (date.toISOString().startsWith(month)) {
    result.push(date.toISOString().slice(0, 10));
    date.setUTCDate(date.getUTCDate() + 1);
  }
  return result;
}
function stateSymbol(state: HistoryDay["state"]): string {
  return state === "COMPLETED" || state === "CLEAN"
    ? "✓"
    : state === "PENDING"
      ? "•"
      : state === "NOT_APPLICABLE"
        ? "—"
        : "×";
}
function isApplicableState(
  state: HistoryDay["state"] | undefined
): state is Exclude<HistoryDay["state"], "NOT_APPLICABLE"> {
  return state !== undefined && state !== "NOT_APPLICABLE";
}
function stateLabel(state: HistoryDay["state"]): string {
  return state.toLowerCase().replace("_", " ");
}
