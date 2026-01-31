const GRID_SIZE = 9;
const gridContainer = document.getElementById('grid');
const objectGrid = document.getElementById('object-grid');
const countDisplay = document.getElementById('count');
const tooltip = document.getElementById('tooltip');

let OBJECTS = [
    { name: 'star', label: '⭐', image: 'resources/images/star.svg' },
    { name: 'box', label: '🎁', image: 'resources/images/box.svg' },
    { name: 'gem', label: '💎', image: 'resources/images/gem.svg' },
    { name: 'house', label: '🏠', image: 'resources/images/house.svg' },
    { name: 'tree', label: '🌳', image: 'resources/images/tree.svg' },
    { name: 'heart', label: '❤️', image: 'resources/images/heart.svg' },
    { name: 'fire', label: '🔥', image: 'resources/images/fire.svg' },
    { name: 'sword', label: '⚔️', image: 'resources/images/sword.svg' }
];
let selectedObject = OBJECTS[0];

// Locked cell: bottom middle (row 8, column 4)
const LOCKED_CELL_INDEX = 8 * 9 + 4; // Index 76

// Initialize grid data
const gridData = Array(GRID_SIZE * GRID_SIZE).fill(null);

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
    OBJECTS.forEach((obj) => {
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
        
        if (obj.name === selectedObject.name) {
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
    selectedObject = obj;
    
    // Update visual feedback
    document.querySelectorAll('.object-btn').forEach(btn => {
        btn.classList.remove('selected');
    });
    btnElement.classList.add('selected');
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
            imgElement.src = gridData[i].image;
            imgElement.alt = gridData[i].name;
            imgElement.title = gridData[i].name;
            imgElement.style.width = '100%';
            imgElement.style.height = '100%';
            cell.appendChild(imgElement);
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
                    showTooltip(gridData[i].name, cell);
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
        // Place object
        gridData[index] = selectedObject;
        const imgElement = document.createElement('img');
        imgElement.src = selectedObject.image;
        imgElement.alt = selectedObject.name;
        imgElement.title = selectedObject.name;
        imgElement.style.width = '100%';
        imgElement.style.height = '100%';
        cellElement.appendChild(imgElement);
        cellElement.classList.add('placed');
    } else {
        // Remove object
        gridData[index] = null;
        cellElement.innerHTML = '';
        cellElement.classList.remove('placed');
    }
    
    updateCount();
}

// Clear cell (for right-click)
function clearCell(index, cellElement) {
    if (gridData[index] !== null) {
        gridData[index] = null;
        cellElement.innerHTML = '';
        cellElement.classList.remove('placed');
        updateCount();
    }
}

// Clear all objects from grid
function clearGrid() {
    if (confirm('Are you sure you want to clear all objects?')) {
        gridData.fill(null);
        initializeGrid();
        updateCount();
    }
}

// Update the count display
function updateCount() {
    const count = gridData.filter(cell => cell !== null).length;
    countDisplay.textContent = count;
}

// Initialize on page load
initializeObjectGrid();
initializeGrid();
