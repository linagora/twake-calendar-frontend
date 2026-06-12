import { alpha, Avatar, Box, useTheme } from '@linagora/twake-mui'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'

interface ResourceIconProps {
  avatarUrl?: string
  colorIcon?: boolean
  color?: string
}

export const ResourceIcon: React.FC<ResourceIconProps> = ({
  avatarUrl,
  colorIcon,
  color
}) => {
  const theme = useTheme()

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
      sx={{
        backgroundColor: 'transparent',
        color: alpha(theme.palette.grey[900], 0.9),
        width: '24px',
        height: '24px'
      }}
    >
      <LayersOutlinedIcon />
    </Avatar>
  )
}
