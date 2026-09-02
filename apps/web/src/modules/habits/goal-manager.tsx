import {
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  TargetIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";

import type { Goal } from "./goals.api";
import { goalMutations, goalQueries } from "./goals.options";

export function GoalManager({ habitId }: { habitId: string }) {
  const { data: goals } = useSuspenseQuery(goalQueries.list(habitId));
  const [adding, setAdding] = useState(false);
  return (
    <section className="flex flex-col gap-3" aria-labelledby="goals-title">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="goals-title" className="text-lg font-medium">
            Goals
          </h2>
          <p className="text-muted-foreground text-sm">
            Set successful-day targets for this habit.
          </p>
        </div>
        {!adding && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <PlusIcon data-icon="inline-start" />
            Add goal
          </Button>
        )}
      </div>
      {adding && (
        <GoalForm habitId={habitId} onCancel={() => setAdding(false)} />
      )}
      {goals.length === 0 && !adding ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TargetIcon />
            </EmptyMedia>
            <EmptyTitle>No goals yet</EmptyTitle>
            <EmptyDescription>
              Add a successful-day target when you are ready.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        goals.map((goal) => <GoalCard key={goal.id} goal={goal} />)
      )}
    </section>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const remove = useMutation(goalMutations.delete(queryClient));
  const percentage = Math.min(
    100,
    Math.round((goal.successfulDays / goal.targetSuccessfulDays) * 100)
  );
  if (editing) {
    return <GoalForm goal={goal} onCancel={() => setEditing(false)} />;
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {goal.targetSuccessfulDays} successful day
          {goal.targetSuccessfulDays === 1 ? "" : "s"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Progress value={percentage} max={100}>
          <ProgressLabel>Progress</ProgressLabel>
          <ProgressValue>
            {() =>
              `${goal.successfulDays.toString()} / ${goal.targetSuccessfulDays.toString()}`
            }
          </ProgressValue>
        </Progress>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <PencilSimpleIcon data-icon="inline-start" />
          Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" size="sm" />}
          >
            <TrashIcon data-icon="inline-start" />
            Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes the target without deleting the habit or its
                history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={remove.isPending}
                onClick={async () => {
                  try {
                    await remove.mutateAsync({
                      habitId: goal.habitId,
                      goalId: goal.id,
                    });
                    toast.add({ title: "Goal deleted", type: "success" });
                  } catch (error) {
                    toast.add({
                      title: "Couldn’t delete goal",
                      description:
                        error instanceof Error ? error.message : "Try again.",
                      type: "error",
                    });
                  }
                }}
              >
                {remove.isPending && <Spinner data-icon="inline-start" />}
                Delete goal
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

function GoalForm({
  habitId,
  goal,
  onCancel,
}: {
  habitId?: string;
  goal?: Goal;
  onCancel: () => void;
}) {
  const queryClient = useQueryClient();
  const create = useMutation(goalMutations.create(queryClient));
  const update = useMutation(goalMutations.update(queryClient));
  const [submitError, setSubmitError] = useState<string>();
  const form = useForm({
    defaultValues: {
      targetSuccessfulDays: goal?.targetSuccessfulDays.toString() ?? "",
    },
    onSubmit: async ({ value }) => {
      setSubmitError(undefined);
      const targetSuccessfulDays = Number(value.targetSuccessfulDays);
      try {
        if (goal) {
          await update.mutateAsync({
            habitId: goal.habitId,
            goalId: goal.id,
            targetSuccessfulDays,
          });
        } else {
          await create.mutateAsync({
            habitId: habitId!,
            targetSuccessfulDays,
          });
        }
        toast.add({
          title: goal ? "Goal updated" : "Goal added",
          description: `${targetSuccessfulDays} successful days`,
          type: "success",
        });
        onCancel();
      } catch (error) {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : "We couldn't save this goal. Try again."
        );
      }
    },
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{goal ? "Edit goal" : "New goal"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id={`goal-form-${goal?.id ?? "new"}`}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <FieldGroup>
            {submitError && (
              <Alert variant="destructive">
                <WarningCircleIcon />
                <AlertTitle>Couldn&apos;t save goal</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
            <form.Field
              name="targetSuccessfulDays"
              validators={{
                onChange: ({ value }) => validateTarget(value),
                onSubmit: ({ value }) => validateTarget(value),
              }}
            >
              {(field) => (
                <Field
                  data-invalid={
                    field.state.meta.isTouched && !field.state.meta.isValid
                  }
                >
                  <FieldLabel htmlFor={field.name}>
                    Target successful days
                  </FieldLabel>
                  <Input
                    id={field.name}
                    type="number"
                    min={1}
                    step={1}
                    inputMode="numeric"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(event) => field.handleChange(event.target.value)}
                    aria-invalid={
                      field.state.meta.isTouched && !field.state.meta.isValid
                    }
                  />
                  <FieldError
                    errors={field.state.meta.errors.map((message) => ({
                      message,
                    }))}
                  />
                </Field>
              )}
            </form.Field>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          <XIcon data-icon="inline-start" />
          Cancel
        </Button>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              form={`goal-form-${goal?.id ?? "new"}`}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <CheckIcon data-icon="inline-start" />
              )}
              Save goal
            </Button>
          )}
        </form.Subscribe>
      </CardFooter>
    </Card>
  );
}

function validateTarget(value: string): string | undefined {
  const target = Number(value);
  return Number.isInteger(target) && target > 0
    ? undefined
    : "Enter a whole number greater than zero";
}
