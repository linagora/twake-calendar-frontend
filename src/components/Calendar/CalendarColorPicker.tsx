import { Box } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
// const defaultColors = ["#34d399", "#fbbf24", "#f87171", "#60a5fa", "#f472b6"];

const defaultColors = [
  { light: "#D0ECDA", dark: "#45B26B" },
  { light: "#FAE3CE", dark: "#EA8E3A" },
  { light: "#F5CFD0", dark: "#D74244" },
  { light: "#AFCBEF", dark: "#377DD8" },
];

export function ColorPicker({
  selectedColor,
  colors = defaultColors,
  onChange,
}: {
  selectedColor: Record<string, string>;
  colors?: Record<string, string>[];
  onChange: (color: Record<string, string>) => void;
}) {
  console.log(selectedColor);
  return (
    <Box display="flex" alignItems="center" gap={1}>
      {colors.map((c) => (
        <ColorBox color={c} onChange={onChange} selectedColor={selectedColor} />
      ))}
      {!colors.find((c) => c.light === selectedColor?.light) && (
        <ColorBox
          color={selectedColor}
          onChange={onChange}
          selectedColor={selectedColor}
        />
      )}
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
      key={color.light}
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
        }}
      />
    </Box>
  );
}
