// ==================== Save/Load Functionality ====================

const STORAGE_KEY = 'atziri_temple_layouts';

// Get all saved layouts from localStorage
function getSavedLayouts() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
}

// Save layouts to localStorage
function saveSavedLayouts(layouts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
}

// Convert grid data to a serializable format
function serializeGridData() {
    return gridData.map(cell => {
        if (cell === null) return null;
        return {
            objectId: cell.object.id,
            level: cell.level,
            upgraded: cell.upgraded,
            convertedBy: cell.convertedBy || null
        };
    });
}

// Restore grid data from serialized format
function deserializeGridData(serialized) {
    return serialized.map(cell => {
        if (cell === null) return null;
        const room = ROOMS.find(r => r.id === cell.objectId);
        if (!room) return null;
        return {
            object: room,
            level: cell.level,
            upgraded: cell.upgraded,
            convertedBy: cell.convertedBy || null
        };
    });
}

// Show save modal
function showSaveModal() {
    const modal = document.getElementById('save-modal');
    const input = document.getElementById('layout-name');
    input.value = '';
    input.focus();
    modal.classList.add('show');
}

// Close save modal
function closeSaveModal() {
    const modal = document.getElementById('save-modal');
    modal.classList.remove('show');
}

// Save current layout
function saveLayout() {
    const nameInput = document.getElementById('layout-name');
    let name = nameInput.value.trim();
    
    if (!name) {
        name = 'Untitled Layout';
    }
    
    const layouts = getSavedLayouts();
    const id = 'layout_' + Date.now();
    
    layouts[id] = {
        name: name,
        createdAt: new Date().toISOString(),
        gridData: serializeGridData()
    };
    
    saveSavedLayouts(layouts);
    closeSaveModal();
    
    showNotification(`Layout "${name}" saved!`);
}

// Show load modal
function showLoadModal() {
    const modal = document.getElementById('load-modal');
    const listContainer = document.getElementById('saved-layouts-list');
    
    const layouts = getSavedLayouts();
    const layoutIds = Object.keys(layouts);
    
    listContainer.innerHTML = '';
    
    if (layoutIds.length === 0) {
        listContainer.innerHTML = '<p class="no-layouts-message">No saved layouts yet</p>';
    } else {
        layoutIds.sort((a, b) => new Date(layouts[b].createdAt) - new Date(layouts[a].createdAt));
        
        layoutIds.forEach(id => {
            const layout = layouts[id];
            const item = document.createElement('div');
            item.className = 'saved-layout-item';
            
            const date = new Date(layout.createdAt);
            const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            item.innerHTML = `
                <div class="saved-layout-info" onclick="loadLayout('${id}')">
                    <div class="saved-layout-name">${escapeHtml(layout.name)}</div>
                    <div class="saved-layout-date">${dateStr}</div>
                </div>
                <div class="saved-layout-actions">
                    <button class="btn-danger" onclick="deleteLayout('${id}')">Delete</button>
                </div>
            `;
            
            listContainer.appendChild(item);
        });
    }
    
    modal.classList.add('show');
}

// Close load modal
function closeLoadModal() {
    const modal = document.getElementById('load-modal');
    modal.classList.remove('show');
}

// Load a saved layout
function loadLayout(id) {
    const layouts = getSavedLayouts();
    const layout = layouts[id];

    if (!layout) {
        showNotification('Layout not found', 'error');
        return;
    }

    const restoredData = deserializeGridData(layout.gridData);

    for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
        gridData[i] = restoredData[i];
    }

    chainColorMap.clear();
    nextColorIndex = 0;

    initializeGrid();

    // Re-apply all conversions after loading
    reapplyAllConversions();

    updateModifiersDisplay();
    drawConnections();

    closeLoadModal();
    showNotification(`Layout "${layout.name}" loaded!`);
}

