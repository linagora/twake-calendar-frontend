import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";
import LockIcon from "@mui/icons-material/Lock";
import PublicIcon from "@mui/icons-material/Public";
import {
  Box,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useI18n } from "cozy-ui/transpiled/react/providers/I18n";
import { useState, useEffect } from "react";
import { useAppSelector } from "../../app/hooks";
import { Calendars } from "../../features/Calendars/CalendarTypes";
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
  setName: Function;
  description: string;
  setDescription: (d: string) => void;
  color: Record<string, string>;
  setColor: Function;
  visibility: "public" | "private";
  setVisibility: Function;
  calendar?: Calendars;
}) {
  const { t } = useI18n();
  const [toggleDesc, setToggleDesc] = useState(Boolean(description));
  const userId =
    useAppSelector((state) => state.user.userData?.openpaasId) ?? "";
  const isOwn = calendar ? calendar.id.split("/")[0] === userId : true;

  useEffect(() => {
    if (description) setToggleDesc(true);
  }, [description]);

  return (
    <Box mt={2}>
      <TextField
        fullWidth
        label=""
        inputProps={{ "aria-label": t("common.name") }}
        placeholder={t("common.name")}
        value={name}
        onChange={(e) => setName(e.target.value)}
        size="small"
        margin="dense"
      />

      <AddDescButton
        showDescription={toggleDesc}
        setShowDescription={setToggleDesc}
        showMore={false}
        description={description}
        setDescription={setDescription}
      />

      <Box mt={2}>
        <Typography variant="body2" gutterBottom>
          {t("calendar.color")}
        </Typography>
        <ColorPicker
          onChange={(color) => setColor(color)}
          selectedColor={color}
        />
      </Box>

      {isOwn && (
        <Box mt={2}>
          <Typography variant="body2" gutterBottom>
            {t("calendar.newEventsVisibility")}
          </Typography>
          <ToggleButtonGroup
            value={visibility}
            exclusive
            onChange={(e, val) => val && setVisibility(val)}
            size="small"
          >
            <ToggleButton value="public" sx={{ width: "140px" }}>
              <PublicIcon fontSize="small" sx={{ mr: 1 }} />
              {t("common.all")}
            </ToggleButton>

            <ToggleButton value="private" sx={{ width: "140px" }}>
              <LockIcon fontSize="small" sx={{ mr: 1 }} />
              {t("common.you")}
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}
    </Box>
  );
}
