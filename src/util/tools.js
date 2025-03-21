import { CHOSEN_ARMOR_DEBUG, DEBUG, LIMIT } from "./constants";
import HEAD from "../data/compact/head.json";
import CHEST from "../data/compact/chest.json";
import ARMS from "../data/compact/arms.json";
import WAIST from "../data/compact/waist.json";
import LEGS from "../data/compact/legs.json";
import TALISMANS from "../data/compact/talisman.json";
import DECORATIONS from "../data/compact/decoration.json";

export const getSearchParameters = parameters => {
    return {
        skills: parameters.skills || {},
        setSkills: parameters.setSkills || {},
        groupSkills: parameters.groupSkills || {},
        slotFilters: parameters.slotFilters || {}, // specify only armor that has x amount of y size free slots
        decoMods: parameters.decoMods || {}, // specify if you have limited number of a deco
        mandatoryArmor: parameters.mandatoryArmor || ['', '', '', '', '', ''], // must use these named armor pieces (per slot)
        blacklistedArmor: parameters.blacklistedArmor || [], // don't use these named armor pieces
        blacklistedArmorTypes: parameters.blacklistedArmorTypes || [], // don't use thes armor types (head, chest, etc)
        dontUseDecos: parameters.dontUseDecos || false, // if true, excludes decorations from results
        limit: parameters.limit || LIMIT, // amount of results to process
        findOne: parameters.findOne || false, // if true, stops at the first result
        verifySlots: parameters.verifySlots || [], // runs a results test to see if x amount of 3, 2/3 and total slots are present
    };
};

export const emptyGearSet = () => {
    return {
        head: {},
        chest: {},
        arms: {},
        waist: {},
        legs: {}
    };
};

export const emptyGearPiece = (type, rank = "high") => {
    if (type === "talisman") {
        return { None: ["talisman", {}] };
    }

    return { None: [type, {}, "", [], 0, [0, 0, 0, 0, 0], rank, ""] };
};

export const getJsonFromType = type => {
    const typeMap = {
        head: HEAD, chest: CHEST, arms: ARMS, waist: WAIST,
        legs: LEGS, talisman: TALISMANS, decoration: DECORATIONS,
        armor: { ...HEAD, ...CHEST, ...ARMS, ...WAIST, ...LEGS }
    };
    return typeMap[type] || {};
};

export const speed = (func, ...args) => {
    const startTime = performance.now();
    const result = func(...args);
    const endTime = performance.now();
    if (DEBUG) {
        console.log(`>> ${func.name}() = ${((endTime - startTime) / 1000).toFixed(2)} seconds`);
    }
    return result;
};

// Takes x amount of elements from the top of an array of objects and returns a specific field from each
export const offTheTop = (arr, amount, field) => {
    return arr.slice(0, Math.min(amount, arr.length - 1)).map(x => x[field]);
};

export const getBestDecos = skills => {
    return Object.fromEntries(Object.entries(DECORATIONS)
        .filter(([k, v]) => v[0] === "armor" && hasNeededSkill(v[1], skills))
        .sort((a, b) => Object.values(b[1][1])[0] - Object.values(a[1][1])[0])
    );
};

export const hasNeededSkill = (gearSkills, neededSkills) => {
    return Object.keys(gearSkills).some(skillName => skillName in neededSkills);
};

export const isInSets = (armorData, setSkills) => {
    // return setSkills.hasOwnProperty(armorData[7]);
    return armorData[7] in setSkills;
};

export const isInGroups = (armorData, groupSkills) => {
    // return groupSkills.hasOwnProperty(armorData[2]);
    return armorData[2] in groupSkills;
};

export const formatArmorC = obj => {
    return {
        name: obj[0],
        data: obj[1]
    };
};

export const listFind = (list, prop, value) => {
    return list.find(item => item[prop] === value) || null;
};

export const mergeSafeUpdate = (dict1, dict2) => {
    return { ...dict2, ...dict1 };
};

export const mergeSumMaps = mapList => {
    const result = {};
    mapList.forEach(tMap => {
        Object.entries(tMap).forEach(([key, value]) => {
            result[key] = (result[key] || 0) + value;
        });
    });
    return result;
};

export const isEmpty = obj => {
    return Object.keys(obj).length === 0;
};

export const getSetName = armorData => {
    return armorData[7];
};

export const getGroupName = armorData => {
    return armorData[2];
};

export const getDecoSkillsFromNames = names => {
    return mergeSumMaps(names.map(name => _x(DECORATIONS[name], "skills")));
};

// eslint-disable-next-line no-underscore-dangle
export const _x = (piece, field) => {
    // Extracts a field from an armor piece or decoration

    const fieldMap = {
        type: 0,
        skills: 1,
        slot: 2, // for decos
        groupSkill: 2,
        slots: 3,
        defense: 4,
        resistances: 5,
        rank: 6
    };

    return piece[fieldMap[field]];
};

