function cloneSharedBookBookmarks(value) {
  return Array.isArray(value) ? value.filter(Boolean).map(bookmark => ({ ...bookmark })) : [];
}
