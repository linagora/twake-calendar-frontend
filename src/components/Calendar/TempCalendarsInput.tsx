import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { removeTempCal } from "@/features/Calendars/CalendarSlice";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { getTempCalendarsListAsync } from "@/features/Calendars/services";
import { setView } from "@/features/Settings/SettingsSlice";
import { defaultColors } from "@/utils/defaultColors";
import { TextField } from "@linagora/twake-mui";
import { useRef } from "react";
import { useI18n } from "twake-i18n";
import { PeopleSearch, User } from "../Attendees/PeopleSearch";

const requestControllers = new Map<string, AbortController>();

export function TempCalendarsInput({
  tempUsers,
  setTempUsers,
  handleToggleEventPreview,
}: {
  tempUsers: User[];
  setTempUsers: (users: User[]) => void;
  handleToggleEventPreview: () => void;
}) {
  const dispatch = useAppDispatch();
  const tempcalendars =
    useAppSelector((state) => state.calendars.templist) ?? {};
  const { t } = useI18n();

  const prevUsersRef = useRef<User[]>([]);
  const userColorsRef = useRef(
    new Map<string, { light: string; dark: string }>()
  );

  const handleUserChange = async (_: React.SyntheticEvent, users: User[]) => {
    setTempUsers(users);

    const prevUsers = prevUsersRef.current;

    const addedUsers = users.filter(
      (u) => !prevUsers.some((p) => p.email === u.email)
    );
    const removedUsers = prevUsers.filter(
      (p) => !users.some((u) => u.email === p.email)
    );

    prevUsersRef.current = users;

    if (addedUsers.length > 0) {
      dispatch(setView("calendar"));
      for (const user of addedUsers) {
        const controller = new AbortController();
        requestControllers.set(user.email, controller);

        if (!userColorsRef.current.has(user.email)) {
          const usedLights = Array.from(userColorsRef.current.values()).map(
            (c) => c.light
          );
          const colorPair = generateDistinctColor(usedLights);
          userColorsRef.current.set(user.email, colorPair);
        }

        user.color = userColorsRef.current.get(user.email)!;
        dispatch(
          getTempCalendarsListAsync(user, { signal: controller.signal })
        );
      }
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
      objectTypes={["user", "resource"]}
      selectedUsers={tempUsers}
      onChange={handleUserChange}
      onToggleEventPreview={handleToggleEventPreview}
      placeholder={t("peopleSearch.availabilityPlaceholder")}
      inputSlot={(params) => (
        <TextField
          {...params}
          size="small"
          sx={
            tempUsers.length > 0
              ? {
                  "& .MuiOutlinedInput-root": {
                    flexDirection: "column",
                    alignItems: "start",
                    "& .MuiInputBase-input": {
                      width: "100%",
                    },
                  },
                }
              : undefined
          }
        />
      )}
    />
  );
}

function buildEmailToCalendarMap(calRecord: Record<string, Calendar>) {
  const map = new Map<string, string[]>();
  for (const [id, cal] of Object.entries(calRecord)) {
    cal.owner?.emails?.forEach((email) => {
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

function shiftLightness(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  const toHex = (v: number) =>
    clamp(v + amount)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function generateDistinctColor(usedLights: string[]): {
  light: string;
  dark: string;
} {
  for (const color of defaultColors) {
    if (!usedLights.includes(color.light)) return color;
  }

  const cycle = usedLights.length % defaultColors.length;
  const round = Math.floor(usedLights.length / defaultColors.length);
  const base = defaultColors[cycle];

  return {
    light: shiftLightness(base.light, round * 12),
    dark: shiftLightness(base.dark, -(round * 10)),
  };
}
