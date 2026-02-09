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
