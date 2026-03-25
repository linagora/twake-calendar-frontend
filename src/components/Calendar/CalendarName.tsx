import { useAppSelector } from "@/app/hooks";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { defaultColors } from "@/utils/defaultColors";
import { makeDisplayName } from "@/utils/makeDisplayName";
import { renameDefault } from "@/utils/renameDefault";
import { Box, Typography } from "@linagora/twake-mui";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { useI18n } from "twake-i18n";
import { OwnerCaption } from "./OwnerCaption";
import { ResourceIcon } from "../Attendees/ResourceIcon";

export function CalendarName({ calendar }: { calendar: Calendar }) {
  const userData = useAppSelector((state) => state.user.userData);
  const { t } = useI18n();

  const ownerId = calendar.id.split("/")[0];
  const ownerDisplayName = makeDisplayName(calendar) ?? "";
  const isOwnCalendar = userData.openpaasId === ownerId;
  const isResource = calendar.owner?.resource;
  const showCaption =
    calendar.name !== "#default" && !isOwnCalendar && !isResource;

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "16px",
        alignItems: "center",
      }}
    >
      {isResource ? (
        <ResourceIcon
          colorIcon
          avatarUrl={calendar.owner.resourceIcon}
          color={calendar.color?.light ?? defaultColors[0].light}
        />
      ) : (
        <SquareRoundedIcon
          style={{
            color: calendar.color?.light ?? defaultColors[0].light,
            width: 24,
            height: 24,
          }}
        />
      )}
      <Box style={{ display: "flex", flexDirection: "column" }}>
        <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
          {renameDefault(calendar.name, ownerDisplayName, t, isOwnCalendar)}
        </Typography>
        <OwnerCaption
          showCaption={showCaption}
          ownerDisplayName={ownerDisplayName}
        />
      </Box>
    </Box>
  );
}
