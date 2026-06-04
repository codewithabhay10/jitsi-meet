import MultiScreenButton from './components/MultiScreenButton';

const multiScreen = {
    key: 'multi-screen',
    Content: MultiScreenButton,
    group: 2
};

/**
 * A hook that returns the multi-screen toolbar button descriptor. The button
 * itself hides when unsupported via its {@code visible} prop
 * (isMultiScreenSupported), so this always returns the descriptor.
 *
 * @returns {Object}
 */
export function useMultiScreenButton() {
    return multiScreen;
}
