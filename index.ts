import 'react-native-url-polyfill/auto';

// Polyfill global DOMException for React Native fetch aborts using standard ES5 prototype function
if (typeof (global as any).DOMException === 'undefined') {
  const DOMExceptionPolyfill = function (this: any, message?: string, name?: string) {
    this.message = message || '';
    this.name = name || 'DOMException';
    const error = Error(message);
    this.stack = error.stack;
  };
  DOMExceptionPolyfill.prototype = Object.create(Error.prototype);
  DOMExceptionPolyfill.prototype.constructor = DOMExceptionPolyfill;
  (global as any).DOMException = DOMExceptionPolyfill as any;
}

import { registerRootComponent } from 'expo';

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

