// Conversion rules: defines which objects convert adjacent objects to different objects
const CONVERSION_RULES = {
    'synthflesh_lab': {  // synthflesh Lab
        'garrison': 'transcendent_barracks',  // converts garrison to Transcendent Barracks
        'legion_barrack': 'transcendent_barracks'  // converts Region Barracks to Transcendent Barracks
    },
    'spymaster':{
        'garrison': 'legion_barrack'  // converts garrison to Region Barracks
    }
};
