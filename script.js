const GRID_SIZE = 9;
const gridContainer = document.getElementById('grid');
const objectGrid = document.getElementById('object-grid');
const tooltip = document.getElementById('tooltip');
const modifiersTable = document.getElementById('modifiers-table');
const gridConnections = document.getElementById('grid-connections');

// Convert number to Roman numerals (max level 3)
function toRomanNumeral(num) {
    const romanNumerals = ['', 'I', 'II', 'III'];
    return romanNumerals[Math.min(num, 3)] || '';
}

let selectedRoom = null;

const LOCKED_CELL_INDEX = 8 * 9 + 4;

const gridData = Array(GRID_SIZE * GRID_SIZE).fill(null);

gridData[LOCKED_CELL_INDEX] = { object: ROOMS.find(o => o.id === 'path'), level: 0, upgraded: false, convertedBy: null, upgradedBy: [] };

// Accumulate modifiers from all placed objects
function accumulateModifiers() {
    const accumulated = {};
    
    gridData.forEach(cell => {
        if (cell !== null) {
            const objectModifiers = MODIFIERS[cell.object.id];
            if (objectModifiers && objectModifiers[cell.level]) {
                objectModifiers[cell.level].forEach(modifier => {
                    if (!accumulated[modifier.name]) {
                        accumulated[modifier.name] = 0;
                    }
                    accumulated[modifier.name] += modifier.value;
                });
            }
        }
    });
    
    return accumulated;
}

