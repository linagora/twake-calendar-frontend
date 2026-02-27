import { AccessRight } from "@/features/Calendars/CalendarTypes";

// Maps our AccessRight numeric value to the DAV share property key
export function accessRightToDavProp(
  right: AccessRight
): "dav:administration" | "dav:read-write" | "dav:read" {
  switch (right) {
    case 5:
      return "dav:administration";
    case 3:
      return "dav:read-write";
    case 2:
    default:
      return "dav:read";
  }
}
