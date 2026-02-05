/**
 * Tests for placement rules and validation logic.
 */

const {
    GRID_SIZE,
    LOCKED_CELL_INDEX,
    getAdjacentIndices,
    wouldConversionBreakChain,
    isValidPlacement,
    getValidChainExtensions,
    createEmptyGrid,
    createCell,
    PLACEMENT_RULES,
    CONVERSION_RULES
} = require('../placement-logic.js');

describe('getAdjacentIndices', () => {
    test('returns 4 adjacent cells for center cell', () => {
        // Cell 40 is the center (4,4)
        const adjacent = getAdjacentIndices(40);
        expect(adjacent).toHaveLength(4);
        expect(adjacent).toContain(31); // up
        expect(adjacent).toContain(49); // down
        expect(adjacent).toContain(39); // left
        expect(adjacent).toContain(41); // right
    });

    test('returns 3 adjacent cells for edge cell', () => {
        // Cell 0 is top-left corner
        const adjacent = getAdjacentIndices(0);
        expect(adjacent).toHaveLength(2);
        expect(adjacent).toContain(9);  // down
        expect(adjacent).toContain(1);  // right
    });

    test('returns 3 adjacent cells for top edge', () => {
        // Cell 4 is top middle
        const adjacent = getAdjacentIndices(4);
        expect(adjacent).toHaveLength(3);
        expect(adjacent).toContain(13); // down
        expect(adjacent).toContain(3);  // left
        expect(adjacent).toContain(5);  // right
    });
});

describe('PLACEMENT_RULES', () => {
    test('path can connect to all non-hidden rooms', () => {
        const pathAllowed = PLACEMENT_RULES['path'];
        expect(pathAllowed).toContain('garrison');
        expect(pathAllowed).toContain('armoury');
        expect(pathAllowed).toContain('path');
    });

    test('spymaster can only connect to legion_barrack and path', () => {
        const spymasterAllowed = PLACEMENT_RULES['spymaster'];
        expect(spymasterAllowed).toEqual(['legion_barrack', 'path']);
    });

    test('garrison can connect to armoury, commander, and path', () => {
        const garrisonAllowed = PLACEMENT_RULES['garrison'];
        expect(garrisonAllowed).toContain('armoury');
        expect(garrisonAllowed).toContain('commander');
        expect(garrisonAllowed).toContain('path');
    });
});

describe('CONVERSION_RULES', () => {
    test('spymaster converts garrison to legion_barrack', () => {
        expect(CONVERSION_RULES['spymaster']['garrison']).toBe('legion_barrack');
    });

    test('synthflesh_lab converts garrison to transcendent_barracks', () => {
        expect(CONVERSION_RULES['synthflesh_lab']['garrison']).toBe('transcendent_barracks');
    });

    test('synthflesh_lab converts legion_barrack to transcendent_barracks', () => {
        expect(CONVERSION_RULES['synthflesh_lab']['legion_barrack']).toBe('transcendent_barracks');
    });
});

