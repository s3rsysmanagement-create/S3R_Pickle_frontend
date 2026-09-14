import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.S3R.pickleball',
  appName: 'S3R Dinkers Management',
  webDir: 'dist',
  server: {
    androidScheme: 'http',
    allowMixedContent: true
  }
};

export default config;