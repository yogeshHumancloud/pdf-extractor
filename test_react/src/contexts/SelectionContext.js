import React, { createContext, useContext, useReducer, useCallback } from 'react';

// Create the context
const SelectionContext = createContext();

// Action types
export const ACTIONS = {
  ADD_SELECTION: 'ADD_SELECTION',
  REMOVE_SELECTION: 'REMOVE_SELECTION',
  CLEAR_SELECTIONS: 'CLEAR_SELECTIONS',
  SET_SELECTION_MODE: 'SET_SELECTION_MODE',
  CACHE_TEXT_ITEMS: 'CACHE_TEXT_ITEMS',
  CLEAR_TEXT_CACHE: 'CLEAR_TEXT_CACHE'
};

// Initial state
const initialState = {
  selections: [], // Array of selection objects
  selectionMode: false, // Whether selection mode is active
  textItemsCache: new Map() // Cache of extracted text items per page
};

// Reducer function
function selectionReducer(state, action) {
  switch (action.type) {
    case ACTIONS.ADD_SELECTION:
      return {
        ...state,
        selections: [...state.selections, action.payload]
      };

    case ACTIONS.REMOVE_SELECTION:
      return {
        ...state,
        selections: state.selections.filter(sel => sel.id !== action.payload)
      };

    case ACTIONS.CLEAR_SELECTIONS:
      return {
        ...state,
        selections: []
      };

    case ACTIONS.SET_SELECTION_MODE:
      return {
        ...state,
        selectionMode: action.payload
      };

    case ACTIONS.CACHE_TEXT_ITEMS:
      // action.payload = { pageNum, textItems, viewport }
      const newCache = new Map(state.textItemsCache);
      newCache.set(action.payload.pageNum, {
        textItems: action.payload.textItems,
        viewport: action.payload.viewport
      });
      return {
        ...state,
        textItemsCache: newCache
      };

    case ACTIONS.CLEAR_TEXT_CACHE:
      return {
        ...state,
        textItemsCache: new Map()
      };

    default:
      return state;
  }
}

// Provider component
export function SelectionProvider({ children }) {
  const [state, dispatch] = useReducer(selectionReducer, initialState);

  // Memoized action creators
  const addSelection = useCallback((selection) => {
    dispatch({ type: ACTIONS.ADD_SELECTION, payload: selection });
  }, []);

  const removeSelection = useCallback((selectionId) => {
    dispatch({ type: ACTIONS.REMOVE_SELECTION, payload: selectionId });
  }, []);

  const clearSelections = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_SELECTIONS });
  }, []);

  const setSelectionMode = useCallback((enabled) => {
    dispatch({ type: ACTIONS.SET_SELECTION_MODE, payload: enabled });
  }, []);

  const cacheTextItems = useCallback((pageNum, textItems, viewport) => {
    dispatch({
      type: ACTIONS.CACHE_TEXT_ITEMS,
      payload: { pageNum, textItems, viewport }
    });
  }, []);

  const clearTextCache = useCallback(() => {
    dispatch({ type: ACTIONS.CLEAR_TEXT_CACHE });
  }, []);

  // Helper functions
  const getSelectionsForPage = useCallback((pageNum) => {
    return state.selections.filter(sel => sel.pageNum === pageNum);
  }, [state.selections]);

  const getSelectionCount = useCallback(() => {
    return state.selections.length;
  }, [state.selections]);

  const getPageCount = useCallback(() => {
    const pages = new Set(state.selections.map(sel => sel.pageNum));
    return pages.size;
  }, [state.selections]);

  const hasSelections = useCallback(() => {
    return state.selections.length > 0;
  }, [state.selections]);

  const getCachedTextItems = useCallback((pageNum) => {
    return state.textItemsCache.get(pageNum);
  }, [state.textItemsCache]);

  const hasCachedTextItems = useCallback((pageNum) => {
    return state.textItemsCache.has(pageNum);
  }, [state.textItemsCache]);

  // Context value
  const value = {
    // State
    selections: state.selections,
    selectionMode: state.selectionMode,
    textItemsCache: state.textItemsCache,

    // Actions
    addSelection,
    removeSelection,
    clearSelections,
    setSelectionMode,
    cacheTextItems,
    clearTextCache,

    // Helpers
    getSelectionsForPage,
    getSelectionCount,
    getPageCount,
    hasSelections,
    getCachedTextItems,
    hasCachedTextItems
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

// Custom hook to use the selection context
export function useSelection() {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
}

// Export context for testing
export { SelectionContext };
