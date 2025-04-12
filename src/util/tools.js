import { DEBUG, LIMIT } from "./constants";
import HEAD from "../data/compact/head.json";
import CHEST from "../data/compact/chest.json";
import ARMS from "../data/compact/arms.json";
import WAIST from "../data/compact/waist.json";
import LEGS from "../data/compact/legs.json";
import TALISMANS from "../data/compact/talisman.json";
import DECORATIONS from "../data/compact/decoration.json";
import SKILLS from '../data/detailed/skills.json';
import { getArmorTypeList } from "./util";

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
        updateProgressFunc: parameters.updateProgressFunc, // callback function to pass progress value to
        exhaustive: parameters.exhaustive || false,
        cancelToken: parameters.cancelToken,
        addMoreFunc: parameters.addMoreFunc
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

export const getArmorSkillNames = () => {
    return Object.entries(SKILLS).filter(x => x[1].type === "armor").map(x => x[0]);
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

export const speedAsync = async(func, ...args) => {
    const startTime = performance.now();
    const result = await new Promise(resolve => {
        setTimeout(() => {
            resolve(func(...args));
        }, 0);
    });
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

export const getSkillPotential = (armorData, skillName, decos, allSkills) => {
    const filteredDecos = Object.fromEntries(Object.entries(decos)
        .filter(([k, v]) => skillName in v[1])
        .map(([k, v]) => [k, [v[1][skillName], v[2]]]) // [name, [skill level, slot size]]
        .sort((a, b) => {
            if (b[1][0] !== a[1][0]) { return b[1][0] - a[1][0]; } // Sort by skill level first (descending)
            return b[1][1] - a[1][1]; // otherwise, slot size (descending)
        })
    );

    // slot sizes of other wanted skills
    const otherDecoSlotSizes = Object.values(decos)
        .filter(v => !(skillName in v[1]))
        .map(v => v[2]);

    const extraPoints = Object.entries(armorData[1])
        .filter(([skill]) => skill !== skillName)
        .reduce((sum, [skill, level]) => sum + (allSkills[skill] ? 5 : 1), 0); // todo: improve this

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

export const paddedSlots = slots => [
    slots[0] ?? 0,
    slots[1] ?? 0,
    slots[2] ?? 0,
];

export const reversedSlots = slots => [
    slots[2] ?? 0,
    slots[1] ?? 0,
    slots[0] ?? 0,
];

export const areSlotsEqual = (a, b) => {
    for (let i = 0; i < 3; i++) {
        const aVal = a[i] ?? 0;
        const bVal = b[i] ?? 0;
        if (aVal !== bVal) { return false; }
    }
    return true;
};

// returns true if leftSlots are bigger than rightSlots (eg, [3, 2, 1] is bigger than [2, 2, 2])
export const areLeftSlotsBigger = (leftSlots, rightSlots) => {
    for (let i = 0; i < 3; i++) {
        const left = leftSlots[i] ?? 0;
        const right = rightSlots[i] ?? 0;
        if (left > right) { return true; }
    }
    return false;
};

// returns true if leftSlots are longer than rightSlots (eg, [3, 2, 1] is shorter than [2, 2, 2])
export const areLeftSlotsLonger = (leftSlots, rightSlots) => {
    for (let i = 2; i >= 0; i--) {
        const left = leftSlots[i] ?? 0;
        const right = rightSlots[i] ?? 0;
        if (left > right) { return true; }
    }
    return false;
};

export const slottageLengthCompare = (a, b, fallback) => {
    for (let i = 2; i >= 0; i--) {
        const aVal = a[i] ?? 0;
        const bVal = b[i] ?? 0;
        if (aVal !== bVal) { return bVal - aVal; }
    }
    return fallback;
};

export const slottageSizeCompare = (a, b, fallback) => {
    for (let i = 0; i < 3; i++) {
        const aVal = a[i] ?? 0;
        const bVal = b[i] ?? 0;
        if (aVal !== bVal) { return bVal - aVal; }
    }
    return fallback;
};

export const hasBiggerSlottage = (armors, challengerSlots) => {
    if (!armors || isEmpty(armors)) { return true; }

    const sortedData = Object.fromEntries(
        Object.entries({ ...armors }).sort((a, b) => slottageSizeCompare(a[1][3], b[1][3]))
    );

    const top = Object.values(sortedData)[0];
    return areLeftSlotsBigger(challengerSlots, top[3]);
};

export const hasLongerSlottage = (armors, challengerSlots, skillName = null) => {
    if (!armors || isEmpty(armors)) { return true; }

    // Filter by skillName before sorting
    const filteredArmors = Object.fromEntries(
        Object.entries(armors).filter(([_, v]) => !skillName || skillName in v[1])
    );

    // Sort by slottageLengthCompare (assumes it returns -1, 0, or 1 like Python's cmp_to_key)
    const sortedData = Object.fromEntries(
        Object.entries(filteredArmors).sort((a, b) => slottageLengthCompare(a[1][3], b[1][3]))
    );

    // Extract the first entry's slots
    const top = Object.values(sortedData)[0];
    return areLeftSlotsLonger(challengerSlots, top[3]);
};

export const isBetterArmor = (existingArmors, newSlots) => {
    return hasBiggerSlottage(existingArmors, newSlots) || hasLongerSlottage(existingArmors, newSlots);
};

const slotCompare = (topSlots, trySlots) => {
    const bestSlots = paddedSlots(topSlots); // .sort((a, b) => b - a);
    const testSlots = paddedSlots(trySlots); // .sort((a, b) => b - a);

    const longer = areLeftSlotsLonger(testSlots, bestSlots);
    const bigger = areLeftSlotsBigger(testSlots, bestSlots);
    const identical = areSlotsEqual(testSlots, bestSlots);

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
            if (areLeftSlotsBigger(armorData[3], alias.slots || [])) {
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

const countSlots = slots => {
    const counts = { 1: 0, 2: 0, 3: 0 };
    for (const size of slots) {
        if (counts[size] !== undefined) {
            counts[size]++;
        }
    }
    return counts;
};

export const cartesianProduct = (...arrays) => {
    return arrays.reduce((acc, arr) => {
        return acc.flatMap(c => arr.map(x => [...c, x]));
    }, [[]]);
};

export const getInclusiveRemainingSlots = (freeSlots, usedFilter) => {
    // Start with a count of available slots
    const available = countSlots(freeSlots);

    // Copy so we don’t mutate original
    const remaining = { ...available };

    // Try to fulfill size-3 request using size-3 only
    const use3 = Math.min(usedFilter[3] || 0, remaining[3]);
    remaining[3] -= use3;
    const unmet3 = (usedFilter[3] || 0) - use3;
    if (unmet3 > 0) { return null; } // Cannot fulfill size-3 requirement

    // Try to fulfill size-2 request using 2s, then 3s
    let remaining2Need = usedFilter[2] || 0;
    const use2 = Math.min(remaining2Need, remaining[2]);
    remaining[2] -= use2;
    remaining2Need -= use2;

    const use3for2 = Math.min(remaining2Need, remaining[3]);
    remaining[3] -= use3for2;
    remaining2Need -= use3for2;

    if (remaining2Need > 0) { return null; } // Not enough slots for 2s

    // Try to fulfill size-1 request using 1s → 2s → 3s
    let remaining1Need = usedFilter[1] || 0;

    const use1 = Math.min(remaining1Need, remaining[1]);
    remaining[1] -= use1;
    remaining1Need -= use1;

    const use2for1 = Math.min(remaining1Need, remaining[2]);
    remaining[2] -= use2for1;
    remaining1Need -= use2for1;

    const use3for1 = Math.min(remaining1Need, remaining[3]);
    remaining[3] -= use3for1;
    remaining1Need -= use3for1;

    if (remaining1Need > 0) { return null; } // Not enough slots for 1s

    return remaining;
};

export const getSkillTestOrderBinary = (maxLevel, currentLevel = 0) => {
    const result = [];
    const visited = new Set();

    const helper = (low, high) => {
        if (low > high) { return; }
        const mid = Math.floor((low + high) / 2);
        if (!visited.has(mid)) {
            result.push(mid);
            visited.add(mid);
        }
        helper(mid + 1, high);
        helper(low, mid - 1);
    };

    const start = currentLevel + 1;
    helper(start, maxLevel);
    return result;
};

export const canArmorFulfillSkill = (armor, armorPool, decos, skillName, skillLevel) => {
    const poolTypeList = getArmorTypeList().filter(type => !armor[type]);

    // add up points for types we don't have
    let totalPoints = 0;
    for (const type of poolTypeList) {
        let bestPointsOfType = 0;
        for (const armorData of Object.values(armorPool[type])) { // loop through each piece of type
            let points = armorData[1][skillName] || 0;
            if (type !== "talisman") {
                const armorSlots = armorData[3];
                for (const deco of Object.values(decos)) {
                    const decoSkillLevel = deco[1][skillName];
                    if (decoSkillLevel) {
                        points += decoSkillLevel * armorSlots.filter(slotSize => slotSize >= deco[2]).length;
                        break;
                    }
                }
            }

            bestPointsOfType = Math.max(points, bestPointsOfType);
        }
        totalPoints += bestPointsOfType;
        if (totalPoints >= skillLevel) { return true; }
    }

    // add up points for types we do have
    for (const [armorType, armorPieces] of Object.entries(armor)) {
        // const armorName = armorPieces[0];
        const armorData = armorPieces[1];
        totalPoints += armorData[1]?.[skillName] || 0;
        if (armorType === "talisman") { continue; }
        const armorSlots = armorData[3];

        for (const deco of Object.values(decos)) {
            const decoSkillLevel = deco[1][skillName];
            if (decoSkillLevel) {
                totalPoints += decoSkillLevel * armorSlots.filter(slotSize => slotSize >= deco[2]).length;
                break;
            }
        }
    }

    return totalPoints >= skillLevel;
};