export const groupArmorIntoSets = (armorPieces, setSkills, groupSkills) => {
    const groups = {};
    const groupsEmpty = {};

    Object.entries(armorPieces).forEach(([armorName, armorData]) => {
        const setName = getSetName(armorData);
        const groupName = getGroupName(armorData);

        if (setName && setSkills[setName]) {
            groups[setName] = groups[setName] || {};
            groupsEmpty[setName] = groupsEmpty[setName] || {};
            groups[setName][armorName] = armorData;
        }

        if (groupName && groupSkills[groupName]) {
            groups[groupName] = groups[groupName] || {};
            groupsEmpty[groupName] = groupsEmpty[groupName] || {};
            groups[groupName][armorName] = armorData;
        }
    });

    return [groups, groupsEmpty];
};

export const slottageLengthCompare = (a, b, fallback) => {
    const aSlots = [...a[1][3]];
    const bSlots = [...b[1][3]];

    while (aSlots.length < bSlots.length) { aSlots.push(0); }
    while (bSlots.length < aSlots.length) { bSlots.push(0); }

    for (let i = aSlots.length - 1; i >= 0; i--) {
        if (aSlots[i] !== bSlots[i]) { return bSlots[i] - aSlots[i]; }
    }
    return fallback || 0;
};

export const slottageSizeCompare = (a, b, fallback) => {
    const aSlots = [...a[1][3]];
    const bSlots = [...b[1][3]];

    while (aSlots.length < bSlots.length) { aSlots.push(0); }
    while (bSlots.length < aSlots.length) { bSlots.push(0); }

    for (let i = 0; i < aSlots.length; i++) {
        if (aSlots[i] !== bSlots[i]) { return bSlots[i] - aSlots[i]; }
    }
    return fallback || 0;
};

export const slottageLengthCompareRaw = (topSlots, challengerSlots) => {
    const bestSlots = [...topSlots];
    const testSlots = [...challengerSlots];
    const standardLength = Math.max(bestSlots.length, testSlots.length);
    while (testSlots.length < standardLength) { testSlots.push(0); }
    while (bestSlots.length < standardLength) { bestSlots.push(0); }

    for (let i = bestSlots.length - 1; i >= 0; i--) {
        if (testSlots[i] > bestSlots[i]) { return true; }
    }
    return false;
};

export const slottageLengthCompareSort = (slots = []) => {
    // Returns an array of slot values, right-aligned with zeros.
    return [...slots, ...Array(3 - slots.length).fill(0)].reverse();
};

export const hasBetterSlottage = (armors, challengerSlots) => {
    if (!armors || Object.keys(armors).length === 0) { return true; }

    const sortedBySlottage = Object.fromEntries(
        Object.entries({ ...armors }).sort((a, b) => _x(b[1], "slots") - _x(a[1], "slots"))
    );

    const top = Object.values(sortedBySlottage)[0];
    return challengerSlots > top[3];
};

export const hasLongerSlottage = (armors, challengerSlots, skillName = null) => {
    if (!armors || Object.keys(armors).length === 0) { return true; }

    // Filter by skillName before sorting
    const filteredArmors = Object.fromEntries(
        Object.entries(armors).filter(([_, v]) => !skillName || skillName in v[1])
    );

    // Sort by slottageLengthCompare (assumes it returns -1, 0, or 1 like Python's cmp_to_key)
    const sortedData = Object.fromEntries(
        Object.entries(filteredArmors).sort((a, b) => slottageLengthCompare(a[1], b[1]))
    );

    // Extract the first entry's slots
    const firstEntry = Object.entries(sortedData)[0]?.[1][3] || [];

    return slottageLengthCompareRaw(firstEntry, challengerSlots);
};

export const isBetterArmor = (existingArmors, newSlots) => {
    return hasBetterSlottage(existingArmors, newSlots) || hasLongerSlottage(existingArmors, newSlots);
};

