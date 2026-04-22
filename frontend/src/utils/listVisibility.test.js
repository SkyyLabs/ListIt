import { getVisibleLists, isListVisibleToUser } from './listVisibility';

describe('list visibility helpers', () => {
  const user = { uid: 'user-1' };

  test('keeps owner and collaborator lists visible even when showPublic is disabled', () => {
    const ownerList = { ownerUid: 'user-1', collaborators: [], isPublic: false };
    const collaboratorList = {
      ownerUid: 'user-2',
      collaborators: [{ uid: 'user-1' }],
      isPublic: false
    };
    const publicList = { ownerUid: 'user-3', collaborators: [], isPublic: true };

    expect(isListVisibleToUser(ownerList, user, false)).toBe(true);
    expect(isListVisibleToUser(collaboratorList, user, false)).toBe(true);
    expect(isListVisibleToUser(publicList, user, false)).toBe(false);
  });

  test('filters mixed lists using the current user and public preference', () => {
    const lists = [
      { _id: 'owner', title: 'Mine', ownerUid: 'user-1', collaborators: [], isPublic: false },
      {
        _id: 'collab',
        title: 'Shared',
        ownerUid: 'user-2',
        collaborators: ['user-1'],
        isPublic: false
      },
      { _id: 'public', title: 'Public', ownerUid: 'user-3', collaborators: [], isPublic: true }
    ];

    expect(getVisibleLists(lists, user, false).map(list => list._id)).toEqual([
      'owner',
      'collab'
    ]);
    expect(getVisibleLists(lists, user, true).map(list => list._id)).toEqual([
      'owner',
      'collab',
      'public'
    ]);
  });
});
