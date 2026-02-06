/**
 * Core placement logic extracted for testing.
 * This module contains pure functions that can be tested independently of the DOM.
 */

const { PLACEMENT_RULES } = require('./placement-rules.js');
const { CONVERSION_RULES } = require('./conversion-rules.js');
const { UPGRADE_RULES } = require('./upgrade-rules.js');
const { ROOMS } = require('./rooms.js');

const GRID_SIZE = 9;
const LOCKED_CELL_INDEX = 76; // Locked cell at row 8, column 4 (8 * 9 + 4 = 76)

/**
 * Get adjacent cell indices for a given cell index on the grid.
 * @param {number} index - The cell index
 * @returns {Array<number>} Array of adjacent indices (can include LOCKED_CELL_INDEX sentinel)
 */
function getAdjacentIndices(index) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const adjacentIndices = [];

    // Up
    if (row > 0) {
        adjacentIndices.push(index - GRID_SIZE);
    }
    // Down
    if (row < GRID_SIZE - 1) {
        adjacentIndices.push(index + GRID_SIZE);
    }
    // Left
    if (col > 0) {
        adjacentIndices.push(index - 1);
    }
    // Right
    if (col < GRID_SIZE - 1) {
        adjacentIndices.push(index + 1);
    }

    return adjacentIndices;
}

/**
 * Check if converting a room would break its existing chain connections.
 * @param {number} roomIndex - The index of the room being converted
 * @param {string} convertedToId - The room ID it would be converted to
 * @param {Array} gridData - The current grid state
 * @returns {boolean} True if conversion would break the chain
 */
