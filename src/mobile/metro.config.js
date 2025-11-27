// Use the new Expo Metro configuration API. The legacy `expo/metro-config`
// module has been deprecated in Expo SDK 50 and later. Importing from
// `@expo/metro-config` ensures compatibility with the local Expo CLI bundled
// with the project.
const { getDefaultConfig } = require('@expo/metro-config');

module.exports = getDefaultConfig(__dirname);
