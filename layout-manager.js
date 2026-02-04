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
        gridData: serializeGridData(),
        placementOrder: [...placementOrder]
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
    
    placementOrder = layout.placementOrder ? [...layout.placementOrder] : [];
    
    chainColorMap.clear();
    nextColorIndex = 0;
    
    initializeGrid();
    updateCount();
    
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
        gridData: serializeGridData(),
        placementOrder: [...placementOrder]
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
            
            placementOrder = data.placementOrder ? [...data.placementOrder] : [];
            
            chainColorMap.clear();
            nextColorIndex = 0;
            
            initializeGrid();
            updateCount();
            
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

// Initialize layout manager event listeners
function initializeLayoutManager() {
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        const saveModal = document.getElementById('save-modal');
        const loadModal = document.getElementById('load-modal');
        
        if (e.target === saveModal) {
            closeSaveModal();
        }
        if (e.target === loadModal) {
            closeLoadModal();
        }
    });

    // Handle Enter key in save modal
    document.getElementById('layout-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            saveLayout();
        }
    });
}
