<template>
  <input
    type="checkbox"
    :checked="modelValue"
    @change="onChange"
  >
</template>

<script>
import Storage from '../../lib/ayva-storage.js';

const storage = new Storage('checkbox-value');

export default {
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },

    storageKey: {
      type: String,
      default: null,
    },
  },

  emits: ['update:modelValue', 'change'],

  data () {
    return {
      initialValue: null,
    };
  },

  beforeMount () {
    if (this.storageKey) {
      this.initialValue = storage.load(this.storageKey);
    }
  },

  mounted () {
    if (this.initialValue !== null && this.initialValue !== undefined) {
      this.notifyChange(this.initialValue);
    }
  },

  methods: {
    onChange (event) {
      const { checked } = event.target;

      if (this.storageKey) {
        storage.save(this.storageKey, checked);
      }

      this.notifyChange(checked);
    },

    notifyChange (checked) {
      this.$emit('update:modelValue', checked);
      this.$emit('change', checked);
    },
  },
};
</script>
