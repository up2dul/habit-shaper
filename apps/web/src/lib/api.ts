const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function getApiHealth(): Promise<void> {
  const response = await fetch(`${apiUrl}/health`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("API is unavailable");
  }
}
