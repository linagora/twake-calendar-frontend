import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Box } from "@linagora/twake-mui";

export function Loading() {
  return (
    <Box
      data-testid="loading"
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100vw",
        height: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
      }}
    >
      <DotLottieReact
        src="/loadercalendar.lottie"
        loop
        autoplay
        style={{ width: "175px" }}
      />
    </Box>
  );
}
