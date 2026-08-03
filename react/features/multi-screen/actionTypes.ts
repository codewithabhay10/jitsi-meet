/**
 * The type of (redux) action which sets the multi-screen active state.
 *
 * {
 *     type: SET_MULTI_SCREEN_ACTIVE,
 *     isActive: boolean
 * }
 */
export const SET_MULTI_SCREEN_ACTIVE = 'SET_MULTI_SCREEN_ACTIVE';

/**
 * The type of (redux) action which sets the layout mode of the secondary window.
 *
 * {
 *     type: SET_SECONDARY_LAYOUT,
 *     layout: SecondaryLayout
 * }
 */
export const SET_SECONDARY_LAYOUT = 'SET_SECONDARY_LAYOUT';

/**
 * The type of (redux) action which pins the participant (a person or a
 * screenshare) featured on the secondary window's Stage layout, letting the user
 * switch between several people or shared screens. A null value means auto-select
 * (mirror the main window's stage, falling back to the dominant speaker).
 *
 * {
 *     type: SET_STAGE_PARTICIPANT,
 *     participantId: string | null
 * }
 */
export const SET_STAGE_PARTICIPANT = 'SET_STAGE_PARTICIPANT';

/**
 * The type of (redux) action which opens or collapses the Stage filmstrip in the
 * secondary window. This is local to the secondary window so it does not touch
 * the main window's own filmstrip visibility.
 *
 * {
 *     type: SET_STAGE_FILMSTRIP_OPEN,
 *     open: boolean
 * }
 */
export const SET_STAGE_FILMSTRIP_OPEN = 'SET_STAGE_FILMSTRIP_OPEN';
