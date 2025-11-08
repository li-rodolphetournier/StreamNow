const slugify = (input: string): string =>
  input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const generateSlug = (title: string, suffix?: string): string => {
  const base = slugify(title);
  if (!suffix) {
    return base;
  }
  return `${base}-${slugify(suffix)}`;
};

