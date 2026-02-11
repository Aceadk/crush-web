module.exports = {
  root: true,
  extends: [require.resolve('@crush/config/eslint'), 'next/core-web-vitals'],
  rules: {
    'react/no-unescaped-entities': 'off',
  },
};
