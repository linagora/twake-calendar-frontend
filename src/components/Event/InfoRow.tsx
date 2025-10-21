import React from "react";
import { Box, Typography, Link } from "@mui/material";

type InfoRowProps = {
  icon: React.ReactNode;
  text?: string;
  error?: boolean;
  data?: string; // optional link target
  content?: React.ReactNode; // if provided, overrides text rendering
};

function detectUrls(text: string) {
  // Simple regex that captures whole URLs without splitting them apart
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

  const parts = [];
  let lastIndex = 0;

  text.replace(urlRegex, (match, _, offset) => {
    // Push the text before the match
    if (lastIndex < offset) {
      parts.push(
        <React.Fragment key={lastIndex}>
          {text.slice(lastIndex, offset)}
        </React.Fragment>
      );
    }

    // Normalize href
    const href = match.startsWith("http") ? match : `https://${match}`;
    parts.push(
      <Link
        key={offset}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        underline="always"
      >
        {match}
      </Link>
    );

    lastIndex = offset + match.length;
    return match;
  });

  // Push remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(
      <React.Fragment key={lastIndex}>{text.slice(lastIndex)}</React.Fragment>
    );
  }

  return parts;
}

export function InfoRow({
  icon,
  text,
  error = false,
  data,
  content,
}: InfoRowProps) {
  return (
    <Box
      style={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        marginBottom: 1,
      }}
    >
      {icon}
      {content ? (
        content
      ) : (
        <Typography
          variant="body2"
          color={error ? "error" : "textPrimary"}
          style={{
            wordBreak: "break-word",
            whiteSpace: "pre-line",
            maxHeight: "33vh",
            overflowY: "auto",
            width: "100%",
          }}
        >
          {data ? (
            <Link
              href={data}
              target="_blank"
              rel="noopener noreferrer"
              underline="always"
            >
              {text}
            </Link>
          ) : text ? (
            detectUrls(text)
          ) : null}
        </Typography>
      )}
    </Box>
  );
}
