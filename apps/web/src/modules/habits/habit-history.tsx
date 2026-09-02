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
import { useEffect, useState } from "react";

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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
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
  const { data } = useSuspenseQuery(habitQueries.history(search.month));
  const navigate = useNavigate();
  const habits = data.habits.filter(
    (habit) =>
      (search.type === "ALL" || habit.type === search.type) &&
      (!search.habitId || habit.id === search.habitId)
  );
  const update = (next: Partial<ProgressSearch>) =>
    navigate({ to: "/progress", search: { ...search, ...next } });

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
          <h1 className="text-2xl font-medium">Progress</h1>
        </div>
      </header>
      <div className="flex flex-col gap-3">
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
      </div>
      <HistoryView
        data={{ ...data, habits }}
        onMonthChange={(month) => void update({ month })}
      />
    </main>
  );
}

export function HabitHistoryPanel({ habitId }: { habitId: string }) {
  const [month, setMonth] = useState(currentMonth);
  const { data } = useSuspenseQuery(habitQueries.history(month, habitId));
  return <HistoryView data={data} onMonthChange={setMonth} showMetrics />;
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
            Tracking records for the selected date.
          </p>
        </div>
        {selected.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No applicable habits on this date.
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
        ✓ completed or clean · × missed or relapse · • pending · — not
        applicable
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
              {habit.type === "BUILD" ? "Build habit" : "Break habit"}
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
              mutation.mutate({ habitId: habit.id, date: day.date })
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
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {mutation.isError
              ? mutation.error.message
              : mutation.isSuccess
                ? "History updated."
                : ""}
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
            {habit.type === "BUILD" ? "Build streak" : "Clean streak"}
          </CardDescription>
          <CardTitle>{habit.streak}</CardTitle>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardDescription>
            {habit.type === "BUILD" ? "This week" : "This week"}
          </CardDescription>
          <CardTitle>
            {weekly.type === "BUILD"
              ? `${weekly.completed}/${weekly.completed + weekly.missed}`
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
