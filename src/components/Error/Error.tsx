import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ReplayIcon from "@mui/icons-material/Replay";
import { Box, Button, Fade, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useRef } from "react";
import { push } from "redux-first-history";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { useI18n } from "twake-i18n";

export function Error() {
  const { t } = useI18n();
  const dispatch = useAppDispatch();
  const userError = useAppSelector((state) => state.user.error);
  const calendarError = useAppSelector((state) => state.calendars.error);
  const initialUserError = useRef(userError).current;

  useEffect(() => {
    if (!initialUserError) {
      dispatch(push("/"));
    }
  }, [dispatch, initialUserError]);

  const errorMessage = userError || calendarError || t("error.unknown");

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
              {t("error.title")}
            </Typography>

            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {errorMessage}
            </Typography>

            <Button
              variant="contained"
              color="error"
              startIcon={<ReplayIcon />}
              onClick={() => window.location.reload()}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                borderRadius: 2,
                px: 3,
                py: 1,
                boxShadow: "none",
              }}
            >
              {t("error.retry")}
            </Button>
          </Stack>
        </Paper>
      </Box>
    </Fade>
  );
}
