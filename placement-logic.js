/**
 * Core placement logic extracted for testing.
 * This module contains pure functions that can be tested independently of the DOM.
 */

const { PLACEMENT_RULES } = require('./placement-rules.js');
const { CONVERSION_RULES } = require('./conversion-rules.js');
const { UPGRADE_RULES } = require('./upgrade-rules.js');
const { ROOMS } = require('./rooms.js');

const GRID_SIZE = 9;
const LOCKED_CELL_INDEX = 40; // Center cell (4,4) in a 9x9 grid

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
    
    // For each potential room, check if it can upgrade or convert at least one adjacent room
    const allRoomIds = ROOMS.filter(r => !r.hidden).map(r => r.id);
    
    for (const candidateRoomId of allRoomIds) {
        const candidateAllowedRooms = PLACEMENT_RULES[candidateRoomId] || [];
        let canUpgradeOrConvert = false;
        
        for (const adjIndex of adjacentIndices) {
            if (gridData[adjIndex] !== null) {
                const adjacentCell = gridData[adjIndex];
                const adjacentObjectId = adjacentCell.object.id;
                const adjAllowedRooms = PLACEMENT_RULES[adjacentObjectId] || [];
                
                // Check if candidate room can upgrade the adjacent room
                const adjacentUpgradeRule = UPGRADE_RULES[adjacentObjectId];
                if (adjacentUpgradeRule && adjacentUpgradeRule.type === 'list' &&
                    Array.isArray(adjacentUpgradeRule.upgradedBy) &&
                    adjacentUpgradeRule.upgradedBy.includes(candidateRoomId)) {
                    // Can upgrade - check if connection is valid and not already upgraded by this type
                    if (adjAllowedRooms.includes(candidateRoomId) && candidateAllowedRooms.includes(adjacentObjectId)) {
                        if (!adjacentCell.upgradedBy || !adjacentCell.upgradedBy.includes(candidateRoomId)) {
                            canUpgradeOrConvert = true;
                            break;
                        }
                    }
                }
                
                // Check if candidate room converts adjacent room
                const candidateConversionRule = CONVERSION_RULES[candidateRoomId];
                if (candidateConversionRule && candidateConversionRule[adjacentObjectId]) {
                    const convertedToId = candidateConversionRule[adjacentObjectId];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    
                    // Valid conversion if: converted room allows candidate AND candidate allows converted
                    // AND conversion won't break the chain
                    if (convertedAllowedRooms.includes(candidateRoomId) &&
                        candidateAllowedRooms.includes(convertedToId) &&
                        !wouldConversionBreakChain(adjIndex, convertedToId, gridData)) {
                        canUpgradeOrConvert = true;
                        break;
                    }
                }
            }
            
            // Also allow placement next to locked cell (path) if path allows the room
            if (adjIndex === LOCKED_CELL_INDEX) {
                const pathAllowedRooms = PLACEMENT_RULES['path'] || [];
                if (pathAllowedRooms.includes(candidateRoomId)) {
                    canUpgradeOrConvert = true;
                    break;
                }
            }
        }
        
        if (canUpgradeOrConvert) {
            validRooms.add(candidateRoomId);
        }
    }
    
    // Generator can only be placed adjacent to a path
    if (!hasAdjacentPath) {
        validRooms.delete('generator');
    }
    
    return validRooms;
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

    // A room can be placed if:
    // 1. It has a valid symmetric connection to at least one adjacent room, OR
    // 2. It can convert an adjacent room without breaking chains
    const selectedAllowedRooms = PLACEMENT_RULES[selectedRoomId] || [];
    let canBePlaced = false;
    
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentCell = gridData[adjIndex];
            const adjacentObjectId = adjacentCell.object.id;
            const adjAllowedRooms = PLACEMENT_RULES[adjacentObjectId] || [];
            
            // Check if there's a valid symmetric connection (valid chain extension)
            if (adjAllowedRooms.includes(selectedRoomId) && selectedAllowedRooms.includes(adjacentObjectId)) {
                canBePlaced = true;
            }
            
            // Check if selected room converts adjacent room
            const selectedConversionRule = CONVERSION_RULES[selectedRoomId];
            if (selectedConversionRule && selectedConversionRule[adjacentObjectId]) {
                const convertedToId = selectedConversionRule[adjacentObjectId];
                const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                
                // Valid conversion if: converted room allows selected AND selected allows converted
                // AND conversion won't break the chain
                if (convertedAllowedRooms.includes(selectedRoomId) &&
                    selectedAllowedRooms.includes(convertedToId) &&
                    !wouldConversionBreakChain(adjIndex, convertedToId, gridData)) {
                    canBePlaced = true;
                }
            }
        }
        
        // Also allow placement next to locked cell (path) if path allows the room
        if (adjIndex === LOCKED_CELL_INDEX) {
            const pathAllowedRooms = PLACEMENT_RULES['path'] || [];
            if (pathAllowedRooms.includes(selectedRoomId)) {
                canBePlaced = true;
            }
        }
    }
    
    return canBePlaced;
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
