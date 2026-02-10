import { RejectedError } from "@/features/Calendars/types/RejectedError";

export function formatReduxError(error: unknown): string {
  if (!error) return "Unknown error";

  if (typeof error === "string") return error;

  if (typeof error === "object" && error !== null) {
    if (
      "message" in error &&
      typeof (error as { message: unknown }).message === "string"
    ) {
      return (error as { message: string }).message;
    }
  }

  return "Unexpected error occurred";
}

export function toRejectedError(err: unknown): RejectedError {
  const status =
    typeof err === "object" && err !== null && "response" in err
      ? (err as { response?: { status?: number } }).response?.status
      : undefined;
  return { message: formatReduxError(err), status };
}