// Update the modifiers display table
function updateModifiersDisplay() {
    const accumulated = accumulateModifiers();
    modifiersTable.innerHTML = '';
    
    if (Object.keys(accumulated).length === 0) {
        modifiersTable.innerHTML = '<p style="text-align: center; color: #999; margin: 10px 0;">No modifiers</p>';
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'modifiers-list';
    
    Object.entries(accumulated).forEach(([name, value]) => {
        const modifierItem = document.createElement('p');
        modifierItem.className = 'modifier-item';
        
        const parts = name.split('%');
        modifierItem.innerHTML = parts[0] + '<strong>' + value + '%</strong>' + parts[1];
        
        container.appendChild(modifierItem);
    });
    
    modifiersTable.appendChild(container);
}

// Show tooltip
function showTooltip(objectName, objectImage, element) {
    tooltip.innerHTML = '';
    
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    
    const img = document.createElement('img');
    img.src = objectImage;
    img.alt = objectName;
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.borderRadius = '4px';
    container.appendChild(img);
    
    const text = document.createElement('span');
    text.textContent = objectName;
    container.appendChild(text);
    
    tooltip.appendChild(container);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = (rect.top - 10) + 'px';
    tooltip.style.left = (rect.right + 5) + 'px';
    tooltip.classList.add('visible');
}

// Get list of rooms that can be placed at a given index
function getPlaceableRooms(index) {
    const placeableRooms = [];
    
    ROOMS.forEach(room => {
        if (room.hidden) return;
        
        const originalRoom = selectedRoom;
        selectedRoom = room;
        const isValid = isValidPlacement(index);
        selectedRoom = originalRoom;
        
        if (isValid) {
            placeableRooms.push(room);
        }
    });
    
    return placeableRooms;
}

// Get the display name for a room by its ID
function getRoomDisplayName(roomId) {
    const room = ROOMS.find(r => r.id === roomId);
    return room ? room.name : roomId;
}

// Get the image URL for a room by its ID
function getRoomImage(roomId) {
    const room = ROOMS.find(r => r.id === roomId);
    return room ? room.image : '';
}

// Check if two rooms can be placed adjacent to each other
function canBePlacedAdjacent(roomId1, roomId2) {
    const allowedRooms = PLACEMENT_RULES[roomId1] || [];
    return allowedRooms.includes(roomId2);
}

// Get rooms that can upgrade a given room (from UPGRADE_RULES), filtered by placement rules
function getRoomsThatUpgrade(roomId) {
    const upgradeRule = UPGRADE_RULES[roomId];
    if (!upgradeRule) return [];
    
    let upgradingRooms = [];
    
    if (upgradeRule.type === 'list' && Array.isArray(upgradeRule.upgradedBy)) {
        upgradingRooms = upgradeRule.upgradedBy;
    } else if (upgradeRule.type === 'count' && Array.isArray(upgradeRule.objectIds)) {
        upgradingRooms = upgradeRule.objectIds;
    }
    
    // Filter to only include rooms that can be placed adjacent according to placement rules
    return upgradingRooms.filter(upRoomId => canBePlacedAdjacent(roomId, upRoomId));
}

// Get rooms that this room can upgrade (reverse lookup in UPGRADE_RULES), filtered by placement rules
function getRoomsThisUpgrades(roomId) {
    const roomsItUpgrades = [];
    
    for (const [targetRoomId, rule] of Object.entries(UPGRADE_RULES)) {
        if (rule.type === 'list' && Array.isArray(rule.upgradedBy)) {
            if (rule.upgradedBy.includes(roomId)) {
                // Only include if this room can be placed adjacent to the target room
                if (canBePlacedAdjacent(roomId, targetRoomId)) {
                    roomsItUpgrades.push(targetRoomId);
                }
            }
        } else if (rule.type === 'count' && Array.isArray(rule.objectIds)) {
            if (rule.objectIds.includes(roomId)) {
                // Only include if this room can be placed adjacent to the target room
                if (canBePlacedAdjacent(roomId, targetRoomId)) {
                    roomsItUpgrades.push(targetRoomId);
                }
            }
        }
    }
    
    return roomsItUpgrades;
}

// Show tooltip with upgrade information for placed rooms
function showPlacedRoomTooltip(objectName, objectImage, element, roomId) {
    tooltip.innerHTML = '';
    
    const container = document.createElement('div');
    container.className = 'tooltip-container';
    
    // Room header with image and name
    const header = document.createElement('div');
    header.className = 'tooltip-header';
    
    const img = document.createElement('img');
    img.src = objectImage;
    img.alt = objectName;
    img.className = 'tooltip-room-image';
    header.appendChild(img);
    
    const text = document.createElement('span');
    text.className = 'tooltip-room-name';
    text.textContent = objectName;
    header.appendChild(text);
    
    container.appendChild(header);
    
    // Get upgrade relationships
    const upgradedBy = getRoomsThatUpgrade(roomId);
    const upgrades = getRoomsThisUpgrades(roomId);
    
    // Show rooms that upgrade this room
    if (upgradedBy.length > 0) {
        const upgradeBySection = document.createElement('div');
        upgradeBySection.className = 'tooltip-section';
        
        const upgradeByLabel = document.createElement('div');
        upgradeByLabel.className = 'tooltip-section-label';
        upgradeByLabel.textContent = 'Upgraded by:';
        upgradeBySection.appendChild(upgradeByLabel);
        
        const upgradeByList = document.createElement('div');
        upgradeByList.className = 'tooltip-room-list';
        
        upgradedBy.forEach(upRoomId => {
            const roomItem = document.createElement('div');
            roomItem.className = 'tooltip-room-item';
            
            const roomImg = document.createElement('img');
            roomImg.src = getRoomImage(upRoomId);
            roomImg.alt = getRoomDisplayName(upRoomId);
            roomImg.className = 'tooltip-small-image';
            roomItem.appendChild(roomImg);
            
            const roomName = document.createElement('span');
            roomName.textContent = getRoomDisplayName(upRoomId);
            roomItem.appendChild(roomName);
            
            upgradeByList.appendChild(roomItem);
        });
        
        upgradeBySection.appendChild(upgradeByList);
        container.appendChild(upgradeBySection);
    }
    
    // Show rooms this room upgrades
    if (upgrades.length > 0) {
        const upgradesSection = document.createElement('div');
        upgradesSection.className = 'tooltip-section';
        
        const upgradesLabel = document.createElement('div');
        upgradesLabel.className = 'tooltip-section-label';
        upgradesLabel.textContent = 'Upgrades:';
        upgradesSection.appendChild(upgradesLabel);
        
        const upgradesList = document.createElement('div');
        upgradesList.className = 'tooltip-room-list';
        
        upgrades.forEach(upRoomId => {
            const roomItem = document.createElement('div');
            roomItem.className = 'tooltip-room-item';
            
            const roomImg = document.createElement('img');
            roomImg.src = getRoomImage(upRoomId);
            roomImg.alt = getRoomDisplayName(upRoomId);
            roomImg.className = 'tooltip-small-image';
            roomItem.appendChild(roomImg);
            
            const roomName = document.createElement('span');
            roomName.textContent = getRoomDisplayName(upRoomId);
            roomItem.appendChild(roomName);
            
            upgradesList.appendChild(roomItem);
        });
        
        upgradesSection.appendChild(upgradesList);
        container.appendChild(upgradesSection);
    }
    
    tooltip.appendChild(container);
    
    const rect = element.getBoundingClientRect();
    tooltip.style.top = (rect.top - 10) + 'px';
    tooltip.style.left = (rect.right + 5) + 'px';
    tooltip.classList.add('visible');
}

// Hide tooltip
function hideTooltip() {
    tooltip.classList.remove('visible');
}

// Create object selector grid
function initializeObjectGrid() {
    objectGrid.innerHTML = '';
    ROOMS.forEach((obj) => {
        if (obj.hidden) {
            return;
        }
        
        const btn = document.createElement('button');
        btn.className = 'object-btn';
        btn.dataset.object = obj.name;
        btn.title = obj.name;
        
        const imgElement = document.createElement('img');
        imgElement.src = obj.image;
        imgElement.alt = obj.name;
        imgElement.title = obj.name;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        btn.appendChild(imgElement);
        
        if (selectedRoom && obj.id === selectedRoom.id) {
            btn.classList.add('selected');
        }
        
        btn.addEventListener('click', () => selectObject(obj, btn));
        btn.addEventListener('mouseover', () => showTooltip(obj.name, obj.image, btn));
        btn.addEventListener('mouseout', () => hideTooltip());
        objectGrid.appendChild(btn);
    });
}

// Select object from grid
function selectObject(obj, btnElement) {
    selectedRoom = obj;
    
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    btnElement.classList.add('selected');
}

// Get adjacent cell indices
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

// Apply conversions when an object is placed
function applyConversions(index) {
    if (gridData[index] === null) {
        return;
    }
    
    const placedObjectId = gridData[index].object.id;
    const adjacentIndices = getAdjacentIndices(index);
    const conversionRule = CONVERSION_RULES[placedObjectId];
    
    // Placed room converts adjacent rooms
    if (conversionRule) {
        adjacentIndices.forEach(adjIndex => {
            if (gridData[adjIndex] !== null) {
                const adjacentObjectId = gridData[adjIndex].object.id;
                const convertToId = conversionRule[adjacentObjectId];
                
                if (convertToId) {
                    convertObject(adjIndex, convertToId, placedObjectId);
                }
            }
        });
    }
    
    // Adjacent rooms convert the placed room
    adjacentIndices.forEach(adjIndex => {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const adjacentConversionRule = CONVERSION_RULES[adjacentObjectId];
            
            if (adjacentConversionRule && adjacentConversionRule[placedObjectId]) {
                const convertToId = adjacentConversionRule[placedObjectId];
                convertObject(index, convertToId, adjacentObjectId);
            }
        }
    });
}

