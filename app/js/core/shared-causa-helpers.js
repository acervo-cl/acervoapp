function sharedCausaIsVisible(row, memberIds, uid) {
  if (!row || !uid) return false;
  return String(row.owner_id) === String(uid) || memberIds.has(String(row.id));
}
