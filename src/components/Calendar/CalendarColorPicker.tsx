import { Box } from "@mui/material";

const defaultColors = ["#34d399", "#fbbf24", "#f87171", "#60a5fa", "#f472b6"];

export function ColorPicker({
  selectedColor,
  colors = defaultColors,
  onChange,
}: {
  selectedColor?: string;
  colors?: string[];
  onChange: (color: string) => void;
}) {
  return (
    <Box display="flex" alignItems="center" gap={1}>
      {colors.map((c) => (
        <Box
          key={c}
          role="button"
          aria-label={`select color ${c}`}
          onClick={() => onChange(c)}
          style={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: c,
            cursor: "pointer",
            border:
              selectedColor === c ? "2px solid black" : "2px solid transparent",
            transition: "all 0.2s",
          }}
        />
      ))}
    </Box>
  );
}
