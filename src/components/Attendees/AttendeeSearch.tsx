import {
  Autocomplete,
  Avatar,
  CircularProgress,
  ListItem,
  ListItemAvatar,
  ListItemText,
  TextField,
} from "@mui/material";
import { useEffect, useState } from "react";
import { searchUsers } from "../../features/User/userAPI";
import { userAttendee } from "../../features/User/userDataTypes";

interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
}

export default function UserSearch({
  attendees,
  setAttendees,
  disabled,
}: {
  attendees: userAttendee[];
  setAttendees: Function;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

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
    <Autocomplete
      multiple
      options={options}
      disabled={disabled}
      loading={loading}
      filterOptions={(x) => x}
      fullWidth
      getOptionLabel={(option) => option.displayName || option.email}
      filterSelectedOptions
      onInputChange={(event, value) => setQuery(value)}
      onChange={(event, value) =>
        setAttendees(
          value.map((a) => ({
            cn: a.displayName,
            cal_address: a.email,
            partstat: "NEED_ACTION",
            rsvp: "FALSE",
            role: "CHAIR",
            cutype: "INDIVIDUAL",
          }))
        )
      }
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
        if (attendees.find((a) => a.cal_address === option.email)) return;
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
  );
}
