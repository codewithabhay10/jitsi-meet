import { IReduxState } from '../app/types';

import { SecondaryLayout } from './constants';

/**
 * Returns whether multi-screen support is available in the current browser.
 *
 * The feature requires the Window Management API (getScreenDetails) for
 * optimal multi-monitor placement, but falls back to basic window.open()
 * positioning if the API is unavailable.
 *
 * Currently gated on Window Management API support (Chrome/Edge 100+).
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {boolean} Whether multi-screen is supported.
 */
export function isMultiScreenSupported(state: IReduxState): boolean {
    return typeof window !== 'undefined'
        && 'getScreenDetails' in window
        && state['features/base/config'].multiScreen?.enabled !== false;
}

/**
 * Returns whether the secondary multi-screen window is currently active.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {boolean} Whether multi-screen is active.
 */
export function isMultiScreenActive(state: IReduxState): boolean {
    return state['features/multi-screen'].isActive;
}

/**
 * Returns the current layout mode of the secondary window.
 *
 * @param {IReduxState} state - The Redux state.
 * @returns {SecondaryLayout} The current secondary layout.
 */
export function getSecondaryLayout(state: IReduxState): SecondaryLayout {
    return state['features/multi-screen'].secondaryLayout;
}
