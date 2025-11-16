import {
  legacy_createStore as createStore,
  applyMiddleware,
  compose,
} from "redux";
import thunk from "redux-thunk";
import { reducers } from "../reducers";

function saveToLocalStorage(store) {
  try {
      const serializedStore = JSON.stringify(store);
      window.localStorage.setItem('store', serializedStore);
  } catch(e) {
      console.log(e);
  }
}

function loadFromLocalStorage() {
  try {
      const serializedStore = window.localStorage.getItem('store');
      if(serializedStore === null) return undefined;
      const parsedStore = JSON.parse(serializedStore);
      // Don't restore authData from localStorage - we'll fetch fresh data from server
      // Also reset initializing to true so we check for token on app load
      if (parsedStore && parsedStore.authReducer) {
        parsedStore.authReducer.authData = null;
        parsedStore.authReducer.initializing = true;
      }
      return parsedStore;
  } catch(e) {
      console.log(e);
      return undefined;
  }
}
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
const persistedState = loadFromLocalStorage();

const store = createStore(reducers, persistedState, composeEnhancers(applyMiddleware(thunk)));

store.subscribe(() => {
  const state = store.getState();
  // Don't persist authData to localStorage - only persist other state
  const stateToSave = {
    ...state,
    authReducer: {
      ...state.authReducer,
      authData: null // Don't persist user data
    }
  };
  saveToLocalStorage(stateToSave);
});

export default store;