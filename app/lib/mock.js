module.exports = {
  enable() {
    process.env.CCMOCK = 'true';
  },

  isEnabled() {
    return (process.env.CCMOCK && process.env.CCMOCK == 'true');
  },

  disable() {
    process.env.CCMOCK = undefined;
  },
};
