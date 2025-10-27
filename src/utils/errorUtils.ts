export function formatReduxError(error: unknown): string {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    const err = error as any;
    if (err?.message) return err.message;
  }
  return "Unexpected error occurred";
}
