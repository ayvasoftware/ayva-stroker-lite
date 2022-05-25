<template>
  <input
    type="checkbox"
    :checked="modelValue"
    @change="onChange"
  >
</template>

<script>
export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },

    storage: {
      type: String,
      default: null,
    },
  },

  emits: ['update:modelValue', 'change'],

  data () {
    return {
      storageNamespace: 'ayva-stroker',
      initialValue: null,
    };
  },

  beforeMount () {
    if (this.storage) {
      const storedValue = localStorage.getItem(this.getStorageKey());

      if (storedValue !== undefined && storedValue !== null) {
        this.initialValue = storedValue === 'true';
      }
    }
  },

  mounted () {
    if (this.initialValue !== null) {
      this.notifyChange(this.initialValue);
    }
  },

  methods: {
    onChange (event) {
      const { checked } = event.target;

      if (this.storage) {
        localStorage.setItem(this.getStorageKey(this.storage), checked);
      }

      this.notifyChange(checked);
    },

    notifyChange (checked) {
      this.$emit('update:modelValue', checked);
      this.$emit('change', checked);
    },

    getStorageKey () {
      return `${this.storageNamespace}-checkbox--${this.storage}`;
    },
  },
};
</script>
