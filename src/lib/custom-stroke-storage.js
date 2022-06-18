import Storage from './ayva-storage.js';
import validator from './custom-stroke-validator.js';

const storage = new Storage('custom-tempest-strokes');

const fileOptions = {
  types: [
    {
      description: 'Strokes',
      accept: {
        'application/json': ['.json'],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
  suggestedName: 'ayva-strokes.json',
};

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

  /**
   * Prompt user to select stroke file(s) to import. When there are conflicts
   * the strokes will be renamed with a numerical suffix.
   * @param {Array} onConflicts - A function that accepts an array of conflicts for reporting.
   */
  async import (onConflicts) {
    let fileHandle;

    try {
      [fileHandle] = await window.showOpenFilePicker(fileOptions);
    } catch (abortError) {
      return;
    }

    const file = await fileHandle.getFile();
    const strokes = JSON.parse(await file.text());

    if (!Array.isArray(strokes) || !validator.validate(strokes)) {
      throw new SyntaxError('Invalid stroke file.');
    }

    const library = this.load();
    const conflicts = [];

    for (const stroke of strokes) {
      let { name } = stroke;

      if (library[name]) {
        // Append a number to stroke name when there is a conflict.
        let nextIndex = 2;

        while (library[name]) {
          name = `${stroke.name}-${nextIndex++}`;
        }

        conflicts.push(name);
      }

      this.save(name, stroke.data);
    }

    if (conflicts.length && onConflicts instanceof Function) {
      onConflicts(conflicts);
    }
  }

  /**
   * Prompt user to export all custom strokes to a json file.
   */
  async export () {
    let fileHandle;

    try {
      fileHandle = await window.showSaveFilePicker(fileOptions);
    } catch (abortError) {
      return;
    }

    const writable = await fileHandle.createWritable();

    const library = this.load();

    const strokeFileObject = Object.entries(library).map(([name, data]) => ({
      name,
      type: 'tempest-stroke',
      data,
    }));

    await writable.write(JSON.stringify(strokeFileObject, null, 2));
    await writable.close();
  }

  async exportOne (name) {
    // TODO: Thou shalt not repeat thyself.
    let fileHandle;

    try {
      fileHandle = await window.showSaveFilePicker({ ...fileOptions, suggestedName: `${name}.json` });
    } catch (abortError) {
      return;
    }

    const writable = await fileHandle.createWritable();

    const library = this.load();
    const data = library[name];

    const strokeFileObject = [{
      name,
      type: 'tempest-stroke',
      data,
    }];

    await writable.write(JSON.stringify(strokeFileObject, null, 2));
    await writable.close();
  }
}

export default CustomStrokeStorage;
