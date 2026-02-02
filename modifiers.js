const MODIFIERS = {
    'garrison': {  // garrison
        1: [
            { name: '% increased number of Monster Packs', value: 10 }
        ],
        2: [
            { name: '% increased number of Monster Packs', value: 15 },
            { name: 'Normal Monsters have % increased Effectiveness', value: 15 }
        ],
        3: [
            { name: '% increased number of Monster Packs', value: 20 },
            { name: 'Normal Monsters have % increased Effectiveness', value: 30 }
        ]
    },
    'commander': {  // commander
        1: [
            { name: 'Rare Monsters have % increased Effectiveness', value: 15 }
        ],
        2: [
            { name: 'Rare Monsters have % increased Effectiveness', value: 30 }
        ],
        3: [
            { name: 'Rare Monsters have % increased Effectiveness', value: 60 }
        ]
    },
    'armoury': {  // armoury
        1:[
            {name:'Humanoid Monsters have % increased Effectiveness', value:15}
        ],
        2:[
            {name:'Humanoid Monsters have % increased Effectiveness', value:30}
        ],
        3:[
            {name:'Humanoid Monsters have % increased Effectiveness', value:60}
        ]
    },
    'smithy': {  // smithy
        1:[
            {name:'Chests have % more Item Rarity', value:15}
        ],
        2:[
            {name:'Chests have % more Item Rarity', value:30}
        ],
        3:[
            {name:'Chests have % more Item Rarity', value:60}
        ]
    },
    'generator': {  // generator
        1:[
            {name:'Construct Monsters have % increased Effectiveness ', value:15}
        ],
        2:[
            {name:'Construct Monsters have % increased Effectiveness ', value:30}
        ],
        3:[
            {name:'Construct Monsters have % increased Effectiveness ', value:60},
            {name:'Area contains an additional Royal Colossus', value:null}
        ]
    },
    'spymaster': {  // spymaster
        1:[
            {name:'% increased effect of Temple Mods from Generators, Synthflesh Labs, Flesh Surgeons, Transcendent Barracks, and Alchemy Labs', value:8}
        ],
        2:[
            {name:'% increased effect of Temple Mods from Generators, Synthflesh Labs, Flesh Surgeons, Transcendent Barracks, and Alchemy Labs', value:15}
        ],
        3:[
            {name:'% increased effect of Temple Mods from Generators, Synthflesh Labs, Flesh Surgeons, Transcendent Barracks, and Alchemy Labs\nArea contains an additional Unchained Beast', value:30}
        ]
    },
    'legion_barrack': {  // legion barrack
        2:[
            {name:'% increased number of Rare Monsters', value:30}
        ],
        3:[
            {name:'% increased number of Rare Monsters', value:60}
        ]
    },
    'synthflesh_lab': {  // synthflesh lab
        1:[
            {name:'Monsters grant % increased Experience', value:10}
        ],
        2:[
            {name:'Monsters grant % increased Experience', value:20}
        ],
        3:[
            {name:'Monsters grant % increased Experience', value:40}
        ]
    },
    'flesh_surgeon': {  // flesh surgeon
        1:[
            {name:'Unique Monsters have % increased Effectiveness', value:10}
        ],
        2:[
            {name:'Unique Monsters have % increased Effectiveness', value:20}
        ],
        3:[
            {name:'Unique Monsters have % increased Effectiveness', value:40}
        ]
    },
    'transcendent_barracks': {  // transcendent barracks
        2:[
            {name:'% increased number of Magic Monsters', value:30}
        ],
        3:[
            {name:'% increased number of Magic Monsters', value:60}
        ]
    },
    'alchemy_lab': {  // alchemy lab
        1:[
            {name:'% increased Rarity of Items Dropped by Monsters', value:15}
        ],
        2:[
            {name:'% increased Rarity of Items Dropped by Monsters', value:30}
        ],
        3:[
            {name:'% increased Rarity of Items Dropped by Monsters', value:60},
            {name:'% increased Gold found in this Area', value:50}
        ]
    },
    'thaumaturge': {  // thaumaturge
        1:[
            {name:'% increased effect of Temple Mods from Corruption Chambers, Treasure Vaults, and Sacrificial Chambers', value:8}
        ],
        2:[
            {name:'% increased effect of Temple Mods from Corruption Chambers, Treasure Vaults, and Sacrificial Chambers', value:15}
        ],
        3:[
            {name:'% increased effect of Temple Mods from Corruption Chambers, Treasure Vaults, and Sacrificial Chambers', value:30},
            {name:'Area contains an additional Quadrilla Sergeant', value:null}
        ]
    },
    'golem_works': {  // golem works
        1:[
            {name:'% increased effect of Temple Mods from Garrisons, Commanders, Armouries, Smithies, and Legion Barracks', value:8}
        ],
        2:[
            {name:'% increased effect of Temple Mods from Garrisons, Commanders, Armouries, Smithies, and Legion Barracks', value:15}
        ],
        3:[
            {name:'% increased effect of Temple Mods from Garrisons, Commanders, Armouries, Smithies, and Legion Barracks', value:30},
            {name:'Area contains an additional Royal Sentinel', value:null}
        ]
    },
    'corruption_chamber': {  // corruption chamber
        1:[
            {name:'Rare Monsters have a % chance to have an additional Modifier', value:15}
        ],
        2:[
            {name:'Rare Monsters have a % chance to have an additional Modifier', value:30}
        ],
        3:[
            {name:'Rare Monsters have a % chance to have an additional Modifier', value:60},
            {name:'Area contains an additional Corrupted Abomination', value:null}
        ]
    },
    'sacrificial_chamber': {  // sacrificial chamber
        1:[
            {name:'% increased amount of Rare Chests', value:15}
        ],
        2:[
            {name:'% increased amount of Rare Chests', value:30}
        ],
        3:[
            {name:'% increased amount of Rare Chests', value:60},
            {name:'Area contains an additional High Priest', value:null}
        ]
    }
};
