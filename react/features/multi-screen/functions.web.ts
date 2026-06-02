import { IReduxState } from '../app/types';

import { SECONDARY_WINDOW_FALLBACK, SecondaryLayout } from './constants';
import logger from './logger';

/**
 * The on-screen placement (position and size, in pixels) of the secondary
 * multi-screen window.
 */
export interface ISecondaryWindowPlacement {

    /**
     * The height of the window.
     */
    height: number;

    /**
     * The distance from the left edge of the (virtual) screen.
     */
    left: number;

    /**
     * The distance from the top edge of the (virtual) screen.
     */
    top: number;

    /**
     * The width of the window.
     */
    width: number;
}

/**
 * The result of resolving a secondary-window placement: the geometry plus
 * whether the Window Management permission was denied (so the caller can
 * surface that to the user).
 */
export interface ISecondaryWindowPlacementResult {

    /**
     * Whether window-management permission was denied, causing placement to
     * fall back instead of targeting a specific monitor.
     */
    permissionDenied: boolean;

    /**
     * The computed window geometry.
     */
    placement: ISecondaryWindowPlacement;
}

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

/**
 * Computes the placement (position and size) for the secondary multi-screen
 * window.
 *
 * Uses the Window Management API (getScreenDetails) to detect connected
 * monitors and, when more than one is present, fills a non-primary screen.
 * When only a single screen is available — or the API is unsupported or its
 * permission is denied — it falls back to an offset window sized relative to
 * the available screen real estate (see {@link SECONDARY_WINDOW_FALLBACK}).
 *
 * @returns {Promise<ISecondaryWindowPlacementResult>} The placement geometry
 * and whether window-management permission was denied.
 */
export async function getSecondaryWindowPlacement(): Promise<ISecondaryWindowPlacementResult> {
    const placement = getFallbackPlacement();

    if (typeof window === 'undefined' || !('getScreenDetails' in window)) {
        return { permissionDenied: false, placement };
    }

    try {
        const { screens } = await window.getScreenDetails();

        if (screens.length <= 1) {
            logger.info('Only one screen detected, using offset position');

            return { permissionDenied: false, placement };
        }

        // Find a non-primary screen and fill it.
        const secondary = screens.find(s => !s.isPrimary) || screens[1];
        const targeted: ISecondaryWindowPlacement = {
            height: secondary.availHeight,
            left: secondary.availLeft,
            top: secondary.availTop,
            width: secondary.availWidth
        };

        logger.info(`Targeting secondary screen: ${targeted.width}x${targeted.height} `
            + `at (${targeted.left}, ${targeted.top})`);

        return { permissionDenied: false, placement: targeted };
    } catch (error) {
        // getScreenDetails rejects with a NotAllowedError DOMException when the
        // window-management permission is denied; distinguish that so the caller
        // can prompt the user, versus other (transient) failures.
        const permissionDenied = error instanceof DOMException && error.name === 'NotAllowedError';

        logger.warn('Window Management API failed, using fallback position', error);

        return { permissionDenied, placement };
    }
}

/**
 * Builds the fallback placement used when the secondary window cannot be
 * targeted to a specific monitor. The window is sized to a fraction of the
 * available screen real estate, degrading to fixed dimensions when the screen
 * metrics cannot be read.
 *
 * @returns {ISecondaryWindowPlacement} The fallback window placement geometry.
 */
function getFallbackPlacement(): ISecondaryWindowPlacement {
    const { HEIGHT, LEFT, SIZE_RATIO, TOP, WIDTH } = SECONDARY_WINDOW_FALLBACK;
    const availWidth = typeof window === 'undefined' ? 0 : window.screen.availWidth;
    const availHeight = typeof window === 'undefined' ? 0 : window.screen.availHeight;

    return {
        height: Math.round(availHeight * SIZE_RATIO) || HEIGHT,
        left: LEFT,
        top: TOP,
        width: Math.round(availWidth * SIZE_RATIO) || WIDTH
    };
}
