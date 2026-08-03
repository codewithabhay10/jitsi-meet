import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import Icon from '../../base/icons/components/Icon';
import { IconPin } from '../../base/icons/svg';
import { getParticipantDisplayName } from '../../base/participants/functions';
import { selectStageParticipant } from '../actions';

import GalleryTile from './GalleryTile';

interface IProps {

    /**
     * The height of the tile in pixels.
     */
    height: number;

    /**
     * Whether this participant is the dominant speaker (drives the speaking ring).
     */
    isActiveSpeaker: boolean;

    /**
     * The id of the participant — a person or a virtual screenshare — this tile
     * previews and pins to the stage on click.
     */
    participantId: string;

    /**
     * Whether the user has explicitly pinned this participant to the stage. Drives
     * the pin badge and makes a click unpin (rather than pin) this tile.
     */
    pinned: boolean;

    /**
     * The width of the tile in pixels.
     */
    width: number;
}

/**
 * A clickable tile in the Stage filmstrip.
 *
 * Wraps a {@link GalleryTile} — which already renders a person's camera or a
 * shared screen — in a button that pins that participant or screen to the stage,
 * mirroring how the main window's filmstrip thumbnails pin to the large video. A
 * pin badge marks the pinned tile; clicking it again unpins (returning the stage
 * to auto-select: the active screenshare, else the dominant speaker). Memoized so
 * pinning only re-renders the tiles whose {@code pinned} flag flips.
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const StageFilmstripItem: React.FC<IProps> = ({ height, isActiveSpeaker, participantId, pinned, width }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const name = useSelector((state: IReduxState) => getParticipantDisplayName(state, participantId));

    // Toggle: pin this tile, or unpin (null → auto-select) if it is already pinned.
    const onClick = useCallback(() => {
        dispatch(selectStageParticipant(pinned ? null : participantId));
    }, [ dispatch, participantId, pinned ]);

    return (
        <button
            aria-label = { t(pinned ? 'multiScreen.unpinFromStage' : 'multiScreen.showOnStage', { name }) }
            aria-pressed = { pinned }
            className = 'multi-screen-filmstrip-item'
            onClick = { onClick }
            type = 'button'>
            <GalleryTile
                height = { height }
                isActiveSpeaker = { isActiveSpeaker }
                participantId = { participantId }
                width = { width } />
            { pinned && (
                <span className = 'multi-screen-filmstrip-pin'>
                    <Icon
                        size = { 14 }
                        src = { IconPin } />
                </span>
            ) }
        </button>
    );
};

export default React.memo(StageFilmstripItem);
