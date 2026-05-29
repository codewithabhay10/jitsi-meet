import { IStore } from '../app/types';

import { SET_MULTI_SCREEN_ACTIVE, SET_SECONDARY_LAYOUT } from './actionTypes';
import { SecondaryLayout } from './constants';
import { isMultiScreenSupported } from './functions';
import logger from './logger';

/**
 * Module-level reference to the secondary window.
 * Stored at module scope so it persists across renders and can be
 * accessed by the portal component without going through Redux.
 */
let secondaryWindow: Window | null = null;

/**
 * Returns the current secondary window reference, or null if not open.
 *
 * @returns {Window|null} The secondary window.
 */
export function getSecondaryWindow(): Window | null {
    return secondaryWindow;
}

/**
 * Copies all stylesheets from the main document into a target window document.
 *
 * Uses a two-tier approach:
 * 1. Same-origin stylesheets: inline the CSS rules as style elements.
 * 2. Cross-origin stylesheets: link to the external stylesheet via link element.
 *
 * @param {Window} targetWindow - The window to copy styles into.
 * @returns {void}
 */
export function copyStylesToWindow(targetWindow: Window): void {
    const targetDoc = targetWindow.document;

    Array.from(document.styleSheets).forEach(styleSheet => {
        try {
            // Tier 1: Same-origin — inline the CSS rules directly.
            const cssRules = Array.from(styleSheet.cssRules)
                .map(rule => rule.cssText)
                .join('\n');
            const style = targetDoc.createElement('style');

            style.textContent = cssRules;
            targetDoc.head.appendChild(style);
        } catch {
            // Tier 2: Cross-origin — link to the external stylesheet.
            if (styleSheet.href) {
                const link = targetDoc.createElement('link');

                link.rel = 'stylesheet';
                link.href = styleSheet.href;
                targetDoc.head.appendChild(link);
            }
        }
    });
}

/**
 * Opens a secondary browser window for multi-screen conferencing.
 *
 * Uses the Window Management API (getScreenDetails) to detect connected
 * monitors and position the window on a non-primary screen when available.
 * Falls back to a default offset position if the API is unavailable.
 *
 * @returns {Function}
 */
export function openSecondaryWindow() {
    return async (dispatch: IStore['dispatch'], getState: IStore['getState']) => {
        const state = getState();

        if (!isMultiScreenSupported(state)) {
            logger.warn('Multi-screen is not supported or not enabled');

            return;
        }

        // Don't open a second window if one is already active.
        if (secondaryWindow && !secondaryWindow.closed) {
            logger.warn('Secondary window is already open');
            secondaryWindow.focus();

            return;
        }

        let left = 100;
        let top = 100;
        let width = 960;
        let height = 540;

        // Try to use the Window Management API for smart screen placement.
        try {
            if ('getScreenDetails' in window) {
                // @ts-ignore — Window Management API types not yet in lib.dom.
                const screenDetails = await window.getScreenDetails();
                const screens = screenDetails.screens;

                if (screens.length > 1) {
                    // Find a non-primary screen and fill it.
                    const secondary = screens.find(
                        (s: { isPrimary: boolean; }) => !s.isPrimary
                    ) || screens[1];

                    left = secondary.availLeft;
                    top = secondary.availTop;
                    width = secondary.availWidth;
                    height = secondary.availHeight;

                    logger.info(
                        `Targeting secondary screen: ${width}x${height} at (${left}, ${top})`
                    );
                } else {
                    logger.info('Only one screen detected, using offset position');
                }
            }
        } catch (error) {
            logger.warn('Window Management API failed, using fallback position', error);
        }

        // Open the secondary window.
        const features = `left=${left},top=${top},width=${width},height=${height}`;

        try {
            const newWindow = window.open('about:blank', 'jitsi-multi-screen', features);

            if (!newWindow) {
                logger.error('Popup was blocked by the browser');

                return;
            }

            // Set up the secondary window document.
            newWindow.document.title = 'Jitsi Meet — Multi-Screen';

            // Set dark background matching conference theme.
            newWindow.document.documentElement.style.backgroundColor = '#1a1a2e';
            newWindow.document.body.style.backgroundColor = '#1a1a2e';
            newWindow.document.body.style.margin = '0';
            newWindow.document.body.style.padding = '0';
            newWindow.document.body.style.overflow = 'hidden';

            // Create the root element for React portal rendering.
            const rootDiv = newWindow.document.createElement('div');

            rootDiv.id = 'multi-screen-root';
            rootDiv.style.width = '100%';
            rootDiv.style.height = '100%';
            newWindow.document.body.appendChild(rootDiv);

            // Copy all stylesheets from the main window.
            copyStylesToWindow(newWindow);

            // Store the window reference.
            secondaryWindow = newWindow;

            // Listen for the secondary window being closed.
            newWindow.addEventListener('pagehide', () => {
                dispatch(closeSecondaryWindow());
            });

            // Update Redux state.
            dispatch({
                type: SET_MULTI_SCREEN_ACTIVE,
                isActive: true
            });

            logger.info('Secondary window opened successfully');
        } catch (error) {
            logger.error('Failed to open secondary window', error);
        }
    };
}

/**
 * Closes the secondary browser window and cleans up state.
 *
 * @returns {Function}
 */
export function closeSecondaryWindow() {
    return (dispatch: IStore['dispatch']) => {
        if (secondaryWindow && !secondaryWindow.closed) {
            secondaryWindow.close();
        }

        secondaryWindow = null;

        dispatch({
            type: SET_MULTI_SCREEN_ACTIVE,
            isActive: false
        });

        logger.info('Secondary window closed');
    };
}

/**
 * Toggles the secondary multi-screen window open or closed.
 *
 * @returns {Function}
 */
export function toggleMultiScreen() {
    return (dispatch: IStore['dispatch']) => {
        if (secondaryWindow && !secondaryWindow.closed) {
            dispatch(closeSecondaryWindow());
        } else {
            dispatch(openSecondaryWindow());
        }
    };
}

/**
 * Sets the layout mode of the secondary window.
 *
 * @param {SecondaryLayout} layout - The layout to set (from SECONDARY_LAYOUTS).
 * @returns {{
 *     type: SET_SECONDARY_LAYOUT,
 *     layout: SecondaryLayout
 * }}
 */
export function setSecondaryLayout(layout: SecondaryLayout) {
    return {
        type: SET_SECONDARY_LAYOUT,
        layout
    };
}
