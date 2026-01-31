// Upgrade rules: defines which objects can upgrade which other objects
const UPGRADE_RULES = {
    5: {  // commander (id: 5)
        type: 'count',
        objectIds: [1, 7]  // Count garrison (id: 1) or Transcendent Barracks (id: 7)
    },
    2: [1],  // armoury (id: 2) upgrades garrison (id: 1)
    1: [5]   // garrison (id: 1) upgrades commander (id: 5)
};
