const config = {
  // transformIgnorePatterns: ['<rootDir>/node_modules/(?!axios)/'],
  moduleNameMapper: {
    axios: 'axios/dist/node/axios.cjs'
  }
};

module.exports = config;
