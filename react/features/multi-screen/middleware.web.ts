import { IStore } from '../app/types';
import { CONFERENCE_FAILED, CONFERENCE_LEFT } from '../base/conference/actionTypes';
import { CONNECTION_DISCONNECTED } from '../base/connection/actionTypes';
import { getScreenshareParticipantIds } from '../base/participants/functions';
import MiddlewareRegistry from '../base/redux/MiddlewareRegistry';
import { TRACK_ADDED, TRACK_REMOVED, TRACK_UPDATED } from '../base/tracks/actionTypes';

import {
    closeSecondaryWindow,
    getSecondaryWindow,
    selectStageParticipant,
    setSecondaryLayout
} from './actions.web';
import { SECONDARY_LAYOUTS } from './constants';
import { getSecondaryLayout, isMultiScreenActive } from './functions';
import logger from './logger';

/**
 * Actions after which the set of active screenshares may have changed, so the
 * auto-switch-to-Stage check is worth running.
 */
const SCREENSHARE_AFFECTING_ACTIONS = new Set([ TRACK_ADDED, TRACK_REMOVED, TRACK_UPDATED ]);

/**
 * Switches the secondary window to the Stage layout when a new screenshare has
 * just started, so the shared screen is featured automatically.
 *
 * Acts only when the number of active screenshares grew (someone started sharing)
 * and Stage is not already showing; the caller has already gated on the secondary
 * window being open. The layout is set transiently ({@code setSecondaryLayout})
 * rather than via {@code selectSecondaryLayout}, so this automatic switch is not
 * remembered as the user's preferred layout the next time they open the window.
 * Any stale pin is also cleared so the new share is featured via the large-video
 * mirror rather than whatever the user had pinned before.
 *
 * This is a switch-in-only policy: it never switches away when sharing stops, so a
 * layout the user manually selected (or was auto-switched to) persists until the
 * next new share. Opening the window while a share is already active applies the
 * same policy (see {@link openSecondaryWindow}).
 *
 * @param {IStore} store - The redux store.
 * @param {number} previousShareCount - The screenshare count captured before the
 * action was processed.
 * @returns {void}
 */
function maybeAutoSwitchToStage(store: IStore, previousShareCount: number): void {
    const state = store.getState();
    const currentShareCount = getScreenshareParticipantIds(state).length;

    if (currentShareCount > previousShareCount
            && getSecondaryLayout(state) !== SECONDARY_LAYOUTS.STAGE) {
        logger.info('Screenshare started — auto-switching secondary window to Stage');
        store.dispatch(setSecondaryLayout(SECONDARY_LAYOUTS.STAGE));
        store.dispatch(selectStageParticipant(null));
    }
}

/**
 * Middleware for the multi-screen feature.
 *
 * Handles two side effects:
 * 1. Auto-switching the secondary window to the Stage layout when a screenshare
 *    starts.
 * 2. Automatic cleanup of the secondary window whenever the user leaves the
 *    conference — by leaving, on failure, or on disconnect — preventing stale
 *    orphaned popup windows.
 */
MiddlewareRegistry.register(store => next => action => {
    // Capture the screenshare count before the action is applied, but only for the
    // actions that can change it and only while the secondary window is open — so a
    // session with the window closed (the common case) pays nothing on track churn.
    const watchScreenshares = SCREENSHARE_AFFECTING_ACTIONS.has(action.type)
        && isMultiScreenActive(store.getState());
    const previousShareCount = watchScreenshares
        ? getScreenshareParticipantIds(store.getState()).length
        : 0;

    const result = next(action);

    switch (action.type) {
    case CONFERENCE_LEFT:
    case CONFERENCE_FAILED:
    case CONNECTION_DISCONNECTED: {
        const secondaryWindow = getSecondaryWindow();

        if (secondaryWindow && !secondaryWindow.closed) {
            logger.info(`${action.type} — auto-closing secondary window`);
            store.dispatch(closeSecondaryWindow());
        }
        break;
    }
    }

    if (watchScreenshares) {
        maybeAutoSwitchToStage(store, previousShareCount);
    }

    return result;
});
