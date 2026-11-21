import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.somna',
  appName: 'Somna',
  webDir: 'dist',
  android: { backgroundColor: '#07070c' },
  plugins: { LocalNotifications: { smallIcon: 'ic_notification', iconColor: '#C9B9EF' } },
}

export default config
