import React from 'react'
import { Box, IconButton, Skeleton } from '@linagora/twake-mui'
import FormatListBulletedOutlinedIcon from '@mui/icons-material/FormatListBulletedOutlined'
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined'
import driveLogotype from '@common/static/images/drive-logotype.svg'

const rowWidths = [180, 280, 220, 260, 200, 240, 170, 250, 210]

export const PickerSkeleton: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      width: '100%',
      backgroundColor: 'white'
    }}
  >
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: '24px 32px 24px 24px',
        borderBottom: 1,
        borderColor: 'divider'
      }}
    >
      <img
        src={driveLogotype}
        alt="Twake Drive"
        height="32px"
        style={{ width: 'auto' }}
      />
    </Box>
    {/* Toolbar: 3 breadcrumb pills | search + 2 icon buttons */}
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        pb: 4
      }}
    >
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Skeleton
          variant="rounded"
          width={48}
          height={28}
          sx={{ borderRadius: 4 }}
        />
        <Skeleton
          variant="rounded"
          width={64}
          height={28}
          sx={{ borderRadius: 4 }}
        />
        <Skeleton
          variant="rounded"
          width={80}
          height={28}
          sx={{ borderRadius: 4 }}
        />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
        <IconButton
          disabled
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28
          }}
        >
          <FormatListBulletedOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
        <IconButton
          disabled
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28
          }}
        >
          <GridViewOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      </Box>
    </Box>

    {/* File list */}
    <Box sx={{ flex: 1, px: 2, py: 1 }}>
      {rowWidths.map((nameWidth, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
            gap: 2
          }}
        >
          <Skeleton variant="rounded" width={nameWidth} height={14} />
          <Box sx={{ flex: 1 }} />
          <Skeleton variant="rounded" width={60} height={14} />
          <Skeleton variant="rounded" width={36} height={14} />
        </Box>
      ))}
    </Box>
  </Box>
)
