module.exports = {
  'env': {
    'es6': true,
    'node': true
  },
  'parserOptions': {
    'sourceType': 'module'
  },
  'extends': [
    'eslint-config-airbnb-base',
  ],
  'rules': {
    'comma-dangle': ['error', {
      arrays: 'always-multiline', // ('always-multiline' inherited from airbnb)
      objects: 'always-multiline',
      imports: 'always-multiline',
      exports: 'always-multiline',
      functions: 'never', // since we don't use babel, commas there are syntax errors
    }],
  },
};
