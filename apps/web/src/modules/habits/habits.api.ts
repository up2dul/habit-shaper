import { api, readResponse } from "@/lib/api";

export type HabitType = "BUILD" | "BREAK";
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Habit = {
  id: string;
  name: string;
  description: string | null;
  type: HabitType;
  startDate: string;
  scheduleDays: Weekday[];
  createdAt: string;
  updatedAt: string;
};
export type TodayHabit = Pick<
  Habit,
  "id" | "name" | "description" | "type" | "startDate" | "scheduleDays"
> & {
  state: "COMPLETED" | "PENDING" | "CLEAN" | "RELAPSE";
  streak: number;
};
export type CreateHabitInput = {
  name: string;
  description?: string | null;
  startDate: string;
} & ({ type: "BUILD"; scheduleDays: Weekday[] } | { type: "BREAK" });
export type UpdateHabitInput = Partial<
  Pick<CreateHabitInput, "name" | "description" | "startDate"> & {
    scheduleDays: Weekday[];
  }
>;

export async function listHabits(): Promise<Habit[]> {
  return readResponse<Habit[]>(await api.habits.$get());
}

export async function listTodayHabits(): Promise<TodayHabit[]> {
  return readResponse<TodayHabit[]>(await api.habits.today.$get());
}

export type TrackingMutation = { habitId: string; date: string };
export type HistoryDay = {
  date: string;
  state:
    | "COMPLETED"
    | "MISSED"
    | "PENDING"
    | "CLEAN"
    | "RELAPSE"
    | "NOT_APPLICABLE";
  editable: boolean;
};
export type HistoryHabit = Pick<Habit, "id" | "name" | "type" | "startDate"> & {
  streak: number;
  successfulDays: number;
  weekly:
    | {
        type: "BUILD";
        completed: number;
        missed: number;
        pending: number;
        completionRate: number | null;
      }
    | { type: "BREAK"; clean: number; relapse: number };
  days: HistoryDay[];
};
export type HabitHistory = {
  month: string;
  today: string;
  habits: HistoryHabit[];
};

export async function getHabitHistory(input: {
  month: string;
  habitId?: string;
}): Promise<HabitHistory> {
  return readResponse<HabitHistory>(
    await api.habits.history.$get({ query: input })
  );
}

export async function markCompletion(input: TrackingMutation): Promise<void> {
  const response = await api.habits[":habitId"].completions[":date"].$put({
    param: input,
  });
  if (!response.ok) await readResponse(response);
}

export async function undoCompletion(input: TrackingMutation): Promise<void> {
  const response = await api.habits[":habitId"].completions[":date"].$delete({
    param: input,
  });
  if (!response.ok) await readResponse(response);
}

export async function recordRelapse(input: TrackingMutation): Promise<void> {
  const response = await api.habits[":habitId"].relapses[":date"].$put({
    param: input,
  });
  if (!response.ok) await readResponse(response);
}

export async function undoRelapse(input: TrackingMutation): Promise<void> {
  const response = await api.habits[":habitId"].relapses[":date"].$delete({
    param: input,
  });
  if (!response.ok) await readResponse(response);
}

export async function getHabit(habitId: string): Promise<Habit> {
  return readResponse<Habit>(
    await api.habits[":habitId"].$get({ param: { habitId } })
  );
}

export async function createHabit(input: CreateHabitInput): Promise<Habit> {
  return readResponse<Habit>(await api.habits.$post({ json: input }));
}

export async function updateHabit({
  habitId,
  input,
}: {
  habitId: string;
  input: UpdateHabitInput;
}): Promise<Habit> {
  return readResponse<Habit>(
    await api.habits[":habitId"].$patch({ param: { habitId }, json: input })
  );
}

export async function deleteHabit(habitId: string): Promise<void> {
  const response = await api.habits[":habitId"].$delete({ param: { habitId } });
  if (!response.ok) await readResponse(response);
}
