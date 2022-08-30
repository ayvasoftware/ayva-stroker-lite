import { Ayva } from 'ayvajs';
import _ from 'lodash';
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
    const library = storage.load('all') || {};
    return this.deserialize(library);
  }

  save (name, stroke) {
    const library = this.load();
    library[name] = stroke;

    storage.save('all', this.serialize(library));
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

    const library = this.serialize(this.load());

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

    const library = this.serialize(this.load());
    const data = library[name];

    const strokeFileObject = [{
      name,
      type: 'tempest-stroke',
      data,
    }];

    await writable.write(JSON.stringify(strokeFileObject, null, 2));
    await writable.close();
  }

  serialize (library) {
    const result = _.cloneDeep(library);

    Object.values(result).forEach((stroke) => {
      Object.values(stroke).forEach((params) => {
        // Translate motion properties to strings.
        // TODO: Handle differently when custom functions are available.
        if (params.motion instanceof Function) {
          switch (params.motion.name) {
            case 'tempestMotion':
              params.motion = 'Ayva.tempestMotion';
              break;
            case 'parabolicMotion':
              params.motion = 'Ayva.parabolicMotion';
              break;
            case 'linearMotion':
              params.motion = 'Ayva.linearMotion';
              break;
            default:
              console.warn('Invalid motion property:', params.motion); // eslint-disable-line no-console
              delete params.motion;
          }
        } else if (params.motion !== undefined && typeof params.motion !== 'string') {
          console.warn('Invalid motion property:', params.motion); // eslint-disable-line no-console
          delete params.motion;
        }
      });
    });

    return result;
  }

  deserialize (library) {
    const result = _.cloneDeep(library);

    Object.values(result).forEach((stroke) => {
      Object.values(stroke).forEach((params) => {
        // Translate motion properties to actual functions.
        // TODO: Convert this to eval() or new Function() once custom motion is supported.
        switch (params.motion) {
          case 'Ayva.tempestMotion':
            params.motion = Ayva.tempestMotion;
            break;
          case 'Ayva.parabolicMotion':
            params.motion = Ayva.parabolicMotion;
            break;
          case 'Ayva.linearMotion':
            params.motion = Ayva.linearMotion;
            break;
          default:
            if (params.motion) {
              console.warn('Invalid motion property:', params.motion); // eslint-disable-line no-console
              delete params.motion;
            }
        }
      });
    });

    return result;
  }
}

export default CustomStrokeStorage;
