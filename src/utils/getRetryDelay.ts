export type RetryBackoffConfig = {
  initialDelay: number;
  maxDelay: number;
};

export function getRetryDelay(
  attempt: number,
  { initialDelay, maxDelay }: RetryBackoffConfig
) {
  const base = initialDelay * Math.pow(2, attempt);
  const jitter = 0.5 + Math.random();
  return Math.min(maxDelay, base * jitter);
}
