// Upgrade rules: defines which objects upgrade which other objects
const UPGRADE_RULES = {
    // Objects that can be upgraded
    'garrison': {
        type: 'list',
        upgradedBy: ['armoury', 'commander']  // garrison is upgraded by armoury or commander
    },
    'armoury': {
        type: 'list',
        upgradedBy: ['smithy', 'alchemy_lab']  // armoury is upgraded by smithy or alchemy_lab
    },
    'legion_barrack': {
        type: 'list',
        upgradedBy: ['armoury', 'spymaster']  // legion barrack is upgraded by armoury or spymaster
    },
    'generator': {
        type: 'list',
        upgradedBy: ['thaumaturge','sacrificial_chamber']  // generator is upgraded by thaumaturge or sacrificial chamber
    },
    'corruption_chamber': {
        type: 'list',
        upgradedBy: ['thaumaturge', 'sacrificial_chamber']  // corruption chamber is upgraded by thaumaturge or sacrificial chamber
    },
    'alchemy_lab': {
        type: 'count',
        upgradedBy: ['thaumaturge'],  // alchemy lab is upgraded by thaumaturge
        maxLevel: 2  // maximum level 2 (2 thaumaturge adjacent)
    },
    'commander': {
        type: 'count',
        objectIds: ['garrison', 'transcendent_barracks'],  // commander is upgraded by count of garrison or transcendent barracks
        maxLevel: 3  // maximum level 3 (3 garrison/transcendent_barracks adjacent)
    },
    'transcendent_barracks': {
        type: 'list',
        upgradedBy: ['synthflesh_lab','generator']  // transcendent barracks is upgraded by transcendent barracks itself
    },
    'synthflesh_lab': {
        type: 'list',
        upgradedBy: ['flesh_surgeon','generator']  // synthflesh lab is upgraded by flesh surgeon
    },
    'smithy': {
        type: 'list',
        upgradedBy: ['golem_works','generator']  // smithy is upgraded by golem_works
    },
    'flesh_surgeon': {
        type: 'list',
        upgradedBy: ['synthflesh_lab'] // flesh surgeon is upgraded by synthflesh lab
    },
    'thaumaturge': {
        type: 'list',
        upgradedBy:['sacrificial_chamber'] // thaumaturge is upgraded by sacrificial chamber
    },
    'golem_works': {
        type:'count',
        objectIds: ['generator'],
        maxLevel: 2  // golem works is upgraded by count of generator
    }
};

// Export for Node.js/Jest testing (won't affect browser usage)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UPGRADE_RULES };
}