// Delete a saved layout
function deleteLayout(id) {
    const layouts = getSavedLayouts();
    const layout = layouts[id];
    
    if (!layout) return;
    
    if (confirm(`Are you sure you want to delete "${layout.name}"?`)) {
        delete layouts[id];
        saveSavedLayouts(layouts);
        showLoadModal();
        showNotification(`Layout "${layout.name}" deleted`);
    }
}

// Export current layout to JSON file
function exportLayout() {
    const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        gridData: serializeGridData()
    };
    
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'temple_layout_' + Date.now() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Layout exported!');
}

// Import layout from JSON file
function importLayout(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);

            if (!data.gridData || !Array.isArray(data.gridData)) {
                throw new Error('Invalid layout format');
            }

            const restoredData = deserializeGridData(data.gridData);

            for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
                gridData[i] = restoredData[i];
            }

            chainColorMap.clear();
            nextColorIndex = 0;

            initializeGrid();

            // Re-apply all conversions after importing
            reapplyAllConversions();

            updateModifiersDisplay();
            drawConnections();

            showNotification('Layout imported successfully!');
        } catch (err) {
            showNotification('Failed to import layout: ' + err.message, 'error');
        }
    };

    reader.readAsText(file);
    event.target.value = '';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show notification toast
function showNotification(message, type = 'success') {
    const existing = document.querySelector('.notification');
    if (existing) {
        existing.remove();
    }
    
    const notification = document.createElement('div');
    notification.className = 'notification notification-' + type;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => notification.classList.add('show'), 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Create a room ID to index mapping for compact encoding
// Include ALL rooms (even hidden ones) so converted rooms can be serialized
const ROOM_ID_TO_INDEX = {};
const ROOM_INDEX_TO_ID = {};
ROOMS.forEach((room, index) => {
    ROOM_ID_TO_INDEX[room.id] = index;
    ROOM_INDEX_TO_ID[index] = room.id;
});

// Base64 URL-safe encoding characters
const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

// Convert byte array to Base64 URL-safe string
function bytesToBase64(bytes) {
    let result = '';
    for (let i = 0; i < bytes.length; i++) {
        result += BASE64_CHARS[bytes[i] & 0x3F];
    }
    return result;
}

// Convert Base64 URL-safe string to byte array
function base64ToBytes(str) {
    const bytes = [];
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        const index = BASE64_CHARS.indexOf(char);
        if (index >= 0) {
            bytes.push(index);
        }
    }
    return bytes;
}

