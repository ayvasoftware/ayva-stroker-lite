/**
 * Rip of function from lil-gui that makes an element collapsible.
 * The element must contain the appropriate classes in order for this
 * methd to work (.title and .children element).
 */
export function makeCollapsible (element) {
  element._openAnimated = function (open = true) {
    // set state immediately
    this._closed = !open;

    this.$title.setAttribute('aria-expanded', !this._closed);

    // wait for next frame to measure $children
    requestAnimationFrame(() => {
      // explicitly set initial height for transition
      const initialHeight = this.$children.clientHeight;
      this.$children.style.height = `${initialHeight}px`;

      this.domElement.classList.add('transition');

      const onTransitionEnd = (e) => {
        if (e.target !== this.$children) return;
        this.$children.style.height = '';
        this.domElement.classList.remove('transition');
        this.$children.removeEventListener('transitionend', onTransitionEnd);
      };

      this.$children.addEventListener('transitionend', onTransitionEnd);

      // todo: this is wrong if children's scrollHeight makes for a gui taller than maxHeight
      const targetHeight = !open ? 0 : this.$children.scrollHeight;

      this.domElement.classList.toggle('closed', !open);

      requestAnimationFrame(() => {
        this.$children.style.height = `${targetHeight}px`;
      });
    });

    return this;
  };

  element.$title = element.querySelector('.title');
  element.$children = element.querySelector('.children');
  element.domElement = element;
  element._closed = false;

  element.$title.addEventListener('click', () => {
    element._openAnimated(element._closed);
  });
}

/**
 * Number formatter for use with noUiSlider configurations.
 */
export const formatter = (decimals = 0, suffix = '') => ({
  to (value) {
    return `${value.toFixed(decimals)}${suffix}`;
  },
  from (value) {
    return Number(value.replace(',-', ''));
  },
});

/**
 * Shorthand for Object.prototype.hasOwnProperty.call()
 */
export function has (obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