function wouldConversionBreakChain(roomIndex, convertedToId, gridData) {
    if (gridData[roomIndex] === null) return false;
    
    const adjacentIndices = getAdjacentIndices(roomIndex);
    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
    
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjRoomId = gridData[adjIndex].object.id;
            const adjAllowedRooms = PLACEMENT_RULES[adjRoomId] || [];
            
            // Check symmetric connection: both rooms must allow each other
            if (!convertedAllowedRooms.includes(adjRoomId) || !adjAllowedRooms.includes(convertedToId)) {
                return true;
            }
        }
        
        // Check connection to path (locked cell)
        if (adjIndex === LOCKED_CELL_INDEX) {
            if (!convertedAllowedRooms.includes('path')) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Get all valid rooms that can be placed at a given index.
 * @param {number} index - The cell index
 * @param {Array} gridData - The current grid state
 * @returns {Set<string>} Set of valid room IDs
 */
function getValidChainExtensions(index, gridData) {
    const adjacentIndices = getAdjacentIndices(index);
    const validRooms = new Set();
    
    // Check if there's an adjacent path (for generator placement rule)
    const hasAdjacentPath = adjacentIndices.some(adjIndex => 
        adjIndex === LOCKED_CELL_INDEX || 
        (gridData[adjIndex] !== null && gridData[adjIndex].object.id === 'path')
    );
    
    for (const adjIndex of adjacentIndices) {
        if (adjIndex === LOCKED_CELL_INDEX || (gridData[adjIndex] !== null)) {
            let roomId;
            if (adjIndex === LOCKED_CELL_INDEX) {
                roomId = 'path';
            } else {
                roomId = gridData[adjIndex].object.id;
            }
            
            // Add rooms that can directly extend from the adjacent room
            const extensions = getChainExtensions(roomId);
            extensions.forEach(ext => validRooms.add(ext));
            
            if (adjIndex !== LOCKED_CELL_INDEX) {
                // Add rooms that would convert the adjacent room (placed room converts adjacent)
                for (const [convertingRoomId, conversionTargets] of Object.entries(CONVERSION_RULES)) {
                    if (conversionTargets[roomId]) {
                        const convertedToId = conversionTargets[roomId];
                        const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                        const convertingAllowedRooms = PLACEMENT_RULES[convertingRoomId] || [];
                        
                        if (convertedAllowedRooms.includes(convertingRoomId) && convertingAllowedRooms.includes(convertedToId)) {
                            validRooms.add(convertingRoomId);
                        }
                    }
                }
                
                // Add rooms that would BE CONVERTED BY the adjacent room (adjacent room converts placed room)
                const adjConversionRule = CONVERSION_RULES[roomId];
                if (adjConversionRule) {
                    for (const [targetRoomId, convertedToId] of Object.entries(adjConversionRule)) {
                        // If adjacent room converts targetRoomId to convertedToId
                        // and convertedToId is a valid extension, then targetRoomId can be placed
                        const adjAllowedRooms = PLACEMENT_RULES[roomId] || [];
                        if (adjAllowedRooms.includes(convertedToId)) {
                            validRooms.add(targetRoomId);
                        }
                    }
                }
            }
        }
    }
    
    if (hasAdjacentPath) {
        validRooms.add('path');
    }
    
    // Generator can only be placed adjacent to a path
    if (!hasAdjacentPath) {
        validRooms.delete('generator');
    }
    
    // Filter out rooms that would break any chain when placed
    const safeRooms = new Set();
    for (const roomId of validRooms) {
        if (!wouldPlacementBreakAnyChain(index, roomId, gridData)) {
            safeRooms.add(roomId);
        }
    }
    
    return safeRooms;
}

/**
 * Check if placing a room would break any existing chain via conversions.
 * @param {number} index - The cell index
 * @param {string} roomId - The room ID to place
 * @param {Array} gridData - The current grid state
 * @returns {boolean} True if placement would break any chain
 */
function wouldPlacementBreakAnyChain(index, roomId, gridData) {
    const conversionRule = CONVERSION_RULES[roomId];
    if (!conversionRule) {
        return false;
    }
    
    const adjacentIndices = getAdjacentIndices(index);
    
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const convertedToId = conversionRule[adjacentObjectId];
            
            if (convertedToId) {
                if (wouldConversionBreakChain(adjIndex, convertedToId, gridData)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

/**
 * Get all rooms that can extend a chain starting from a given room.
 * @param {string} roomId - The room ID
 * @returns {Array<string>} Array of room IDs that can be placed next to the given room
 */
function getChainExtensions(roomId) {
    if (roomId === 'path') {
        return Object.keys(PLACEMENT_RULES).filter(id => id !== 'path');
    }
    
    const allowedRooms = PLACEMENT_RULES[roomId] || [];
    return allowedRooms.filter(id => id !== 'path');
}

/**
 * Check if a room can be placed at a given index.
 * @param {number} index - The cell index
 * @param {string} selectedRoomId - The room ID to place
 * @param {Array} gridData - The current grid state
 * @returns {boolean} True if placement is valid
 */
function isValidPlacement(index, selectedRoomId, gridData) {
    // Sacrificial chamber can only be placed once
    if (selectedRoomId === 'sacrificial_chamber') {
        const sacrificialChamberExists = gridData.some(cell =>
            cell !== null && cell.object.id === 'sacrificial_chamber'
        );
        if (sacrificialChamberExists) {
            return false;
        }
    }

    const adjacentIndices = getAdjacentIndices(index);

    // Generator can only be placed adjacent to a path
    if (selectedRoomId === 'generator') {
        const hasAdjacentPath = adjacentIndices.some(adjIndex =>
            adjIndex === LOCKED_CELL_INDEX ||
            (gridData[adjIndex] !== null && gridData[adjIndex].object.id === 'path')
        );
        if (!hasAdjacentPath) {
            return false;
        }
    }

    // Must have at least one adjacent room or path
    const hasAdjacentRoom = adjacentIndices.some(adjIndex =>
        adjIndex === LOCKED_CELL_INDEX || gridData[adjIndex] !== null
    );

    if (!hasAdjacentRoom) {
        return false;
    }

    // Check if placing this room would break any existing chain via conversions
    if (wouldPlacementBreakAnyChain(index, selectedRoomId, gridData)) {
        return false;
    }

    // Check if placing this room would try to upgrade an adjacent room that has already been upgraded by this room type
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentCell = gridData[adjIndex];
            const adjacentObjectId = adjacentCell.object.id;
            const adjacentUpgradeRule = UPGRADE_RULES[adjacentObjectId];

            // Check if the adjacent room can be upgraded by the selected room type
            if (adjacentUpgradeRule && adjacentUpgradeRule.type === 'list' &&
                Array.isArray(adjacentUpgradeRule.upgradedBy) &&
                adjacentUpgradeRule.upgradedBy.includes(selectedRoomId)) {
                // Check if the adjacent room has already been upgraded by this room type
                if (adjacentCell.upgradedBy && adjacentCell.upgradedBy.includes(selectedRoomId)) {
                    return false;
                }
            }
        }
    }

    // Check if all adjacent existing rooms allow this room to be placed
    // (connections must be symmetric - both rooms must allow each other)
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const adjAllowedRooms = PLACEMENT_RULES[adjacentObjectId] || [];
            const selectedAllowedRooms = PLACEMENT_RULES[selectedRoomId] || [];

            // Check if the connection is symmetrically allowed
            // If this room is NOT in the adjacent room's allowed list, placement is invalid
            // UNLESS there's a valid conversion that makes the connection work
            if (!adjAllowedRooms.includes(selectedRoomId)) {
                // Check if the selected room converts the adjacent room
                const selectedConversionRule = CONVERSION_RULES[selectedRoomId];
                const adjConversionRule = CONVERSION_RULES[adjacentObjectId];

                let hasValidConversion = false;

                // Case 1: Selected room converts adjacent room
                if (selectedConversionRule && selectedConversionRule[adjacentObjectId]) {
                    const convertedToId = selectedConversionRule[adjacentObjectId];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    const selectedAllowedRooms = PLACEMENT_RULES[selectedRoomId] || [];
                    // Conversion is valid if converted room allows selected room AND vice versa
                    if (convertedAllowedRooms.includes(selectedRoomId) &&
                        selectedAllowedRooms.includes(convertedToId)) {
                        hasValidConversion = true;
                    }
                }

                // Case 2: Adjacent room converts selected room
                if (adjConversionRule && adjConversionRule[selectedRoomId]) {
                    const convertedToId = adjConversionRule[selectedRoomId];
                    const adjAllowedRooms = PLACEMENT_RULES[adjacentObjectId] || [];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    // Conversion is valid if adjacent room allows converted room AND vice versa
                    if (adjAllowedRooms.includes(convertedToId) &&
                        convertedAllowedRooms.includes(adjacentObjectId)) {
                        hasValidConversion = true;
                    }
                }

                if (!hasValidConversion) {
                    return false;
                }
            }
        }
    }

    const validExtensions = getValidChainExtensions(index, gridData);

    if (validExtensions.has(selectedRoomId)) {
        return true;
    }

    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const adjacentConversionRule = CONVERSION_RULES[adjacentObjectId];

            if (adjacentConversionRule && adjacentConversionRule[selectedRoomId]) {
                const convertedToId = adjacentConversionRule[selectedRoomId];
                if (validExtensions.has(convertedToId)) {
                    return true;
                }
            }
        }

        if (adjIndex === LOCKED_CELL_INDEX) {
            const pathAllowedRooms = PLACEMENT_RULES['path'] || [];
            if (pathAllowedRooms.includes(selectedRoomId)) {
                return true;
            }
        }
    }

    const conversionRuleForSelected = CONVERSION_RULES[selectedRoomId];
    if (conversionRuleForSelected) {
        for (const adjIndex of adjacentIndices) {
            if (gridData[adjIndex] !== null) {
                const adjacentObjectId = gridData[adjIndex].object.id;
                if (conversionRuleForSelected[adjacentObjectId]) {
                    const convertedToId = conversionRuleForSelected[adjacentObjectId];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    const selectedAllowedRooms = PLACEMENT_RULES[selectedRoomId] || [];
                    if (convertedAllowedRooms.includes(selectedRoomId) &&
                        selectedAllowedRooms.includes(convertedToId)) {
                        return true;
                    }
                }
            }
        }
    }

    return false;
}