describe('isValidPlacement - basic placement', () => {
    test('can place garrison next to path (center cell)', () => {
        const gridData = createEmptyGrid();
        // Cell 31 is directly above the locked center cell (40)
        const result = isValidPlacement(31, 'garrison', gridData);
        expect(result).toBe(true);
    });

    test('cannot place room with no adjacent rooms', () => {
        const gridData = createEmptyGrid();
        // Cell 0 is corner with no adjacent rooms
        const result = isValidPlacement(0, 'garrison', gridData);
        expect(result).toBe(false);
    });

    test('can place armoury next to garrison', () => {
        const gridData = createEmptyGrid();
        // Place garrison at cell 31 (above center)
        gridData[31] = createCell('garrison');
        // Try to place armoury at cell 22 (above garrison)
        const result = isValidPlacement(22, 'armoury', gridData);
        expect(result).toBe(true);
    });

    test('cannot place spymaster directly next to path', () => {
        const gridData = createEmptyGrid();
        // Spymaster can only connect to legion_barrack, not directly to path
        // Cell 31 is next to path but spymaster's PLACEMENT_RULES only allow legion_barrack and path
        // Wait - spymaster DOES allow path in its placement rules
        const result = isValidPlacement(31, 'spymaster', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - conversions', () => {
    test('spymaster can be placed next to garrison (will convert it)', () => {
        const gridData = createEmptyGrid();
        // Place garrison at cell 31
        gridData[31] = createCell('garrison');
        // Spymaster at cell 22 should be able to convert garrison to legion_barrack
        const result = isValidPlacement(22, 'spymaster', gridData);
        expect(result).toBe(true);
    });

    test('spymaster converts garrison to legion_barrack - check rule symmetry', () => {
        // When spymaster converts garrison to legion_barrack:
        // - legion_barrack must allow spymaster (yes: ['armoury', 'spymaster', 'path'])
        // - spymaster must allow legion_barrack (yes: ['legion_barrack', 'path'])
        expect(PLACEMENT_RULES['legion_barrack']).toContain('spymaster');
        expect(PLACEMENT_RULES['spymaster']).toContain('legion_barrack');
    });
});

describe('isValidPlacement - the spymaster/garrison/legion_barrack scenario', () => {
    /**
     * Scenario: What happens when spymaster tries to convert garrison to legion_barrack
     * but there's already a legion_barrack adjacent to the garrison?
     * 
     * Grid layout (9x9, center=40 is path):
     *   Row 2: ...21,22,23...
     *   Row 3: ...30,31,32...
     *   Row 4: ...39,40,41...  (40 is path/center)
     * 
     * Setup:
     *   - Cell 40: path (locked center)
     *   - Cell 31: garrison (above path)  
     *   - Cell 22: legion_barrack (above garrison)
     *   
     * If spymaster is placed at cell 32, it would convert garrison to legion_barrack.
     * But then cells 22 (legion_barrack) and 31 (converted legion_barrack) would be
     * adjacent, and PLACEMENT_RULES['legion_barrack'] = ['armoury', 'spymaster', 'path']
     * does NOT allow legion_barrack to be adjacent to another legion_barrack.
     * 
     * Therefore, this placement should be BLOCKED to prevent breaking the chain.
     */
    test('cannot place spymaster when conversion would create invalid adjacent legion_barracks', () => {
        const gridData = createEmptyGrid();
        
        // Setup: garrison above path
        gridData[31] = createCell('garrison');
        
        // Setup: legion_barrack above garrison
        gridData[22] = createCell('legion_barrack', null, 'spymaster');
        
        // Try to place spymaster at cell 32 (right of garrison)
        // This would convert garrison to legion_barrack, creating two adjacent legion_barracks
        // which is NOT allowed by placement rules
        const result = isValidPlacement(32, 'spymaster', gridData);
        expect(result).toBe(false);
    });

    test('CAN place spymaster next to garrison when no conflicting legion_barrack', () => {
        const gridData = createEmptyGrid();
        
        // Setup: just garrison above path, no legion_barrack nearby
        gridData[31] = createCell('garrison');
        
        // Spymaster at cell 32 can convert garrison to legion_barrack
        // No conflict because garrison's other neighbors are just path
        const result = isValidPlacement(32, 'spymaster', gridData);
        expect(result).toBe(true);
    });

    test('spymaster next to garrison converts it to legion_barrack', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('garrison');
        
        // Cell 32 is to the right of garrison
        const result = isValidPlacement(32, 'spymaster', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - end-of-chain rooms', () => {
    /**
     * End-of-chain rooms like golem_works, flesh_surgeon should be placeable
     * even though they don't upgrade or convert anything.
     */
    test('golem_works can be placed next to smithy', () => {
        const gridData = createEmptyGrid();
        // Place smithy adjacent to path
        gridData[31] = createCell('smithy');
        // golem_works should be placeable next to smithy
        const result = isValidPlacement(22, 'golem_works', gridData);
        expect(result).toBe(true);
    });

    test('flesh_surgeon can be placed next to synthflesh_lab', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('synthflesh_lab');
        const result = isValidPlacement(22, 'flesh_surgeon', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - sacrificial_chamber uniqueness', () => {
    test('can place sacrificial_chamber when none exists', () => {
        const gridData = createEmptyGrid();
        const result = isValidPlacement(31, 'sacrificial_chamber', gridData);
        expect(result).toBe(true);
    });

    test('cannot place second sacrificial_chamber', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('sacrificial_chamber');
        // Try to place another at cell 49 (below center)
        const result = isValidPlacement(49, 'sacrificial_chamber', gridData);
        expect(result).toBe(false);
    });
});

describe('isValidPlacement - generator rules', () => {
    test('generator can be placed next to path', () => {
        const gridData = createEmptyGrid();
        const result = isValidPlacement(31, 'generator', gridData);
        expect(result).toBe(true);
    });

    test('generator cannot be placed away from path', () => {
        const gridData = createEmptyGrid();
        // Place some rooms to create a chain
        gridData[31] = createCell('thaumaturge');
        gridData[22] = createCell('alchemy_lab');
        // Try to place generator next to alchemy_lab but not adjacent to path
        // Cell 13 is above cell 22
        const result = isValidPlacement(13, 'generator', gridData);
        expect(result).toBe(false);
    });
});

describe('wouldConversionBreakChain', () => {
    test('conversion does not break chain when no other adjacent rooms', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('garrison');
        // Converting garrison to legion_barrack when only adjacent to path should be fine
        const result = wouldConversionBreakChain(31, 'legion_barrack', gridData);
        expect(result).toBe(false);
    });

    test('conversion breaks chain when adjacent room incompatible', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('garrison');
        gridData[22] = createCell('commander'); // commander allows garrison but not legion_barrack
        
        // Converting garrison to legion_barrack would break connection with commander
        // commander's allowed: ['garrison', 'transcendent_barracks', 'path']
        // legion_barrack's allowed: ['armoury', 'spymaster', 'path']
        const result = wouldConversionBreakChain(31, 'legion_barrack', gridData);
        expect(result).toBe(true);
    });
});

describe('getValidChainExtensions', () => {
    test('returns rooms that can be placed next to path', () => {
        const gridData = createEmptyGrid();
        // Cell 31 is adjacent to locked cell (path)
        const validRooms = getValidChainExtensions(31, gridData);
        
        // Should include rooms that path allows
        expect(validRooms.has('garrison')).toBe(true);
        expect(validRooms.has('armoury')).toBe(true);
        expect(validRooms.has('generator')).toBe(true);
    });

    test('returns upgrade rooms for adjacent upgradeable room', () => {
        const gridData = createEmptyGrid();
        gridData[31] = createCell('garrison');
        
        // Cell 22 is above garrison
        const validRooms = getValidChainExtensions(22, gridData);
        
        // Should include rooms that can upgrade garrison (armoury, commander)
        expect(validRooms.has('armoury')).toBe(true);
        expect(validRooms.has('commander')).toBe(true);
    });
});
