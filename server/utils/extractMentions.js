const extractMentions = (text = "") => {
  const matches = text.match(/@([a-zA-Z0-9_]+)/g);

  if (!matches) {
    return [];
  }

  return [
    ...new Set(
      matches.map((mention) =>
        mention.slice(1).toLowerCase()
      )
    ),
  ];
};

export default extractMentions;