<template>
  <div class="special-message">
    <h2>
      A special message from the creator of
      <span style="color: var(--ayva-blue);">Ayva </span><span style="color: indigo">Software</span>
    </h2>

    <div>
      Hello!
    </div>

    <div>
      This app has become quite popular. I love knowing that so many people have been able to
      have fun, learn, and experience lots of pleasure with it. 😊
    </div>

    <div>
      I feel awkward asking, but I need your help. Most Ayva Software—including Ayva Stroker Lite—is <b>free</b> and open source.
      I depend on donations to cover the associated costs (and to stay motivated to keep producing cool products for you to enjoy!).
    </div>

    <div>I tend to mostly come out of pocket to provide these services.</div>

    <div>
      If everyone who used Ayva Stroker Lite for more than ten minutes this month donated <b>$3</b>,
      the cost of the <b>ayva-stroker-lite.io</b> domain would be covered <u>for over two years.</u>
    </div>

    <div>
      That's right, about the price of an organic eggplant is all I am asking.<br>
      Please support Ayva Software with a <b>one time donation</b> <i>today</i>:
    </div>

    <div>
      <a href="https://www.buymeacoffee.com/soritesparadox" target="_blank">Buy Sorites Paradox an Eggplant</a> 🍆
    </div>

    <div>
      If you would like to provide support on an ongoing basis, you can subscribe on
      <a href="https://patreon.com/soritesparadox" target="_blank">Patreon</a>.
      The subscriber tier includes unlimited access to
      <a target="_blank" href="https://remote.ayvasoftware.io/about">Ayva Remote</a>
      (an app that allows anyone in the world to <i>anonymously</i> stroke you off!).
    </div>

    <div>
      I truly love what I do. I won't be stopping any time soon, and I greatly appreciate your support.
    </div>

    <div>
      Thank You and Happy Stroking! 💙
    </div>

    <div>
      <i>Sorites Paradox</i>
    </div>

    <div style="font-size: 11px; font-style: italic">
      P.S. "This message won't appear again in this browser until the next Fundraiser 😅,
      but you can buy me an eggplant anytime from the settings menu in the lower left corner of the app."
    </div>

    <div>
      <button class="ayva-button primary" :disabled="fundraiserTime > 0" @click="endFundraiser">
        Enter Ayva Stroker Lite {{ fundraiserTime ? `(${fundraiserTime})` : '' }}
      </button>
    </div>
  </div>
</template>

<script>
export default {
  emits: ['end-fundraiser'],

  data () {
    return {
      fundraiserTime: 30,
    };
  },

  mounted () {
    setTimeout(this.tickFundraiser, 1000);
  },

  methods: {
    tickFundraiser () {
      this.fundraiserTime--;

      if (this.fundraiserTime > 0) {
        setTimeout(this.tickFundraiser, 1000);
      }
    },

    endFundraiser () {
      if (this.fundraiserTime <= 0) {
        this.$emit('end-fundraiser');
      }
    },
  },
};
</script>

<style scoped>
  .special-message {
    width: 50dvw;
    display: flex;
    flex-direction: column;
    color: rgb(235, 235, 235);
    background-color: #1f1f1f;
    padding: 20px;
    font-family: Menlo, Monaco, Consolas, "Droid Sans Mono", monospace;
    font-size: 14px;
    margin: 2rem auto;
  }

  .special-message > * {
    padding: 10px 0;
    text-align: center;
  }

  h2 {
    margin: 0;
  }

  a {
    color: var(--ayva-blue);
  }

  button {
    padding: 5px 20px;
    height: fit-content;
  }

  button:not([disabled]) {
    cursor: pointer;
  }
</style>
