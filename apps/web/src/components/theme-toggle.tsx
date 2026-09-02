import { MoonIcon, SunIcon } from "@phosphor-icons/react";

import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = `Switch to ${isDark ? "light" : "dark"} theme`;
  const iconClasses =
    "absolute transition-[opacity,scale,filter] duration-150 ease-[cubic-bezier(0.2,0,0,1)]";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("relative", className)}
      aria-label={label}
      aria-pressed={isDark}
      title={`${label} (D)`}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <SunIcon
        aria-hidden="true"
        className={cn(
          iconClasses,
          isDark
            ? "scale-25 opacity-0 blur-[4px]"
            : "blur-0 scale-100 opacity-100"
        )}
      />
      <MoonIcon
        aria-hidden="true"
        className={cn(
          iconClasses,
          isDark
            ? "blur-0 scale-100 opacity-100"
            : "scale-25 opacity-0 blur-[4px]"
        )}
      />
    </Button>
  );
}
