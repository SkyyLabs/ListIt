export function compareStrings(a = '', b = '') {
  return String(a).localeCompare(String(b), undefined, {
    sensitivity: 'base'
  });
}

export function sortStrings(values = []) {
  return [...values].sort(compareStrings);
}

export function uniqueSortedStrings(values = []) {
  return Array.from(new Set(values.filter(Boolean))).sort(compareStrings);
}

export function getUserDisplayLabel(user) {
  return user?.displayName
    || user?.email?.split('@')[0]
    || user?.uid
    || '';
}

export function sortUsers(users = []) {
  return [...users].sort((left, right) =>
    compareStrings(getUserDisplayLabel(left), getUserDisplayLabel(right))
  );
}

export function sortItems(items = [], sortMode = 'subcategory') {
  const sorted = [...items];
  sorted.sort((left, right) => {
    const primary = sortMode === 'name'
      ? compareStrings(left.text, right.text)
      : compareStrings(left.subCategory, right.subCategory);
    if (primary !== 0) {
      return primary;
    }

    const secondary = sortMode === 'name'
      ? compareStrings(left.subCategory, right.subCategory)
      : compareStrings(left.text, right.text);
    if (secondary !== 0) {
      return secondary;
    }

    return compareStrings(left._id, right._id);
  });
  return sorted;
}
