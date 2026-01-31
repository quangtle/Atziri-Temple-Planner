const GRID_SIZE = 9;
const gridContainer = document.getElementById('grid');
const objectGrid = document.getElementById('object-grid');
const countDisplay = document.getElementById('count');
const tooltip = document.getElementById('tooltip');
const modifiersTable = document.getElementById('modifiers-table');

// Function to convert number to Roman numerals (max level 3)
function toRomanNumeral(num) {
    const romanNumerals = ['', 'I', 'II', 'III'];
    return romanNumerals[Math.min(num, 3)] || '';
}

// Rooms array loaded from rooms.js
let selectedRoom = ROOMS[0];

// Locked cell: bottom middle (row 8, column 4)
const LOCKED_CELL_INDEX = 8 * 9 + 4; // Index 76

// Initialize grid data - store objects with their level
const gridData = Array(GRID_SIZE * GRID_SIZE).fill(null);

// Place path object in locked cell
gridData[LOCKED_CELL_INDEX] = { object: ROOMS.find(o => o.id === 'path'), level: 0 };

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
    
    const table = document.createElement('table');
    table.className = 'modifiers-table-content';
    
    // Add header
    const headerRow = table.insertRow();
    const headerName = headerRow.insertCell();
    headerName.textContent = 'Modifier';
    headerName.className = 'modifier-header';
    const headerValue = headerRow.insertCell();
    headerValue.textContent = 'Total';
    headerValue.className = 'modifier-header';
    
    // Add rows for each modifier
    Object.entries(accumulated).forEach(([name, value]) => {
        const row = table.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = name;
        nameCell.className = 'modifier-name';
        const valueCell = row.insertCell();
        valueCell.textContent = value;
        valueCell.className = 'modifier-value';
    });
    
    modifiersTable.appendChild(table);
}

// Show tooltip
function showTooltip(objectName, element) {
    tooltip.textContent = objectName;
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
        btn.addEventListener('mouseover', () => showTooltip(obj.name, btn));
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
    const col = index % GRID_SIZE;
    
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

// Check if a cell has any adjacent objects
function hasAdjacentObject(index) {
    return getAdjacentIndices(index).some(adjIndex => gridData[adjIndex] !== null);
}

// Apply conversions when an object is placed
function applyConversions(index) {
    if (gridData[index] === null) {
        return;
    }
    
    const placedObjectId = gridData[index].object.id;
    const adjacentIndices = getAdjacentIndices(index);
    const conversionRule = CONVERSION_RULES[placedObjectId];
    
    if (!conversionRule) {
        return;
    }
    
    // Check each adjacent cell for objects to convert
    adjacentIndices.forEach(adjIndex => {
        if (gridData[adjIndex] !== null) {
            const adjacentObjectId = gridData[adjIndex].object.id;
            const convertToId = conversionRule[adjacentObjectId];
            
            if (convertToId) {
                // Convert the adjacent object
                const targetObject = ROOMS.find(obj => obj.id === convertToId);
                if (targetObject) {
                    const level = gridData[adjIndex].level;  // Preserve level
                    gridData[adjIndex].object = targetObject;
                    
                    // Update the DOM
                    const cell = document.querySelector(`[data-index="${adjIndex}"]`);
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
    
    // Reset level to 1 (base level)
    gridData[index].level = 1;
    
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
            gridData[index].level = Math.max(1, count);
        } else if (upgradeRule.type === 'list' && Array.isArray(upgradeRule.upgradedBy)) {
            // List of objects that upgrade this object
            adjacentIndices.forEach(adjIndex => {
                if (gridData[adjIndex] !== null) {
                    const adjacentObjectId = gridData[adjIndex].object.id;
                    
                    // If the adjacent object can upgrade this object, apply upgrade
                    if (upgradeRule.upgradedBy.includes(adjacentObjectId)) {
                        gridData[index].level += 1;
                    }
                }
            });
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

// Check if placement is valid (adjacent to another object, locked cell, or first placement)
function isValidPlacement(index) {
    // First object can be placed anywhere
    const hasAnyObjects = gridData.some(cell => cell !== null);
    if (!hasAnyObjects) {
        return true;
    }
    
    // Check if adjacent to existing objects
    if (hasAdjacentObject(index)) {
        return true;
    }
    
    // Check if adjacent to the locked cell
    const adjacentIndices = getAdjacentIndices(index);
    if (adjacentIndices.includes(LOCKED_CELL_INDEX)) {
        return true;
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
                     showTooltip(gridData[i].object.name, cell);
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
         // Check if placement is valid
         if (!isValidPlacement(index)) {
             return;
         }
         
         // Level is based on count of this specific object type
         const objectLevel = selectedRoom.id === 'path' ? 0 : 1;
         
         // Place object with level
         gridData[index] = { object: selectedRoom, level: objectLevel };
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

// Update all level indicators after removal
function updateAllLevels() {
     // Recalculate upgrades for all objects on the grid
     gridData.forEach((cell, index) => {
         if (cell !== null) {
             applyUpgrades(index);
         }
     });
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
}

// Toggle object visibility in selector
function toggleObjectVisibility(objectName) {
    const obj = OBJECTS.find(o => o.name === objectName);
    if (obj) {
        obj.hidden = !obj.hidden;
        initializeObjectGrid();
    }
}

// Initialize on page load
initializeObjectGrid();
initializeGrid();
