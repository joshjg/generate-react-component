'use babel';

export default class GenerateReactComponentView {

  constructor() {
    // Create root element
    this.element = document.createElement('div');
    this.element.classList.add('generate-react-component');

    // Create message element
    const message = document.createElement('label');
    message.textContent = 'Enter component name:';
    message.classList.add('icon');
    message.classList.add('icon-file-add');
    this.element.appendChild(message);

    // Create input field
    const field = document.createElement('atom-text-editor');
    field.classList.add('editor');
    field.classList.add('mini');
    field.setAttribute('mini', true);
    this.element.appendChild(field);

    // Create error message
    const errorMessage = document.createElement('div');
    errorMessage.classList.add('text-error');
    this.element.appendChild(errorMessage);

    this.generateCheckbox('createDirectory');

    // Create checkbox for each conditional
    atom.config.get('generate-react-component.conditionals').forEach(cnd => {
      this.generateCheckbox(cnd);
    });
  }

  generateCheckbox(name) {
    const div = document.createElement('div');
    div.setAttribute('style', 'margin-top: 6px');
    div.setAttribute('id', name);
    const checkbox = document.createElement('label');
    checkbox.classList.add('input-label');
    checkbox.innerHTML = `<input class='input-checkbox' type='checkbox'> ${name}`;
    div.appendChild(checkbox);
    this.element.appendChild(div);
  }

  // Returns an object that can be retrieved when package is activated
  serialize() {}

  // Tear down any state and detach
  destroy() {
    this.element.remove();
  }

  getElement() {
    return this.element;
  }

}
