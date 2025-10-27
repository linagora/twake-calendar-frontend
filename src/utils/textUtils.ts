export function trimLongTextWithoutSpace(text: string): string {
  const words = text.split(/\s+/);

  const hasLongWord = words.some((word) => word.length > 25);

  if (!hasLongWord) {
    return text;
  }

  let result = "";
  for (const word of words) {
    if (word.length > 25) {
      const remaining = 20 - result.length;
      result += word.substring(0, Math.max(remaining - 3, 5)) + "...";
      break;
    } else {
      result += (result ? " " : "") + word;
    }
  }

  return result;
}
