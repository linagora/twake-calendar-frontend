import { Avatar, Box, Typography } from "@linagora/twake-mui";
import { useI18n } from "twake-i18n";
import { stringAvatar } from "../Event/utils/eventUtils";
import { UserWithAccess } from "./CalendarAccessRights";

interface ResourceAdminProps {
  admin: UserWithAccess;
}

export function ResourceAdmin({ admin }: ResourceAdminProps) {
  const { t } = useI18n();

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      px={1}
      py={0.5}
      sx={{
        borderRadius: "8px",
        "&:hover": { backgroundColor: "action.hover" },
      }}
    >
      <Box display="flex" alignItems="center" gap={1.5} minWidth={0}>
        <Avatar
          {...stringAvatar(admin.displayName)}
          sx={{ width: 28, height: 28, fontSize: "0.875rem" }}
        />
        <Box minWidth={0} display="flex" flexDirection="column" gap={0}>
          <Typography noWrap>{admin.displayName}</Typography>
          <Typography variant="caption" color="text.secondary">
            {admin.email}
          </Typography>
        </Box>
      </Box>

      <Box display="flex" alignItems="center" gap={0.5} flexShrink={0}>
        <Typography variant="caption">
          {t("calendarPopover.access.administrator")}
        </Typography>
      </Box>
    </Box>
  );
}
