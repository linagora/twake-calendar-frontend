import React from 'react'
import { DotLottieReact, setWasmUrl } from '@lottiefiles/dotlottie-react'
import { Box } from '@linagora/twake-mui'
import twakeLogo from '@common/static/twake-workplace.svg'

// The player runtime is served by the application itself (copied at build
// time, see rsbuild.config.ts): by default it is fetched from a public CDN,
// which would disclose every loading screen to a third party and run code
// nobody reviewed.
setWasmUrl('/dotlottie-player.wasm')

export const Loading: React.FC = () => {
  return (
    <Box
      data-testid="loading"
      sx={{
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 9999
      }}
    >
      <DotLottieReact
        src="/loadercalendar.lottie"
        autoplay
        style={{ width: '175px' }}
      />
      <Box
        component="img"
        src={twakeLogo}
        alt="twake workplace"
        sx={{
          position: 'absolute',
          bottom: '50px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '210px'
        }}
      />
    </Box>
  )
}
