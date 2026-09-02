import { WarningCircleIcon } from "@phosphor-icons/react";
import type { ErrorComponentProps } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RoutePending() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-svh w-full max-w-xl flex-col gap-6 p-4 sm:p-6"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-col gap-2 py-2">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-48" />
      </div>
      {[0, 1, 2].map((item) => (
        <Card key={item} aria-hidden="true">
          <CardHeader>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-11 w-full" />
          </CardContent>
        </Card>
      ))}
      <span className="sr-only" role="status">
        Loading content…
      </span>
    </main>
  );
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-svh w-full max-w-xl items-center p-4 sm:p-6"
    >
      <Alert variant="destructive" className="w-full">
        <WarningCircleIcon aria-hidden="true" />
        <AlertTitle>We couldn&apos;t load this page</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-4">
          <span>{message}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={reset}>
              Try again
            </Button>
            <Button variant="link" render={<Link to="/" />}>
              Return to today
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </main>
  );
}
