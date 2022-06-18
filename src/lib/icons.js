export default {
  install (app) {
    // Dynamically import any icons under ../assets/icons so we can use them anywhere.
    const componentDefinitions = import.meta.globEager('../assets/icons/*.svg');

    Object.entries(componentDefinitions).forEach(([path, definition]) => {
      // Get name of component, based on filename
      const componentName = path.split('/').pop().replace(/\.\w+$/, '');

      app.component(`${componentName}-icon`, definition.default);
    });
  },
};