// Serialize grid data using bit packing
function serializeGridToString() {
    const occupiedCells = [];
    for (let i = 0; i < gridData.length; i++) {
        if (gridData[i] !== null && i !== LOCKED_CELL_INDEX) {
            const cell = gridData[i];
            const roomIndex = ROOM_ID_TO_INDEX[cell.object.id];
            if (roomIndex !== undefined) {
            occupiedCells.push({
                index: i,
                roomIndex: roomIndex,
                level: Math.min(cell.level, 3), // Max level 3 (2 bits)
                upgradedBy: cell.upgradedBy || [],
                convertedBy: cell.convertedBy || null
            });
            }
        }
    }
    
    if (occupiedCells.length === 0) {
        return '';
    }
    
    // Bit packing format:
    // Header: number of cells (1 byte, max 81)
    // For each cell:
    //   - Cell index: 7 bits (0-80)
    //   - Room index: 6 bits (0-63, supports up to 64 rooms)
    //   - Level: 2 bits (0-3)
    //   - Has convertedBy flag: 1 bit
    //   - If has convertedBy: converter room index 6 bits
    //   - Number of upgradedBy entries: 2 bits (0-3)
    //   - For each upgradedBy: 6 bits (room index)
    // Total per cell: 18 bits minimum + 6 bits per upgrade (+6 if converted)
    
    const bytes = [];
    
    // Header: number of cells
    bytes.push(occupiedCells.length);
    
    let currentByte = 0;
    let bitsInCurrentByte = 0;
    
    function writeBits(value, numBits) {
        for (let i = numBits - 1; i >= 0; i--) {
            const bit = (value >> i) & 1;
            currentByte = (currentByte << 1) | bit;
            bitsInCurrentByte++;
            
            if (bitsInCurrentByte === 6) {
                bytes.push(currentByte);
                currentByte = 0;
                bitsInCurrentByte = 0;
            }
        }
    }
    
    // Flush remaining bits
    function flushBits() {
        if (bitsInCurrentByte > 0) {
            currentByte <<= (6 - bitsInCurrentByte);
            bytes.push(currentByte);
            currentByte = 0;
            bitsInCurrentByte = 0;
        }
    }
    
    for (const cell of occupiedCells) {
        // Write cell index (7 bits, 0-80)
        writeBits(cell.index, 7);
        
        // Write room index (6 bits)
        writeBits(cell.roomIndex, 6);
        
        // Write level (2 bits)
        writeBits(cell.level, 2);
        
        // Write has convertedBy flag (1 bit)
        const hasConvertedBy = cell.convertedBy !== null && cell.convertedBy !== undefined;
        writeBits(hasConvertedBy ? 1 : 0, 1);
        
        // Write converter room index if converted (6 bits)
        if (hasConvertedBy) {
            const converterIndex = ROOM_ID_TO_INDEX[cell.convertedBy];
            writeBits(converterIndex !== undefined ? converterIndex : 0, 6);
        }
        
        // Write number of upgradedBy entries (2 bits, max 3 upgrades)
        const numUpgrades = Math.min(cell.upgradedBy.length, 3);
        writeBits(numUpgrades, 2);
        
        // Write upgradedBy room indices (6 bits each)
        for (let i = 0; i < numUpgrades; i++) {
            const upgraderIndex = ROOM_ID_TO_INDEX[cell.upgradedBy[i]];
            if (upgraderIndex !== undefined) {
                writeBits(upgraderIndex, 6);
            } else {
                writeBits(0, 6);
            }
        }
    }
    
    flushBits();
    
    return bytesToBase64(bytes);
}

// Deserialize grid data from bit-packed format
function deserializeGridFromString(dataStr) {
    const gridData = Array(GRID_SIZE * GRID_SIZE).fill(null);
    
    // Set locked cell
    gridData[LOCKED_CELL_INDEX] = { 
        object: ROOMS.find(o => o.id === 'path'), 
        level: 0, 
        upgraded: false, 
        convertedBy: null, 
        upgradedBy: [] 
    };
    
    if (!dataStr) {
        return gridData;
    }
    
    const bytes = base64ToBytes(dataStr);
    if (bytes.length === 0) {
        return gridData;
    }
    
    // Read header: number of cells
    const numCells = bytes[0];
    
    let byteIndex = 1;
    let currentByte = 0;
    let bitsInCurrentByte = 0;
    
    function readBits(numBits) {
        let result = 0;
        for (let i = 0; i < numBits; i++) {
            if (bitsInCurrentByte === 0) {
                if (byteIndex >= bytes.length) {
                    return 0; // Out of data
                }
                currentByte = bytes[byteIndex++];
                bitsInCurrentByte = 6;
            }
            result = (result << 1) | ((currentByte >> 5) & 1);
            currentByte <<= 1;
            bitsInCurrentByte--;
        }
        return result;
    }
    
    for (let i = 0; i < numCells; i++) {
        // Read cell index (7 bits)
        const index = readBits(7);
        
        // Read room index (6 bits)
        const roomIndex = readBits(6);
        
        // Read level (2 bits)
        const level = readBits(2);
        
        // Read has convertedBy flag (1 bit)
        const hasConvertedBy = readBits(1) === 1;
        
        // Read converter room index if converted (6 bits)
        let convertedBy = null;
        if (hasConvertedBy) {
            const converterIndex = readBits(6);
            convertedBy = ROOM_INDEX_TO_ID[converterIndex];
        }
        
        // Read number of upgrades (2 bits)
        const numUpgrades = readBits(2);
        
        // Read upgradedBy room indices
        const upgradedBy = [];
        for (let j = 0; j < numUpgrades; j++) {
            const upgraderIndex = readBits(6);
            const upgraderId = ROOM_INDEX_TO_ID[upgraderIndex];
            if (upgraderId) {
                upgradedBy.push(upgraderId);
            }
        }
        
        // Create cell if valid
        if (index < gridData.length && index !== LOCKED_CELL_INDEX) {
            const roomId = ROOM_INDEX_TO_ID[roomIndex];
            const room = ROOMS.find(r => r.id === roomId);
            if (room) {
                gridData[index] = {
                    object: room,
                    level: level,
                    upgraded: upgradedBy.length > 0,
                    convertedBy: convertedBy,
                    upgradedBy: upgradedBy
                };
            } else {
                console.error('ERROR - Room not found for index', roomIndex, 'at cell', index);
            }
        }
    }
    
    return gridData;
}

