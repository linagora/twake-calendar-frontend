import { AsyncThunkResult } from "@/features/Calendars/types/AsyncThunkResult";

export async function assertThunkSuccess(result: unknown): Promise<void> {
  const typed = result as AsyncThunkResult;
  if (typed?.type?.endsWith("/rejected")) {
    throw new Error(
      typed.error?.message || typed.payload?.message || "API call failed"
    );
  }
  if (typeof typed.unwrap === "function") {
    await typed.unwrap();
  }
}
