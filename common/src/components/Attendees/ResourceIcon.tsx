import { alpha, Box, useTheme } from '@linagora/twake-mui'
import { Avatar } from '@common/ds/Avatar/Avatar'
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
        style={{
          width: '24px',
          height: '24px',
          backgroundColor: color,
          // Quoted: the URL comes from the server and must stay a single token
          maskImage: `url(${JSON.stringify(avatarUrl)})`,
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
