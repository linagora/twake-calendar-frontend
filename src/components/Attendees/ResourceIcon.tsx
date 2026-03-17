import { Avatar } from "@linagora/twake-mui";
import PeopleAltOutlinedIcon from "@mui/icons-material/PeopleAltOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import PhoneIphoneOutlinedIcon from "@mui/icons-material/PhoneIphoneOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import VideoCameraBackOutlinedIcon from "@mui/icons-material/VideoCameraBackOutlined";
import MeetingRoomOutlinedIcon from "@mui/icons-material/MeetingRoomOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import ViewComfyAltOutlinedIcon from "@mui/icons-material/ViewComfyAltOutlined";
import TvOutlinedIcon from "@mui/icons-material/TvOutlined";
import type { SvgIconComponent } from "@mui/icons-material";

/**
 * displayName → MUI icon mapping.
 * Add new entries here when new resources are created.
 */
const RESOURCE_ICON_MAP: Record<string, SvgIconComponent> = {
  "Astreinte OSSA": PeopleAltOutlinedIcon,
  "Chômage Partiel": CalendarMonthOutlinedIcon,
  Congés: CalendarMonthOutlinedIcon,
  COPIL: CalendarMonthOutlinedIcon,
  "Iphone 11 Pro Max": PhoneIphoneOutlinedIcon,
  "Note de Service": DescriptionOutlinedIcon,
  "OSS Events": CalendarMonthOutlinedIcon,
  "Permanence OSSA": PeopleAltOutlinedIcon,
  "Projo salle 404": VideoCameraBackOutlinedIcon,
  "Salle-bat-A-S215-visio-15p": MeetingRoomOutlinedIcon,
  "Salle-bat-A-S216-ecran-5p": MeetingRoomOutlinedIcon,
  "Salle-bat-B-S217-10p": MeetingRoomOutlinedIcon,
  "Salle-bat-C-S218-ecran-20p": MeetingRoomOutlinedIcon,
  "Salle-bat-D-S218-visio-amphi-200p": MeetingRoomOutlinedIcon,
  Télétravail: LayersOutlinedIcon,
  "TV - VN": TvOutlinedIcon,
  "Veille COPIL": LayersOutlinedIcon,
  "White Board - VN": ViewComfyAltOutlinedIcon,
};

function getIconForDisplayName(displayName: string): SvgIconComponent {
  return RESOURCE_ICON_MAP[displayName] ?? LayersOutlinedIcon;
}

interface ResourceIconProps {
  displayName: string;
}

export function ResourceIcon({ displayName }: ResourceIconProps) {
  const IconComponent = getIconForDisplayName(displayName);

  return (
    <Avatar sx={{ backgroundColor: "transparent" }}>
      <IconComponent fontSize="medium" />
    </Avatar>
  );
}
