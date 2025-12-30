import { useTheme } from "@linagora/twake-mui";
import { useRef } from "react";
import { useI18n } from "twake-i18n";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
  getTempCalendarsListAsync,
  removeTempCal,
} from "../../features/Calendars/CalendarSlice";
import { Calendar } from "../../features/Calendars/CalendarTypes";
import { setView } from "../../features/Settings/SettingsSlice";
import { TextField } from "@linagora/twake-mui";
import { User, PeopleSearch } from "../Attendees/PeopleSearch";
import { getAccessiblePair } from "./utils/calendarColorsUtils";

const requestControllers = new Map<string, AbortController>();

export function TempCalendarsInput({
  tempUsers,
  setTempUsers,
  handleToggleEventPreview,
  selectedCalendars,
  setSelectedCalendars,
}: {
  tempUsers: User[];
  setTempUsers: (users: User[]) => void;
  handleToggleEventPreview: () => void;
  selectedCalendars: string[];
  setSelectedCalendars: Function;
}) {
  const dispatch = useAppDispatch();
  const tempcalendars =
    useAppSelector((state) => state.calendars.templist) ?? {};
  const calendars = useAppSelector((state) => state.calendars.list);
  const theme = useTheme();
  const { t } = useI18n();

  const prevUsersRef = useRef<User[]>([]);
  const userColorsRef = useRef(new Map<string, string>());

  const handleUserChange = async (_: any, users: User[]) => {
    setTempUsers(users);

    const prevUsers = prevUsersRef.current;

    const addedUsers = users.filter(
      (u) => !prevUsers.some((p) => p.email === u.email)
    );
    const removedUsers = prevUsers.filter(
      (p) => !users.some((u) => u.email === p.email)
    );

    prevUsersRef.current = users;

    const { calendarsToImport, calendarsToToggle } = getCalendarsFromUsersDelta(
      addedUsers,
      buildEmailToCalendarMap(calendars),
      selectedCalendars
    );

    if (calendarsToImport.length > 0) {
      for (const user of calendarsToImport) {
        const controller = new AbortController();
        requestControllers.set(user.email, controller);

        if (!userColorsRef.current.has(user.email)) {
          const existingColors = Array.from(userColorsRef.current.values());
          const lightColor = generateDistinctColor(existingColors);
          userColorsRef.current.set(user.email, lightColor);
        }
        const lightColor = userColorsRef.current.get(user.email)!;

        user.color = {
          light: lightColor,
          dark: getAccessiblePair(lightColor, theme),
        };
        dispatch(setView("calendar"));
        dispatch(
          getTempCalendarsListAsync(user, { signal: controller.signal })
        );
      }
    }

    if (calendarsToToggle.length > 0) {
      setSelectedCalendars((prev: string[]) => [
        ...new Set([...prev, ...calendarsToToggle]),
      ]);
    }

    for (const user of removedUsers) {
      const controller = requestControllers.get(user.email);
      if (controller) {
        controller.abort();
        requestControllers.delete(user.email);
      }

      const calIds = buildEmailToCalendarMap(tempcalendars).get(user.email);
      calIds?.forEach((id) => dispatch(removeTempCal(id)));
      userColorsRef.current.delete(user.email);
    }
  };

  return (
    <PeopleSearch
      objectTypes={["user"]}
      selectedUsers={tempUsers}
      onChange={handleUserChange}
      onToggleEventPreview={handleToggleEventPreview}
      placeholder={t("peopleSearch.availabilityPlaceholder")}
      inputSlot={(params) => <TextField {...params} size="small" />}
    />
  );
}

function getCalendarsFromUsersDelta(
  addedUsers: User[],
  emailToCalendarId: Map<string, string[]>,
  selectedCalendars: string[]
) {
  const selectedSet = new Set(selectedCalendars);

  const calendarsToImport: User[] = [];
  const calendarsToToggle: string[] = [];

  for (const user of addedUsers) {
    const calIds = emailToCalendarId.get(user.email) ?? [];

    if (!calIds || calIds.every((calId) => !selectedSet.has(calId))) {
      calendarsToImport.push(user);
    } else {
      // calIds.forEach((calId) => calendarsToToggle.push(calId));
    }
  }

  return { calendarsToImport, calendarsToToggle };
}

function buildEmailToCalendarMap(calRecord: Record<string, Calendar>) {
  const map = new Map<string, string[]>();
  for (const [id, cal] of Object.entries(calRecord)) {
    cal.ownerEmails?.forEach((email) => {
      const existing = map.get(email);
      if (existing) {
        existing.push(id);
      } else {
        map.set(email, [id]);
      }
    });
  }
  return map;
}

function extractHSL(hslColor: string): { h: number; s: number; l: number } {
  const match = hslColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return { h: 0, s: 70, l: 50 };
  return {
    h: parseInt(match[1], 10),
    s: parseInt(match[2], 10),
    l: parseInt(match[3], 10),
  };
}

function getHueDistance(hue1: number, hue2: number): number {
  const diff = Math.abs(hue1 - hue2);
  return Math.min(diff, 360 - diff);
}

function getColorDistance(color1: string, color2: string): number {
  const hsl1 = extractHSL(color1);
  const hsl2 = extractHSL(color2);

  const hueDist = getHueDistance(hsl1.h, hsl2.h) / 180;
  const satDist = Math.abs(hsl1.s - hsl2.s) / 100;
  const lightDist = Math.abs(hsl1.l - hsl2.l) / 100;

  // Weighted distance: hue is most important, then saturation, then lightness
  return Math.sqrt(
    hueDist * hueDist * 4 + satDist * satDist * 1 + lightDist * lightDist * 1
  );
}

function generateDistinctColor(
  existingColors: string[],
  minDistance: number = 0.35,
  maxAttempts: number = 150
): string {
  // Predefined palette with good variety
  const palette = [
    { h: 0, s: 75, l: 50 }, // Red
    { h: 30, s: 80, l: 50 }, // Orange
    { h: 50, s: 85, l: 50 }, // Yellow-orange
    { h: 120, s: 70, l: 45 }, // Green
    { h: 180, s: 70, l: 45 }, // Cyan
    { h: 210, s: 75, l: 50 }, // Blue
    { h: 270, s: 70, l: 50 }, // Purple
    { h: 320, s: 75, l: 50 }, // Magenta
    { h: 90, s: 65, l: 55 }, // Lime
    { h: 200, s: 80, l: 45 }, // Deep blue
    { h: 290, s: 65, l: 55 }, // Light purple
    { h: 340, s: 75, l: 50 }, // Pink-red
  ];

  // Try palette colors first
  for (const color of palette) {
    const colorStr = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    if (existingColors.length === 0) {
      return colorStr;
    }

    const minDist = Math.min(
      ...existingColors.map((c) => getColorDistance(colorStr, c))
    );

    if (minDist >= minDistance) {
      return colorStr;
    }
  }

  // If palette exhausted, generate random colors
  let bestColor = `hsl(0, 70%, 50%)`;
  let bestMinDistance = 0;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const h = Math.floor(Math.random() * 360);
    const s = 65 + Math.floor(Math.random() * 20); // 65-85%
    const l = 45 + Math.floor(Math.random() * 15); // 45-60%
    const candidateColor = `hsl(${h}, ${s}%, ${l}%)`;

    const minDist = Math.min(
      ...existingColors.map((c) => getColorDistance(candidateColor, c))
    );

    if (minDist >= minDistance) {
      return candidateColor;
    }

    if (minDist > bestMinDistance) {
      bestMinDistance = minDist;
      bestColor = candidateColor;
    }
  }

  return bestColor;
}