// Convert an object at a specific index
function convertObject(index, convertToId, convertedByRoomId) {
    const targetObject = ROOMS.find(obj => obj.id === convertToId);
    if (targetObject) {
        const level = gridData[index].level;
        // Store the original object before conversion if not already stored
        if (!gridData[index].originalObject) {
            gridData[index].originalObject = gridData[index].object;
        }
        gridData[index].object = targetObject;
        gridData[index].convertedBy = convertedByRoomId;  // Track which room type caused the conversion

        const cell = document.querySelector(`[data-index="${index}"]`);
        if (cell) {
            const imgElement = cell.querySelector('img');
            if (imgElement) {
                imgElement.src = targetObject.image;
                imgElement.alt = targetObject.name;
                imgElement.title = targetObject.name;
            }
        }
    }
}

// Re-apply all conversions from existing rooms
function reapplyAllConversions() {
    // First pass: reset all converted rooms to their original state
    gridData.forEach((cell, index) => {
        if (cell !== null && cell.originalObject) {
            cell.object = cell.originalObject;
            cell.convertedBy = null;
            cell.originalObject = null;

            // Update display
            const cellElement = document.querySelector(`[data-index="${index}"]`);
            if (cellElement) {
                const imgElement = cellElement.querySelector('img');
                if (imgElement) {
                    imgElement.src = cell.object.image;
                    imgElement.alt = cell.object.name;
                    imgElement.title = cell.object.name;
                }
            }
        }
    });

    // Second pass: re-apply conversions for all placed rooms
    gridData.forEach((cell, index) => {
        if (cell !== null) {
            applyConversions(index);
        }
    });
}

