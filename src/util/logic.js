// JavaScript equivalent of mhws-ss.py

// Import JSON files
import head from "../data/compact/head.json";
import chest from "../data/compact/chest.json";
import arms from "../data/compact/arms.json";
import waist from "../data/compact/waist.json";
import legs from "../data/compact/legs.json";
import talisman from "../data/compact/talisman.json";
import decoration from "../data/compact/decoration.json";
import skillDb from "../data/compact/skills.json";
import setSkillDb from "../data/compact/set-skills.json";
import groupSkillDb from "../data/compact/group-skills.json";
import decoInventory from "../data/user/deco-inventory.json";

const weapon_db = {};
let totalPossibleCombinations = 0;
const DEBUG = true;

const hasNeededSkill = (gearSkills, neededSkills) => {
    return Object.keys(neededSkills).every(skillName => skillName in gearSkills);
};

const isInSets = (armorData, setSkills) => {
    // return setSkills.hasOwnProperty(armorData[7]);
    return armorData[7] in setSkills;
};

const isInGroups = (armorData, groupSkills) => {
    // return groupSkills.hasOwnProperty(armorData[2]);
    return armorData[2] in groupSkills;
};

const formatArmorC = obj => {
    return {
        name: obj[0],
        data: obj[1]
    };
};

const listFind = (list, prop, value) => {
    return list.find(item => item[prop] === value) || null;
};

const mergeSafeUpdate = (dict1, dict2) => {
    return { ...dict2, ...dict1 };
};

const mergeSumMaps = mapList => {
    const result = {};
    mapList.forEach(tMap => {
        Object.entries(tMap).forEach(([key, value]) => {
            result[key] = (result[key] || 0) + value;
        });
    });
    return result;
};

const getGearPool = (skills, setSkills, groupSkills, mustUseArmor, blacklistedArmor) => {
    return {
        head: getBestArmor("head", skills, setSkills, groupSkills, mustUseArmor[0], blacklistedArmor),
        chest: getBestArmor("chest", skills, setSkills, groupSkills, mustUseArmor[1], blacklistedArmor),
        arms: getBestArmor("arms", skills, setSkills, groupSkills, mustUseArmor[2], blacklistedArmor),
        waist: getBestArmor("waist", skills, setSkills, groupSkills, mustUseArmor[3], blacklistedArmor),
        legs: getBestArmor("legs", skills, setSkills, groupSkills, mustUseArmor[4], blacklistedArmor),
        talisman: getBestArmor("talisman", skills, setSkills, groupSkills, mustUseArmor[5], blacklistedArmor),
        decos: getBestArmor("decoration", skills, setSkills, groupSkills)
    };
};

const getSetName = armorData => {
    return armorData[7];
};

const getGroupName = armorData => {
    return armorData[2];
};

const getDecoSkillsFromNames = names => {
    return mergeSumMaps(names.map(name => _x(decoration[name], "skills")));
};

// eslint-disable-next-line no-underscore-dangle
const _x = (piece, field) => {
    // Extracts a field from an armor piece or decoration

    const fieldMap = {
        type: 0,
        skills: 1,
        slot: 2, // for decos
        group_skill: 2,
        slots: 3,
        defense: 4,
        resistances: 5,
        rank: 6
    };

    return piece[fieldMap[field]];
};

