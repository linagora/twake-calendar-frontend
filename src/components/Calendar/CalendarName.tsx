import { Calendar } from "@/features/Calendars/CalendarTypes";
import { Box, Typography } from "@linagora/twake-mui";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { defaultColors } from "@/utils/defaultColors";
export function CalendarName({ calendar }: { calendar: Calendar }) {
  return (
    <Box style={{ display: "flex", flexDirection: "row", gap: 8 }}>
      <SquareRoundedIcon
        style={{
          color: calendar.color?.light ?? defaultColors[0].light,
          width: 24,
          height: 24,
        }}
      />
      <Typography sx={{ wordBreak: "break-word" }}>{calendar.name}</Typography>
    </Box>
  );
}
