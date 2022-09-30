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
      this.domElement.style.height = null;
      // explicitly set initial height for transition
      const initialHeight = this.$children.clientHeight;
      this.$children.style.height = `${initialHeight}px`;

      this.domElement.classList.add('transition');

      const onTransitionEnd = (e) => {
        if (e.target !== this.$children) return;
        this.$children.style.height = '';
        this.domElement.classList.remove('transition');
        this.$children.removeEventListener('transitionend', onTransitionEnd);
        window.dispatchEvent(new Event('resize'));
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

export function clamp (value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Check if a value is numeric and within a certain range.
 */
export function validNumber (value, min, max) {
  if (!Number.isFinite(value)) {
    return false;
  }

  if (min !== undefined && value < min) {
    return false;
  }

  if (max !== undefined && value > max) {
    return false;
  }

  return true;
}

export function createConstantProperty (object, name, value) {
  Object.defineProperty(object, name, {
    value: value,
    writeable: false,
    configurable: false,
    enumerable: true,
  });
}

/**
 * Size an element to extend to the bottom of the viewport.
 */
export function clampHeight (element, min, max) {
  const rect = element.getBoundingClientRect();
  const height = rect.height + (window.innerHeight - (rect.y + rect.height));

  element.style.height = `${clamp(height, min, max)}px`;
}

/**
 * Utility for UI sliders to activate merging tooltips.
 * Ripped from https://refreshless.com/nouislider/examples/#section-merging-tooltips
 *
 * @param slider HtmlElement with an initialized slider
 * @param threshold Minimum proximity (in percentages) to merge tooltips
 * @param separator String joining tooltips
 */
export function mergeTooltips (slider, threshold, separator) {
  const textIsRtl = getComputedStyle(slider).direction === 'rtl';
  const isRtl = slider.noUiSlider.options.direction === 'rtl';
  const isVertical = slider.noUiSlider.options.orientation === 'vertical';
  const tooltips = slider.noUiSlider.getTooltips();
  const origins = slider.noUiSlider.getOrigins();

  // Move tooltips into the origin element. The default stylesheet handles this.
  tooltips.forEach(function (tooltip, index) {
    if (tooltip) {
      origins[index].appendChild(tooltip);
    }
  });

  slider.noUiSlider.on('update', function (values, handle, unencoded, tap, positions) {
    const pools = [[]];
    const poolPositions = [[]];
    const poolValues = [[]];
    let atPool = 0;

    // Assign the first tooltip to the first pool, if the tooltip is configured
    if (tooltips[0]) {
      pools[0][0] = 0;
      [poolPositions[0][0]] = positions;
      [poolValues[0][0]] = values;
    }

    for (let i = 1; i < positions.length; i++) {
      if (!tooltips[i] || (positions[i] - positions[i - 1]) > threshold) {
        atPool++;
        pools[atPool] = [];
        poolValues[atPool] = [];
        poolPositions[atPool] = [];
      }

      if (tooltips[i]) {
        pools[atPool].push(i);
        poolValues[atPool].push(values[i]);
        poolPositions[atPool].push(positions[i]);
      }
    }

    pools.forEach(function (pool, poolIndex) {
      const handlesInPool = pool.length;

      for (let j = 0; j < handlesInPool; j++) {
        const handleNumber = pool[j];

        if (j === handlesInPool - 1) {
          let offset = 0;

          poolPositions[poolIndex].forEach(function (value) {
            offset += 1000 - value;
          });

          const direction = isVertical ? 'bottom' : 'right';
          const last = isRtl ? 0 : handlesInPool - 1;
          const lastOffset = 1000 - poolPositions[poolIndex][last];
          offset = (textIsRtl && !isVertical ? 100 : 0) + (offset / handlesInPool) - lastOffset;

          // Center this tooltip over the affected handles
          tooltips[handleNumber].innerHTML = poolValues[poolIndex].join(separator);
          tooltips[handleNumber].style.display = 'block';
          tooltips[handleNumber].style[direction] = `${offset}%`;
        } else {
          // Hide this tooltip
          tooltips[handleNumber].style.display = 'none';
        }
      }
    });
  });
}
