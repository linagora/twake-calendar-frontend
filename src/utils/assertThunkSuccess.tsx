import { AsyncThunkResult } from "@/features/Calendars/types/AsyncThunkResult";

export async function assertThunkSuccess(result: unknown): Promise<void> {
  if (result === undefined || result === null) {
    return;
  }
  const typed = result as AsyncThunkResult;
  if (typed.type && typed.type.endsWith("/rejected")) {
    throw new Error(
      typed.error?.message ?? typed.payload?.message ?? "Thunk was rejected"
    );
  }
  if (typeof typed.unwrap === "function") {
    await typed.unwrap();
  }
}
