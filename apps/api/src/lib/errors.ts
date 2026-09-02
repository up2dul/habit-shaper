import { HttpStatus, type HttpStatusCode } from "./http-status.js";

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_ORIGIN: "INVALID_ORIGIN",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_UNAVAILABLE: "DATABASE_UNAVAILABLE",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  EMAIL_ALREADY_REGISTERED: "EMAIL_ALREADY_REGISTERED",
  HABIT_NOT_FOUND: "HABIT_NOT_FOUND",
  GOAL_NOT_FOUND: "GOAL_NOT_FOUND",
  BREAK_HABIT_SCHEDULE_NOT_ALLOWED: "BREAK_HABIT_SCHEDULE_NOT_ALLOWED",
  BUILD_DATE_NOT_SCHEDULED: "BUILD_DATE_NOT_SCHEDULED",
  HABIT_EVENT_TYPE_MISMATCH: "HABIT_EVENT_TYPE_MISMATCH",
  HABIT_DATE_BEFORE_START: "HABIT_DATE_BEFORE_START",
  HABIT_DATE_IN_FUTURE: "HABIT_DATE_IN_FUTURE",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

type ErrorDefinition = {
  status: HttpStatusCode;
  message: string;
};

const ERROR_DEFINITIONS = {
  [ERROR_CODES.VALIDATION_ERROR]: {
    status: HttpStatus.BAD_REQUEST,
    message: "Invalid request",
  },
  [ERROR_CODES.UNAUTHORIZED]: {
    status: HttpStatus.UNAUTHORIZED,
    message: "Authentication required",
  },
  [ERROR_CODES.INVALID_ORIGIN]: {
    status: HttpStatus.FORBIDDEN,
    message: "Request origin is not allowed",
  },
  [ERROR_CODES.INTERNAL_ERROR]: {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: "Something went wrong",
  },
  [ERROR_CODES.DATABASE_UNAVAILABLE]: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    message: "Database is unavailable",
  },
  [ERROR_CODES.INVALID_CREDENTIALS]: {
    status: HttpStatus.UNAUTHORIZED,
    message: "Email or password is incorrect",
  },
  [ERROR_CODES.EMAIL_ALREADY_REGISTERED]: {
    status: HttpStatus.CONFLICT,
    message: "Email is already registered",
  },
  [ERROR_CODES.HABIT_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: "Habit not found",
  },
  [ERROR_CODES.GOAL_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: "Goal not found",
  },
  [ERROR_CODES.BREAK_HABIT_SCHEDULE_NOT_ALLOWED]: {
    status: HttpStatus.BAD_REQUEST,
    message: "Break habits cannot have a weekday schedule",
  },
  [ERROR_CODES.BUILD_DATE_NOT_SCHEDULED]: {
    status: HttpStatus.BAD_REQUEST,
    message: "The build habit is not scheduled on this date",
  },
  [ERROR_CODES.HABIT_EVENT_TYPE_MISMATCH]: {
    status: HttpStatus.BAD_REQUEST,
    message: "This action is only valid for this habit type",
  },
  [ERROR_CODES.HABIT_DATE_BEFORE_START]: {
    status: HttpStatus.BAD_REQUEST,
    message: "History cannot be changed before the habit starts",
  },
  [ERROR_CODES.HABIT_DATE_IN_FUTURE]: {
    status: HttpStatus.BAD_REQUEST,
    message: "Future history cannot be changed",
  },
} as const satisfies Record<ErrorCode, ErrorDefinition>;

export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message?: string
  ) {
    super(message ?? ERROR_DEFINITIONS[code].message);
    this.name = "AppError";
  }

  get status(): HttpStatusCode {
    return ERROR_DEFINITIONS[this.code].status;
  }
}
