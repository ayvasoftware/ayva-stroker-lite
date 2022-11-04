<template>
  <div class="modal-body-small" :style="modalStyle">
    <div class="header">
      <div class="toolbar">
        <span class="toolbar-left">
          <span>Output Settings</span>
        </span>
        <span class="toolbar-right">
          <span>
            <close-icon
              class="close icon"
              :disabled="frequencyInvalid || portInvalid ? '' : undefined"
              @click="frequencyInvalid || portInvalid ? '' : $emit('close')"
            />
          </span>
        </span>
      </div>
      <div class="limits lil-gui children">
        <div class="settings">
          <div class="settings-label">
            Type:
          </div>
          <ayva-dropdown v-model="connectionType" class="connection-type" :options="connectionTypeOptions" storage-key="connection-type" />
        </div>
        <div v-show="connectionType === 'websocket'" class="settings">
          <div class="settings-label">
            Port:
          </div>
          <div>
            <n-tooltip :show="portInvalid" class="error-tooltip">
              <template #trigger>
                <input v-model="port" class="port" :class="portInvalid ? 'error' : ''" maxlength="5" @keydown="restrictNumbers">
              </template>
              Port must be a number between 1 and 65535.
            </n-tooltip>
          </div>
        </div>
        <div class="settings">
          <div class="settings-label">
            Frequency:
          </div>
          <div>
            <n-tooltip :show="frequencyInvalid" class="error-tooltip">
              <template #trigger>
                <input v-model="frequency" class="frequency" :class="frequencyInvalid ? 'error' : ''" maxlength="3" @keydown="restrictNumbers">
              </template>
              Frequency must be a number between 10 and 250.
            </n-tooltip>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AyvaDropdown from './widgets/AyvaDropdown.vue';

export default {
  components: {
    AyvaDropdown,
  },

  emits: ['close'],

  data () {
    return {
      connectionTypeOptions: [{
        key: 'serial',
        label: 'Serial',
      }, {
        key: 'websocket',
        label: 'WebSocket',
      }],

      connectionType: 'serial',

      port: 9090,

      frequency: 50,
    };
  },

  computed: {
    modalStyle () {
      return this.connectionType === 'websocket' ? { height: '165px' } : { height: '118px' };
    },

    portInvalid () {
      const port = Number(this.port);
      return !(Number.isFinite(port) && port >= 1 && port <= 65535);
    },

    frequencyInvalid () {
      const frequency = Number(this.frequency);
      return !(Number.isFinite(frequency) && frequency >= 10 && frequency <= 250);
    },
  },

  methods: {
    restrictNumbers (event) {
      const validKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight'];

      if (!event.key.match(/[0-9]/) && validKeys.indexOf(event.key) === -1) {
        event.preventDefault();
      }
    },
  },

};
</script>

<style src="../assets/ayva-modal.css" scoped></style>

<style scoped>
.settings-label {
  display: flex;
  align-items: center;
  font-size: 14px;
  margin-top: -2px;
  justify-content: right;
  padding-right: 10px;
}

.settings {
  display: grid;
  grid-template-columns: 40% 60%;
  padding: 10px 21px 10px 4px;
}

.settings input {
  background: var(--ayva-background-dark) !important;
}

.port {
  width: 34%;
}

.frequency {
  width: 25%;
}
</style>
