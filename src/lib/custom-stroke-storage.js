import Storage from './ayva-storage.js';

const storage = new Storage('custom-tempest-strokes');

class CustomStrokeStorage {
  load () {
    return storage.load('all') || {};
  }

  save (name, stroke) {
    const library = this.load();
    library[name] = stroke;
    storage.save('all', library);
  }

  delete (name) {
    const library = this.load();
    delete library[name];
    storage.save('all', library);

    localStorage.removeItem(`checkbox-value--free-play-pattern-${name}`);
  }
}

export default CustomStrokeStorage;