// Apply upgrades based on all adjacent objects
function applyUpgrades(index) {
    if (gridData[index] === null) {
        return;
    }
    
    const placedObject = gridData[index].object;
    const adjacentIndices = getAdjacentIndices(index);
    
    // Don't apply upgrades to rooms that were just converted - they keep their original upgrade state
    if (gridData[index].convertedBy) {
        return;
    }
    
    gridData[index].level = 1;
    gridData[index].upgraded = false;
    gridData[index].upgradedBy = [];  // Reset upgradedBy tracking
    
    const upgradeRule = UPGRADE_RULES[placedObject.id];
    
        if (upgradeRule) {
        if (upgradeRule.type === 'count') {
            let count = 0;
            const objectIdsToCount = upgradeRule.objectIds || upgradeRule.upgradedBy;
            
            adjacentIndices.forEach(adjIndex => {
                if (gridData[adjIndex] !== null && objectIdsToCount.includes(gridData[adjIndex].object.id)) {
                    count++;
                }
            });
            
            if (count > 0) {
                const maxLevel = upgradeRule.maxLevel || 3;
                gridData[index].level = Math.min(count, maxLevel);
                gridData[index].upgraded = true;
            }
        } else if (upgradeRule.type === 'list' && Array.isArray(upgradeRule.upgradedBy)) {
            let hasUpgrade = false;
            const usedUpgradeTypes = new Set();  // Track which upgrade room types have been used
            adjacentIndices.forEach(adjIndex => {
                if (gridData[adjIndex] !== null) {
                    const adjacentObjectId = gridData[adjIndex].object.id;
                    
                    // Only apply upgrade if this room type hasn't been used yet
                    if (upgradeRule.upgradedBy.includes(adjacentObjectId) && !usedUpgradeTypes.has(adjacentObjectId)) {
                        gridData[index].level += 1;
                        hasUpgrade = true;
                        usedUpgradeTypes.add(adjacentObjectId);
                        gridData[index].upgradedBy.push(adjacentObjectId);  // Track which room type upgraded this room
                    }
                }
            });
            if (hasUpgrade) {
                gridData[index].upgraded = true;
            }
        }
    }
    
    const cell = document.querySelector(`[data-index="${index}"]`);
    if (cell) {
        const levelIndicator = cell.querySelector('.level-indicator');
        if (levelIndicator) {
            levelIndicator.textContent = toRomanNumeral(gridData[index].level);
        }
    }
}

// Get all rooms that can extend a chain starting from a given room
function getChainExtensions(roomId) {
    if (roomId === 'path') {
        return Object.keys(PLACEMENT_RULES).filter(id => id !== 'path');
    }
    
    const allowedRooms = PLACEMENT_RULES[roomId] || [];
    return allowedRooms.filter(id => id !== 'path');
}

// Check if converting a room would break its existing chain connections
function wouldConversionBreakChain(roomIndex, convertedToId) {
    if (gridData[roomIndex] === null) return false;
    
    const adjacentIndices = getAdjacentIndices(roomIndex);
    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
    
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjRoomId = gridData[adjIndex].object.id;
            const adjAllowedRooms = PLACEMENT_RULES[adjRoomId] || [];
            
            if (!convertedAllowedRooms.includes(adjRoomId) || !adjAllowedRooms.includes(convertedToId)) {
                return true;
            }
        }
        
        if (adjIndex === LOCKED_CELL_INDEX) {
            if (!convertedAllowedRooms.includes('path')) {
                return true;
            }
        }
    }
    
    return false;
}

// Check if placing a room would cause conversions that break ANY chain
function wouldPlacementBreakAnyChain(index, roomId) {
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
                if (wouldConversionBreakChain(adjIndex, convertedToId)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// Check if placing a room would try to upgrade an adjacent room that is already at max level
function wouldUpgradeExceedMaxLevel(index, roomId) {
    const adjacentIndices = getAdjacentIndices(index);
    
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const upgradeRule = UPGRADE_RULES[adjacentObjectId];
            
            if (upgradeRule) {
                const currentLevel = gridData[adjIndex].level || 1;
                
                if (upgradeRule.type === 'count') {
                    // Check if this room type can upgrade the adjacent room
                    const objectIdsToCount = upgradeRule.objectIds || upgradeRule.upgradedBy || [];
                    if (objectIdsToCount.includes(roomId)) {
                        const maxLevel = upgradeRule.maxLevel || 3;
                        // Check if already at max level
                        if (currentLevel >= maxLevel) {
                            return true;
                        }
                    }
                } else if (upgradeRule.type === 'list' && Array.isArray(upgradeRule.upgradedBy)) {
                    // Check if this room type can upgrade the adjacent room
                    if (upgradeRule.upgradedBy.includes(roomId)) {
                        const maxLevel = 3; // List-type upgrades max at level 3
                        // Check if already at max level
                        if (currentLevel >= maxLevel) {
                            return true;
                        }
                    }
                }
            }
        }
    }
    
    return false;
}

// Get all valid rooms that can be placed at an index based on adjacent chains
function getValidChainExtensions(index) {
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
        if (!wouldPlacementBreakAnyChain(index, roomId)) {
            safeRooms.add(roomId);
        }
    }
    
    return safeRooms;
}

