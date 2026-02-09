// Type for async thunk results
export interface AsyncThunkResult {
  type: string;
  error?: { message?: string };
  payload?: { message?: string };
  unwrap?: () => Promise<unknown>;
}