// Generate share URL
function generateShareUrl() {
    const gridStr = serializeGridToString();
    if (!gridStr) {
        return window.location.origin + window.location.pathname;
    }
    return window.location.origin + window.location.pathname + '#' + encodeURIComponent(gridStr);
}

// Load layout from URL hash
function loadLayoutFromHash() {
    const hash = window.location.hash.slice(1); // Remove #
    if (!hash) return false;
    
    try {
        const gridStr = decodeURIComponent(hash);
        const restoredData = deserializeGridFromString(gridStr);
        
        // Restore grid data
        for (let i = 0; i < gridData.length; i++) {
            gridData[i] = restoredData[i];
        }
        
        // Note: We don't call reapplyAllConversions() here because the URL
        // already contains the final state after all conversions have been applied.
        // Each converted room is stored with its converted type and convertedBy field.
        // Re-applying conversions would reset them to their original type first,
        // which would lose the converted state.
        
        // Update display
        initializeGrid();
        updateModifiersDisplay();
        drawConnections();
        
        showNotification('Layout loaded from URL!');
        return true;
    } catch (e) {
        console.error('Failed to load layout from URL:', e);
        showNotification('Failed to load layout from URL', 'error');
        return false;
    }
}

// Share layout - generates URL and copies to clipboard immediately
function shareLayout() {
    const url = generateShareUrl();
    
    navigator.clipboard.writeText(url).then(() => {
        showNotification('Link copied to clipboard!');
    }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Link copied to clipboard!');
    });
}

// Show share modal
function showShareModal() {
    const modal = document.getElementById('share-modal');
    const urlInput = document.getElementById('share-url');
    const copyBtn = document.getElementById('share-copy-btn');
    
    urlInput.value = generateShareUrl();
    copyBtn.textContent = 'Copy';
    copyBtn.classList.remove('copied');
    
    modal.classList.add('active');
}

// Close share modal
function closeShareModal() {
    document.getElementById('share-modal').classList.remove('active');
}

// Copy share URL to clipboard
function copyShareUrl() {
    const urlInput = document.getElementById('share-url');
    const copyBtn = document.getElementById('share-copy-btn');
    
    urlInput.select();
    urlInput.setSelectionRange(0, 99999); // For mobile
    
    navigator.clipboard.writeText(urlInput.value).then(() => {
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        showNotification('Link copied to clipboard!');
    }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        document.execCommand('copy');
        copyBtn.textContent = 'Copied!';
        copyBtn.classList.add('copied');
        showNotification('Link copied to clipboard!');
    });
}

// Initialize layout manager event listeners
function initializeLayoutManager() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        const saveModal = document.getElementById('save-modal');
        const loadModal = document.getElementById('load-modal');
        const shareModal = document.getElementById('share-modal');
        
        if (e.target === saveModal) {
            closeSaveModal();
        }
        if (e.target === loadModal) {
            closeLoadModal();
        }
        if (e.target === shareModal) {
            closeShareModal();
        }
    });

    // Handle Enter key in save modal
    document.getElementById('layout-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveLayout();
        }
    });
    
    // Handle hash changes for shared layouts
    window.addEventListener('hashchange', () => {
        if (window.location.hash) {
            loadLayoutFromHash();
        }
    });
}