/**
 * Create an empty grid of the specified size.
 * @returns {Array} Empty grid array
 */
function createEmptyGrid() {
    return new Array(GRID_SIZE * GRID_SIZE).fill(null);
}

/**
 * Create a cell object for testing.
 * @param {string} roomId - The room ID
 * @param {Array<string>} upgradedBy - Optional array of room IDs that have upgraded this cell
 * @param {string} convertedBy - Optional room ID that converted this cell
 * @returns {Object} Cell object
 */
function createCell(roomId, upgradedBy = null, convertedBy = null) {
    const room = ROOMS.find(r => r.id === roomId);
    if (!room) {
        throw new Error(`Unknown room ID: ${roomId}`);
    }
    return {
        object: room,
        level: 1,
        upgradedBy: upgradedBy,
        convertedBy: convertedBy
    };
}

module.exports = {
    GRID_SIZE,
    LOCKED_CELL_INDEX,
    getAdjacentIndices,
    wouldConversionBreakChain,
    wouldPlacementBreakAnyChain,
    getValidChainExtensions,
    isValidPlacement,
    createEmptyGrid,
    createCell,
    // Re-export rules for convenience
    PLACEMENT_RULES,
    CONVERSION_RULES,
    UPGRADE_RULES,
    ROOMS
};
