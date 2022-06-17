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
}

export default CustomStrokeStorage;