export const getSkillPotential = (armorData, skillName, decos, allSkills) => {
    // Returns (max skill level, leftover slots, length of slots)
    const filteredDecos = Object.fromEntries(Object.entries(decos)
        .filter(([k, v]) => skillName in v[1])
        .map(([k, v]) => [k, [v[1][skillName], v[2]]])
        .sort((a, b) => {
            if (b[1][0] !== a[1][0]) { return b[1][0] - a[1][0]; } // Sort by skill level first
            return b[1][1] - a[1][1]; // If levels are the same, sort by slot size
        })
    );

    const otherDecoSlotSizes = Object.values(decos)
        .filter(v => !(skillName in v[1]))
        .map(v => v[2]);

    const extraPoints = Object.entries(armorData[1])
        .filter(([skill]) => skill !== skillName)
        .reduce((sum, [skill, level]) => sum + (allSkills[skill] ? 5 : 1), 0);

    let maxPoints = 0;
    const leftoverSlots = [...armorData[3]];

    for (const stats of Object.values(filteredDecos)) {
        const level = stats[0];
        const slotSize = stats[1];
        let summation = 0;

        for (let i = 0; i < armorData[3].length; i++) {
            const slot = armorData[3][i];
            if (slotSize <= slot) {
                const popIndex = leftoverSlots.indexOf(slot);
                leftoverSlots.splice(popIndex, 1); // Removes and shifts the array
                summation += level;
            }
        }

        maxPoints = Math.max(summation, maxPoints);
    }

    const points = maxPoints + (armorData[1][skillName] || 0);
    const modPoints = points + leftoverSlots.filter(slot => otherDecoSlotSizes.includes(slot)).length;

    return { points, leftoverSlots, extraPoints, modPoints };
};

// returns true if slots1 > slots2 (eg, [3, 2, 1] > [2, 2, 1])
export const slotSizeCompare = (slots1, slots2) => {
    const biggerLength = Math.max(slots1.length, slots2.length);
    for (let i = 0; i < biggerLength; i++) {
        const a = slots1[i] || 0;
        const b = slots2[i] || 0;
        if (a > b) {
            return true;
        }
    }

    return false;
};

const slotCompare = (topSlots, trySlots) => {
    // redundant sort, but whatever
    const bestSlots = [...topSlots, ...Array(3 - topSlots.length).fill(0)].sort((a, b) => b - a);
    const testSlots = [...trySlots, ...Array(3 - trySlots.length).fill(0)].sort((a, b) => b - a);

    let identical = true;
    let longer = false;
    const bigger = slotSizeCompare(testSlots, bestSlots);

    for (let i = bestSlots.length - 1; i >= 0; i--) {
        const test = testSlots[i];
        const best = bestSlots[i];

        if (test !== best) {
            identical = false;
        }

        if (test > best) {
            longer = true;
            break;
        }
    }

    return identical ? "equal" : longer || bigger;
};

export const updateSkillPotential = (
    skillPotential, totalSkillPotential, modPointMap, category,
    skillName, armorName, armorData,
    decos, skills,
    groupName = null
) => {
    const { points, leftoverSlots, extraPoints, modPoints } = getSkillPotential(armorData, skillName, decos, skills);
    modPointMap[armorName] = modPoints;
    let alias = {};
    skillPotential[category] ??= {};
    if (groupName) {
        skillPotential[category][groupName] ??= {};
        skillPotential[category][groupName][skillName] ??= {};
        alias = skillPotential[category][groupName][skillName];
    } else {
        skillPotential[category][skillName] ??= {};
        alias = skillPotential[category][skillName];
    }

    const applyForMore = newApplicant => {
        const morePool = alias.more || [];
        if (morePool.every(piece => modPointMap[newApplicant] >= modPointMap[piece])) {
            morePool.push(newApplicant);
            alias.more = morePool;
        }
    };

    const aliasUpdate = (keys = []) => {
        const oldBest = alias.best;
        Object.assign(alias, {
            best: armorName,
            points,
            slots: armorData[3],
            extraPoints: keys.includes("extra_points") ? extraPoints : alias.extraPoints || 0,
            leftoverSlots: keys.includes("leftover_slots") ? leftoverSlots : alias.leftoverSlots || [],
            defense: armorData[4]
        });
        // console.log(`best: ${armorName}, points: ${points}`);

        if (oldBest && modPointMap[oldBest] >= modPoints) {
            applyForMore(oldBest);
        }

        totalSkillPotential[skillName] = (totalSkillPotential[skillName] || 0) + points;
    };

    const currentPoints = alias.points || 0;
    const currentModPoints = modPointMap[armorName] || 0;
    const compare = slotCompare(alias.leftoverSlots || [], leftoverSlots);

    if (points > currentPoints) {
        aliasUpdate(["leftover_slots", "extra_points"]);
    } else if (points === currentPoints && compare) {
        if (compare === "equal") {
            const bestExtraPoints = alias.extraPoints || 0;
            if (armorData[3] > (alias.slots || [])) {
                aliasUpdate();
            } else if (extraPoints > bestExtraPoints) {
                aliasUpdate(["extra_points"]);
            } else if (extraPoints === bestExtraPoints) {
                if (armorData[4] > (alias.defense || 0)) {
                    aliasUpdate();
                }
            }
        } else {
            aliasUpdate(["leftover_slots"]);
        }
    } else if (points < currentPoints && modPoints > currentModPoints) {
        applyForMore(armorName);
    }

    return { pot: skillPotential, totalPot: totalSkillPotential, modMap: modPointMap };
};
