export function appendUniqueById<T extends { id: string }>(current: T[], incoming: T[]) {
  const seen = new Set<string>();
  return [...current, ...incoming].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}
