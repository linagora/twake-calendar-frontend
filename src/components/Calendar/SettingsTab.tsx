import { useAppSelector } from "@/app/hooks";
import { Calendar } from "@/features/Calendars/CalendarTypes";
import { extractEventBaseUuid } from "@/utils/extractEventBaseUuid";
import {
  Box,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@linagora/twake-mui";
import LockOutlineIcon from "@mui/icons-material/LockOutline";
import PublicIcon from "@mui/icons-material/Public";
import { useEffect, useState } from "react";
import { useI18n } from "twake-i18n";
import { AddDescButton } from "../Event/AddDescButton";
import { ColorPicker } from "./CalendarColorPicker";

export function SettingsTab({
  name,
  setName,
  description,
  setDescription,
  color,
  setColor,
  visibility,
  setVisibility,
  calendar,
}: {
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (d: string) => void;
  color: Record<string, string>;
  setColor: (color: Record<string, string>) => void;
  visibility: "public" | "private";
  setVisibility: (visibility: "public" | "private") => void;
  calendar?: Calendar;
}) {
  const { t } = useI18n();
  const [toggleDesc, setToggleDesc] = useState(Boolean(description));
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const isOwn = calendar ? extractEventBaseUuid(calendar.id) === userId : true;

  useEffect(() => {
    if (description) setToggleDesc(true);
  }, [description]);

  return (
    <>
      {/* Form group 1: Name field - first group, margin top 0 */}
      <Box mt={0}>
        <Typography variant="h6" sx={{ margin: 0 }}>
          {t("calendarPopover.settings.calendarName")}
        </Typography>
        <Box sx={{ marginTop: "6px" }}>
          <TextField
            fullWidth
            label=""
            inputProps={{ "aria-label": t("common.name") }}
            placeholder={t("common.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            size="small"
            sx={{
              "&.MuiFormControl-root": {
                marginTop: 0,
                marginBottom: 0,
              },
            }}
          />
        </Box>
      </Box>

      {/* Form group 2: Description */}
      <Box mt={2}>
        <AddDescButton
          showDescription={toggleDesc}
          setShowDescription={setToggleDesc}
          showMore={false}
          description={description}
          setDescription={setDescription}
        />
      </Box>

      {/* Form group 3: Color */}
      <Box mt={2}>
        <Typography variant="h6" sx={{ margin: 0 }}>
          {t("calendar.color")}
        </Typography>
        <Box sx={{ marginTop: "6px" }}>
          <ColorPicker
            onChange={(color) => setColor(color)}
            selectedColor={color}
          />
        </Box>
      </Box>

      {/* Form group 4: New events visibility */}
      {isOwn && (
        <Box mt={2}>
          <Typography variant="h6" sx={{ margin: 0 }}>
            {t("calendar.newEventsVisibility")}
          </Typography>
          <Box sx={{ marginTop: "6px" }}>
            <ToggleButtonGroup
              value={visibility}
              exclusive
              onChange={(e, val) => val && setVisibility(val)}
              size="medium"
              sx={{ borderRadius: "12px" }}
            >
              <ToggleButton value="public" sx={{ width: "140px" }}>
                <PublicIcon fontSize="small" sx={{ mr: 1 }} />
                {t("common.all")}
              </ToggleButton>

              <ToggleButton value="private" sx={{ width: "140px" }}>
                <LockOutlineIcon fontSize="small" sx={{ mr: 1 }} />
                {t("common.you")}
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
      )}
    </>
  );
}
