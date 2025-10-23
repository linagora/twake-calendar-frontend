import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import {
  Box,
  Button,
  Popover,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { useState } from "react";
import { HexColorPicker } from "react-colorful";
import { defaultColors, getAccessiblePair } from "./utils/calendarColorsUtils";

export function ColorPicker({
  selectedColor,
  colors = defaultColors,
  onChange,
}: {
  selectedColor: Record<string, string>;
  colors?: Record<string, string>[];
  onChange: (color: Record<string, string>) => void;
}) {
  const [customColor, setCustomColor] = useState(
    !colors.find((c) => c.light === selectedColor?.light)
      ? selectedColor
      : undefined
  );
  return (
    <Box display="flex" alignItems="center" gap={1}>
      {colors.map((c) => (
        <ColorBox
          key={c.light}
          color={c}
          onChange={onChange}
          selectedColor={selectedColor}
        />
      ))}
      {customColor && (
        <ColorBox
          color={customColor ?? {}}
          onChange={onChange}
          selectedColor={selectedColor}
        />
      )}

      <ColorPickerBox
        onChange={(c) => {
          onChange(c);
          setCustomColor(c);
        }}
        selectedColor={selectedColor}
      />
    </Box>
  );
}
function ColorBox({
  color,
  onChange,
  selectedColor,
}: {
  color: Record<string, string>;
  onChange: (color: Record<string, string>) => void;
  selectedColor: Record<string, string>;
}) {
  return (
    <Box
      role="button"
      aria-label={`select color ${color.light}`}
      onClick={() => onChange(color)}
      style={{
        width: "46px",
        height: "32px",
        padding: 0,
        borderRadius: "4px",
        backgroundColor: color.light,
        cursor: "pointer",
        transition: "all 0.2s",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Box
        style={{
          height: "7px",
          width: "100%",
          borderRadius: "4px 4px 0px 0px",
          backgroundColor: color.dark,
        }}
      ></Box>
      <CheckIcon
        style={{
          visibility:
            selectedColor?.light === color.light ? "visible" : "hidden",
          color: color.dark,
        }}
      />
    </Box>
  );
}

function ColorPickerBox({
  onChange,
  selectedColor,
}: {
  onChange: (color: Record<string, string>) => void;
  selectedColor: Record<string, string>;
}) {
  const [oldColor] = useState(
    selectedColor ?? { light: "#ffffff", dark: "#808080" }
  );
  const [color, setColor] = useState(oldColor);

  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);
  const theme = useTheme();

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    onChange(oldColor);
    setAnchorEl(null);
  };

  const handleSave = () => {
    onChange(color);
    setAnchorEl(null);
  };

  const handleColorChange = (c: string) => {
    const newLight = c;
    const newColor = {
      light: newLight,
      dark: getAccessiblePair(newLight, theme),
    };
    setColor(newColor);
    onChange(newColor);
  };
  return (
    <>
      <Box
        key={"colorPicker"}
        role="button"
        aria-label={`select custom color`}
        onClick={handleClick}
        style={{
          width: "46px",
          height: "32px",
          padding: 0,
          borderRadius: "4px",
          border: "1px solid #CBD2E0",
          backgroundColor: "#FFF",
          cursor: "pointer",
          transition: "all 0.2s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Box
          style={{
            height: "7px",
            width: "100%",
            borderRadius: "4px 4px 0px 0px",
            backgroundColor: "#CBD2E0",
          }}
        ></Box>
        <AddIcon
          style={{
            color: "#CBD2E0",
          }}
        />
      </Box>
      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "center",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        slotProps={{
          paper: {
            style: {
              padding: "24px",
              width: "294px",
              borderRadius: "8px",
              boxShadow: "0px 1px 3px #3C404326",
            },
          },
        }}
      >
        <Typography variant="subtitle1" fontWeight="600">
          Choose custom colour
        </Typography>
        <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
          Choose a background colour for this calendar
        </Typography>

        <Box sx={{ mb: 2 }}>
          <HexColorPicker
            color={color.light}
            onChange={handleColorChange}
            style={{ width: "100%" }}
          />
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="body2" sx={{ mr: 1 }}>
            Hex
          </Typography>
          <TextField
            value={color.light?.toUpperCase()}
            onChange={(e) => handleColorChange(e.target.value)}
            variant="standard"
            size="small"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </Box>

        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ textTransform: "none" }}
          >
            Save
          </Button>
        </Box>
      </Popover>
    </>
  );
}
