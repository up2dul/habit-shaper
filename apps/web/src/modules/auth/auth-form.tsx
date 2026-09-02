import { WarningCircleIcon } from "@phosphor-icons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";
import { ApiError } from "@/lib/api";

import { authMutations } from "./auth.options";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [submitError, setSubmitError] = useState<string>();
  const isRegister = mode === "register";
  const loginMutation = useMutation(authMutations.login(queryClient));
  const registerMutation = useMutation(authMutations.register(queryClient));
  const form = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setSubmitError(undefined);
      try {
        if (isRegister) {
          await registerMutation.mutateAsync({
            name: value.name,
            email: value.email,
            password: value.password,
          });
        } else {
          await loginMutation.mutateAsync({
            email: value.email,
            password: value.password,
          });
        }
        toast.add({
          title: isRegister ? "Account created" : "Welcome back",
          description: "Your habits are ready.",
          type: "success",
        });
        await navigate({ to: "/" });
      } catch (error) {
        setSubmitError(
          error instanceof ApiError
            ? error.message
            : "We couldn't complete that request. Try again."
        );
      }
    },
  });

  return (
    <main
      id="main-content"
      className="flex min-h-svh items-center justify-center p-4"
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            {isRegister ? "Start shaping your days" : "Welcome back"}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? "Create your account to begin a gentler routine."
              : "Sign in to keep your momentum going."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id={`${mode}-form`}
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
                  <AlertTitle>Couldn&apos;t continue</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}
              {isRegister && (
                <form.Field
                  name="name"
                  validators={{
                    onBlur: ({ value }) =>
                      value.trim() ? undefined : "Enter your name",
                  }}
                >
                  {(field) => (
                    <TextField field={field} label="Name" autoComplete="name" />
                  )}
                </form.Field>
              )}
              <form.Field
                name="email"
                validators={{
                  onBlur: ({ value }) =>
                    /^\S+@\S+\.\S+$/.test(value)
                      ? undefined
                      : "Enter a valid email address",
                }}
              >
                {(field) => (
                  <TextField
                    field={field}
                    label="Email"
                    type="email"
                    autoComplete="email"
                  />
                )}
              </form.Field>
              <form.Field
                name="password"
                validators={{
                  onBlur: ({ value }) =>
                    value.length >= 8 ? undefined : "Use at least 8 characters",
                }}
              >
                {(field) => (
                  <TextField
                    field={field}
                    label="Password"
                    type="password"
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                  />
                )}
              </form.Field>
              {isRegister && (
                <form.Field
                  name="confirmPassword"
                  validators={{
                    onChangeListenTo: ["password"],
                    onChange: ({ value, fieldApi }) => {
                      if (!value) return "Confirm your password";
                      return value === fieldApi.form.getFieldValue("password")
                        ? undefined
                        : "Passwords do not match";
                    },
                    onSubmit: ({ value, fieldApi }) => {
                      if (!value) return "Confirm your password";
                      return value === fieldApi.form.getFieldValue("password")
                        ? undefined
                        : "Passwords do not match";
                    },
                  }}
                >
                  {(field) => (
                    <TextField
                      field={field}
                      label="Confirm password"
                      type="password"
                      autoComplete="new-password"
                    />
                  )}
                </form.Field>
              )}
            </FieldGroup>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-2">
          <form.Subscribe
            selector={(state) => [state.canSubmit, state.isSubmitting]}
          >
            {([canSubmit, isSubmitting]) => (
              <Button
                type="submit"
                form={`${mode}-form`}
                size="lg"
                disabled={!canSubmit || isSubmitting}
              >
                {isSubmitting && <Spinner data-icon="inline-start" />}
                {isRegister ? "Create account" : "Sign in"}
              </Button>
            )}
          </form.Subscribe>
          <Button
            variant="link"
            render={<Link to={isRegister ? "/login" : "/register"} />}
          >
            {isRegister
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}

type TextFieldApi = {
  name: string;
  state: {
    value: string;
    meta: {
      isTouched: boolean;
      isValid: boolean;
      errors: Array<string | undefined>;
    };
  };
  handleBlur: () => void;
  handleChange: (value: string) => void;
};

function TextField({
  field,
  label,
  type = "text",
  autoComplete,
}: {
  field: TextFieldApi;
  label: string;
  type?: string;
  autoComplete: string;
}) {
  const invalid = field.state.meta.isTouched && !field.state.meta.isValid;
  return (
    <Field data-invalid={invalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        autoComplete={autoComplete}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={invalid}
      />
      <FieldError
        errors={field.state.meta.errors.map((message) => ({ message }))}
      />
    </Field>
  );
}
