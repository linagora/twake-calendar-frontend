import { Typography } from '@linagora/twake-mui'

export function OwnerCaption({
  showCaption,
  ownerDisplayName
}: {
  showCaption: boolean
  ownerDisplayName: string
}) {
  return (
    <Typography
      variant="caption"
      sx={{
        color: 'text.secondary',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        overflowWrap: 'break-word'
      }}
    >
      {showCaption && ownerDisplayName}
    </Typography>
  )
}
