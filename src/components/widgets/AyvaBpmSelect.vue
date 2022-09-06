<template>
  <n-dropdown
    class="bpm-select"
    placement="bottom-start"
    trigger="click"
    size="small"
    :options="options"
    @select="onChange"
  >
    <span class="dropdown">
      <span>{{ label }}</span>
      <chevron-dropdown-icon class="chevron" />
    </span>
  </n-dropdown>
</template>

<script>
import Storage from '../../lib/ayva-storage.js';

const storage = new Storage('bpm-select');

export default {
  props: {
    modelValue: {
      type: String,
      default: null,
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

      options: [{
        key: 'transition',
        label: 'On Transition',
      }, {
        key: 'continuous',
        label: 'Continuously',
      }],
    };
  },

  computed: {
    label () {
      const labelMap = this.options.reduce((map, next) => {
        map[next.key] = next.label;
        return map;
      }, {});

      return labelMap[this.modelValue] || '';
    },
  },

  watch: {
    modelValue (value) {
      if (this.storageKey) {
        storage.save(this.storageKey, value);
      }
    },
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
    onChange (value) {
      if (this.storageKey) {
        storage.save(this.storageKey, value);
      }

      this.notifyChange(value);
    },

    notifyChange (value) {
      this.$emit('update:modelValue', value);
      this.$emit('change', value);
    },
  },
};
</script>

<style scoped>
  .dropdown {
    background-color: var(--ayva-background-dark);
    padding: 5px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .dropdown:hover {
    cursor: pointer;
    opacity: 0.9;
  }

  .chevron {
    width: 14px;
    height: 14px;
  }
</style>
