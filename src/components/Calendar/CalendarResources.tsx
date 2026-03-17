import { useAppDispatch, useAppSelector } from "@/app/hooks";
import { getCalendars } from "@/features/Calendars/CalendarApi";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { CalendarData } from "@/features/Calendars/types/CalendarData";
import { renameDefault } from "@/utils/renameDefault";
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  useTheme,
} from "@linagora/twake-mui";
import CloseIcon from "@mui/icons-material/Close";
import { useRef, useState } from "react";
import { useI18n } from "twake-i18n";
import { ResponsiveDialog } from "../Dialog";
import { ColorPicker } from "./CalendarColorPicker";
import { getAccessiblePair } from "@/utils/getAccessiblePair";
import { defaultColors } from "@/utils/defaultColors";
import { addCalendarResourceAsync } from "@/features/Calendars/api/addCalendarResourceAsync";
import { Resource, ResourceSearch } from "../Attendees/ResourceSearch";
import { ResourceIcon } from "../Attendees/ResourceIcon";

interface CalendarWithOwner {
  cal: CalendarData;
  owner: Resource;
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
  const { t } = useI18n();
  return (
    <Box
      key={cal.cal["dav:name"]}
      display="flex"
      justifyContent="space-between"
      gap={2}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <ResourceIcon displayName={cal.owner.displayName} />
        <Typography variant="body1">
          {renameDefault(cal.cal["dav:name"], cal.owner.displayName, t, false)}
        </Typography>
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
        owner: Resource;
        visibleCals: CalendarWithOwner[];
        alreadyExisting: boolean;
      }
    >
  >((acc, cal) => {
    const exists = Object.values(calendars).some(
      (existing: Calendar) =>
        existing.id ===
        cal.cal?._links?.self?.href
          ?.replace("/calendars/", "")
          .replace(".json", "")
    );

    if (!acc[cal.owner.displayName]) {
      acc[cal.owner.displayName] = {
        owner: cal.owner,
        visibleCals: [],
        alreadyExisting: false,
      };
    }

    if (exists) {
      acc[cal.owner.displayName].alreadyExisting = true;
    } else {
      acc[cal.owner.displayName].visibleCals.push(cal);
    }

    return acc;
  }, {});

  return (
    <Box mt={2}>
      <Typography variant="h6" sx={{ margin: 0 }}>
        {t("common.resource")}
      </Typography>

      {Object.values(groupedByOwner).map(
        ({ owner, visibleCals, alreadyExisting }) => (
          <Box key={owner.displayName} mb={2}>
            {visibleCals.length > 0 ? (
              visibleCals.map((cal) =>
                cal.cal ? (
                  <CalendarItem
                    key={cal.owner.displayName + cal.cal["dav:name"]}
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

export default function CalendarResources({
  open,
  onClose,
}: {
  open: boolean;
  onClose: (ids?: string[]) => void;
}) {
  const dispatch = useAppDispatch();
  const theme = useTheme();

  const openpaasId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const calendars = useAppSelector((state) => state.calendars.list);

  const [selectedCal, setSelectedCalendars] = useState<CalendarWithOwner[]>([]);
  const [selectedResources, setSelectedResources] = useState<Resource[]>([]);

  const fetchSeqRef = useRef(0);

  const handleSave = async () => {
    if (selectedCal.length > 0) {
      const results = await Promise.allSettled(
        selectedCal.map(async (cal) => {
          const calId = crypto.randomUUID();
          const exists = Object.values(calendars).some(
            (existing: Calendar) =>
              existing.id ===
              cal.cal?._links?.self?.href
                ?.replace("/calendars/", "")
                .replace(".json", "")
          );
          if (!exists && cal.cal) {
            await dispatch(
              addCalendarResourceAsync({
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
            ).unwrap();
            return cal.cal._links.self?.href
              ?.replace("/calendars/", "")
              .replace(".json", "");
          }
          return null;
        })
      );

      const idList = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<string | null>).value)
        .filter(Boolean) as string[];

      onClose(idList);
    } else {
      onClose();
    }
    setSelectedCalendars([]);
    setSelectedResources([]);
  };
  const { t } = useI18n();

  const handleClose = () => {
    fetchSeqRef.current += 1; // invalidate in-flight fetch results
    onClose();
    setSelectedCalendars([]);
    setSelectedResources([]);
  };

  return (
    <ResponsiveDialog
      open={open}
      contentSx={{ paddingTop: "8px !important" }}
      onClose={handleClose}
      title={t("calendar.browseResources")}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose}>
            {t("common.cancel")}
          </Button>
          <Button variant="contained" onClick={handleSave}>
            {t("actions.add")}
          </Button>
        </>
      }
    >
      <ResourceSearch
        objectTypes={["resource"]}
        selectedResources={selectedResources}
        inputSlot={(params) => <TextField {...params} size="small" />}
        onChange={async (_event: React.SyntheticEvent, value: Resource[]) => {
          const requestSeq = ++fetchSeqRef.current;
          setSelectedResources(value);

          const results = await Promise.allSettled(
            value.map(async (user: Resource) => {
              if (user?.openpaasId) {
                const cals = await getCalendars(
                  user.openpaasId,
                  "sharedPublic=true&"
                );
                return cals._embedded?.["dav:calendar"]
                  ? cals._embedded["dav:calendar"].map((cal) => ({
                      cal,
                      owner: user,
                    }))
                  : [{ cal: undefined, owner: user }];
              }
              return null;
            })
          );

          const successfulCals = results
            .filter((result) => result.status === "fulfilled")
            .map(
              (result) =>
                (result as PromiseFulfilledResult<CalendarWithOwner[]>).value
            )
            .flat()
            .filter(Boolean);

          if (requestSeq !== fetchSeqRef.current) return;
          setSelectedCalendars(successfulCals as CalendarWithOwner[]);
        }}
      />

      <SelectedCalendarsList
        calendars={calendars}
        selectedCal={selectedCal}
        onRemove={(cal) => {
          if (!cal.cal?._links?.self?.href) return;
          setSelectedCalendars((prev) =>
            prev.filter(
              (c) => c.cal?._links?.self?.href !== cal.cal._links.self?.href
            )
          );
          if (
            !selectedCal.find(
              (c) =>
                cal.owner.displayName === c.owner.displayName &&
                c.cal?._links?.self?.href !== cal.cal._links.self?.href
            )
          ) {
            setSelectedResources((prev) =>
              prev.filter((u) => u.displayName !== cal.owner.displayName)
            );
          }
        }}
        onColorChange={(cal, color) =>
          setSelectedCalendars((prev) =>
            prev.map((prevcal) =>
              prevcal.owner.displayName === cal.owner.displayName &&
              prevcal.cal._links.self?.href === cal.cal._links.self?.href
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
