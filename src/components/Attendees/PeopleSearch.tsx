import CloseIcon from "@mui/icons-material/Close";
import Autocomplete from "@mui/material/Autocomplete";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CardHeader from "@mui/material/CardHeader";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemText from "@mui/material/ListItemText";
import Modal from "@mui/material/Modal";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState, useEffect } from "react";
import { searchUsers } from "../../features/User/userAPI";

export interface User {
  email: string;
  displayName: string;
  avatarUrl: string;
  openpaasId: string;
}

export function PeopleSearch({
  selectedUsers,
  onChange,
  disabled,
}: {
  selectedUsers: User[];
  onChange: Function;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<User[]>([]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (query) {
        setLoading(true);
        const res = await searchUsers(query, ["user"]);
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
      value={selectedUsers}
      onInputChange={(event, value) => setQuery(value)}
      onChange={(event, value) => onChange(event, value)}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Search user"
          slotProps={{
            input: {
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? (
                    <CircularProgress color="inherit" size={20} />
                  ) : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            },
          }}
        />
      )}
      renderOption={(props, option) => {
        if (selectedUsers.find((u) => u.email === option.email)) return;
        return (
          <ListItem
            {...props}
            key={option.email + option.displayName}
            disableGutters
          >
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
