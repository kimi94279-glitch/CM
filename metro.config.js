// Sentry: 번들·소스맵에 Debug ID 를 붙여 오류 위치를 원본 코드로 보여준다(expo/metro-config 기본값 + Sentry 직렬화).
// https://docs.sentry.io/platforms/react-native/guides/expo/
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

module.exports = config;