// Check if placement is valid
function isValidPlacement(index) {
    if (selectedRoom === null) {
        return false;
    }
    
    const selectedRoomId = selectedRoom.id;

    if (selectedRoomId === 'sacrificial_chamber') {
        const sacrificialChamberExists = gridData.some(cell =>
            cell !== null && cell.object.id === 'sacrificial_chamber'
        );
        if (sacrificialChamberExists) {
            return false;
        }
    }

    // Generator can only be placed adjacent to a path, not extending other rooms
    if (selectedRoomId === 'generator') {
        const adjacentIndices = getAdjacentIndices(index);
        const hasAdjacentPath = adjacentIndices.some(adjIndex =>
            adjIndex === LOCKED_CELL_INDEX ||
            (gridData[adjIndex] !== null && gridData[adjIndex].object.id === 'path')
        );
        if (!hasAdjacentPath) {
            return false;
        }
    }

    const adjacentIndices = getAdjacentIndices(index);

    const hasAdjacentRoom = adjacentIndices.some(adjIndex =>
        adjIndex === LOCKED_CELL_INDEX || gridData[adjIndex] !== null
    );

    if (!hasAdjacentRoom) {
        return false;
    }

    // Check if placing this room would break any existing chain via conversions
    if (wouldPlacementBreakAnyChain(index, selectedRoomId)) {
        return false;
    }

    // Check if placing this room would try to upgrade an adjacent room that is already at max level
    if (wouldUpgradeExceedMaxLevel(index, selectedRoomId)) {
        return false;
    }

    // Check if all adjacent existing rooms allow this room to be placed
    // (connections must be symmetric - both rooms must allow each other)
    for (const adjIndex of adjacentIndices) {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const adjAllowedRooms = PLACEMENT_RULES[adjacentObjectId] || [];

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

    const validExtensions = getValidChainExtensions(index);

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

// Create grid cells
function initializeGrid() {
    gridContainer.innerHTML = '';
    
    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        
        if (i === LOCKED_CELL_INDEX) {
            cell.classList.add('locked');
            const imgElement = document.createElement('img');
            imgElement.src = 'resources/images/path.png';
            imgElement.alt = 'Locked Path';
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            cell.appendChild(imgElement);
        } else if (gridData[i]) {
            const imgElement = document.createElement('img');
            imgElement.src = gridData[i].object.image;
            imgElement.alt = gridData[i].object.name;
            imgElement.title = gridData[i].object.name;
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            cell.appendChild(imgElement);
            
            const levelIndicator = document.createElement('div');
            levelIndicator.className = 'level-indicator';
            levelIndicator.textContent = toRomanNumeral(gridData[i].level);
            if (gridData[i].level > 0) {
                cell.appendChild(levelIndicator);
            }
            
            cell.classList.add('placed');
            
            applyChainColorToCell(i, cell);
        } else {
            // Show cell number on empty cells
            const cellNumber = document.createElement('span');
            cellNumber.className = 'cell-number';
            cellNumber.textContent = i;
            cell.appendChild(cellNumber);
        }
        
        if (i !== LOCKED_CELL_INDEX) {
            cell.addEventListener('click', () => toggleCell(i, cell));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                clearCell(i, cell);
            });
            cell.addEventListener('mouseover', () => {
                if (gridData[i]) {
                    showPlacedRoomTooltip(gridData[i].object.name, gridData[i].object.image, cell, gridData[i].object.id);
                }
            });
            cell.addEventListener('mouseout', () => hideTooltip());
        }
        gridContainer.appendChild(cell);
    }
}

// Apply chain color to a cell based on its root path
function applyChainColorToCell(index, cellElement) {
    if (gridData[index] && gridData[index].object.id === 'path') {
        return;
    }
    
    const rootPath = traceChainToPath(index);
    if (rootPath !== null) {
        const chainColor = getChainColor(rootPath);
        cellElement.style.backgroundColor = chainColor.border;
        cellElement.style.borderColor = chainColor.header;
    }
}

// Toggle object placement on cell
function toggleCell(index, cellElement) {
    if (gridData[index] === null) {
        if (selectedRoom === null) {
            showRoomPickerModal(index, cellElement);
            return;
        }
        
        if (!isValidPlacement(index)) {
            return;
        }
        
        const objectLevel = selectedRoom.id === 'path' ? 0 : 1;
        
        gridData[index] = { object: selectedRoom, level: objectLevel, upgraded: false, convertedBy: null, upgradedBy: [] };
        
        // Clear the cell number before placing the room
        cellElement.innerHTML = '';
        
        const imgElement = document.createElement('img');
        imgElement.src = selectedRoom.image;
        imgElement.alt = selectedRoom.name;
        imgElement.title = selectedRoom.name;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        cellElement.appendChild(imgElement);
        
        const levelIndicator = document.createElement('div');
        levelIndicator.className = 'level-indicator';
        levelIndicator.textContent = toRomanNumeral(objectLevel);
        if (objectLevel > 0) {
            cellElement.appendChild(levelIndicator);
        }
        
        cellElement.classList.add('placed');
        
        applyChainColorToCell(index, cellElement);
        
        applyConversions(index);
        
        applyUpgrades(index);
        
        const adjacentIndices = getAdjacentIndices(index);
        adjacentIndices.forEach(adjIndex => {
            if (gridData[adjIndex] !== null) {
                applyUpgrades(adjIndex);
            }
        });
    } else {
        gridData[index] = null;
        cellElement.innerHTML = '';
        cellElement.classList.remove('placed');

        cellElement.style.backgroundColor = '';
        cellElement.style.borderColor = '';

        // Add cell number back
        const cellNumber = document.createElement('span');
        cellNumber.className = 'cell-number';
        cellNumber.textContent = index;
        cellElement.appendChild(cellNumber);

        // Revert conversions caused by the removed room and re-apply remaining conversions
        reapplyAllConversions();

        const adjacentIndices = getAdjacentIndices(index);
        adjacentIndices.forEach(adjIndex => {
            if (gridData[adjIndex] !== null) {
                applyUpgrades(adjIndex);
            }
        });
    }
    
    updateModifiersDisplay();
    drawConnections();
}

