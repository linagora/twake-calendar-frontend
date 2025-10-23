import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, Button, Fade, Paper, Stack, Typography } from "@mui/material";
import { useEffect } from "react";
import { push } from "redux-first-history";
import { useAppDispatch, useAppSelector } from "../../app/hooks";

export function Error() {
  const dispatch = useAppDispatch();
  const userError = useAppSelector((state) => state.user.error);
  const calendarError = useAppSelector((state) => state.calendars.error);

  useEffect(() => {
    if (!userError) {
      dispatch(push("/"));
    }
  }, [calendarError, dispatch]);

  const errorMessage = userError || calendarError || "Unknown error";

  return (
    <Fade in timeout={500}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          p: 3,
        }}
      >
        <Paper
          elevation={3}
          sx={{
            borderRadius: 4,
            p: 6,
            textAlign: "center",
            maxWidth: 420,
            width: "100%",
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Box
              sx={{
                color: "error.main",
                borderRadius: "50%",
                width: 72,
                height: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 40 }} />
            </Box>

            <Typography variant="h5" fontWeight={600}>
              Something went wrong
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>

            <Button
              variant="contained"
              color="error"
              startIcon={<ReplayIcon />}
              onClick={() => {
                window.location.reload();
              }}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: "none",
              }}
            >
              Try Again
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Fade>
  );
}
