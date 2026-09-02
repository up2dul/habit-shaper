export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status: 400 | 401 | 409
  ) {
    super(message);
    this.name = "AppError";
  }
}
