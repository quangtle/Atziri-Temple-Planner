// Placement rules: defines which rooms can be placed next to each other
const PLACEMENT_RULES = {
    'garrison': ['armoury', 'commander', 'spymaster', 'synthflesh_lab', 'path'],
    'armoury': ['garrison', 'smithy', 'alchemy_lab', 'legion_barrack', 'path'],
    'spymaster': ['garrison', 'legion_barrack', 'path'],
    'legion_barrack': ['armoury', 'spymaster', 'synthflesh_lab', 'path'],
    'commander': ['garrison', 'transcendent_barracks', 'path'],
    'synthflesh_lab': ['garrison', 'legion_barrack', 'flesh_surgeon', 'path'],
    'transcendent_barracks': ['commander', 'transcendent_barracks', 'path'],
    'alchemy_lab': ['armoury', 'thaumaturge', 'path'],
    'smithy': ['armoury', 'golem_works', 'path'],
    'sacrificial_chamber': ['thaumaturge', 'corruption_chamber', 'path'],
    'thaumaturge': ['generator', 'corruption_chamber', 'alchemy_lab', 'sacrificial_chamber', 'path'],
    'golem_works': ['smithy', 'path'],
    'corruption_chamber': ['thaumaturge', 'sacrificial_chamber', 'path'],
    'generator': ['thaumaturge', 'path'],
    'flesh_surgeon': ['synthflesh_lab', 'path'],
    'path': ['path']
};
