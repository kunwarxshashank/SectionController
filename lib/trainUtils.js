// Utility functions for train-related operations

// Train type configurations
export const TRAIN_TYPES = {
    EXPRESS: {
        label: 'Express',
        color: 'red',
        badgeClass: 'badge-express',
    },
    FREIGHT: {
        label: 'Freight',
        color: 'yellow',
        badgeClass: 'badge-freight',
    },
    LOCAL: {
        label: 'Local',
        color: 'blue',
        badgeClass: 'badge-local',
    },
    PASSENGER: {
        label: 'Passenger',
        color: 'green',
        badgeClass: 'badge-local',
    },
};

// Priority level configurations
export const PRIORITY_LEVELS = {
    HIGH: {
        label: 'High',
        color: 'red',
        badgeClass: 'badge-high',
    },
    MEDIUM: {
        label: 'Medium',
        color: 'orange',
        badgeClass: 'badge-medium',
    },
    LOW: {
        label: 'Low',
        color: 'green',
        badgeClass: 'badge-low',
    },
};

// Get train type badge class
export const getTrainTypeBadge = (type) => {
    const trainType = type?.toUpperCase();
    return TRAIN_TYPES[trainType]?.badgeClass || 'badge-local';
};

// Get priority badge class
export const getPriorityBadge = (priority) => {
    const priorityLevel = priority?.toUpperCase();
    return PRIORITY_LEVELS[priorityLevel]?.badgeClass || 'badge-medium';
};

// Calculate delay status
export const getDelayStatus = (delayMinutes) => {
    if (delayMinutes <= 0) return { status: 'On Time', color: 'green' };
    if (delayMinutes <= 5) return { status: `${delayMinutes} min late`, color: 'yellow' };
    if (delayMinutes <= 15) return { status: `${delayMinutes} min late`, color: 'orange' };
    return { status: `${delayMinutes} min late`, color: 'red' };
};

// Format train number (e.g., "12345" -> "#12345")
export const formatTrainNumber = (number) => {
    return `#${number}`;
};

// Calculate ETA from current position and speed
export const calculateETA = (distanceKm, speedKmph) => {
    if (!speedKmph || speedKmph === 0) return 'N/A';

    const hours = distanceKm / speedKmph;
    const minutes = Math.round(hours * 60);

    if (minutes < 60) return `${minutes} min`;

    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hrs}h ${mins}m`;
};

// Calculate train position on track (percentage based on block index)
export const calculateTrainPosition = (train, sectionData) => {
    if (!train.currentBlock) return 0;

    const track = sectionData.tracks?.find(t =>
        t.blocks?.some(b => b.block_id === train.currentBlock)
    );

    if (!track || !track.blocks) return 0;

    const blockIndex = track.blocks.findIndex(b => b.block_id === train.currentBlock);
    if (blockIndex === -1) return 0;

    const totalBlocks = track.blocks.length;
    return (blockIndex / totalBlocks) * 100;
};

// Get block by ID from section data
export const getBlockById = (blockId, sectionData) => {
    for (const track of sectionData.tracks || []) {
        const block = track.blocks?.find(b => b.id === blockId || b.block_id === blockId);
        if (block) return block;
    }
    return null;
};

// Get station by ID from section data
export const getStationById = (stationId, sectionData) => {
    return sectionData.stations?.find(s => s.id === stationId);
};

// Calculate next station for a train
export const getNextStation = (train, sectionData) => {
    const track = sectionData.tracks?.find(t =>
        t.direction === train.direction
    );

    if (!track) return 'Unknown';

    // Simple logic: get the stations ahead in the direction
    const stations = sectionData.stations || [];
    if (stations.length === 0) return 'Unknown';

    // For now, return the last station
    return stations[stations.length - 1]?.name || 'Unknown';
};

// Sort trains by priority and delay
export const sortTrains = (trains) => {
    const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    return [...trains].sort((a, b) => {
        const aPriority = priorityOrder[a.priority?.toUpperCase()] ?? 1;
        const bPriority = priorityOrder[b.priority?.toUpperCase()] ?? 1;

        if (aPriority !== bPriority) return aPriority - bPriority;

        // If same priority, sort by delay (higher delay first)
        return (b.delay || 0) - (a.delay || 0);
    });
};

// Filter trains by time window
export const filterTrainsByTime = (trains, hoursAhead) => {
    const now = new Date();
    const futureTime = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);

    return trains.filter(train => {
        if (!train.eta) return true; // Show trains without ETA

        const trainETA = new Date(train.eta);
        return trainETA <= futureTime;
    });
};
