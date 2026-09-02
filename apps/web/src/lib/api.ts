import { webEnv } from "@/config/env";

export async function getApiHealth(): Promise<void> {
  const response = await fetch(`${webEnv.apiUrl}/health`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("API is unavailable");
  }
}
