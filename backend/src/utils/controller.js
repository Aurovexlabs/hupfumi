import { AppError } from "./appError.js";
import { fail } from "./response.js";

export const handleControllerError = (res, error) => {
  if (error instanceof AppError) {
    return fail(res, error.message, error.statusCode);
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return fail(res, message, 500);
};
