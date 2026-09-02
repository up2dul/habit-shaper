import { WarningCircleIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ApiError } from "@/lib/api";

import type { Habit, HabitType, Weekday } from "./habits.api";
import { habitMutations } from "./habits.options";

const weekdays = [
  [1, "Mon"],
  [2, "Tue"],
  [3, "Wed"],
  [4, "Thu"],
  [5, "Fri"],
  [6, "Sat"],
  [0, "Sun"],
] as const;

export function HabitForm({ habit }: { habit?: Habit }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string>();
  const createMutation = useMutation(habitMutations.create(queryClient));
  const updateMutation = useMutation(habitMutations.update(queryClient));
  const form = useForm({
    defaultValues: {
      name: habit?.name ?? "",
      description: habit?.description ?? "",
      type: habit?.type ?? ("BUILD" as HabitType),
      startDate: habit?.startDate ?? localToday(),
      scheduleDays: habit?.scheduleDays ?? weekdays.map(([day]) => day),
    },
    onSubmit: async ({ value }) => {
      setSubmitError(undefined);
      try {
        const common = {
          name: value.name,
          description: value.description.trim() || null,
          startDate: value.startDate,
        };
        const saved = habit
          ? await updateMutation.mutateAsync({
              habitId: habit.id,
              input: {
                ...common,
                ...(habit.type === "BUILD"
                  ? { scheduleDays: value.scheduleDays }
                  : {}),
              },
            })
          : await createMutation.mutateAsync(
              value.type === "BUILD"
                ? { ...common, type: "BUILD", scheduleDays: value.scheduleDays }
                : { ...common, type: "BREAK" }
            );
        await navigate({
          to: "/habits/$habitId",
          params: { habitId: saved.id },
        });
      } catch (error) {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : "We couldn't save this habit. Try again."
        );
      }
    },
  });

  return (
    <form
      id="habit-form"
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
            <AlertTitle>Couldn&apos;t save habit</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}
        <form.Field
          name="name"
          validators={{
            onBlur: ({ value }) =>
              value.trim() ? undefined : "Enter a habit name",
          }}
        >
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
              />
              <FieldError
                errors={field.state.meta.errors.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="description">
          {(field) => (
            <Field>
              <FieldLabel htmlFor={field.name}>
                Description (optional)
              </FieldLabel>
              <Textarea
                id={field.name}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                maxLength={2000}
              />
            </Field>
          )}
        </form.Field>
        <form.Field name="type">
          {(field) => (
            <FieldSet disabled={Boolean(habit)}>
              <FieldLegend variant="label">Type</FieldLegend>
              {habit ? (
                <>
                  <Input
                    value={habit.type === "BUILD" ? "Build" : "Break"}
                    disabled
                  />
                  <FieldDescription>
                    Habit type cannot be changed after creation.
                  </FieldDescription>
                </>
              ) : (
                <ToggleGroup
                  value={[field.state.value]}
                  onValueChange={(value) => {
                    const type = value[0] as HabitType | undefined;
                    if (type) field.handleChange(type);
                  }}
                  variant="outline"
                >
                  <ToggleGroupItem value="BUILD">Build</ToggleGroupItem>
                  <ToggleGroupItem value="BREAK">Break</ToggleGroupItem>
                </ToggleGroup>
              )}
            </FieldSet>
          )}
        </form.Field>
        <form.Field
          name="startDate"
          validators={{
            onBlur: ({ value }) => (value ? undefined : "Choose a start date"),
          }}
        >
          {(field) => (
            <Field
              data-invalid={
                field.state.meta.isTouched && !field.state.meta.isValid
              }
            >
              <FieldLabel htmlFor={field.name}>Start date</FieldLabel>
              <Input
                id={field.name}
                type="date"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                aria-invalid={
                  field.state.meta.isTouched && !field.state.meta.isValid
                }
              />
              <FieldError
                errors={field.state.meta.errors.map((message) => ({ message }))}
              />
            </Field>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => state.values.type}>
          {(type) =>
            type === "BUILD" && (
              <form.Field
                name="scheduleDays"
                validators={{
                  onChange: ({ value }) =>
                    value.length ? undefined : "Choose at least one day",
                  onSubmit: ({ value }) =>
                    value.length ? undefined : "Choose at least one day",
                }}
              >
                {(field) => (
                  <FieldSet>
                    <FieldLegend variant="label">Active days</FieldLegend>
                    <FieldDescription>
                      Schedule changes apply from today forward.
                    </FieldDescription>
                    <ToggleGroup
                      multiple
                      value={field.state.value.map(String)}
                      onValueChange={(value) =>
                        field.handleChange(value.map(Number) as Weekday[])
                      }
                      variant="outline"
                      className="flex-wrap"
                      aria-invalid={
                        field.state.meta.isTouched && !field.state.meta.isValid
                      }
                    >
                      {weekdays.map(([day, label]) => (
                        <ToggleGroupItem key={day} value={String(day)}>
                          {label}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <FieldError
                      errors={field.state.meta.errors.map((message) => ({
                        message,
                      }))}
                    />
                  </FieldSet>
                )}
              </form.Field>
            )
          }
        </form.Subscribe>
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
        >
          {([canSubmit, isSubmitting]) => (
            <Button
              type="submit"
              size="lg"
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting && <Spinner data-icon="inline-start" />}
              {habit ? "Save changes" : "Create habit"}
            </Button>
          )}
        </form.Subscribe>
      </FieldGroup>
    </form>
  );
}

function localToday() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
