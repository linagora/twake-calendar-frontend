export function extractEventBaseUuid(eventKey: string) {
  if (!eventKey) return "";
  return eventKey.split("/")[0];
}
