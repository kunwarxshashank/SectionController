// Parse and process section data for visualization

/**
 * Parse station positions for SVG rendering
 * @param {Array} stations - Array of station objects
 * @returns {Array} Processed stations with SVG coordinates
 */
export const parseStations = (stations) => {
    if (!stations || stations.length === 0) return [];

    return stations.map((station, index) => ({
        ...station,
        svgX: index * 200 + 100, // Space stations 200px apart
        svgY: 150, // Fixed Y position for horizontal layout
    }));
};

/**
 * Parse tracks and blocks for SVG rendering
 * @param {Array} tracks - Array of track objects
 * @param {Array} stations - Array of station objects
 * @returns {Array} Processed tracks with SVG coordinates
 */
export const parseTracks = (tracks, stations) => {
    if (!tracks || tracks.length === 0) return [];

    const parsedStations = parseStations(stations);

    return tracks.map((track, trackIndex) => {
        const yOffset = trackIndex * 60; // Stack tracks vertically

        const parsedBlocks = track.blocks?.map((block, blockIndex) => {
            const blockWidth = 150;
            const x = blockIndex * blockWidth + 50;
            const y = 100 + yOffset;

            return {
                ...block,
                svgX: x,
                svgY: y,
                svgWidth: blockWidth - 10,
                svgHeight: 40,
                signalX: x + blockWidth - 10,
                signalY: y + 20,
            };
        }) || [];

        return {
            ...track,
            yOffset,
            blocks: parsedBlocks,
        };
    });
};

/**
 * Calculate SVG canvas size based on tracks and stations
 * @param {Array} tracks - Array of track objects
 * @param {Array} stations - Array of station objects
 * @returns {Object} Canvas dimensions {width, height}
 */
export const calculateCanvasSize = (tracks, stations) => {
    const maxBlocks = Math.max(...(tracks?.map(t => t.blocks?.length || 0) || [0]));
    const width = Math.max(maxBlocks * 150 + 100, stations.length * 200 + 200);
    const height = (tracks?.length || 1) * 60 + 200;

    return { width, height };
};

/**
 * Get signal color based on aspect
 * @param {String} aspect - Signal aspect (GREEN, YELLOW, RED)
 * @returns {String} CSS color class
 */
export const getSignalColor = (aspect) => {
    switch (aspect?.toUpperCase()) {
        case 'GREEN':
            return 'signal-green';
        case 'YELLOW':
        case 'DOUBLE_YELLOW':
            return 'signal-yellow';
        case 'RED':
            return 'signal-red';
        default:
            return 'signal-red';
    }
};

/**
 * Find train's current block on the track
 * @param {Object} train - Train object
 * @param {Array} tracks - Array of parsed tracks
 * @returns {Object|null} Block object or null
 */
export const findTrainBlock = (train, tracks) => {
    if (!train.currentBlock) return null;

    for (const track of tracks) {
        const block = track.blocks?.find(
            b => b.id === train.currentBlock || b.block_id === train.currentBlock
        );
        if (block) return { ...block, track };
    }

    return null;
};

/**
 * Calculate train's SVG position on track
 * @param {Object} train - Train object
 * @param {Array} tracks - Array of parsed tracks
 * @returns {Object} Position {x, y} or null
 */
export const calculateTrainSVGPosition = (train, tracks) => {
    const block = findTrainBlock(train, tracks);

    if (!block) return null;

    // Place train in the middle of the block
    return {
        x: block.svgX + block.svgWidth / 2,
        y: block.svgY + block.svgHeight / 2,
    };
};

/**
 * Parse complete section data for visualization
 * @param {Object} sectionData - Complete section data from JSON
 * @returns {Object} Parsed data ready for SVG rendering
 */
export const parseSectionData = (sectionData) => {
    if (!sectionData) return null;

    const parsedStations = parseStations(sectionData.stations);
    const parsedTracks = parseTracks(sectionData.tracks, parsedStations);
    const canvasSize = calculateCanvasSize(parsedTracks, parsedStations);

    return {
        section: sectionData.section,
        stations: parsedStations,
        tracks: parsedTracks,
        canvasSize,
        raw: sectionData,
    };
};

/**
 * Get track color based on type and direction
 * @param {String} type - Track type (MAIN, LOOP)
 * @param {String} direction - Track direction (UP, DOWN)
 * @returns {String} CSS color
 */
export const getTrackColor = (type, direction) => {
    if (type === 'MAIN') {
        return direction === 'UP' ? '#3b82f6' : '#ef4444'; // Blue for UP, Red for DOWN
    }
    return '#fbbf24'; // Yellow for LOOP
};
