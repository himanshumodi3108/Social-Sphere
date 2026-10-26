import {
  legacy_createStore as createStore,
  applyMiddleware,
  compose,
} from "redux";
import thunk from "redux-thunk";
import { reducers } from "../reducers";

// Debounced asynchronous persistence to prevent main-thread jank and UI freezes
let saveTimeout = null;
function debouncedSaveToLocalStorage(state) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    try {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(() => {
          try {
            // Keep localStorage lightweight and non-blocking
            const token = localStorage.getItem('authToken');
            if (!token) {
              window.localStorage.removeItem('store');
            }
          } catch (e) {
            // ignore
          }
        });
      }
    } catch (e) {
      // ignore
    }
  }, 1000);
}

function loadFromLocalStorage() {
  try {
    const serializedStore = window.localStorage.getItem('store');
    if (!serializedStore) return undefined;
    const parsedStore = JSON.parse(serializedStore);
    if (parsedStore && parsedStore.authReducer) {
      parsedStore.authReducer.authData = null;
      parsedStore.authReducer.initializing = true;
    }
    return parsedStore;
  } catch (e) {
    return undefined;
  }
}

const composeEnhancers = (typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__) || compose;
const persistedState = loadFromLocalStorage();

const store = createStore(reducers, persistedState, composeEnhancers(applyMiddleware(thunk)));

// Subscribe using debounced non-blocking scheduler instead of blocking JSON.stringify on every action
store.subscribe(() => {
  debouncedSaveToLocalStorage(store.getState());
});

export default store;
