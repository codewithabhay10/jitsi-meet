import React, { useCallback } from 'react';

import Icon from '../../base/icons/components/Icon';

interface IProps {

    /**
     * The icon shown on the button (an SVG icon component).
     */
    icon: Function;

    /**
     * The DOM id of the radio button.
     */
    id: string;

    /**
     * The position of this option in the radiogroup.
     */
    index: number;

    /**
     * The translated label, used as the button's accessible name (the button
     * itself is icon-only).
     */
    label: string;

    /**
     * Selects the option at the given index.
     */
    onSelect: (index: number) => void;

    /**
     * Registers the button element under its index so the radiogroup can move
     * keyboard focus to it.
     */
    registerRef: (index: number, element: HTMLButtonElement | null) => void;

    /**
     * Whether this option is the selected one.
     */
    selected: boolean;
}

/**
 * A single icon-only layout option in the secondary toolbar, rendered as a
 * WAI-ARIA radio.
 *
 * Owns its own ref and click callbacks so the toolbar's radiogroup can map over
 * the options without inline binds (which the lint config forbids). The visible
 * glyph is an icon; the translated label is exposed via {@code aria-label} for
 * screen readers and as a tooltip.
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const LayoutRadioButton: React.FC<IProps> = ({
    icon,
    id,
    index,
    label,
    onSelect,
    registerRef,
    selected
}) => {
    const handleRef = useCallback((element: HTMLButtonElement | null) => {
        registerRef(index, element);
    }, [ index, registerRef ]);

    const handleClick = useCallback(() => {
        onSelect(index);
    }, [ index, onSelect ]);

    return (
        <button
            aria-checked = { selected }
            aria-label = { label }
            className = { `multi-screen-toolbar-btn ${selected ? 'active' : ''}` }
            id = { id }
            onClick = { handleClick }
            ref = { handleRef }
            role = 'radio'
            tabIndex = { selected ? 0 : -1 }
            title = { label }
            type = 'button'>
            <Icon
                size = { 22 }
                src = { icon } />
        </button>
    );
};

export default LayoutRadioButton;
