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

// Export for Node.js/Jest testing (won't affect browser usage)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONVERSION_RULES };
}
