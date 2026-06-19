import ReducerRegistry from '../base/redux/ReducerRegistry';

import {
    SET_MULTI_SCREEN_ACTIVE,
    SET_SECONDARY_LAYOUT,
    SET_STAGE_FILMSTRIP_OPEN,
    SET_STAGE_PARTICIPANT
} from './actionTypes';
import { SECONDARY_LAYOUTS, SecondaryLayout } from './constants';

/**
 * The Redux state shape for the multi-screen feature.
 */
export interface IMultiScreenState {

    /**
     * Whether the secondary window is currently open and active.
     */
    isActive: boolean;

    /**
     * The current layout mode of the secondary window.
     * One of the values from SECONDARY_LAYOUTS.
     */
    secondaryLayout: SecondaryLayout;

    /**
     * Whether the Stage filmstrip is open (expanded). Collapsing it gives the
     * featured screen/person the full window, mirroring the main window's
     * collapsible filmstrip. Local to the secondary window.
     */
    stageFilmstripOpen: boolean;

    /**
     * The id of the participant (a person or a virtual screenshare) the user
     * pinned to the Stage layout, or null to auto-select it (mirror the main
     * window's stage, falling back to the dominant speaker). Lets the user switch
     * which screen or person the stage features from the filmstrip.
     */
    stagePinnedId: string | null;
}

/**
 * The default state for the multi-screen feature.
 */
const DEFAULT_STATE: IMultiScreenState = {
    isActive: false,
    secondaryLayout: SECONDARY_LAYOUTS.STAGE,
    stageFilmstripOpen: true,
    stagePinnedId: null
};

/**
 * Reduces the Redux actions of the multi-screen feature.
 */
ReducerRegistry.register<IMultiScreenState>(
    'features/multi-screen',
    (state = DEFAULT_STATE, action): IMultiScreenState => {
        switch (action.type) {
        case SET_MULTI_SCREEN_ACTIVE:
            return {
                ...state,
                isActive: action.isActive,

                // Reset the transient, per-session stage state when the window
                // closes so a reopen starts clean: a stale pin can't silently
                // reactivate (e.g. when a former presenter shares again under a
                // reused id) and the filmstrip reopens expanded. The chosen layout
                // is intentionally kept — it is the user's remembered preference,
                // re-applied on the next open.
                ...(action.isActive ? {} : {
                    stageFilmstripOpen: DEFAULT_STATE.stageFilmstripOpen,
                    stagePinnedId: DEFAULT_STATE.stagePinnedId
                })
            };

        case SET_SECONDARY_LAYOUT:
            return {
                ...state,
                secondaryLayout: action.layout
            };

        case SET_STAGE_PARTICIPANT:
            return {
                ...state,
                stagePinnedId: action.participantId
            };

        case SET_STAGE_FILMSTRIP_OPEN:
            return {
                ...state,
                stageFilmstripOpen: action.open
            };

        default:
            return state;
        }
    }
);
