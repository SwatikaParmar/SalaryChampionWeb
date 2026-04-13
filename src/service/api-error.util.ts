const MESSAGE_KEYS = [
  'message',
  'errorMessage',
  'error',
  'detail',
  'title',
  'msg',
  'statusMessage',
  'description',
];

const CONTAINER_KEYS = [
  'errors',
  'messages',
  'details',
  'validationErrors',
  'fieldErrors',
  'data',
];

function findFirstMessage(value: any, depth = 0): string | null {
  if (value == null || depth > 6) {
    return null;
  }

  if (typeof value === 'string') {
    const message = value.trim();
    return message || null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const fromItem = findFirstMessage(item, depth + 1);
      if (fromItem) {
        return fromItem;
      }
    }
    return null;
  }

  if (typeof value === 'object') {
    for (const key of MESSAGE_KEYS) {
      const fromKey = findFirstMessage(value?.[key], depth + 1);
      if (fromKey) {
        return fromKey;
      }
    }

    for (const key of CONTAINER_KEYS) {
      const fromContainer = findFirstMessage(value?.[key], depth + 1);
      if (fromContainer) {
        return fromContainer;
      }
    }

    for (const key of Object.keys(value)) {
      const fromAnyKey = findFirstMessage(value[key], depth + 1);
      if (fromAnyKey) {
        return fromAnyKey;
      }
    }
  }

  return null;
}

export function getFirstApiErrorMessage(source: any, _fallback?: string): string {
  return (
    findFirstMessage(source?.error) ??
    findFirstMessage(source) ??
    ''
  );
}
