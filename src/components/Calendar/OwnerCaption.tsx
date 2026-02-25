import { Typography } from "@linagora/twake-mui";

export function OwnerCaption({
  showCaption,
  ownerDisplayName,
}: {
  showCaption: boolean;
  ownerDisplayName: string;
}) {
  return (
    <Typography
      variant="caption"
      color="text.secondary"
      style={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        wordBreak: "break-word",
      }}
    >
      {showCaption && ownerDisplayName}
    </Typography>
  );
}
