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
        upgradedBy: ['thaumaturge']  // generator is upgraded by thaumaturge
    },
    'corruption_chamber': {
        type: 'list',
        upgradedBy: ['thaumaturge', 'sacrificial_chamber']  // corruption chamber is upgraded by thaumaturge or sacrificial chamber
    },
    'alchemy_lab': {
        type: 'list',
        upgradedBy: ['thaumaturge']  // alchemy lab is upgraded by thaumaturge
    },
    'commander': {
        type: 'count',
        objectIds: ['garrison', 'transcendent_barracks']  // commander is upgraded by count of garrison or transcendent barracks
    },
    'transcendent_barracks': {
        type: 'list',
        upgradedBy: ['transcendent_barracks']  // transcendent barracks is upgraded by transcendent barracks itself
    },
    'synthflesh_lab': {
        type: 'list',
        upgradedBy: ['flesh_surgeon']  // synthflesh lab is upgraded by flesh surgeon
    },
    'smithy': {
        type: 'list',
        upgradedBy: ['golem_works']  // smithy is upgraded by golem_works
    },
    'flesh_surgeon': {
        type: 'list',
        upgradedBy: ['synthflesh_lab'] // flesh surgeon is upgraded by synthflesh lab
    },
    'thaumaturge': {
        type: 'list',
        upgradedBy:['sacrificial_chamber'] // thaumaturge is upgraded by sacrificial chamber
    }
};
