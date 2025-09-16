import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  IconButton,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Popover,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { searchUsers } from "../../features/User/userAPI";
import { userAttendee } from "../../features/User/userDataTypes";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import CloseIcon from "@mui/icons-material/Close";

import {
  addSharedCalendar,
  getCalendar,
  getCalendars,
} from "../../features/Calendars/CalendarApi";
import {
  addSharedCalendarAsync,
  createCalendarAsync,
} from "../../features/Calendars/CalendarSlice";

interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
  openpaasId: string;
}

export default function CalendarSearch({
  anchorEl,
  open,
  onClose,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: (Calendar: {}, reason: "backdropClick" | "escapeKeyDown") => void;
}) {
  const dispatch = useAppDispatch();
  const [query, setQuery] = useState("");
  const openpaasId =
    useAppSelector((state) => state.user.userData.openpaasId) ?? "";
  const [options, setOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const calendars = useAppSelector((state) => state.calendars.list);
  const [selectedCal, setSelectedCalendars] = useState<Record<string, any>[]>(
    []
  );
  const colors = ["#34d399", "#fbbf24", "#f87171", "#60a5fa", "#f472b6"];

  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  const handleSave = () => {
    const calId = crypto.randomUUID();
    if (selectedCal) {
      selectedCal.forEach(async (cal) =>
        dispatch(addSharedCalendarAsync({ userId: openpaasId, calId, cal }))
      );
      onClose({}, "backdropClick");
    }
  };
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query) {
        setLoading(true);
        const res = await searchUsers(query);
        setOptions(res);
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);
  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
      transformOrigin={{
        vertical: "center",
        horizontal: "center",
      }}
    >
      <Box p={2}>
        <Typography variant="h6" gutterBottom>
          Browse other calendars
        </Typography>
        <Autocomplete
          multiple
          options={options}
          loading={loading}
          filterOptions={(x) => x}
          fullWidth
          getOptionLabel={(option) => option.displayName || option.email}
          filterSelectedOptions
          value={selectedUsers} // controlled!
          onInputChange={(event, value) => setQuery(value)}
          onChange={async (event, value) => {
            setSelectedUsers(value); // update Autocomplete

            const cals = await Promise.all(
              value.map(async (user) => {
                const cal = (await getCalendars(user.openpaasId)) as Record<
                  string,
                  any
                >;
                return {
                  cal,
                  owner: user,
                };
              })
            );

            setSelectedCalendars(cals); // update table
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search user"
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
          renderOption={(props, option) => {
            if (
              Object.keys(calendars)
                .map((id) => calendars[id])
                .find((c) => c.ownerEmails?.find((e) => e === option.email))
            )
              return null;
            return (
              <ListItem {...props} key={option.email} disableGutters>
                <ListItemAvatar>
                  <Avatar src={option.avatarUrl} alt={option.displayName} />
                </ListItemAvatar>
                <ListItemText
                  primary={option.displayName}
                  secondary={option.email}
                />
              </ListItem>
            );
          }}
        />
        {selectedCal.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle1" gutterBottom>
              Name
            </Typography>
            {selectedCal.map((cal) => (
              <Box
                key={cal.owner.email}
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  borderRadius: 2,
                  border: "1px solid #e5e7eb",
                  p: 1,
                  mb: 1,
                }}
              >
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar src={cal.owner.avatarUrl} alt={cal.owner.email} />
                  <Box>
                    <Typography variant="body1">
                      {cal.cal._embedded["dav:calendar"][0]["dav:name"]}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {cal.owner.email}
                    </Typography>
                  </Box>
                </Box>

                <Box display="flex" alignItems="center" gap={1}>
                  {colors.map((c) => (
                    <Box
                      key={c}
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        bgcolor: c,
                        cursor: "pointer",
                      }}
                    />
                  ))}
                  <IconButton
                    size="small"
                    onClick={() => {
                      setSelectedCalendars((prev) =>
                        prev.filter(
                          (prevcal) => prevcal.owner.email !== cal.owner.email
                        )
                      );
                      setSelectedUsers((prev) =>
                        prev.filter((u) => u.email !== cal.owner.email)
                      );
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        <Box mt={2} display="flex" justifyContent="flex-end" gap={1}>
          <Button
            variant="outlined"
            onClick={() => onClose({}, "backdropClick")}
          >
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSave}>
            Create
          </Button>
        </Box>
      </Box>
    </Popover>
  );
}
