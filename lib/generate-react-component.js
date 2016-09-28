'use babel';

import GenerateReactComponentView from './generate-react-component-view';
import { CompositeDisposable } from 'atom';
import path from 'path';
import fs from 'fs-plus';

const getPath = (element) => {
  return element.dataset.path || element.children[0].dataset.path;
};

const replacePlaceholders = (templateString, componentName) => (
  templateString.replace(/__ComponentName__/g, componentName)
);

const computeConditionals = (templateString, options) => (
  Object.keys(options).reduce((prev, curr) => (
    options[curr] ?
      prev.replace(new RegExp('\\/\\* ?IF ?!'+curr+'[\\s\\S]*?ENDIF ?\\*\\/', 'g'), '')
      : prev.replace(new RegExp(`\\/\\* ?IF ?`+curr+'[\\s\\S]*?ENDIF ?\\*\\/', 'g'), '')
  ), templateString).replace(/\/\* ?(END)?IF.*?\*\/\n?/g, '')
);

export default {

  generateReactComponentView: null,
  modalPanel: null,
  subscriptions: null,
  componentName: null,
  basePath: null,
  mode: 'component',
  options: null,

  config: {
    conditionals: {
      description: 'Toggle certain portions of your templates with these named booleans.',
      order: 1,
      type: 'array',
      'default': ['class'],
      items: { type: 'string' }
    },
    componentTemplatePath: {
      description: 'Absolute path to custom **component** template directory. If left blank, defaults to relative path ``lib/component_template`` accessible via the "View Code" button for this package.',
      order: 2,
      type: 'string',
      default: ''
    },
    containerTemplatePath: {
      description: 'Absolute path to custom **container** template directory. If left blank, defaults to relative path ``lib/container_template`` accessible via the "View Code" button for this package.',
      order: 3,
      type: 'string',
      default: ''
    }
  },

  activate(state) {
    this.generateReactComponentView = new GenerateReactComponentView(state.generateReactComponentViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.generateReactComponentView.getElement(),
      visible: false
    });

    // Create options object from conditionals array in config
    this.options = atom.config.get('generate-react-component.conditionals').reduce((prev, curr) => {
      !curr || (prev[curr] = false);
      return prev;
    }, {});

    // Re-render whenever conditionals list is changed
    atom.config.onDidChange('generate-react-component.conditionals', () => {
      this.deactivate();
      this.activate();
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register commands to show this view
    this.subscriptions.add(atom.commands.add('.directory .header', 'generate-react-component:container', ({target}) => {
      this.mode = 'container';
      this.basePath = getPath(target);
      this.prompt();
    }));
    this.subscriptions.add(atom.commands.add('.directory .header', 'generate-react-component:component', ({target}) => {
      this.mode = 'component';
      this.basePath = getPath(target);
      this.prompt();
    }));

    // Register commands to exit this view
    this.subscriptions.add(atom.commands.add('.generate-react-component', {
      'core:cancel': () => this.close(),
      'core:confirm': () => this.generate()
    }));
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.generateReactComponentView.destroy();
  },

  serialize() {
    return {
      generateReactComponentViewState: this.generateReactComponentView.serialize()
    };
  },

  prompt() {
    this.modalPanel.show();
    this.modalPanel.getItem().children[1].focus();

    // TODO: remove this event listener on close
    const panelChildren = this.modalPanel.getItem().children;
    Object.keys(panelChildren).slice(3).forEach(i => {
      panelChildren[i].addEventListener('change', () => {
        this.options[panelChildren[i].id] = panelChildren[i].children[0].children[0].checked;
      });
    });
  },

  close() {
    // Clear text input and error message
    this.modalPanel.getItem().children[1].getModel().setText('');
    this.modalPanel.getItem().children[2].textContent = '';
    this.modalPanel.hide();
  },

  generate() {
    this.componentName = this.modalPanel.getItem().children[1].getModel().getText().trim();

    if (!!this.componentName) {
      const newPath = path.join(this.basePath, this.componentName);
      if (!fs.existsSync(newPath)) {
        console.log(`Generating ${newPath}`);
        fs.mkdir(newPath, err => {
          if (err) throw err;
          // use included templates if user-defined path is empty
          const templatePath =
            atom.config.get(`generate-react-component.${this.mode}TemplatePath`).trim() ||
            path.resolve(__dirname, `${this.mode}_template`);
          fs.readdir(templatePath, (err, files) => {
            if (err) throw err;
            files.map(filename => {
              const newFilename = replacePlaceholders(filename, this.componentName);
              const filePath = path.resolve(templatePath, filename);
              fs.readFile(filePath, (err, data) => {
                if (err) throw err;
                const newFilePath = path.join(newPath, newFilename);
                fs.appendFile(newFilePath, replacePlaceholders(
                  computeConditionals(data.toString(), this.options),
                  this.componentName
                ));
              });
            });
          });
        });
        return this.close();
      } else {
        this.modalPanel.getItem().children[2].textContent = 'Path already exists';
      }
    } else {
      this.modalPanel.getItem().children[2].textContent = 'Invalid name';
    }
  }
};
