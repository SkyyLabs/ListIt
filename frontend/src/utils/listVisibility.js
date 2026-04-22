export function isListVisibleToUser(list, user, showPublic) {
  const ownerUid = list.owner?.uid ?? list.ownerUid;
  const collaborators = (list.collaborators || []).map(
    collaborator => collaborator.uid || collaborator
  );
  const isOwner = user?.uid === ownerUid;
  const isCollaborator = Boolean(user && collaborators.includes(user.uid));

  if (isOwner || isCollaborator) {
    return true;
  }

  return list.isPublic && showPublic;
}

export function getVisibleLists(lists, user, showPublic) {
  return lists.filter(list => isListVisibleToUser(list, user, showPublic));
}
