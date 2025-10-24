import CloseIcon from "@mui/icons-material/Close";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { getCalendars } from "../../features/Calendars/CalendarApi";
import { addSharedCalendarAsync } from "../../features/Calendars/CalendarSlice";
import { ColorPicker } from "./CalendarColorPicker";
import { Calendars } from "../../features/Calendars/CalendarTypes";
import { User, PeopleSearch } from "../Attendees/PeopleSearch";
import { getAccessiblePair } from "./utils/calendarColorsUtils";
import { useTheme } from "@mui/material/styles";
import { ResponsiveDialog } from "../Dialog";

interface CalendarWithOwner {
  cal: Record<string, any>;
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
      alignItems="center"
      justifyContent="space-between"
      style={{
        borderRadius: 8,
        border: "1px solid #e5e7eb",
        padding: 8,
        marginBottom: 8,
      }}
    >
      <Box display="flex" alignItems="center" gap={2}>
        <Avatar
          src={cal.owner.avatarUrl}
          alt={cal.owner.email}
          style={{
            border: `2px solid ${cal.cal["apple:color"] ?? "transparent"}`,
            boxShadow: cal.cal["apple:color"]
              ? `0 0 0 2px ${cal.cal["apple:color"]}`
              : "none",
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
            light: cal.cal["apple:color"],
            dark: getAccessiblePair(cal.cal["apple:color"], theme),
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
  calendars: Record<string, Calendars>;
  selectedCal: CalendarWithOwner[];
  onRemove: (cal: CalendarWithOwner) => void;
  onColorChange: (
    cal: CalendarWithOwner,
    color: Record<string, string>
  ) => void;
}) {
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
      (existing: any) =>
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
        Name
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
                  <Typography color="textSecondary">
                    No publicly available calendars for {owner.displayName}
                  </Typography>
                )
              )
            ) : alreadyExisting ? (
              <Typography color="textSecondary">
                No more Calendar for {owner.displayName}
              </Typography>
            ) : null}
          </Box>
        )
      )}
    </Box>
  );
}

export default function CalendarSearch({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: Function;
}) {
  const dispatch = useAppDispatch();
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
            (existing: any) =>
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
                  color: cal.cal["apple:color"],
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

  return (
    <ResponsiveDialog
      open={open}
      contentSx={{ paddingTop: "8px !important" }}
      onClose={() => {
        onClose({}, "backdropClick");
        setSelectedCalendars([]);
        setSelectedUsers([]);
      }}
      title="Browse other calendars"
      actions={
        <>
          <Button
            variant="outlined"
            onClick={() => onClose({}, "backdropClick")}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Add
          </Button>
        </>
      }
    >
      <PeopleSearch
        objectTypes={["user"]}
        selectedUsers={selectedUsers}
        onChange={async (event: any, value: User[]) => {
          setSelectedUsers(value);

          const cals = await Promise.all(
            value.map(async (user: User) => {
              const cals = (await getCalendars(
                user.openpaasId,
                "sharedPublic=true&withRights=true"
              )) as Record<string, any>;
              return cals._embedded?.["dav:calendar"]
                ? cals._embedded["dav:calendar"].map(
                    (cal: Record<string, any>) => ({ cal, owner: user })
                  )
                : { cal: undefined, owner: user };
            })
          );

          setSelectedCalendars(cals.flat());
        }}
      />

      <SelectedCalendarsList
        calendars={calendars}
        selectedCal={selectedCal}
        onRemove={(cal) => {
          setSelectedCalendars((prev) =>
            prev.filter(
              (c) => c.cal._links.self.href !== cal.cal._links.self.href
            )
          );
          if (
            !selectedCal.find(
              (c) =>
                cal.owner.email === c.owner.email &&
                c.cal._links.self.href !== cal.cal._links.self.href
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
                      "X-TWAKE-Dark-theme-color": color.dark,
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
