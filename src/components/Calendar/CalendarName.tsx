import { useAppSelector } from "@/app/hooks";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { defaultColors } from "@/utils/defaultColors";
import { makeDisplayName } from "@/utils/makeDisplayName";
import { renameDefault } from "@/utils/renameDefault";
import { Box, Typography } from "@linagora/twake-mui";
import SquareRoundedIcon from "@mui/icons-material/SquareRounded";
import { useI18n } from "twake-i18n";
import { OwnerCaption } from "./OwnerCaption";

export function CalendarName({ calendar }: { calendar: Calendar }) {
  const userData = useAppSelector((state) => state.user.userData);
  const showCaption =
    calendar.name !== "#default" &&
    userData.openpaasId !== calendar.id.split("/")[0];
  const { t } = useI18n();

  return (
    <Box
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "16px",
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
          {renameDefault(
            calendar.name,
            makeDisplayName(calendar) ?? "",
            t,
            userData.openpaasId === calendar.id.split("/")[0]
          )}
        </Typography>
        <OwnerCaption
          showCaption={showCaption}
          ownerDisplayName={makeDisplayName(calendar) ?? ""}
        />
      </Box>
    </Box>
  );
}
