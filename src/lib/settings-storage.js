const fileOptions = {
  types: [
    {
      description: 'Ayva Stroker Lite Settings',
      accept: {
        'application/json': ['.json'],
      },
    },
  ],
  excludeAcceptAllOption: true,
  multiple: false,
  suggestedName: 'ayva-stroker-settings.json',
};

export default {
  async export () {
    let fileHandle;

    try {
      fileHandle = await window.showSaveFilePicker(fileOptions);
    } catch (abortError) {
      return false;
    }

    const writable = await fileHandle.createWritable();

    await writable.write(JSON.stringify(localStorage, null, 2));
    await writable.close();
    return true;
  },

  async import () {
    let fileHandle;

    try {
      [fileHandle] = await window.showOpenFilePicker(fileOptions);
    } catch (abortError) {
      return false;
    }

    const file = await fileHandle.getFile();
    const storageImport = JSON.parse(await file.text());

    localStorage.clear();
    Object.entries(storageImport).forEach(([key, value]) => localStorage.setItem(key, value));
    return true;
  },
};
