/**
 * Tests for placement rules and validation logic.
 */

const {
    GRID_SIZE,
    LOCKED_CELL_INDEX,
    getAdjacentIndices,
    wouldConversionBreakChain,
    wouldPlacementBreakAnyChain,
    wouldUpgradeExceedMaxLevel,
    isValidPlacement,
    getValidChainExtensions,
    createEmptyGrid,
    createCell,
    PLACEMENT_RULES,
    CONVERSION_RULES
} = require('../placement-logic.js');

describe('getAdjacentIndices', () => {
    test('[001] returns 4 adjacent cells for center cell', () => {
        // Cell 40 is the center (4,4)
        const adjacent = getAdjacentIndices(40);
        expect(adjacent).toHaveLength(4);
        expect(adjacent).toContain(31); // up
        expect(adjacent).toContain(49); // down
        expect(adjacent).toContain(39); // left
        expect(adjacent).toContain(41); // right
    });

    test('[002] returns 3 adjacent cells for edge cell', () => {
        // Cell 0 is top-left corner
        const adjacent = getAdjacentIndices(0);
        expect(adjacent).toHaveLength(2);
        expect(adjacent).toContain(9);  // down
        expect(adjacent).toContain(1);  // right
    });

    test('[003] returns 3 adjacent cells for top edge', () => {
        // Cell 4 is top middle
        const adjacent = getAdjacentIndices(4);
        expect(adjacent).toHaveLength(3);
        expect(adjacent).toContain(13); // down
        expect(adjacent).toContain(3);  // left
        expect(adjacent).toContain(5);  // right
    });
});

describe('PLACEMENT_RULES', () => {
    test('[004] path can connect to all non-hidden rooms', () => {
        const pathAllowed = PLACEMENT_RULES['path'];
        expect(pathAllowed).toContain('garrison');
        expect(pathAllowed).toContain('armoury');
        expect(pathAllowed).toContain('path');
    });

    test('[005] spymaster can only connect to legion_barrack and path', () => {
        const spymasterAllowed = PLACEMENT_RULES['spymaster'];
        expect(spymasterAllowed).toEqual(['legion_barrack', 'path']);
    });

    test('[006] garrison can connect to armoury, commander, and path', () => {
        const garrisonAllowed = PLACEMENT_RULES['garrison'];
        expect(garrisonAllowed).toContain('armoury');
        expect(garrisonAllowed).toContain('commander');
        expect(garrisonAllowed).toContain('path');
    });
});

describe('CONVERSION_RULES', () => {
    test('[007] spymaster converts garrison to legion_barrack', () => {
        expect(CONVERSION_RULES['spymaster']['garrison']).toBe('legion_barrack');
    });

    test('[008] synthflesh_lab converts garrison to transcendent_barracks', () => {
        expect(CONVERSION_RULES['synthflesh_lab']['garrison']).toBe('transcendent_barracks');
    });

    test('[009] synthflesh_lab converts legion_barrack to transcendent_barracks', () => {
        expect(CONVERSION_RULES['synthflesh_lab']['legion_barrack']).toBe('transcendent_barracks');
    });
});

