export function extractEventBaseUuid(eventKey: string) {
  return eventKey.split("/")[0];
}
