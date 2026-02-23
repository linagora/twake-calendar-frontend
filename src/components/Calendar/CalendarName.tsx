import { Calendar } from "@/features/Calendars/CalendarTypes";
import { Box, Typography } from "@linagora/twake-mui";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { defaultColors } from "@/utils/defaultColors";
import { makeDisplayName } from "@/utils/makeDisplayName";
import { OwnerCaption } from "./OwnerCaption";
import { useAppSelector } from "@/app/hooks";

export function CalendarName({ calendar }: { calendar: Calendar }) {
  const userData = useAppSelector((state) => state.user.userData);
  const showCaption =
    calendar.name !== "#default" &&
    userData.openpaasId !== calendar.id.split("/")[0];

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: 8,
        alignItems: "center",
      }}
    >
      <SquareRoundedIcon
        style={{
          color: calendar.color?.light ?? defaultColors[0].light,
          width: 24,
          height: 24,
        }}
      />
      <Box style={{ display: "flex", flexDirection: "column" }}>
        <Typography sx={{ wordBreak: "break-word" }}>
          {calendar.name}
        </Typography>
        <OwnerCaption
          showCaption={showCaption}
          ownerDisplayName={makeDisplayName(calendar) ?? ""}
        />
      </Box>
    </Box>
  );
}
