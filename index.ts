// Polyfill global DOMException for React Native fetch aborts
if (typeof (global as any).DOMException === 'undefined') {
  class DOMExceptionPolyfill extends Error {
    name: string;
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name || 'DOMException';
    }
  }
  (global as any).DOMException = DOMExceptionPolyfill;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
