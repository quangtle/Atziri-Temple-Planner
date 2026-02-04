const GRID_SIZE = 9;
const gridContainer = document.getElementById('grid');
const objectGrid = document.getElementById('object-grid');
const countDisplay = document.getElementById('count');
const tooltip = document.getElementById('tooltip');
const modifiersTable = document.getElementById('modifiers-table');
const gridConnections = document.getElementById('grid-connections');

// Function to convert number to Roman numerals (max level 3)
function toRomanNumeral(num) {
    const romanNumerals = ['', 'I', 'II', 'III'];
    return romanNumerals[Math.min(num, 3)] || '';
}

// Rooms array loaded from rooms.js
let selectedRoom = ROOMS[0];

// Locked cell: bottom middle (row 8, column 4)
const LOCKED_CELL_INDEX = 8 * 9 + 4; // Index 76

// Initialize grid data - store objects with their level and upgraded status
const gridData = Array(GRID_SIZE * GRID_SIZE).fill(null);

// Place path object in locked cell
gridData[LOCKED_CELL_INDEX] = { object: ROOMS.find(o => o.id === 'path'), level: 0, upgraded: false };

// Track placement order to assign levels
let placementOrder = [];

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
    
    // Add each modifier as a sentence
    Object.entries(accumulated).forEach(([name, value]) => {
        const modifierItem = document.createElement('p');
        modifierItem.className = 'modifier-item';
        
        // Replace % with bold value and %
        const parts = name.split('%');
        modifierItem.innerHTML = parts[0] + '<strong>' + value + '%</strong>' + parts[1];
        
        container.appendChild(modifierItem);
    });
    
    modifiersTable.appendChild(container);
}

