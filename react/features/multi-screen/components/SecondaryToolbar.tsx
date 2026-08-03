import React, { useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';

import { IReduxState } from '../../app/types';
import { IconTileView, IconUser } from '../../base/icons/svg';
import { selectSecondaryLayout } from '../actions';
import { SECONDARY_LAYOUTS, SecondaryLayout } from '../constants';
import { getSecondaryLayout } from '../functions';

import LayoutRadioButton from './LayoutRadioButton';

/**
 * The selectable layouts, in the order they appear in the toolbar radiogroup.
 * Icons mirror the main window: a single focused person for Stage, the grid for
 * Tile.
 */
const LAYOUT_OPTIONS: Array<{ icon: Function; id: string; labelKey: string; layout: SecondaryLayout; }> = [
    { icon: IconUser, id: 'multiScreenStageBtn', labelKey: 'multiScreen.stageView', layout: SECONDARY_LAYOUTS.STAGE },
    { icon: IconTileView, id: 'multiScreenTileBtn', labelKey: 'multiScreen.tileView', layout: SECONDARY_LAYOUTS.TILE }
];

/**
 * Toolbar displayed inside the secondary browser window.
 *
 * A minimal, icon-only layout switcher modelled on the main window's toolbox. The
 * buttons form a WAI-ARIA radiogroup: only the selected one is in the tab order
 * (roving tabindex) and the arrow/Home/End keys move the selection between them.
 * The window is closed via its native title-bar control, so there is no in-app
 * close button. All state changes go through the shared Redux store.
 *
 * @returns {React.ReactElement}
 */
const SecondaryToolbar: React.FC = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const currentLayout = useSelector(
        (state: IReduxState) => getSecondaryLayout(state)
    );
    const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const selectedIndex = LAYOUT_OPTIONS.findIndex(option => option.layout === currentLayout);

    const registerRef = useCallback((index: number, element: HTMLButtonElement | null) => {
        buttonRefs.current[index] = element;
    }, []);

    /**
     * Switches to the layout at the given index and moves focus to its radio,
     * following the WAI-ARIA roving-tabindex radio pattern.
     *
     * @param {number} index - The option index to select.
     * @returns {void}
     */
    const selectIndex = useCallback((index: number) => {
        dispatch(selectSecondaryLayout(LAYOUT_OPTIONS[index].layout));
        buttonRefs.current[index]?.focus();
    }, [ dispatch ]);

    /**
     * Moves the radiogroup selection with the keyboard: arrows wrap between the
     * options, Home selects the first and End the last.
     *
     * @param {React.KeyboardEvent} event - The keydown event.
     * @returns {void}
     */
    const onLayoutKeyDown = useCallback((event: React.KeyboardEvent) => {
        const count = LAYOUT_OPTIONS.length;
        let nextIndex: number;

        switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
            nextIndex = (selectedIndex + 1) % count;
            break;
        case 'ArrowLeft':
        case 'ArrowUp':
            nextIndex = ((selectedIndex - 1) + count) % count;
            break;
        case 'Home':
            nextIndex = 0;
            break;
        case 'End':
            nextIndex = count - 1;
            break;
        default:
            return;
        }

        event.preventDefault();
        selectIndex(nextIndex);
    }, [ selectedIndex, selectIndex ]);

    return (
        <div className = 'multi-screen-toolbar'>
            <div
                aria-label = { t('multiScreen.layoutLabel') }
                className = 'multi-screen-toolbar-buttons'
                onKeyDown = { onLayoutKeyDown }
                role = 'radiogroup'>
                { LAYOUT_OPTIONS.map((option, index) => (
                    <LayoutRadioButton
                        icon = { option.icon }
                        id = { option.id }
                        index = { index }
                        key = { option.layout }
                        label = { t(option.labelKey) }
                        onSelect = { selectIndex }
                        registerRef = { registerRef }
                        selected = { index === selectedIndex } />
                )) }
            </div>
        </div>
    );
};

export default SecondaryToolbar;
