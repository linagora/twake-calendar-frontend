import { Avatar } from "@linagora/twake-mui";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";

interface ResourceIconProps {
  avatarUrl?: string;
}

export function ResourceIcon({ avatarUrl }: ResourceIconProps) {
  return avatarUrl ? (
    <Avatar
      sx={{ backgroundColor: "transparent", width: "24px", height: "24px" }}
      src={avatarUrl}
    />
  ) : (
    <Avatar
      sx={{ backgroundColor: "transparent", width: "24px", height: "24px" }}
    >
      <LayersOutlinedIcon />
    </Avatar>
  );
}