// Clear cell (for right-click)
function clearCell(index, cellElement) {
    if (gridData[index] !== null) {
        gridData[index] = null;
        cellElement.innerHTML = '';
        cellElement.classList.remove('placed');

        cellElement.style.backgroundColor = '';
        cellElement.style.borderColor = '';

        // Add cell number back
        const cellNumber = document.createElement('span');
        cellNumber.className = 'cell-number';
        cellNumber.textContent = index;
        cellElement.appendChild(cellNumber);

        // Revert conversions caused by the removed room and re-apply remaining conversions
        reapplyAllConversions();

        const adjacentIndices = getAdjacentIndices(index);
        adjacentIndices.forEach(adjIndex => {
            if (gridData[adjIndex] !== null) {
                applyUpgrades(adjIndex);
            }
        });

        updateModifiersDisplay();
        drawConnections();
    }
}

// Clear all objects from grid
function clearGrid() {
    if (confirm('Are you sure you want to clear all objects?')) {
        gridData.fill(null);
        chainColorMap.clear();
        nextColorIndex = 0;
        initializeGrid();
        updateModifiersDisplay();
        drawConnections();
    }
}

// Trace back from a cell to find its root path by following the chain
function traceChainToPath(startIndex, visited = new Set()) {
    if (visited.has(startIndex)) {
        return null;
    }
    visited.add(startIndex);
    
    if (startIndex === LOCKED_CELL_INDEX) {
        return LOCKED_CELL_INDEX;
    }
    
    if (gridData[startIndex] === null) {
        return null;
    }
    
    if (gridData[startIndex].object.id === 'path') {
        return startIndex;
    }
    
    const adjacentIndices = getAdjacentIndices(startIndex);
    const currentRoomId = gridData[startIndex].object.id;
    
    for (const adjIndex of adjacentIndices) {
        if (adjIndex === LOCKED_CELL_INDEX) {
            return LOCKED_CELL_INDEX;
        }
        
        if (gridData[adjIndex] === null) {
            continue;
        }
        
        const adjRoomId = gridData[adjIndex].object.id;
        
        const adjAllowedRooms = PLACEMENT_RULES[adjRoomId] || [];
        if (adjAllowedRooms.includes(currentRoomId)) {
            const rootPath = traceChainToPath(adjIndex, visited);
            if (rootPath !== null) {
                return rootPath;
            }
        }
    }
    
    return null;
}

