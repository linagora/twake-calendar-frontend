import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { getCalendars } from "@/features/Calendars/CalendarApi";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { addSharedCalendarAsync } from "@/features/Calendars/services";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from "@linagora/twake-mui";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import { useI18n } from "twake-i18n";
import { PeopleSearch, User } from "../Attendees/PeopleSearch";
import { ResponsiveDialog } from "../Dialog";
import { stringAvatar } from "../Event/utils/eventUtils";
import { ColorPicker } from "./CalendarColorPicker";
import { defaultColors, getAccessiblePair } from "./utils/calendarColorsUtils";

interface CalendarWithOwner {
  cal: Record<string, unknown>;
  owner: User;
}

function CalendarItem({
  cal,
  onRemove,
  onColorChange,
}: {
  cal: CalendarWithOwner;
  onRemove: () => void;
  onColorChange: (color: Record<string, string>) => void;
}) {
  const theme = useTheme();

  return (
    <Box
      key={cal.owner.email + cal.cal["dav:name"]}
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      style={{
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        padding: 8,
        marginBottom: 8,
      }}
    >
      <Box display="flex" alignItems="center" gap={2} mb={1}>
        <Avatar
          {...stringAvatar(cal.owner.displayName || cal.owner.email)}
          style={{
            border: `2px solid ${cal.cal["apple:color"] || defaultColors[0].light}`,
            boxShadow: cal.cal["apple:color"]
              ? `0 0 0 2px ${cal.cal["apple:color"]}`
              : `0 0 0 2px ${defaultColors[0].light}`,
          }}
        />
        <Box>
          <Typography variant="body1">
            {cal.cal["dav:name"] === "#default"
              ? cal.owner.displayName + "'s calendar"
              : cal.cal["dav:name"]}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {cal.owner.email}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={1}>
        <ColorPicker
          selectedColor={{
            light: cal.cal["apple:color"] ?? defaultColors[0].light,
            dark: cal.cal["apple:color"]
              ? getAccessiblePair(cal.cal["apple:color"], theme)
              : defaultColors[0].dark,
          }}
          onChange={onColorChange}
        />
        <IconButton size="small" onClick={onRemove}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}

function SelectedCalendarsList({
  calendars,
  selectedCal,
  onRemove,
  onColorChange,
}: {
  calendars: Record<string, Calendar>;
  selectedCal: CalendarWithOwner[];
  onRemove: (cal: CalendarWithOwner) => void;
  onColorChange: (
    cal: CalendarWithOwner,
    color: Record<string, string>
  ) => void;
}) {
  const { t } = useI18n();
  if (selectedCal.length === 0) return null;

  const groupedByOwner = selectedCal.reduce<
    Record<
      string,
      {
        owner: User;
        visibleCals: CalendarWithOwner[];
        alreadyExisting: boolean;
      }
    >
  >((acc, cal) => {
    const exists = Object.values(calendars).some(
      (existing: Calendar) =>
        existing.id ===
        cal.cal?._links?.self?.href
          .replace("/calendars/", "")
          .replace(".json", "")
    );

    if (!acc[cal.owner.email]) {
      acc[cal.owner.email] = {
        owner: cal.owner,
        visibleCals: [],
        alreadyExisting: false,
      };
    }

    if (exists) {
      acc[cal.owner.email].alreadyExisting = true;
    } else {
      acc[cal.owner.email].visibleCals.push(cal);
    }

    return acc;
  }, {});

  return (
    <Box mt={2}>
      <Typography variant="subtitle1" gutterBottom>
        {t("common.name")}
      </Typography>

      {Object.values(groupedByOwner).map(
        ({ owner, visibleCals, alreadyExisting }) => (
          <Box key={owner.email} mb={2}>
            {visibleCals.length > 0 ? (
              visibleCals.map((cal) =>
                cal.cal ? (
                  <CalendarItem
                    key={cal.owner.email + cal.cal["dav:name"]}
                    cal={cal}
                    onRemove={() => onRemove(cal)}
                    onColorChange={(color) => onColorChange(cal, color)}
                  />
                ) : (
                  <Typography
                    key={t("calendar.noPublicCalendarsFor", {
                      name: owner.displayName,
                    })}
                    color="textSecondary"
                  >
                    {t("calendar.noPublicCalendarsFor", {
                      name: owner.displayName,
                    })}
                  </Typography>
                )
              )
            ) : alreadyExisting ? (
              <Typography
                key={t("calendar.noMoreCalendarsFor", {
                  name: owner.displayName,
                })}
                color="textSecondary"
              >
                {t("calendar.noMoreCalendarsFor", { name: owner.displayName })}
              </Typography>
            ) : null}
          </Box>
        )
      )}
    </Box>
  );
}

export default function CalendarSearch({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (
    result?: string[] | Record<string, never>,
    reason?: "backdropClick" | "escapeKeyDown"
  ) => void;
}) {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const openpaasId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);

  const [selectedCal, setSelectedCalendars] = useState<CalendarWithOwner[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const handleSave = async () => {
    if (selectedCal.length > 0) {
      const idList = await Promise.all(
        selectedCal.map(async (cal) => {
          const calId = crypto.randomUUID();
          const exists = Object.values(calendars).some(
            (existing: Calendar) =>
              existing.id ===
              cal.cal?._links?.self?.href
                .replace("/calendars/", "")
                .replace(".json", "")
          );
          if (!exists && cal.cal) {
            await dispatch(
              addSharedCalendarAsync({
                userId: openpaasId,
                calId,
                cal: {
                  ...cal,
                  color: cal.cal["apple:color"]
                    ? {
                        light: cal.cal["apple:color"],
                        dark: getAccessiblePair(cal.cal["apple:color"], theme),
                      }
                    : defaultColors[0],
                },
              })
            );
            return cal.cal._links.self.href
              .replace("/calendars/", "")
              .replace(".json", "");
          }
          return null;
        })
      );

      onClose(idList.filter(Boolean));
      setSelectedCalendars([]);
      setSelectedUsers([]);
    }
  };
  const { t } = useI18n();

  return (
    <ResponsiveDialog
      open={open}
      contentSx={{ paddingTop: "8px !important" }}
      onClose={() => {
        onClose({}, "backdropClick");
        setSelectedCalendars([]);
        setSelectedUsers([]);
      }}
      title={t("calendar.browseOtherCalendars")}
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() => onClose({}, "backdropClick")}
          >
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {t("actions.add")}
          </Button>
        </>
      }
    >
      <PeopleSearch
        objectTypes={["user"]}
        selectedUsers={selectedUsers}
        inputSlot={(params) => <TextField {...params} size="small" />}
        onChange={async (_event: React.SyntheticEvent, value: User[]) => {
          setSelectedUsers(value);

          const cals = await Promise.all(
            value.map(async (user: User) => {
              if (user?.openpaasId) {
                const cals = (await getCalendars(
                  user.openpaasId,
                  "sharedPublic=true&"
                )) as Record<string, unknown>;
                return cals._embedded?.["dav:calendar"]
                  ? cals._embedded["dav:calendar"].map(
                      (cal: Record<string, unknown>) => ({ cal, owner: user })
                    )
                  : { cal: undefined, owner: user };
              }
              return null;
            })
          );
          setSelectedCalendars(cals.flat().filter(Boolean));
        }}
      />

      <SelectedCalendarsList
        calendars={calendars}
        selectedCal={selectedCal}
        onRemove={(cal) => {
          if (!cal.cal?._links?.self?.href) return;
          setSelectedCalendars((prev) =>
            prev.filter(
              (c) => c.cal?._links?.self?.href !== cal.cal._links.self.href
            )
          );
          if (
            !selectedCal.find(
              (c) =>
                cal.owner.email === c.owner.email &&
                c.cal?._links?.self?.href !== cal.cal._links.self.href
            )
          ) {
            setSelectedUsers((prev) =>
              prev.filter((u) => u.email !== cal.owner.email)
            );
          }
        }}
        onColorChange={(cal, color) =>
          setSelectedCalendars((prev) =>
            prev.map((prevcal) =>
              prevcal.owner.email === cal.owner.email &&
              prevcal.cal._links.self.href === cal.cal._links.self.href
                ? {
                    ...prevcal,
                    cal: {
                      ...prevcal.cal,
                      "apple:color": color.light,
                    },
                  }
                : prevcal
            )
          )
        }
      />
    </ResponsiveDialog>
  );
}
