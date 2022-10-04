/* eslint-disable import/no-unresolved */
import * as monaco from 'monaco-editor';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

// eslint-disable-next-line no-restricted-globals
self.MonacoEnvironment = {
  getWorker (_, label) {
    if (label === 'json') {
      return new JsonWorker();
    }
    if (label === 'css' || label === 'scss' || label === 'less') {
      return new CssWorker();
    }
    if (label === 'html' || label === 'handlebars' || label === 'razor') {
      return new HtmlWorker();
    }
    if (label === 'typescript' || label === 'javascript') {
      return new TsWorker();
    }
    return new EditorWorker();
  },
};

const ayvascriptTheme = {
  base: 'vs-dark',
  inherit: true,
  colors: {
    'editor.background': '#111111',
  },
  rules: [],
  settings: [],
};

monaco.editor.defineTheme('ayvascript', ayvascriptTheme);

monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: true,
});

export default {
  create (element) {
    return monaco.editor.create(element, {
      theme: 'ayvascript',
      language: 'javascript',
      hover: false,
      tabSize: 2,
      quickSuggestions: false,
      lightbulb: {
        enabled: false,
      },
      minimap: {
        enabled: false,
      },
    });
  },
};