// Group rooms by which chain(s) they can extend from
function groupRoomsByChain(cellIndex, placeableRooms) {
    const adjacentIndices = getAdjacentIndices(cellIndex);
    
    const adjacentSources = [];
    
    adjacentIndices.forEach(adjIndex => {
        if (adjIndex === LOCKED_CELL_INDEX) {
            adjacentSources.push({
                index: adjIndex,
                roomId: 'path',
                rootPath: LOCKED_CELL_INDEX
            });
        } else if (gridData[adjIndex] !== null) {
            const roomId = gridData[adjIndex].object.id;
            const convertedBy = gridData[adjIndex].convertedBy;
            const rootPath = traceChainToPath(adjIndex);
            if (rootPath !== null) {
                adjacentSources.push({
                    index: adjIndex,
                    roomId: roomId,
                    rootPath: rootPath,
                    convertedBy: convertedBy
                });
            }
        }
    });
    
    const roomToChainsMap = new Map();
    
    placeableRooms.forEach(room => {
        const chainsForRoom = new Set();
        
        adjacentSources.forEach(({ index: adjIndex, roomId, rootPath, convertedBy }) => {
            // Skip if this room type is the one that converted the adjacent room
            if (convertedBy === room.id) {
                return;
            }
            
            const allowedRooms = PLACEMENT_RULES[roomId] || [];
            if (allowedRooms.includes(room.id)) {
                chainsForRoom.add(rootPath);
            }
            
            if (adjIndex !== LOCKED_CELL_INDEX) {
                // Case: placed room converts adjacent room
                const conversionRule = CONVERSION_RULES[room.id];
                if (conversionRule && conversionRule[roomId]) {
                    const convertedToId = conversionRule[roomId];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    const roomAllowedRooms = PLACEMENT_RULES[room.id] || [];
                    if (convertedAllowedRooms.includes(room.id) && 
                        roomAllowedRooms.includes(convertedToId) &&
                        !wouldConversionBreakChain(adjIndex, convertedToId)) {
                        chainsForRoom.add(rootPath);
                    }
                }
                
                // Case: adjacent room converts placed room
                const adjConversionRule = CONVERSION_RULES[roomId];
                if (adjConversionRule && adjConversionRule[room.id]) {
                    const convertedToId = adjConversionRule[room.id];
                    // Check if the converted result is allowed by adjacent room
                    if (allowedRooms.includes(convertedToId)) {
                        chainsForRoom.add(rootPath);
                    }
                }
            }
        });
        
        if (chainsForRoom.size > 0) {
            roomToChainsMap.set(room, chainsForRoom);
        }
    });
    
    const singleChainGroups = new Map();
    const multiChainRooms = [];
    
    placeableRooms.forEach(room => {
        const chains = roomToChainsMap.get(room);
        
        if (!chains || chains.size === 0) {
        } else if (chains.size === 1) {
            const rootPath = chains.values().next().value;
            if (!singleChainGroups.has(rootPath)) {
                singleChainGroups.set(rootPath, []);
            }
            singleChainGroups.get(rootPath).push(room);
        } else {
            multiChainRooms.push(room);
        }
    });
    
    return { singleChainGroups, multiChainRooms };
}

// Chain color palette
const CHAIN_COLORS = [
    { bg: '#e3f2fd', border: '#2196f3', header: '#1565c0' },
    { bg: '#f3e5f5', border: '#9c27b0', header: '#7b1fa2' },
    { bg: '#e8f5e9', border: '#4caf50', header: '#2e7d32' },
    { bg: '#fff3e0', border: '#ff9800', header: '#e65100' },
    { bg: '#fce4ec', border: '#e91e63', header: '#c2185b' },
    { bg: '#e0f7fa', border: '#00bcd4', header: '#00838f' },
    { bg: '#fff8e1', border: '#ffc107', header: '#ff8f00' },
    { bg: '#f1f8e9', border: '#8bc34a', header: '#558b2f' },
];

const chainColorMap = new Map();
let nextColorIndex = 0;

// Get or assign a color for a chain's root path
function getChainColor(rootPathIndex) {
    if (!chainColorMap.has(rootPathIndex)) {
        chainColorMap.set(rootPathIndex, CHAIN_COLORS[nextColorIndex % CHAIN_COLORS.length]);
        nextColorIndex++;
    }
    return chainColorMap.get(rootPathIndex);
}

