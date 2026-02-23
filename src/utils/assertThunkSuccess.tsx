import { AsyncThunkResult } from "@/features/Calendars/types/AsyncThunkResult";

export function assertThunkSuccess(result: unknown): void {
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
    typed.unwrap();
  }
}

export async function unwrapOrAssert(result: unknown): Promise<void> {
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
