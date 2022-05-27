// TODO: Use an external library (such as useStorage in VueUse?)

class Storage {
  namespace = '';

  constructor (namespace) {
    this.namespace = namespace;
  }

  load (key) {
    return JSON.parse(localStorage.getItem(this.storageKey(key)));
  }

  save (key, item) {
    localStorage.setItem(this.storageKey(key), JSON.stringify(item));
  }

  storageKey (key) {
    return `${this.namespace}--${key}`;
  }
}

export default Storage;
