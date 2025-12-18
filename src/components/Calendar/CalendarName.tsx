import { Box, Typography } from "@mui/material";
import { Calendar } from "../../features/Calendars/CalendarTypes";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
export function CalendarName({ calendar }: { calendar: Calendar }) {
  return (
    <Box style={{ display: "flex", flexDirection: "row", gap: 8 }}>
      <SquareRoundedIcon
        style={{
          color: calendar.color?.light ?? "#3788D8",
          width: 24,
          height: 24,
        }}
      />
      <Typography sx={{ wordBreak: "break-word" }}>{calendar.name}</Typography>
    </Box>
  );
}
