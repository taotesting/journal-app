module.exports = {
  appId: 'com.tao.journal',
  appName: 'Journal',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    url: 'http://localhost:3000',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};
