import { CONFERENCE_LEFT } from '../base/conference/actionTypes';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';

import { closeSecondaryWindow, getSecondaryWindow } from './actions.web';
import logger from './logger';

/**
 * Middleware for the multi-screen feature.
 *
 * Handles automatic cleanup of the secondary window when the user
 * leaves the conference, preventing stale popup windows.
 */
MiddlewareRegistry.register(store => next => action => {
    const result = next(action);

    switch (action.type) {
    case CONFERENCE_LEFT: {
        const secondaryWindow = getSecondaryWindow();

        if (secondaryWindow && !secondaryWindow.closed) {
            logger.info('Conference left — auto-closing secondary window');
            store.dispatch(closeSecondaryWindow());
        }
        break;
    }
    }

    return result;
});
