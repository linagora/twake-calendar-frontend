import { Avatar, Box } from '@linagora/twake-mui'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'

interface ResourceIconProps {
  avatarUrl?: string
  colorIcon?: boolean
  color?: string
}

export function ResourceIcon({
  avatarUrl,
  colorIcon,
  color
}: ResourceIconProps) {
  if (colorIcon && avatarUrl) {
    return (
      <Box
        sx={{
          width: '24px',
          height: '24px',
          backgroundColor: color,
          maskImage: `url(${avatarUrl})`,
          maskSize: 'cover'
        }}
      />
    )
  }

  return avatarUrl ? (
    <Avatar
      sx={{ backgroundColor: 'transparent', width: '24px', height: '24px' }}
      src={avatarUrl}
    />
  ) : (
    <Avatar
      sx={{ backgroundColor: 'transparent', width: '24px', height: '24px' }}
    >
      <LayersOutlinedIcon />
    </Avatar>
  )
}
