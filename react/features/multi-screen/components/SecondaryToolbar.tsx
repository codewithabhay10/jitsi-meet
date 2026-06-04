import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import { closeSecondaryWindow, setSecondaryLayout } from '../actions';
import { SECONDARY_LAYOUTS } from '../constants';
import { getSecondaryLayout } from '../functions';

/**
 * Toolbar displayed inside the secondary browser window.
 *
 * Provides layout toggle buttons (Active Speaker / Gallery) and a close
 * button. All state changes go through the shared Redux store.
 *
 * @returns {React.ReactElement}
 */
const SecondaryToolbar: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const currentLayout = useSelector(
        (state: IReduxState) => getSecondaryLayout(state)
    );

    /**
     * Handles switching to active speaker layout.
     *
     * @returns {void}
     */
    const onActiveSpeaker = useCallback(() => {
        dispatch(setSecondaryLayout(SECONDARY_LAYOUTS.ACTIVE_SPEAKER));
    }, [ dispatch ]);

    /**
     * Handles switching to gallery layout.
     *
     * @returns {void}
     */
    const onGallery = useCallback(() => {
        dispatch(setSecondaryLayout(SECONDARY_LAYOUTS.GALLERY));
    }, [ dispatch ]);

    /**
     * Handles closing the secondary window.
     *
     * @returns {void}
     */
    const onClose = useCallback(() => {
        dispatch(closeSecondaryWindow());
    }, [ dispatch ]);

    return (
        <div className = 'multi-screen-toolbar'>
            <div className = 'multi-screen-toolbar-buttons'>
                <button
                    aria-pressed = { currentLayout === SECONDARY_LAYOUTS.ACTIVE_SPEAKER }
                    className = { `multi-screen-toolbar-btn ${
                        currentLayout === SECONDARY_LAYOUTS.ACTIVE_SPEAKER
                            ? 'active' : ''
                    }` }
                    id = 'multiScreenActiveSpeakerBtn'
                    onClick = { onActiveSpeaker }
                    type = 'button'>
                    { t('multiScreen.speakerView') }
                </button>
                <button
                    aria-pressed = { currentLayout === SECONDARY_LAYOUTS.GALLERY }
                    className = { `multi-screen-toolbar-btn ${
                        currentLayout === SECONDARY_LAYOUTS.GALLERY
                            ? 'active' : ''
                    }` }
                    id = 'multiScreenGalleryBtn'
                    onClick = { onGallery }
                    type = 'button'>
                    { t('multiScreen.galleryView') }
                </button>
            </div>
            <button
                className = 'multi-screen-toolbar-btn multi-screen-close-btn'
                id = 'multiScreenCloseBtn'
                onClick = { onClose }
                type = 'button'>
                { t('multiScreen.close') }
            </button>
        </div>
    );
};

export default SecondaryToolbar;
