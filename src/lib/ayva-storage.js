// TODO: Use an external library (such as useStorage in VueUse?)

class Storage {
  namespace = '';

  constructor (namespace) {
    this.namespace = namespace;
  }

  load (key) {
    const stored = localStorage.getItem(this.storageKey(key));

    if (stored !== null && stored !== undefined && stored !== 'undefined') {
      return JSON.parse(stored);
    }

    return null;
  }

  save (key, item) {
    localStorage.setItem(this.storageKey(key), JSON.stringify(item));
  }

  storageKey (key) {
    return `${this.namespace}--${key}`;
  }
}

export default Storage;
