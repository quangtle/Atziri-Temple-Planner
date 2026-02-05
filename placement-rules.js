// Placement rules: defines which rooms can be placed next to each other
const PLACEMENT_RULES = {
    'garrison': ['armoury', 'commander', 'path'],
    'armoury': ['garrison', 'smithy', 'alchemy_lab', 'legion_barrack', 'path'],
    'spymaster': ['legion_barrack', 'path'],
    'legion_barrack': ['armoury', 'spymaster', 'path'],
    'commander': ['garrison', 'transcendent_barracks', 'path'],
    'synthflesh_lab': ['legion_barrack', 'flesh_surgeon', 'path'],
    'transcendent_barracks': ['commander', 'synthflesh_lab', 'path'],
    'alchemy_lab': ['armoury', 'thaumaturge', 'path'],
    'smithy': ['armoury', 'golem_works', 'path'],
    'sacrificial_chamber': ['thaumaturge', 'corruption_chamber', 'generator', 'path'],
    'thaumaturge': ['generator', 'corruption_chamber', 'alchemy_lab', 'sacrificial_chamber', 'path'],
    'golem_works': ['smithy', 'path'],
    'corruption_chamber': ['thaumaturge', 'sacrificial_chamber', 'path'],
    'generator': ['thaumaturge', 'sacrificial_chamber', 'path'],
    'flesh_surgeon': ['synthflesh_lab', 'path'],
    'path': ['path', 'garrison', 'armoury', 'spymaster', 'legion_barrack', 'commander', 'synthflesh_lab', 'transcendent_barracks', 'alchemy_lab', 'smithy', 'sacrificial_chamber', 'thaumaturge', 'golem_works', 'corruption_chamber', 'generator', 'flesh_surgeon']
};

// Export for Node.js/Jest testing (won't affect browser usage)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PLACEMENT_RULES };
}
