import React from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Box } from "@linagora/twake-mui";
import twakeLogo from "../../static/twake-workplace.svg";

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
      <Box
        component="img"
        src={twakeLogo}
        alt="twake workplace"
        sx={{
          position: "absolute",
          bottom: "50px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "210px",
        }}
      />
    </Box>
  );
}