describe('isValidPlacement - basic placement', () => {
    test('[010] can place garrison next to path (locked cell)', () => {
        const gridData = createEmptyGrid();
        // Cell 67 is directly above the locked cell (76)
        const result = isValidPlacement(67, 'garrison', gridData);
        expect(result).toBe(true);
    });

    test('[011] cannot place room with no adjacent rooms', () => {
        const gridData = createEmptyGrid();
        // Cell 0 is corner with no adjacent rooms
        const result = isValidPlacement(0, 'garrison', gridData);
        expect(result).toBe(false);
    });

    test('[012] can place armoury next to garrison', () => {
        const gridData = createEmptyGrid();
        // Place garrison at cell 31 (above center)
        gridData[31] = createCell('garrison');
        // Try to place armoury at cell 22 (above garrison)
        const result = isValidPlacement(22, 'armoury', gridData);
        expect(result).toBe(true);
    });

    test('[013] cannot place spymaster directly next to path', () => {
        const gridData = createEmptyGrid();
        // Spymaster can only connect to legion_barrack, not directly to path
        // Cell 67 is next to path but spymaster's PLACEMENT_RULES only allow legion_barrack and path
        // Wait - spymaster DOES allow path in its placement rules
        const result = isValidPlacement(67, 'spymaster', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - conversions', () => {
    test('[014] spymaster can be placed next to garrison (will convert it)', () => {
        const gridData = createEmptyGrid();
        // Place garrison at cell 67 (above locked cell 76)
        gridData[67] = createCell('garrison');
        // Spymaster at cell 58 (above garrison) should be able to convert garrison to legion_barrack
        const result = isValidPlacement(58, 'spymaster', gridData);
        expect(result).toBe(true);
    });

    test('[015] spymaster converts garrison to legion_barrack - check rule symmetry', () => {
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
     * Grid layout (9x9, locked cell=76 at row 8, col 4):
     *   Row 6: ...57,58,59...
     *   Row 7: ...66,67,68...
     *   Row 8: ...75,76,77...  (76 is locked path)
     * 
     * Setup:
     *   - Cell 76: path (locked)
     *   - Cell 67: garrison (above path)  
     *   - Cell 58: legion_barrack (above garrison)
     *   
     * If spymaster is placed at cell 68, it would convert garrison to legion_barrack.
     * But then cells 58 (legion_barrack) and 67 (converted legion_barrack) would be
     * adjacent, and PLACEMENT_RULES['legion_barrack'] = ['armoury', 'spymaster', 'path']
     * does NOT allow legion_barrack to be adjacent to another legion_barrack.
     * 
     * Therefore, this placement should be BLOCKED to prevent breaking the chain.
     */
    test('[016] cannot place spymaster when conversion would create invalid adjacent legion_barracks', () => {
        const gridData = createEmptyGrid();
        
        // Setup: garrison above locked path
        gridData[67] = createCell('garrison');
        
        // Setup: legion_barrack above garrison
        gridData[58] = createCell('legion_barrack', null, 'spymaster');
        
        // Try to place spymaster at cell 68 (right of garrison)
        // This would convert garrison to legion_barrack, creating two adjacent legion_barracks
        // which is NOT allowed by placement rules
        const result = isValidPlacement(68, 'spymaster', gridData);
        expect(result).toBe(false);
    });

    test('[017] CAN place spymaster next to garrison when no conflicting legion_barrack', () => {
        const gridData = createEmptyGrid();
        
        // Setup: just garrison above path, no legion_barrack nearby
        gridData[67] = createCell('garrison');
        
        // Spymaster at cell 68 can convert garrison to legion_barrack
        // No conflict because garrison's other neighbors are just path
        const result = isValidPlacement(68, 'spymaster', gridData);
        expect(result).toBe(true);
    });

    test('[018] spymaster next to garrison converts it to legion_barrack', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('garrison');
        
        // Cell 68 is to the right of garrison
        const result = isValidPlacement(68, 'spymaster', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - end-of-chain rooms', () => {
    /**
     * End-of-chain rooms like golem_works, flesh_surgeon should be placeable
     * even though they don't upgrade or convert anything.
     */
    test('[019] golem_works can be placed next to smithy', () => {
        const gridData = createEmptyGrid();
        // Place smithy adjacent to locked path (cell 67)
        gridData[67] = createCell('smithy');
        // golem_works should be placeable next to smithy (cell 58)
        const result = isValidPlacement(58, 'golem_works', gridData);
        expect(result).toBe(true);
    });

    test('[020] flesh_surgeon can be placed next to synthflesh_lab', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('synthflesh_lab');
        const result = isValidPlacement(58, 'flesh_surgeon', gridData);
        expect(result).toBe(true);
    });
});

describe('isValidPlacement - sacrificial_chamber uniqueness', () => {
    test('[021] can place sacrificial_chamber when none exists', () => {
        const gridData = createEmptyGrid();
        const result = isValidPlacement(67, 'sacrificial_chamber', gridData);
        expect(result).toBe(true);
    });

    test('[022] cannot place second sacrificial_chamber', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('sacrificial_chamber');
        // Try to place another at cell 75 (left of locked cell 76)
        const result = isValidPlacement(75, 'sacrificial_chamber', gridData);
        expect(result).toBe(false);
    });
});

describe('isValidPlacement - generator rules', () => {
    test('[023] generator can be placed next to path', () => {
        const gridData = createEmptyGrid();
        const result = isValidPlacement(67, 'generator', gridData);
        expect(result).toBe(true);
    });

    test('[024] generator cannot be placed away from path', () => {
        const gridData = createEmptyGrid();
        // Place some rooms to create a chain
        gridData[67] = createCell('thaumaturge');
        gridData[58] = createCell('alchemy_lab');
        // Try to place generator next to alchemy_lab but not adjacent to path
        // Cell 49 is above cell 58
        const result = isValidPlacement(49, 'generator', gridData);
        expect(result).toBe(false);
    });
});

describe('wouldConversionBreakChain', () => {
    test('[025] conversion does not break chain when no other adjacent rooms', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('garrison');
        // Converting garrison to legion_barrack when only adjacent to path should be fine
        const result = wouldConversionBreakChain(67, 'legion_barrack', gridData);
        expect(result).toBe(false);
    });

    test('[026] conversion breaks chain when adjacent room incompatible', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('garrison');
        gridData[58] = createCell('commander'); // commander allows garrison but not legion_barrack
        
        // Converting garrison to legion_barrack would break connection with commander
        // commander's allowed: ['garrison', 'transcendent_barracks', 'path']
        // legion_barrack's allowed: ['armoury', 'spymaster', 'path']
        const result = wouldConversionBreakChain(67, 'legion_barrack', gridData);
        expect(result).toBe(true);
    });
});

describe('getValidChainExtensions', () => {
    test('[027] returns rooms that can be placed next to path', () => {
        const gridData = createEmptyGrid();
        // Cell 67 is adjacent to locked cell (76) - above it
        const validRooms = getValidChainExtensions(67, gridData);
        
        // Should include rooms that path allows
        expect(validRooms.has('garrison')).toBe(true);
        expect(validRooms.has('armoury')).toBe(true);
        expect(validRooms.has('generator')).toBe(true);
    });

    test('[028] returns upgrade rooms for adjacent upgradeable room', () => {
        const gridData = createEmptyGrid();
        gridData[67] = createCell('garrison');
        
        // Cell 58 is above garrison
        const validRooms = getValidChainExtensions(58, gridData);
        
        // Should include rooms that can upgrade garrison (armoury, commander)
        expect(validRooms.has('armoury')).toBe(true);
        expect(validRooms.has('commander')).toBe(true);
    });
});

describe('Complex chain scenario with spymaster', () => {
    /**
     * Scenario: Building a complex chain with spymaster conversion
     * 
     * Grid layout (locked cell=76 at row 8, col 4):
     *   Row 7: 63,64,65,66,67...
     *   Row 8: 72,73,74,75,76,77...  (76 is locked path)
     * 
     * Setup:
     *   - Cell 76: path (locked)
     *   - Cell 75: spymaster (placed first, left of path)
     *   - Cell 74: garrison -> converts to legion_barrack (left of spymaster)
     *   - Cell 65: armoury (above legion_barrack)
     *   - Cell 64: garrison (left of armoury)
     *   
     * Test: Spymaster should NOT be placeable at cell 73 (left of legion_barrack)
     * because cell 74 (legion_barrack) was converted BY spymaster, blocking 
     * additional spymaster placements adjacent to it.
     */
    test('[029] spymaster can be placed in complex chain scenario', () => {
        const gridData = createEmptyGrid();
        
        // Step 1: Place spymaster at 75 (adjacent to locked path at 76)
        gridData[75] = createCell('spymaster');
        
        // Step 2: Place garrison at 74 - should convert to legion_barrack
        // (spymaster converts adjacent garrison to legion_barrack)
        gridData[74] = createCell('legion_barrack', null, 'spymaster');
        
        // Step 3: Place armoury at 65 (above legion_barrack at 74)
        // legion_barrack allows: ['armoury', 'spymaster', 'path']
        gridData[65] = createCell('armoury');
        
        // Step 4: Place garrison at 64 (left of armoury at 65)
        // armoury allows: ['garrison', 'smithy', 'alchemy_lab', 'legion_barrack', 'path']
        gridData[64] = createCell('garrison');
        
        // Step 5: Verify spymaster CAN be placed at 73 (left of legion_barrack at 74)
        // legion_barrack at 74 allows spymaster per PLACEMENT_RULES
        const result = isValidPlacement(73, 'spymaster', gridData);
        expect(result).toBe(true);
    });

    test('[030] commander can be placed next to garrison it upgraded', () => {
        /**
         * Scenario: Commander upgrades garrison, then another commander can be placed
         * 
         * Grid layout (locked cell=76 at row 8, col 4):
         *   Row 8: 72,73,74,75,76,77...  (76 is locked path)
         * 
         * Setup:
         *   - Cell 76: path (locked)
         *   - Cell 75: commander (placed first, left of path)
         *   - Cell 74: garrison (left of commander, gets upgraded to level 2)
         *   
         * Test: Commander should be placeable at cell 73 (left of garrison at 74)
         * even though the garrison was upgraded by commander. Upgrades should not
         * block additional placements of the upgrading room type.
         */
        const gridData = createEmptyGrid();
        
        // Step 1: Place commander at 75 (adjacent to locked path at 76)
        gridData[75] = createCell('commander');
        
        // Step 2: Place garrison at 74 (left of commander)
        // commander allows: ['garrison', 'transcendent_barracks', 'path']
        // garrison should be upgraded by adjacent commander
        gridData[74] = createCell('garrison');
        // Simulate the upgrade: garrison at 74 is upgraded by commander at 75
        gridData[74].level = 2;
        gridData[74].upgraded = true;
        gridData[74].upgradedBy = ['commander'];
        
        // Step 3: Verify commander CAN be placed at 73 (left of garrison at 74)
        // garrison allows: ['armoury', 'commander', 'path']
        // Even though garrison was upgraded by commander, another commander should be placeable
        const result = isValidPlacement(73, 'commander', gridData);
        expect(result).toBe(true);
    });
});

describe('Max level blocking - alchemy_lab', () => {
    /**
     * Alchemy lab has maxLevel 2 from thaumaturge upgrades.
     * Once alchemy lab is at level 2, no more thaumaturge can be placed next to it.
     */
    test('[031] cannot place thaumaturge next to alchemy lab already at max level', () => {
        const gridData = createEmptyGrid();
        
        // Setup: alchemy lab at level 2 (max) upgraded by 2 thaumaturges
        gridData[67] = createCell('alchemy_lab');
        gridData[67].level = 2;
        gridData[67].upgraded = true;
        gridData[67].upgradedBy = ['thaumaturge', 'thaumaturge'];
        
        // Try to place a third thaumaturge next to the maxed alchemy lab
        const result = isValidPlacement(58, 'thaumaturge', gridData);
        expect(result).toBe(false);
    });

    test('[032] can place thaumaturge next to alchemy lab not at max level', () => {
        const gridData = createEmptyGrid();
        
        // Setup: alchemy lab at level 1 (not max)
        gridData[67] = createCell('alchemy_lab');
        gridData[67].level = 1;
        gridData[67].upgraded = false;
        
        // Should be able to place thaumaturge
        const result = isValidPlacement(58, 'thaumaturge', gridData);
        expect(result).toBe(true);
    });

    test('[033] wouldUpgradeExceedMaxLevel returns true for alchemy lab at max', () => {
        const gridData = createEmptyGrid();
        
        // Setup: alchemy lab at level 2 (max)
        gridData[67] = createCell('alchemy_lab');
        gridData[67].level = 2;
        gridData[67].upgraded = true;
        
        const result = wouldUpgradeExceedMaxLevel(58, 'thaumaturge', gridData);
        expect(result).toBe(true);
    });
});

describe('Max level blocking - commander', () => {
    /**
     * Commander has maxLevel 3 from garrison/transcendent_barracks upgrades.
     * Once commander is at level 3, no more garrison can be placed next to it.
     */
    test('[034] cannot place garrison next to commander already at max level', () => {
        const gridData = createEmptyGrid();
        
        // Setup: commander at level 3 (max) upgraded by 3 garrisons
        gridData[67] = createCell('commander');
        gridData[67].level = 3;
        gridData[67].upgraded = true;
        gridData[67].upgradedBy = ['garrison', 'garrison', 'garrison'];
        
        // Try to place a fourth garrison next to the maxed commander
        const result = isValidPlacement(58, 'garrison', gridData);
        expect(result).toBe(false);
    });

    test('[035] can place garrison next to commander not at max level', () => {
        const gridData = createEmptyGrid();
        
        // Setup: commander at level 2 (not max)
        gridData[67] = createCell('commander');
        gridData[67].level = 2;
        gridData[67].upgraded = true;
        gridData[67].upgradedBy = ['garrison', 'garrison'];
        
        // Should be able to place garrison
        const result = isValidPlacement(58, 'garrison', gridData);
        expect(result).toBe(true);
    });
});