// Show tooltip
function showTooltip(objectName, objectImage, element) {
    tooltip.innerHTML = '';
    
    // Create container for image and text
    const container = document.createElement('div');
    container.style.display = 'flex';
    container.style.alignItems = 'center';
    container.style.gap = '8px';
    
    // Add image
    const img = document.createElement('img');
    img.src = objectImage;
    img.alt = objectName;
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.borderRadius = '4px';
    container.appendChild(img);
    
    // Add text
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
    
    // Check each room in ROOMS (excluding hidden ones)
    ROOMS.forEach(room => {
        if (room.hidden) return;
        
        // Temporarily select the room and check if placement is valid
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

// Hide tooltip
function hideTooltip() {
    tooltip.classList.remove('visible');
}

// Create object selector grid
function initializeObjectGrid() {
    objectGrid.innerHTML = '';
    ROOMS.forEach((obj) => {
        // Skip hidden objects
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
        
        if (obj.name === selectedRoom.name) {
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
    
    // Update visual feedback
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    btnElement.classList.add('selected');
}

// Get adjacent cell indices
function getAdjacentIndices(index) {
    const row = Math.floor(index / GRID_SIZE);
    
    const adjacentIndices = [
        index - GRID_SIZE,  // up
        index + GRID_SIZE,  // down
        index - 1,          // left
        index + 1           // right
    ];
    
    return adjacentIndices.filter(adjIndex => {
        // Check bounds
        if (adjIndex < 0 || adjIndex >= GRID_SIZE * GRID_SIZE) {
            return false;
        }
        
        // Check if adjacent cell is in same row (for left/right)
        const adjRow = Math.floor(adjIndex / GRID_SIZE);
        if (Math.abs(row - adjRow) > 1) {
            return false;
        }
        
        return true;
    });
}

// Apply conversions when an object is placed
function applyConversions(index) {
    if (gridData[index] === null) {
        return;
    }
    
    const placedObjectId = gridData[index].object.id;
    const adjacentIndices = getAdjacentIndices(index);
    const conversionRule = CONVERSION_RULES[placedObjectId];
    
    // Convert adjacent objects based on the placed object's conversion rules
    if (conversionRule) {
        adjacentIndices.forEach(adjIndex => {
            if (gridData[adjIndex] !== null) {
                const adjacentObjectId = gridData[adjIndex].object.id;
                const convertToId = conversionRule[adjacentObjectId];
                
                if (convertToId) {
                    convertObject(adjIndex, convertToId);
                }
            }
        });
    }
    
    // Check if the placed object can be converted by adjacent objects
    adjacentIndices.forEach(adjIndex => {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const adjacentConversionRule = CONVERSION_RULES[adjacentObjectId];
            
            if (adjacentConversionRule && adjacentConversionRule[placedObjectId]) {
                const convertToId = adjacentConversionRule[placedObjectId];
                convertObject(index, convertToId);
            }
        }
    });
}

// Helper function to convert an object at a specific index
function convertObject(index, convertToId) {
    const targetObject = ROOMS.find(obj => obj.id === convertToId);
    if (targetObject) {
        const level = gridData[index].level;  // Preserve level
        gridData[index].object = targetObject;
        
        // Update the DOM
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

// Apply upgrades based on all adjacent objects
function applyUpgrades(index) {
    if (gridData[index] === null) {
        return;
    }
    
    const placedObject = gridData[index].object;
    const adjacentIndices = getAdjacentIndices(index);
    
    // Reset level to 1 (base level)
    gridData[index].level = 1;
    gridData[index].upgraded = false;  // Reset upgraded status
    
    const upgradeRule = UPGRADE_RULES[placedObject.id];
    
    if (upgradeRule) {
        // Check if this is a count-based rule
        if (upgradeRule.type === 'count') {
            // Count adjacent objects of the required type(s)
            let count = 0;
            const objectIdsToCount = upgradeRule.objectIds;
            
            adjacentIndices.forEach(adjIndex => {
                if (gridData[adjIndex] !== null && objectIdsToCount.includes(gridData[adjIndex].object.id)) {
                    count++;
                }
            });
            
            // Level equals the count (minimum 1)
            if (count > 0) {
                gridData[index].level = count;
                gridData[index].upgraded = true;  // Mark as upgraded
            }
        } else if (upgradeRule.type === 'list' && Array.isArray(upgradeRule.upgradedBy)) {
            // List of objects that upgrade this object
            let hasUpgrade = false;
            adjacentIndices.forEach(adjIndex => {
                if (gridData[adjIndex] !== null) {
                    const adjacentObjectId = gridData[adjIndex].object.id;
                    
                    // If the adjacent object can upgrade this object, apply upgrade
                    if (upgradeRule.upgradedBy.includes(adjacentObjectId)) {
                        gridData[index].level += 1;
                        hasUpgrade = true;
                    }
                }
            });
            if (hasUpgrade) {
                gridData[index].upgraded = true;  // Mark as upgraded
            }
        }
    }
    
    // Update the level indicator for this object
    const cell = document.querySelector(`[data-index="${index}"]`);
    if (cell) {
        const levelIndicator = cell.querySelector('.level-indicator');
        if (levelIndicator) {
            levelIndicator.textContent = toRomanNumeral(gridData[index].level);
        }
    }
}

// Get all rooms that can extend a chain starting from a given room (excluding paths)
function getChainExtensions(roomId) {
    if (roomId === 'path') {
        // Path can start any chain - return all non-path rooms
        return Object.keys(PLACEMENT_RULES).filter(id => id !== 'path');
    }
    
    const allowedRooms = PLACEMENT_RULES[roomId] || [];
    // Return rooms that this room allows (excluding path)
    return allowedRooms.filter(id => id !== 'path');
}

// Get all valid rooms that can be placed at an index based on adjacent chains
function getValidChainExtensions(index) {
    const adjacentIndices = getAdjacentIndices(index);
    const validRooms = new Set();
    
    for (const adjIndex of adjacentIndices) {
        if (adjIndex === LOCKED_CELL_INDEX || (gridData[adjIndex] !== null)) {
            let roomId;
            if (adjIndex === LOCKED_CELL_INDEX) {
                roomId = 'path';
            } else {
                roomId = gridData[adjIndex].object.id;
            }
            
            const extensions = getChainExtensions(roomId);
            extensions.forEach(ext => validRooms.add(ext));
        }
    }
    
    // Path can only be placed next to another path
    if (adjacentIndices.some(adjIndex => 
        adjIndex === LOCKED_CELL_INDEX || 
        (gridData[adjIndex] !== null && gridData[adjIndex].object.id === 'path')
    )) {
        validRooms.add('path');
    }
    
    return validRooms;
}

// Check if placement is valid (adjacent only to related rooms or locked cell)
function isValidPlacement(index) {
    // Check if trying to place sacrificial_chamber and one already exists
    if (selectedRoom.id === 'sacrificial_chamber') {
        const sacrificialChamberExists = gridData.some(cell => 
            cell !== null && cell.object.id === 'sacrificial_chamber'
        );
        if (sacrificialChamberExists) {
            return false;
        }
    }
    
    // Get adjacent indices
    const adjacentIndices = getAdjacentIndices(index);
    
    // Check if adjacent to any placed room or locked cell
    const hasAdjacentRoom = adjacentIndices.some(adjIndex => 
        adjIndex === LOCKED_CELL_INDEX || gridData[adjIndex] !== null
    );
    
    if (!hasAdjacentRoom) {
        return false; // Not adjacent to any room or locked cell
    }
    
    // Get valid chain extensions from all adjacent rooms
    const validExtensions = getValidChainExtensions(index);
    
    // Check if the selected room is in the valid extensions
    const selectedRoomId = selectedRoom.id;
    
    if (validExtensions.has(selectedRoomId)) {
        return true;
    }
    
    // Check if the selected room would be converted to a valid extension
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
    }
    
    // Check if an adjacent room would be converted by the selected room to establish a valid chain
    const conversionRuleForSelected = CONVERSION_RULES[selectedRoomId];
    if (conversionRuleForSelected) {
        for (const adjIndex of adjacentIndices) {
            if (gridData[adjIndex] !== null) {
                const adjacentObjectId = gridData[adjIndex].object.id;
                if (conversionRuleForSelected[adjacentObjectId]) {
                    const convertedToId = conversionRuleForSelected[adjacentObjectId];
                    const convertedAllowedRooms = PLACEMENT_RULES[convertedToId] || [];
                    if (convertedAllowedRooms.includes(selectedRoomId)) {
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
        
        // Mark locked cell
        if (i === LOCKED_CELL_INDEX) {
            cell.classList.add('locked');
        }
        
        // Restore state if object exists
         if (gridData[i]) {
             const imgElement = document.createElement('img');
             imgElement.src = gridData[i].object.image;
             imgElement.alt = gridData[i].object.name;
             imgElement.title = gridData[i].object.name;
             imgElement.style.width = '100%';
             imgElement.style.height = '100%';
             cell.appendChild(imgElement);
             
             // Add level indicator in bottom right corner
             const levelIndicator = document.createElement('div');
             levelIndicator.className = 'level-indicator';
             levelIndicator.textContent = toRomanNumeral(gridData[i].level);
             if (gridData[i].level > 0) {
                 cell.appendChild(levelIndicator);
             }
             
             cell.classList.add('placed');
         }
        
        if (i !== LOCKED_CELL_INDEX) {
            cell.addEventListener('click', () => toggleCell(i, cell));
            cell.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                clearCell(i, cell);
            });
            cell.addEventListener('mouseover', () => {
                 if (gridData[i]) {
                     showTooltip(gridData[i].object.name, gridData[i].object.image, cell);
                 }
             });
            cell.addEventListener('mouseout', () => hideTooltip());
        }
        gridContainer.appendChild(cell);
    }
}

// Toggle object placement on cell
function toggleCell(index, cellElement) {
     if (gridData[index] === null) {
         // If no room is selected, show the room picker modal
         if (selectedRoom === null) {
             showRoomPickerModal(index, cellElement);
             return;
         }
         
         // Check if placement is valid
         if (!isValidPlacement(index)) {
             return;
         }
         
         // Level is based on count of this specific object type
         const objectLevel = selectedRoom.id === 'path' ? 0 : 1;
         
         // Place object with level and upgraded status
         gridData[index] = { object: selectedRoom, level: objectLevel, upgraded: false };
         placementOrder.push(index);
         
         // Create image element
         const imgElement = document.createElement('img');
         imgElement.src = selectedRoom.image;
         imgElement.alt = selectedRoom.name;
         imgElement.title = selectedRoom.name;
         imgElement.style.width = '100%';
         imgElement.style.height = '100%';
         cellElement.appendChild(imgElement);
         
         // Add level indicator in bottom right corner
         const levelIndicator = document.createElement('div');
         levelIndicator.className = 'level-indicator';
         levelIndicator.textContent = toRomanNumeral(objectLevel);
         if (objectLevel > 0) {
             cellElement.appendChild(levelIndicator);
         }
         
         cellElement.classList.add('placed');
         
         // Apply conversions first (before upgrades)
         applyConversions(index);
         
         // Apply upgrades to this newly placed object
         applyUpgrades(index);
         
         // Apply upgrades to all adjacent objects as well
         const adjacentIndices = getAdjacentIndices(index);
         adjacentIndices.forEach(adjIndex => {
             if (gridData[adjIndex] !== null) {
                 applyUpgrades(adjIndex);
             }
         });
     } else {
         // Remove object
         const removedIndex = placementOrder.indexOf(index);
         if (removedIndex > -1) {
             placementOrder.splice(removedIndex, 1);
         }
         gridData[index] = null;
         cellElement.innerHTML = '';
         cellElement.classList.remove('placed');
         
         // Recalculate upgrades for all adjacent objects
         const adjacentIndices = getAdjacentIndices(index);
         adjacentIndices.forEach(adjIndex => {
             if (gridData[adjIndex] !== null) {
                 applyUpgrades(adjIndex);
             }
         });
     }
     
     updateCount();
 }

// Clear cell (for right-click)
function clearCell(index, cellElement) {
     if (gridData[index] !== null) {
         const removedIndex = placementOrder.indexOf(index);
         if (removedIndex > -1) {
             placementOrder.splice(removedIndex, 1);
         }
         gridData[index] = null;
         cellElement.innerHTML = '';
         cellElement.classList.remove('placed');
         
         // Recalculate upgrades for all adjacent objects
         const adjacentIndices = getAdjacentIndices(index);
         adjacentIndices.forEach(adjIndex => {
             if (gridData[adjIndex] !== null) {
                 applyUpgrades(adjIndex);
             }
         });
         
         updateCount();
     }
 }

// Clear all objects from grid
function clearGrid() {
    if (confirm('Are you sure you want to clear all objects?')) {
        gridData.fill(null);
        placementOrder = [];
        initializeGrid();
        updateCount();
    }
}

// Update the count display
function updateCount() {
    const count = gridData.filter(cell => cell !== null).length;
    countDisplay.textContent = count;
    updateModifiersDisplay();
    drawConnections();
}

// Room picker modal functions
function showRoomPickerModal(cellIndex, cellElement) {
    const placeableRooms = getPlaceableRooms(cellIndex);
    const roomPickerGrid = document.getElementById('room-picker-grid');
    const modal = document.getElementById('room-picker-modal');
    
    roomPickerGrid.innerHTML = '';
    
    if (placeableRooms.length === 0) {
        roomPickerGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #999;">No compatible rooms available</p>';
    } else {
        placeableRooms.forEach(room => {
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
            
            roomPickerGrid.appendChild(btn);
        });
    }
    
    modal.classList.add('show');
}

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
    // Keep selection if clicking on grid cells or object selector
    const cellElement = e.target.closest('.cell');
    const objectBtn = e.target.closest('.object-btn');
    
    if (cellElement || objectBtn) {
        return;
    }
    
    // Deselect when clicking outside these interactive areas
    selectedRoom = null;
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
});

// Draw connections between related rooms
function drawConnections() {
    // Clear previous connections
    gridConnections.innerHTML = '';
    
    // Set SVG dimensions to match the wrapper
    const wrapper = gridConnections.parentElement;
    gridConnections.setAttribute('width', wrapper.offsetWidth);
    gridConnections.setAttribute('height', wrapper.offsetHeight);
    
    // For each cell with a room, check adjacent cells
    gridData.forEach((cell, index) => {
        if (cell === null) return;
        
        const adjacentIndices = getAdjacentIndices(index);
        
        adjacentIndices.forEach(adjIndex => {
            if (index < adjIndex && gridData[adjIndex] !== null) { // Only draw once per pair
                const adjacentObjectId = gridData[adjIndex].object.id;
                const currentObjectId = cell.object.id;
                
                // Check if rooms are related (in placement rules)
                const allowedRooms = PLACEMENT_RULES[currentObjectId] || [];
                if (allowedRooms.includes(adjacentObjectId)) {
                    drawConnectionLine(index, adjIndex);
                }
            }
        });
    });
}

// Draw a line between two cell indices, accounting for 45-degree rotation
function drawConnectionLine(index1, index2) {
    const cell1 = document.querySelector(`[data-index="${index1}"]`);
    const cell2 = document.querySelector(`[data-index="${index2}"]`);
    
    if (!cell1 || !cell2) return;
    
    const rect1 = cell1.getBoundingClientRect();
    const rect2 = cell2.getBoundingClientRect();
    const wrapper = gridConnections.parentElement;
    const wrapperRect = wrapper.getBoundingClientRect();
    
    // Get center points of cells in SVG coordinate space
    const center1X = rect1.left - wrapperRect.left + rect1.width / 2;
    const center1Y = rect1.top - wrapperRect.top + rect1.height / 2;
    const center2X = rect2.left - wrapperRect.left + rect2.width / 2;
    const center2Y = rect2.top - wrapperRect.top + rect2.height / 2;
    
    // Calculate direction vector between centers
    const dx = center2X - center1X;
    const dy = center2Y - center1Y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    // Normalize direction vector
    const normX = dx / distance;
    const normY = dy / distance;
    
    // For a square rotated 45 degrees, use the edge distance (half the cell dimensions)
    // This gives us the distance from center to the edge of the diamond
    const cellWidth = rect1.width;
    const cellHeight = rect1.height;
    const radius = Math.max(cellWidth, cellHeight) / 2;
    
    // Calculate edge points on both cells
    const x1 = center1X + normX * radius;
    const y1 = center1Y + normY * radius;
    const x2 = center2X - normX * radius;
    const y2 = center2Y - normY * radius;
    
    // Create line element
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
