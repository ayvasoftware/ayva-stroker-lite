import { Ayva, TempestStroke } from 'ayvajs';
import _ from 'lodash';
import Storage from './ayva-storage.js';
import validator from './custom-behavior-validator.js';

const storage = new Storage('custom-behaviors');

const fileOptions = {
  types: [
    {
      description: 'Ayva Behaviors',
      accept: {
        'application/json': ['.json'],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
  suggestedName: 'ayva-behaviors.json',
};

class CustomBehaviorStorage {
  migrateLegacyStrokes () {
    const legacyStorage = new Storage('custom-tempest-strokes');
    const legacyLibrary = legacyStorage.load('all');

    if (legacyLibrary) {
      Object.entries(legacyLibrary).forEach(([name, data]) => {
        this.save(name, 'tempest-stroke', data);
      });

      legacyStorage.remove('all');
    }
  }

  load () {
    const library = storage.load('all') || {};
    const result = this.deserialize(library);

    Object.entries(result).forEach(([name, behavior]) => {
      if (behavior.type === 'tempest-stroke') {
        TempestStroke.update(name, behavior.data);
      }
    });

    return result;
  }

  save (name, type, data) {
    const library = this.load();
    library[name] = {
      type,
      data,
    };

    this.saveAll(library);
  }

  saveAll (library) {
    storage.save('all', this.serialize(library));
  }

  delete (name) {
    const library = this.load();
    delete library[name];
    this.saveAll(library);

    TempestStroke.remove(name);

    localStorage.removeItem(`checkbox-value--free-play-pattern-${name}`);
  }

  /**
   * Prompt user to select behavior file(s) to import. When there are conflicts
   * the behaviors will be renamed with a numerical suffix.
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
    const behaviors = JSON.parse(await file.text());

    if (!Array.isArray(behaviors) || !validator.validate(behaviors)) {
      throw new SyntaxError('Invalid behavior file.');
    }

    const library = this.load();
    const conflicts = [];

    for (const behavior of behaviors) {
      let { name } = behavior;

      if (library[name]) {
        // Append a number to behavior name when there is a conflict.
        let nextIndex = 2;

        while (library[name]) {
          name = `${behavior.name}-${nextIndex++}`;
        }

        conflicts.push(name);
      }

      this.save(name, behavior.type, behavior.data);
    }

    if (conflicts.length && onConflicts instanceof Function) {
      onConflicts(conflicts);
    }
  }

  /**
   * Prompt user to export all custom behaviors to a json file.
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

    const behaviorFileObject = Object.entries(library).map(([name, entry]) => ({
      name,
      type: entry.type,
      data: entry.data,
    }));

    await writable.write(JSON.stringify(behaviorFileObject, null, 2));
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
    const { type, data } = library[name];

    const behaviorFileObject = [{
      name,
      type,
      data,
    }];

    await writable.write(JSON.stringify(behaviorFileObject, null, 2));
    await writable.close();
  }

  serialize (library) {
    const result = _.cloneDeep(library);

    Object.values(result).forEach((entry) => {
      if (entry.type === 'tempest-stroke') {
        Object.values(entry.data).forEach((params) => {
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
      }
    });

    return result;
  }

  deserialize (library) {
    const result = _.cloneDeep(library);

    Object.values(result).forEach((entry) => {
      if (entry.type === 'tempest-stroke') {
        Object.values(entry.data).forEach((params) => {
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
      }
    });

    return result;
  }
}

export default CustomBehaviorStorage;
