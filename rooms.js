const ROOMS = [
    { id: 'garrison', name: 'garrison', label: '', image: 'resources/images/garrison.png', hidden: false },
    { id: 'armoury', name: 'armoury', label: '', image: 'resources/images/armoury.png', hidden: false },
    { id: 'spymaster', name: 'spymaster', label: '', image: 'resources/images/spymaster.png', hidden: false },
    { id: 'legion_barrack', name: 'legion barrack', label: '', image: 'resources/images/legion_barrack.png', hidden: true },
    { id: 'commander', name: 'commander', label: '', image: 'resources/images/commander.png', hidden: false },
    { id: 'synthflesh_lab', name: 'synthflesh Lab', label: '', image: 'resources/images/synthflesh_lab.png', hidden: false },
    { id: 'transcendent_barracks', name: 'Transcendent Barracks', label: '', image: 'resources/images/transcendent_barrack.png', hidden: true },
    { id: 'alchemy_lab', name: 'alchemy lab', label: '', image: 'resources/images/alchemy_lab.png', hidden: false },
    { id: 'smithy', name: 'smithy', label: '', image: 'resources/images/smithy.png', hidden: false },
    { id: 'sacrificial_chamber', name: 'sacrificial chamber', label: '', image: 'resources/images/sacrificial_chamber.png', hidden: false },
    { id: 'thaumaturge', name: 'thaumaturge', label: '', image: 'resources/images/thaumaturge.png', hidden: false },
    { id: 'golem_works', name: 'golem works', label: '', image: 'resources/images/golem_works.png', hidden: false },
    { id: 'corruption_chamber', name: 'corruption chamber', label: '', image: 'resources/images/corruption_chamber.png', hidden: false },
    { id: 'generator', name: 'generator', label: '', image: 'resources/images/generator.png', hidden: false },
    { id: 'flesh_surgeon', name: 'flesh surgeon', label: '', image: 'resources/images/flesh_surgeon.png', hidden: false },
    { id: 'path', name: 'path', label: '', image: 'resources/images/path.png', hidden: false },
];

// Export for Node.js/Jest testing (won't affect browser usage)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ROOMS };
}