const groupArmorIntoSets = (armorPieces, setSkills, groupSkills) => {
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

const slottageLengthCompare = (a, b) => {
    const aSlots = [...a[1][3]];
    const bSlots = [...b[1][3]];

    while (aSlots.length < bSlots.length) { aSlots.push(0); }
    while (bSlots.length < aSlots.length) { bSlots.push(0); }

    for (let i = aSlots.length - 1; i >= 0; i--) {
        if (aSlots[i] > bSlots[i]) { return true; }
    }
    return false;
};

const slottageLengthCompareRaw = (bestSlots, challengerSlots) => {
    const testSlots = [...challengerSlots];
    while (testSlots.length < bestSlots.length) { testSlots.push(0); }

    for (let i = bestSlots.length - 1; i > 0; i--) {
        if (testSlots[i] > bestSlots[i]) { return true; }
    }
    return false;
};

const hasBetterSlottage = (armors, challengerSlots) => {
    if (!armors || Object.keys(armors).length === 0) { return true; }

    const sortedBySlottage = Object.fromEntries(
        Object.entries({ ...armors }).sort((a, b) => _x(b[1], "slots") - _x(a[1], "slots"))
    );

    const top = Object.values(sortedBySlottage)[0];
    return challengerSlots > top[3];
};

const hasLongerSlottage = (armors, challengerSlots) => {
    const sortedData = Object.fromEntries(
        Object.entries({ ...armors }).sort((a, b) => {
            return slottageLengthCompare(a, b) ? -1 : 1;
        })
    );

    return slottageLengthCompareRaw(challengerSlots, Object.values(sortedData)[0][3]);
};

const isBetterArmor = (existingArmors, newSlots) => {
    return hasBetterSlottage(existingArmors, newSlots) || hasLongerSlottage(existingArmors, newSlots);
};

const getBestArmor = (
    type, skills, setSkills = {}, groupSkills = {},
    mandatoryPieceName = null,
    blacklistedArmor = [],
    rank = "high"
) => {
    const fullDataFile = getJsonFromType(type);

    if (mandatoryPieceName) {
        const foundData = fullDataFile[mandatoryPieceName];
        if (foundData) {
            return { [mandatoryPieceName]: foundData };
        }

        console.warn(`WARNING: Could not find mandatory ${type} armor ${mandatoryPieceName}!`);
    }

    // Filter data based on rank unless it's talisman or decoration
    const dataFile = Object.fromEntries(
        Object.entries(fullDataFile).filter(([_, v]) =>
            ["talisman", "decoration"].includes(type) || v[6] === rank
        )
    );

    if (type === "talisman") {
        const talismans = Object.fromEntries(
            Object.entries(dataFile)
                .filter(([k, v]) => hasNeededSkill(v[1], skills) && !blacklistedArmor.includes(k))
                .sort((a, b) => Object.values(b[1][1])[0] - Object.values(a[1][1])[0])
        );

        const skOpt = {}, talisOpt = {};

        for (const [talisName, talisData] of Object.entries(talismans)) {
            const sks = talisData[1];
            if (Object.keys(sks).length === 1) {
                for (const [skName, skLevel] of Object.entries(sks)) {
                    if (skLevel > (skOpt[skName] || 0)) {
                        talisOpt[talisName] = talisData;
                        skOpt[skName] = skLevel;
                    }
                }
            }
        }
        return talisOpt;
    }

    if (type === "decoration") {
        return Object.fromEntries(
            Object.entries(dataFile)
                .filter(([_, v]) => v[0] === "armor" && hasNeededSkill(v[1], skills))
                .sort((a, b) => Object.values(b[1][1])[0] - Object.values(a[1][1])[0])
        );
    }

    // Group armors by slot count
    const armorsBySlots = { 0: {}, 1: {}, 2: {}, 3: {} };
    for (const [k, v] of Object.entries(dataFile)) {
        armorsBySlots[v[3].length][k] = v;
    }

    // Sort armor groups by slot count and defense
    for (const slotCount of Object.keys(armorsBySlots)) {
        const sorted = Object.fromEntries(
            Object.entries(armorsBySlots[slotCount])
                .filter(([k, _]) => !blacklistedArmor.includes(k))
                .sort((a, b) => b[1][3] - a[1][3] || b[1][4] - a[1][4])
        );
        armorsBySlots[slotCount] = Object.fromEntries(
            Object.entries(sorted).filter(([k, v]) => slotCount > 0 && k === Object.keys(sorted)[0] || hasNeededSkill(v[1], skills))
        );
    }

    const exclusiveOnly = { ...armorsBySlots[3], ...armorsBySlots[2], ...armorsBySlots[1], ...armorsBySlots[0] };

    const bestSkillage = Object.fromEntries(Object.keys(skills).map(key => [key, 0]));
    let exclusivesToKeep = {};

    for (const [armorName, armorData] of Object.entries(exclusiveOnly)) {
        const aSlots = _x(armorData, "slots");
        const aSkills = _x(armorData, "skills");
        let update = null;

        if (isBetterArmor(exclusivesToKeep, aSlots)) {
            update = [armorName, armorData];
        }

        for (const [skillName, skillLevel] of Object.entries(aSkills)) {
            if (skills[skillName] && skillLevel > bestSkillage[skillName]) {
                update = [armorName, armorData];
                bestSkillage[skillName] = skillLevel;
            }
        }

        if (update) {
            exclusivesToKeep[update[0]] = update[1];
        }
    }

    const groupies = Object.fromEntries(
        Object.entries(dataFile)
            .filter(([k, v]) => !exclusivesToKeep[k] && (isInSets(v, setSkills) || isInGroups(v, groupSkills)))
            .sort((a, b) => b[1][3] - a[1][3] || b[1][4] - a[1][4])
    );

    const [groupiesGrouped, groupiesTracker] = groupArmorIntoSets(groupies, setSkills, groupSkills);
    const groupiesToKeep = {};

    for (const [groupName, groupArmor] of Object.entries(groupiesGrouped)) {
        for (const [armorName, armorData] of Object.entries(exclusivesToKeep)) {
            if (armorData[2] === groupName || armorData[7] === groupName) {
                if (hasBetterSlottage(groupiesTracker[groupName], _x(armorData, "slots")) ||
                    hasLongerSlottage(groupiesTracker[groupName], _x(armorData, "slots"))) {
                    groupiesTracker[groupName][armorName] = armorData;
                }
            }
        }

        for (const [armorName, armorData] of Object.entries(groupArmor)) {
            if (hasBetterSlottage(groupiesTracker[groupName], _x(armorData, "slots")) ||
                hasLongerSlottage(groupiesTracker[groupName], _x(armorData, "slots"))) {
                groupiesTracker[groupName][armorName] = armorData;
            }
        }
    }

    for (const [groupName, groupArmor] of Object.entries(groupiesTracker)) {
        for (const [armorName, armorData] of Object.entries(groupArmor)) {
            if (!groupiesToKeep[armorName]) {
                groupiesToKeep[armorName] = armorData;
            }
        }
    }

    exclusivesToKeep = { ...exclusivesToKeep, ...groupiesToKeep };

    console.log(`# of ${type}: ${Object.keys(exclusivesToKeep).length}`);
    return exclusivesToKeep;
};

const armorCombo = (head, chest, arms, waist, legs, talisman) => {
    const armorSkills = [head.data[1], chest.data[1], arms.data[1], waist.data[1], legs.data[1], talisman.data[1]];
    const armorSlots = [head.data[3], chest.data[3], arms.data[3], waist.data[3], legs.data[3]];

    // Merging dictionaries
    const result = {};
    const slots = [];

    armorSkills.forEach(skill => {
        Object.entries(skill).forEach(([skillName, level]) => {
            result[skillName] = (result[skillName] || 0) + level;
        });
    });

    // Flattening slots list
    armorSlots.forEach(slotList => {
        slots.push(...slotList);
    });

    // Convert result to sorted dictionary
    const skillTotals = Object.fromEntries(
        Object.entries(result).sort((a, b) => b[1] - a[1])
    );

    const armorSetNames = [head.data[7], chest.data[7], arms.data[7], waist.data[7], legs.data[7]];
    const armorGroupNames = [head.data[2], chest.data[2], arms.data[2], waist.data[2], legs.data[2]];
    const setSkills = {};
    const groupSkills = {};

    armorSetNames.forEach(setName => {
        setSkills[setName] = (setSkills[setName] || 0) + 1;
    });

    armorGroupNames.forEach(groupName => {
        groupSkills[groupName] = (groupSkills[groupName] || 0) + 1;
    });

    return {
        names: [head.name, chest.name, arms.name, waist.name, legs.name, talisman.name],
        skills: skillTotals,
        slots: slots,
        set_skills: setSkills,
        group_skills: groupSkills
    };
};

const getDecosToFulfillSkills = (decos, skills, slotsAvailable, startingSkills) => {
    // Adjust required skills based on what we already have
    const skillsNeeded = { ...skills };
    for (const [skill, level] of Object.entries(startingSkills)) {
        if (skillsNeeded[skill]) {
            skillsNeeded[skill] -= level;
            if (skillsNeeded[skill] <= 0) {
                delete skillsNeeded[skill]; // Remove fully fulfilled skills
            }
        }
    }

    // If we already have all required skills, no decorations are needed
    if (Object.keys(skillsNeeded).length === 0) {
        return {
            deco_names: [],
            free_slots: slotsAvailable
        };
    }

    // Sort slots in descending order for optimal placement
    slotsAvailable.sort((a, b) => b - a);

    // Sort decorations by highest skill contribution, then by smallest slot size
    const decoList = Object.entries(decos).sort((a, b) =>
        b[1][2] - a[1][2] || Object.values(a[1][1]).reduce((sum, val) => sum + val, 0) -
        Object.values(b[1][1]).reduce((sum, val) => sum + val, 0)
    );

    // Track used decorations
    const usedDecos = [];
    const usedDecosCount = {};
    const freeSlots = [...slotsAvailable];
    const usedSlots = [];

    // Iterate over available slots and try to fill them with the best decorations
    for (const slotSize of slotsAvailable) {
        for (const [decoName, [decoType, decoSkills, decoSlot]] of decoList) {
            if (decoSlot > slotSize || (usedDecosCount[decoName] || 0) >= decoInventory[decoName]) {
                continue; // Skip if decoration doesn't fit in the slot
            }

            // Check if this decoration helps fulfill any remaining skills
            const useful = Object.keys(decoSkills).some(skill => skillsNeeded[skill] > 0);
            if (!useful) { continue; } // Skip decorations that don't contribute

            // Use this decoration
            usedDecos.push(decoName);
            usedDecosCount[decoName] = (usedDecosCount[decoName] || 0) + 1;
            usedSlots.push(slotSize);
            freeSlots.splice(freeSlots.indexOf(slotSize), 1);

            // Reduce skill requirements
            for (const [skillName, skillLevel] of Object.entries(decoSkills)) {
                if (skillsNeeded[skillName]) {
                    skillsNeeded[skillName] -= skillLevel;
                    if (skillsNeeded[skillName] <= 0) {
                        delete skillsNeeded[skillName]; // Remove fully fulfilled skills
                    }
                }
            }

            // If all skills are fulfilled, return the list of used decorations
            if (Object.keys(skillsNeeded).length === 0) {
                return {
                    deco_names: usedDecos,
                    free_slots: freeSlots
                };
            }
            break;
        }
    }

    return null; // Return null if the required skills cannot be fulfilled
};

const getJsonFromType = type => {
    const typeMap = { head, chest, arms, waist, legs, talisman, decoration };
    return typeMap[type] || {};
};

// Takes x amount of elements from the top of an array of objects and returns a specific field from each
const offTheTop = (arr, amount, field) => {
    return arr.slice(0, Math.min(amount, arr.length - 1)).map(x => x[field]);
};

// Re-orders display results to put some more desirable elements up front
const reorder = dataList => {
    let finality = [];
    const idsToCutLine = [];

    let noThrees = true;
    let noTwos = true;

    for (const res of dataList) {
        if (res.free_slots.includes(3)) { noThrees = false; }
        if (res.free_slots.includes(2)) { noTwos = false; }
        if (!noThrees && !noTwos) { break; }
    }

    if (!noThrees) {
        const mostThrees = [...dataList].sort((a, b) =>
            b.free_slots.filter(num => num === 3).length - a.free_slots.filter(num => num === 3).length
        );
        idsToCutLine.push(...offTheTop(mostThrees, 2, "id"));
    }

    if (!noTwos) {
        const mostTwosOrThrees = [...dataList].sort((a, b) =>
            b.free_slots.filter(num => num === 3 || num === 2).length -
            a.free_slots.filter(num => num === 3 || num === 2).length
        );
        idsToCutLine.push(...offTheTop(mostTwosOrThrees, 2, "id"));
    }

    const longestSlots = [...dataList].sort((a, b) =>
        b.free_slots.length - a.free_slots.length ||
        b.free_slots.filter(num => num === 3 || num === 2).length -
         a.free_slots.filter(num => num === 3 || num === 2).length
    );
    idsToCutLine.push(...offTheTop(longestSlots, 5, "id"));

    const idSet = Array.from(new Set(idsToCutLine));

    // Create a lookup dictionary for id positions (default to a high number for non-priority IDs)
    const idOrderMap = Object.fromEntries(idSet.map((idVal, index) => [idVal, index]));

    // Sort the list: prioritize by order in idOrderMap, then keep the original order for others
    finality = [...dataList].sort((a, b) =>
        (idOrderMap[a.id] ?? Infinity) - (idOrderMap[b.id] ?? Infinity) ||
        dataList.indexOf(a) - dataList.indexOf(b)
    );

    return finality;
};

const rollCombos = (
    head1, chest1, arms1, waist1, legs1, talisman1,
    decos, skills, setSkills, groupSkills, limit
) => {
    let counter = 0, inc = 0;
    const ret = [];

    // Convert objects to arrays for iteration
    const headList = Object.entries(head1);
    const chestList = Object.entries(chest1);
    const armsList = Object.entries(arms1);
    const waistList = Object.entries(waist1);
    const legsList = Object.entries(legs1);
    const talismanList = Object.entries(talisman1);

    // Calculate total possible combinations
    totalPossibleCombinations =
        headList.length * chestList.length * armsList.length * waistList.length * legsList.length * talismanList.length;

    console.log(`possible: ${totalPossibleCombinations}`);

    // Generator for Cartesian product
    // eslint-disable-next-line func-style
    function *cartesianProduct(arrays, prefix = []) {
        if (!arrays.length) {
            yield prefix;
            return;
        }
        for (const item of arrays[0]) {
            yield* cartesianProduct(arrays.slice(1), [...prefix, item]);
        }
    }

    // Process combinations
    let limitReached = false;
    for (const combo of cartesianProduct([headList, chestList, armsList, waistList, legsList, talismanList])) {
        if (counter >= limit) {
            limitReached = true;
            break;
        }

        // Early exit for set/group skills
        if (setSkills || groupSkills) {
            let doSkip = false;

            if (setSkills) {
                for (const [setName, setLevel] of Object.entries(setSkills)) {
                    const piecesFromSet = combo.slice(0, -1).reduce((acc, piece) => acc + (piece[1][7] === setName ? 1 : 0), 0);
                    if (piecesFromSet < setLevel * 2) {
                        doSkip = true;
                        break;
                    }
                }
            }

            if (!doSkip && groupSkills) {
                for (const [groupName, groupLevel] of Object.entries(groupSkills)) {
                    const piecesFromGroup = combo.slice(0, -1).reduce((acc, piece) => acc + (piece[1][2] === groupName ? 1 : 0), 0);
                    if (piecesFromGroup < 3) {
                        doSkip = true;
                        break;
                    }
                }
            }

            if (doSkip) { continue; }
        }

        // Transform and test combo
        const testSet = armorCombo(...combo.map(formatArmorC));
        const result = test(testSet, decos, skills);

        if (result !== null) {
            result.id = counter + 1;
            result._id = inc + 1;
            inc++;
            ret.push(result);
        }

        counter++;
    }

    return ret;
};

const test = (armorSet, decos, desiredSkills) => {
    const skillsNeeded = { ...desiredSkills };
    const have = {};
    const need = {};
    let done = true;
    for (const skillName of Object.keys(skillsNeeded)) {
        have[skillName] = armorSet.skills[skillName] || 0;
        need[skillName] = skillsNeeded[skillName] - have[skillName];
        if (need[skillName] > 0) { done = false; }
    }
    if (done) {
        return {
            armorNames: armorSet.names,
            slots: armorSet.slots,
            decoNames: [],
            skills: armorSet.skills,
            setSkills: armorSet.setSkills,
            groupSkills: armorSet.groupSkills,
            freeSlots: armorSet.slots
        };
    }

    const decosUsed = getDecosToFulfillSkills(decos, desiredSkills, armorSet.slots, armorSet.skills);

    if (decosUsed) {
        const decosSkillsMap = getDecoSkillsFromNames(decosUsed.deco_names);
        const combinedSkills = mergeSumMaps([armorSet.skills, decosSkillsMap]);

        return {
            armor_names: armorSet.names,
            slots: armorSet.slots,
            deco_names: decosUsed.deco_names,
            skills: combinedSkills,
            set_skills: armorSet.set_skills,
            group_skills: armorSet.group_skills,
            free_slots: decosUsed.free_slots
        };
    }

    return null;
};

const search = (
    skills, setSkills = {}, groupSkills = {},
    decoMods = {}, mandatoryArmor = [null, null, null, null, null, null],
    blacklistedArmor = [],
    limit = 500000
) => {
    const gear = speed(getGearPool, skills, setSkills, groupSkills, mandatoryArmor, blacklistedArmor);

    // todo:
    // modifyDecoInventory(decoMods);

    let rolls = speed(
        rollCombos,
        gear.head,
        gear.chest,
        gear.arms,
        gear.waist,
        gear.legs,
        gear.talisman,
        gear.decos,
        skills, setSkills, groupSkills, limit
    );

    rolls = reorder(rolls);

    // printResults(rolls, limit);

    console.log(`found ${rolls.length} matches out of ${totalPossibleCombinations} combinations checked (limit: ${limit})`);
};

const speed = (func, ...args) => {
    const startTime = performance.now();
    const result = func(...args);
    const endTime = performance.now();
    console.log(`>> ${func.name}() = ${(endTime - startTime).toFixed(6)} seconds`);
    return result;
};