// Calculate luminance of a color
function getLuminance(hexColor) {
    const rgb = parseInt(hexColor.slice(1), 16);
    const r = (rgb >> 16) & 255;
    const g = (rgb >> 8) & 255;
    const b = rgb & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Get contrasting text color based on background
function getContrastingTextColor(bgColor) {
    return getLuminance(bgColor) > 0.5 ? '#000000' : '#ffffff';
}

// Get display name for a chain's root path
function getChainDisplayName(rootPathIndex) {
    const row = Math.floor(rootPathIndex / GRID_SIZE);
    const col = rootPathIndex % GRID_SIZE;
    return `Path (${row}, ${col})`;
}

// Show room picker modal
function showRoomPickerModal(cellIndex, cellElement) {
    const placeableRooms = getPlaceableRooms(cellIndex);
    const roomPickerGrid = document.getElementById('room-picker-grid');
    const modal = document.getElementById('room-picker-modal');
    
    roomPickerGrid.innerHTML = '';
    
    if (placeableRooms.length === 0) {
        roomPickerGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No compatible rooms available</p>';
    } else {
        const { singleChainGroups, multiChainRooms } = groupRoomsByChain(cellIndex, placeableRooms);
        
        const createRoomButton = (room) => {
            const btn = document.createElement('button');
            btn.className = 'room-picker-btn';
            btn.title = room.name;
            
            const img = document.createElement('img');
            img.src = room.image;
            img.alt = room.name;
            btn.appendChild(img);
            
            btn.addEventListener('click', () => {
                selectObject(room, document.querySelector(`[data-object="${room.name}"]`));
                closeRoomPickerModal();
                toggleCell(cellIndex, cellElement);
            });
            
            return btn;
        };
        
        singleChainGroups.forEach((rooms, rootPathIndex) => {
            if (rooms.length > 0) {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'room-picker-group';
                
                const chainColor = getChainColor(rootPathIndex);
                groupDiv.style.backgroundColor = chainColor.bg;
                groupDiv.style.borderColor = chainColor.border;
                
                const groupHeader = document.createElement('div');
                groupHeader.className = 'room-picker-group-header';
                groupHeader.textContent = getChainDisplayName(rootPathIndex);
                groupHeader.style.borderBottomColor = chainColor.border;
                groupHeader.style.color = getContrastingTextColor(chainColor.bg);
                groupDiv.appendChild(groupHeader);
                
                const groupContent = document.createElement('div');
                groupContent.className = 'room-picker-group-content';
                rooms.forEach(room => {
                    groupContent.appendChild(createRoomButton(room));
                });
                groupDiv.appendChild(groupContent);
                
                roomPickerGrid.appendChild(groupDiv);
            }
        });
        
        if (multiChainRooms.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'room-picker-group room-picker-group-multi';
            
            const groupHeader = document.createElement('div');
            groupHeader.className = 'room-picker-group-header';
            groupHeader.textContent = 'Merge';
            groupDiv.appendChild(groupHeader);
            
            const groupContent = document.createElement('div');
            groupContent.className = 'room-picker-group-content';
            multiChainRooms.forEach(room => {
                groupContent.appendChild(createRoomButton(room));
            });
            groupDiv.appendChild(groupContent);
            
            roomPickerGrid.appendChild(groupDiv);
        }
    }
    
    modal.classList.add('show');
}

// Close room picker modal
function closeRoomPickerModal() {
    const modal = document.getElementById('room-picker-modal');
    modal.classList.remove('show');
}

// Close modal when clicking outside of it
document.addEventListener('click', (e) => {
    const modal = document.getElementById('room-picker-modal');
    if (e.target === modal) {
        closeRoomPickerModal();
    }
});

// Deselect room when clicking outside of grid cells and object selector
document.addEventListener('click', (e) => {
    const cellElement = e.target.closest('.cell');
    const objectBtn = e.target.closest('.object-btn');
    
    if (cellElement || objectBtn) {
        return;
    }
    
    selectedRoom = null;
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
});

// Draw connections between related rooms
function drawConnections() {
    gridConnections.innerHTML = '';
    
    const wrapper = gridConnections.parentElement;
    gridConnections.setAttribute('width', wrapper.offsetWidth);
    gridConnections.setAttribute('height', wrapper.offsetHeight);
    
    gridData.forEach((cell, index) => {
        if (cell === null) return;
        
        const adjacentIndices = getAdjacentIndices(index);
        
        adjacentIndices.forEach(adjIndex => {
            if (index < adjIndex && gridData[adjIndex] !== null) {
                const adjacentObjectId = gridData[adjIndex].object.id;
                const currentObjectId = cell.object.id;
                
                const allowedRooms = PLACEMENT_RULES[currentObjectId] || [];
                if (allowedRooms.includes(adjacentObjectId)) {
                    drawConnectionLine(index, adjIndex);
                }
            }
        });
    });
}

// Draw a line between two cell indices
function drawConnectionLine(index1, index2) {
    const cell1 = document.querySelector(`[data-index="${index1}"]`);
    const cell2 = document.querySelector(`[data-index="${index2}"]`);
    
    if (!cell1 || !cell2) return;
    
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();
    const wrapper = gridConnections.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    
    const center1X = rect1.left - wrapperRect.left + rect1.width / 2;
    const center1Y = rect1.top - wrapperRect.top + rect1.height / 2;
    const center2X = rect2.left - wrapperRect.left + rect2.width / 2;
    const center2Y = rect2.top - wrapperRect.top + rect2.height / 2;
    
    const dx = center2X - center1X;
    const dy = center2Y - center1Y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    const normX = dx / distance;
    const normY = dy / distance;
    
    const cellWidth = rect1.width;
    const cellHeight = rect1.height;
    const radius = Math.max(cellWidth, cellHeight) / 2;
    
    const x1 = center1X + normX * radius;
    const y1 = center1Y + normY * radius;
    const x2 = center2X - normX * radius;
    const y2 = center2Y - normY * radius;
    
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#667eea');
    line.setAttribute('stroke-width', '6');
    line.setAttribute('opacity', '0.6');
    
    gridConnections.appendChild(line);
}

// Initialize on page load
initializeObjectGrid();
initializeGrid();
initializeLayoutManager();

// Load layout from URL hash if present
if (window.location.hash) {
    setTimeout(() => {
        loadLayoutFromHash();
    }, 100);
}
