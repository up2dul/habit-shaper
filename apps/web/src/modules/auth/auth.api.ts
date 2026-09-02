import { api, readResponse } from "@/lib/api";

export type AuthUser = { id: string; name: string; email: string };
export type LoginInput = { email: string; password: string };
export type RegisterInput = LoginInput & { name: string };

export async function getCurrentUser(): Promise<AuthUser | null> {
  const response: Response = await api.auth.me.$get();
  if (response.status === 401) return null;
  return readResponse<AuthUser>(response);
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  return readResponse<AuthUser>(await api.auth.register.$post({ json: input }));
}

export async function login(input: LoginInput): Promise<AuthUser> {
  return readResponse<AuthUser>(await api.auth.login.$post({ json: input }));
}

export async function logout(): Promise<void> {
  const response = await api.auth.logout.$post();
  if (!response.ok) await readResponse(response);
}
