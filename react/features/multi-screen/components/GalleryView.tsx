import React, { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { getGalleryGridDimensions } from '../functions';

import GalleryTile from './GalleryTile';

/**
 * Maximum number of columns in the gallery grid.
 */
const MAX_GALLERY_COLUMNS = 5;

/**
 * Gap between gallery tiles in pixels.
 */
const GALLERY_GAP = 4;

interface IProps {

    /**
     * The participant currently shown with the dominant-speaker ring, if any.
     */
    dominantSpeakerId: string | null;

    /**
     * Ordered participant IDs to render as tiles (local first, then remotes).
     */
    participantIds: string[];
}

/**
 * Gallery layout for the secondary window: every participant in a responsive
 * grid sized to the container.
 *
 * @param {IProps} props - Component props.
 * @returns {React.ReactElement}
 */
const GalleryView: React.FC<IProps> = ({ dominantSpeakerId, participantIds }) => {
    const { t } = useTranslation();

    // Container dimensions, tracked via a ResizeObserver bound through a callback
    // ref. The callback (re)attaches the observer whenever the grid mounts —
    // including when participants arrive after the window opened empty — and
    // disconnects it when the grid unmounts (React calls it with null), so the
    // observer never lingers on a detached node.
    const [ dimensions, setDimensions ] = useState<{ height: number; width: number; } | null>(null);
    const observerRef = useRef<ResizeObserver | null>(null);

    const attachGridRef = useCallback((element: HTMLDivElement | null) => {
        observerRef.current?.disconnect();
        observerRef.current = null;

        if (!element) {
            return;
        }

        const measure = () => setDimensions({
            width: element.clientWidth,
            height: element.clientHeight
        });

        const observer = new ResizeObserver(measure);

        observer.observe(element);
        observerRef.current = observer;
        measure();
    }, []);

    const count = participantIds.length;

    if (count === 0) {
        return (
            <div className = 'multi-screen-gallery-placeholder'>
                <div className = 'multi-screen-gallery-message'>
                    { t('multiScreen.noParticipants') }
                </div>
            </div>
        );
    }

    // The grid is always rendered so attachGridRef can measure it; the tiles
    // themselves wait until the first measurement lands, avoiding a frame of
    // mis-sized tiles from a guessed default size.
    let tiles: React.ReactNode = null;

    if (dimensions) {
        const { columns, rows } = getGalleryGridDimensions(count, MAX_GALLERY_COLUMNS);

        // Calculate tile dimensions based on the gallery container size.
        const availableWidth = dimensions.width - ((columns - 1) * GALLERY_GAP) - 16;
        const availableHeight = dimensions.height - ((rows - 1) * GALLERY_GAP) - 16;
        const tileWidth = Math.floor(availableWidth / columns);
        const tileHeight = Math.floor(availableHeight / rows);

        // Build rows of participant IDs.
        const galleryRows: string[][] = [];

        for (let i = 0; i < count; i += columns) {
            galleryRows.push(participantIds.slice(i, i + columns));
        }

        tiles = galleryRows.map((row, rowIndex) => (
            <div
                className = 'multi-screen-gallery-row'
                key = { `row-${rowIndex}` }>
                { row.map(id => (
                    <GalleryTile
                        height = { tileHeight }
                        isActiveSpeaker = { id === dominantSpeakerId }
                        key = { id }
                        participantId = { id }
                        width = { tileWidth } />
                )) }
            </div>
        ));
    }

    return (
        <div
            className = 'multi-screen-gallery'
            ref = { attachGridRef }>
            { tiles }
        </div>
    );
};

export default GalleryView;
