export const testSingle = {
    skills: { "Evade Extender": 3 },
    verifySlots: [5, 10, 15]
};

export const testWithoutBurstDeco = {
    skills: { Burst: 5 },
    decoMods: { "Chain Jewel 3": 0 },
    verifySlots: [4, 8, 12]
};

export const testMore = {
    skills: {
        "Coalescence": 1,
        "Evade Extender": 3,
        "Counterstrike": 3,
        "Partbreaker": 3,
        "Agitator": 5
    },
    verifySlots: [1, 3, 5]
};

export const testMulti = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5
    },
    verifySlots: [0, 0, 2]
};

export const testDecosNotNeeded = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Partbreaker": 3,
        "Antivirus": 1
    },
    dontUseDecos: true,
    verifySlots: [3, 4, 11]
};

export const testOneSlotter = {
    skills: { "Speed Eating": 1 },
    verifySlots: [5, 10, 15]
};

export const testSet = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5
    },
    setSkills: { "Arkveld's Hunger": 1 }, // Hasten Recovery
    verifySlots: [0, 0, 2]
};

export const testGroup = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2
    },
    groupSkills: { "Fortifying Pelt": 1 }, // Fortify
    verifySlots: [0, 1, 3]
};

export const testSetAndGroup = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 2
    },
    setSkills: { "Arkveld's Hunger": 1 }, // Hasten Recovery
    groupSkills: { "Fortifying Pelt": 1 }, // Fortify
    verifySlots: [0, 1, 3]
};

export const testImpossible = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "Agitator": 5,
        "Evade Window": 1
    },
    verifySlots: [0, 0, 0]
};

export const testMany = {
    skills: {
        "Evade Extender": 3,
        "Weakness Exploit": 2,
        "Partbreaker": 3,
        "export constitution": 3,
        "Antivirus": 3,
        "Burst": 5
    },
    setSkills: {
        "Ebony Odogaron's Power": 1, // Burst Boost
        "Gore Magala's Tyranny": 1 // Black Eclipse
    },
    verifySlots: [0, 1, 2]
};

export const testTooHigh = {
    skills: {
        "Evade Extender": 3,
        "Weakness Exploit": 5,
        "Partbreaker": 3,
        "export constitution": 3,
        "Antivirus": 3,
        "Burst": 5
    },
    verifySlots: [0, 0, 0]
};

export const testMandatory = {
    skills: { Burst: 4 },
    mandatoryArmor: ["G Ebony Helm Beta", null, null, null, null, null],
    verifySlots: [4, 9, 13]
};

export const testBlacklist = {
    skills: { Burst: 4 },
    blacklistedArmor: ["Arkvulcan Helm Beta", "Arkvulcan Mail Beta", "Gore Coil Beta", "G Arkveld Helm Beta"],
    verifySlots: [4, 9, 13]
};

export const testBlacklistArmorType = {
    skills: {
        "Speed Eating": 3,
        "Evade Extender": 3,
        "Partbreaker": 3
    },
    blacklistedArmorTypes: ["head", "talisman"],
    verifySlots: [2, 0, 5]
};

export const allTests = {
    testSingle: testSingle,
    testWithoutBurstDeco: testWithoutBurstDeco,
    testMore: testMore,
    testMulti: testMulti,
    testDecosNotNeeded: testDecosNotNeeded,
    testOneSlotter: testOneSlotter,
    testSet: testSet,
    testGroup: testGroup,
    testSetAndGroup: testSetAndGroup,
    testImpossible: testImpossible,
    testMany: testMany,
    testTooHigh: testTooHigh,
    testMandatory: testMandatory,
    testBlacklist: testBlacklist,
    testBlacklistArmorType: testBlacklistArmorType,
};
