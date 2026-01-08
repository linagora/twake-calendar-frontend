import pMap from "p-map";

export async function processConcurrently<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  maxConcurrency: number
): Promise<R[]> {
  const results = pMap(items, processor, { concurrency: maxConcurrency });
  return results;
}
