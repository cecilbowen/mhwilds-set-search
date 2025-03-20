import TALISMANS from "../data/compact/talisman.json";
import DECO_INVENTORY from "../data/user/deco-inventory.json";
import SKILL_DB from "../data/compact/skills.json";
import {
    _x,
    emptyGearPiece,
    emptyGearSet, formatArmorC, getBestDecos, getDecoSkillsFromNames,
    getJsonFromType, getSearchParameters, groupArmorIntoSets,
    hasBetterSlottage, hasLongerSlottage, hasNeededSkill, isEmpty, isInGroups,
    isInSets, mergeSumMaps, slottageLengthCompare, slottageLengthCompareSort,
    slottageSizeCompare, speed, updateSkillPotential
} from "./tools";
import { CHOSEN_ARMOR_DEBUG, DEBUG } from "./constants";
import { allTests } from "../test/tests";

let totalPossibleCombinations = 0;
let decoInventory = { ...DECO_INVENTORY };

const getBestArmor = (
    skills, setSkills = {}, groupSkills = {},
    mandatoryPieceNames = [],
    blacklistedArmor = [],
    blacklistedArmorTypes = [],
    dontUseDecos = false,
    rank = "high"
) => {
    const fullDataFile = getJsonFromType("armor");

    const mandatory = {};
    mandatoryPieceNames.forEach(name => {
        if (name) {
            const foundData = fullDataFile[name];
            const foundTalisman = TALISMANS[name];
            if (foundData || foundTalisman) {
                mandatory[foundData?.[0] || foundTalisman?.[0]] = name;
            } else {
                console.warn(`WARNING: Could not find mandatory armor ${name}!`);
            }
        }
    });

    const dataFile = Object.fromEntries(Object.entries(fullDataFile)
        .filter(([k, v]) => v[6] === rank && (!mandatory[v[0]] || k === mandatory[v[0]]) &&
            !blacklistedArmorTypes.includes(v[0]) && !blacklistedArmor.includes(k))
    );

    const bestTalismans = Object.fromEntries(Object.entries(TALISMANS)
        .filter(([k, v]) => !blacklistedArmor.includes(k) &&
        (!mandatory[v[0]] && hasNeededSkill(v[1], skills) || k === mandatory[v[0]]))
        .sort((a, b) => Object.values(b[1][1])[0] - Object.values(a[1][1])[0])
    );

    const topTalis = {};
    if (!blacklistedArmorTypes.includes("talisman")) {
        const topTalisLevels = {};
        for (const [talisName, talisData] of Object.entries(bestTalismans)) {
            const sks = talisData[1];
            if (Object.keys(sks).length === 1) {
                for (const [skName, skLevel] of Object.entries(sks)) {
                    if (skLevel > (topTalisLevels[skName] || 0)) {
                        topTalis[talisName] = talisData;
                        topTalisLevels[skName] = skLevel;
                    }
                }
            }
        }
    }

    const firsts = emptyGearSet();
    const best = emptyGearSet();
    const bestDecos = dontUseDecos ? {} : getBestDecos(skills);

    ["length", "size"].forEach(sortType => {
        const checker = emptyGearSet();
        const allSort = Object.fromEntries(Object.entries(dataFile)
            .sort((a, b) => {
                if (sortType === "size") {
                    return slottageSizeCompare(a, b, b[1][4] - a[1][4]);
                }
                return slottageLengthCompare(a, b, b[1][4] - a[1][4]); // default to defense at end
                // return slottageLengthCompareSort(bV[3]) - slottageLengthCompareSort(aV[3]) || bV[4] - aV[4];
            })
        );

        for (const [armorName, armorData] of Object.entries(allSort)) {
            const category = armorData[0];
            if (isEmpty(checker[category])) {
                if (sortType === "size" && hasBetterSlottage(firsts[category], armorData[3]) ||
                    sortType === "length" && hasLongerSlottage(firsts[category], armorData[3])) {
                    checker[category] = { checked: true };
                    firsts[category][armorName] = armorData;
                }
            }
            if (hasNeededSkill(armorData[1], skills)) {
                best[category][armorName] = armorData;
            }
        }
    });

    let totalMaxSkillPotential = {};
    let maxPossibleSkillPotential = emptyGearSet();
    let modPointMap = {};

    // console.log("best", Object.keys(best.head));

    for (const skillName of Object.keys(skills)) {
        for (const [category, data] of Object.entries(best)) {
            for (const [armorName, armorData] of Object.entries(data)) {
                const { pot, totalPot, modMap } = updateSkillPotential(
                    maxPossibleSkillPotential, totalMaxSkillPotential,
                    modPointMap, category, skillName, armorName, armorData,
                    bestDecos, skills
                );
                maxPossibleSkillPotential = pot;
                totalMaxSkillPotential = totalPot;
                modPointMap = modMap;
            }
        }
    }

    for (const [skillName, targetLevel] of Object.entries(skills)) {
        const relevantTalisman = Object.entries(topTalis).filter(([k, v]) => skillName in v[1]);
        const relevantTalismanLevel = relevantTalisman.length ? relevantTalisman[0][1][skillName] : 0;
        if ((totalMaxSkillPotential[skillName] || 0) + relevantTalismanLevel < targetLevel) {
            return null;
        }
    }

    const bareMinimum = firsts;
    for (const [category, data] of Object.entries(maxPossibleSkillPotential)) {
        for (const [skillName, statData] of Object.entries(data)) {
            for (const key of ["best", "more"]) {
                if (statData[key]) {
                    if (key === "more" && statData[key].length) {
                        for (const ex of statData[key]) {
                            bareMinimum[category][ex] = dataFile[ex];
                        }
                    } else {
                        bareMinimum[category][statData[key]] = dataFile[statData[key]];
                    }
                }
            }
        }
    }

    // now handle set/group skills
    const groupiesAlt = Object.fromEntries(Object.entries(dataFile)
        .filter(([k, v]) => isInSets(v, setSkills) || isInGroups(v, groupSkills))
        .sort((a, b) => {
            return slottageSizeCompare(a, b, b[1][4] - a[1][4]);
        })
    );

    totalMaxSkillPotential = {};
    const maxPossibleSkillPotentialSet = emptyGearSet();

    const bestGroupiesAlt = {};
    for (const [name, aData] of Object.entries(groupiesAlt)) {
        if (!bestGroupiesAlt[aData[0]]) { bestGroupiesAlt[aData[0]] = {}; }
        bestGroupiesAlt[aData[0]][name] = aData;
    }

    if (!isEmpty(skills)) {
        modPointMap = {};
        for (const skillName of Object.keys(skills)) {
            for (const [category, data] of Object.entries(bestGroupiesAlt)) {
                const [groupiesGrouped, _] = groupArmorIntoSets(data, setSkills, groupSkills);

                for (const [groupName, groupArmors] of Object.entries(groupiesGrouped)) {
                    for (const [armorName, armorData] of Object.entries(groupArmors)) {
                        const { pot, totalPot, modMap } = updateSkillPotential(
                            maxPossibleSkillPotentialSet, totalMaxSkillPotential, modPointMap,
                            category, skillName, armorName, armorData,
                            bestDecos, skills, groupName
                        );
                        maxPossibleSkillPotential = pot;
                        totalMaxSkillPotential = totalPot;
                        modPointMap = modMap;
                    }
                }
            }
        }

        for (const [category, data] of Object.entries(maxPossibleSkillPotentialSet)) {
            for (const [groupName, groupData] of Object.entries(data)) {
                for (const [skillName, statData] of Object.entries(groupData)) {
                    for (const key of ["best", "more"]) {
                        if (key in statData) {
                            if (key === "more" && statData[key].length) {
                                for (const ex of statData[key]) {
                                    bareMinimum[category][ex] = dataFile[ex];
                                }
                            } else {
                                bareMinimum[category][statData[key]] = dataFile[statData[key]];
                            }
                        }
                    }
                }
            }
        }
    } else { // if no skills exist, only set/group skills, just copy over all set/group pieces
        for (const [category, data] of Object.entries(bestGroupiesAlt)) {
            bareMinimum[category] = { ...bareMinimum[category], ...data };
        }
    }

    bareMinimum.decos = bestDecos;
    bareMinimum.talisman = topTalis;

    // add in a dummy piece (no skills/slots) for any blacklisted armor types
    blacklistedArmorTypes.forEach(tipo => {
        bareMinimum[tipo] = emptyGearPiece(tipo, rank);
    });

    // add empty data for each armor type that doesn't have any
    // only possible way this could happen is with the talisman if there are only set/group skills
    // or any other armor type if someone does something crazy like blacklist every piece for that type
    const armorTypes = ['head', 'chest', 'arms', 'waist', 'legs', 'talisman'];
    for (const type of armorTypes) {
        if (!bareMinimum[type] || isEmpty(bareMinimum[type])) {
            bareMinimum[type] = emptyGearPiece(type, rank);
        }
    }

    // sort final return armor by slottage
    for (const [cat, armor] of Object.entries(bareMinimum)) {
        if (["decos", "talisman"].includes(cat)) {
            continue;
        }
        const sorted = Object.fromEntries(Object.entries(armor)
            .sort(([aK, aV], [bK, bV]) => {
                const aSort = slottageLengthCompareSort(aV[3]);
                const bSort = slottageLengthCompareSort(bV[3]);

                if (bSort > aSort) {
                    return 1;
                } else if (bSort < aSort) {
                    return -1;
                }
                return slottageLengthCompare([aK, aV], [bK, bV]);
            })
        );
        bareMinimum[cat] = sorted;
    }

    if (DEBUG && CHOSEN_ARMOR_DEBUG) {
        console.log('getBestArmor() return: ', bareMinimum);
        console.log("========================================");
        console.log("Chosen Armor Details:");
        console.log("========================================");

        console.log("Skills:", skills);
        if (setSkills && Object.keys(setSkills).length) {
            console.log("Set Skills:", setSkills);
        }
        if (groupSkills && Object.keys(groupSkills).length) {
            console.log("Group Skills:", groupSkills);
        }
        console.log("\n");

        for (const [category, data] of Object.entries(bareMinimum)) {
            if (category === "talisman" || category === "decos") { continue; }

            console.log(category.toUpperCase()); // Print category name

            for (const [aName, aData] of Object.entries(data)) {
                const relevantSkills = Object.fromEntries(
                    Object.entries(aData[1]).filter(([k]) => k in skills)
                );
                const relevantSetSkill = setSkills && aData[aData.length - 1] in setSkills ? ` / ${aData[aData.length - 1]}` : "";
                const relevantGroupSkill = groupSkills && aData[2] in groupSkills ? ` / ${aData[2]}` : "";

                console.log(
                    // eslint-disable-next-line max-len
                    `\t${aName}: (${_x(aData, "type")} - ${_x(aData, "slots")})`, relevantSkills, relevantSetSkill, relevantGroupSkill
                );
            }
            console.log("\n"); // Extra space after each category
        }
        console.log("========================================");
    }

    return bareMinimum;
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
        setSkills: setSkills,
        groupSkills: groupSkills,
        // todo: add upgraded defense value (also in python too)
        // defenseTotal: [head.data[4], chest.data[4], arms.data[4], waist.data[4], legs.data[4]].reduce((sum, value) => sum + value),
        defense: [head.data[4], chest.data[4], arms.data[4], waist.data[4], legs.data[4]]
    };
};

const getDecosToFulfillSkills = (decos, skills, slotsAvailable, startingSkills) => {
    if (isEmpty(decos)) {
        return null;
    }

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
            decoNames: [],
            freeSlots: slotsAvailable
        };
    }

    // Sort slots in descending order for optimal placement
    slotsAvailable.sort((a, b) => b - a);

    // Sort decorations by highest skill contribution, then by smallest slot size
    const decoList = Object.entries(decos).sort((a, b) =>
        b[1][2] - a[1][2] ||
        Object.values(a[1][1]).reduce((sum, val) => sum + val, 0) -
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

            if (decoSlot < slotSize && freeSlots.includes(decoSlot)) {
                continue; // fits, but more efficient to slot into smaller slot we'll reach later
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
                    decoNames: usedDecos,
                    freeSlots: freeSlots
                };
            }
            break;
        }
    }

    return null; // Return null if the required skills cannot be fulfilled
};

// Re-orders display results to put some more desirable elements up front
const reorder = dataList => {
    // Attach original index to ensure stable sorting
    const indexedData = dataList.map((item, index) => ({ ...item, _originalIndex: index }));

    for (const data of indexedData) {
        // visually limit skills to stay within level bounds
        for (const [skName, skLevel] of Object.entries(data.skills)) {
            if (skLevel > SKILL_DB[skName]) {
                data.skills[skName] = SKILL_DB[skName];
            }
        }

        // sort skills by level then name
        const skills = Object.fromEntries(
            Object.entries(data.skills)
                .sort(([k1, v1], [k2, v2]) => v2 - v1 || k1.localeCompare(k2)) // Sort by level descending, then name ascending
        );
        data.skills = skills;

        // correct set skill levels
        const setSkills = Object.fromEntries(
            Object.entries(data.setSkills)
                .filter(([k, v]) => k && Math.floor(v / 2) > 0)
                .map(([k, v]) => [k, Math.floor(v / 2)])
        );
        data.setSkills = setSkills;

        // correct group skill levels
        const groupSkills = Object.fromEntries(
            Object.entries(data.groupSkills)
                .filter(([k, v]) => k && Math.floor(v / 3) > 0)
                .map(([k, v]) => [k, Math.floor(v / 3)])
        );
        data.groupSkills = groupSkills;
    }

    // i'll figure out this sorting bs to make it match python's sort later
    // TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO TODO
    const damnSort = [...indexedData].sort((a, b) =>
        slottageSizeCompare([0, [0, 0, 0, a.freeSlots]], [0, [0, 0, 0, b.freeSlots]], b.id - a.id) // Sort by highest slot value
    );

    damnSort.forEach(d => d.slots.sort((a, b) => b - a));

    let pre = [], post = [];
    const bestPerThree = {}; // Tracks the best (longest) list per (numThrees, numTwos)

    const sortedDamnSort = damnSort.sort((a, b) => {
        const aThrees = a.freeSlots.filter(y => y === 3).length;
        const bThrees = b.freeSlots.filter(y => y === 3).length;

        const aTwos = a.freeSlots.filter(y => y === 2).length;
        const bTwos = b.freeSlots.filter(y => y === 2).length;

        return (
            bThrees - aThrees || // Most 3s
            bTwos - aTwos || // Most 2s
            b.freeSlots.length - a.freeSlots.length || // Longest slots
            Object.keys(b.skills).length - Object.keys(a.skills).length ||
            b.id - a.id
            // a.armorNames.join().localeCompare(b.armorNames.join()) ||
            // eslint-disable-next-line no-underscore-dangle
            // a._originalIndex - b._originalIndex // Ensures stable sorting by original order
        );
    });

    sortedDamnSort.forEach(res => {
        const numThrees = res.freeSlots.filter(y => y === 3).length;
        const numTwos = res.freeSlots.filter(y => y === 2).length;
        const key = `${numThrees},${numTwos}`;

        if (!(key in bestPerThree)) {
            pre.push(res);
            bestPerThree[key] = res.freeSlots.length;
        } else {
            post.push(res);
        }
    });

    pre = [...pre, ...post];
    const excludeIds = new Set(pre.map(obj => obj.id));

    const longestSlots = [...indexedData]
        .filter(v => !excludeIds.has(v.id))
        .sort((a, b) => {
            const aHasPriority = a.freeSlots.some(val => val === 2 || val === 3) ? a.freeSlots.length : 0;
            const bHasPriority = b.freeSlots.some(val => val === 2 || val === 3) ? b.freeSlots.length : 0;

            return (
                b.freeSlots.length - a.freeSlots.length ||
                bHasPriority - aHasPriority ||
                // eslint-disable-next-line no-underscore-dangle
                a._originalIndex - b._originalIndex // Preserve stability
            );
        });

    return [...pre, ...longestSlots];
};

const product = (...arrays) => {
    return arrays.reduce((prevAccumulator, currentArray) => {
        const newAccumulator = [];
        prevAccumulator.forEach(prevAccumulatorArray => {
            currentArray.forEach(currentValue => {
                newAccumulator.push(prevAccumulatorArray.concat(currentValue));
            });
        });
        return newAccumulator;
    }, [[]]);
};

const cartesianProduct = (...arrays) => {
    return arrays.reduce((acc, arr) => {
        return acc.flatMap(c => arr.map(x => [...c, x]));
    }, [[]]);
};

const rollCombos = (gear, skills, setSkills, groupSkills, limit, findOne = false) => {
    if (!gear) {
        console.warn("rollCombos(): gear is null, something went wrong");
        return [];
    }

    let counter = 0, inc = 0;
    const ret = [];

    // Convert gear categories into arrays for efficient iteration
    const headList = Object.entries(gear.head);
    const chestList = Object.entries(gear.chest);
    const armsList = Object.entries(gear.arms);
    const waistList = Object.entries(gear.waist);
    const legsList = Object.entries(gear.legs);
    const talismanList = Object.entries(gear.talisman);

    // Calculate total possible combinations
    totalPossibleCombinations =
        headList.length * chestList.length * armsList.length *
        waistList.length * legsList.length * talismanList.length;
    if (CHOSEN_ARMOR_DEBUG) {
        console.log(`possible: ${totalPossibleCombinations.toLocaleString()}`);
    }

    const setSkillsCheck = setSkills ? new Set(Object.keys(setSkills)) : new Set();
    const groupSkillsCheck = groupSkills ? new Set(Object.keys(groupSkills)) : new Set();

    // Use cartesianProduct to generate all combinations in the same order as Python's itertools.product
    const allCombos = cartesianProduct(headList, chestList, armsList, waistList, legsList, talismanList);

    for (const combo of allCombos) {
        if (counter >= limit) { return ret; }

        if (setSkillsCheck.size > 0 || groupSkillsCheck.size > 0) {
            const piecesFromSet = {};
            const piecesFromGroup = {};

            for (const piece of combo.slice(0, -1)) { // Ignore talisman for set/group skills
                const armorData = piece[1];
                const setName = armorData[7];
                const groupName = armorData[2];

                if (setSkillsCheck.has(setName)) {
                    piecesFromSet[setName] = (piecesFromSet[setName] || 0) + 1;
                }

                if (groupSkillsCheck.has(groupName)) {
                    piecesFromGroup[groupName] = (piecesFromGroup[groupName] || 0) + 1;
                }
            }

            if ([...setSkillsCheck].some(skill => (piecesFromSet[skill] || 0) < setSkills[skill] * 2)) {
                continue;
            }

            if ([...groupSkillsCheck].some(skill => (piecesFromGroup[skill] || 0) < 3)) {
                continue;
            }
        }

        const testSet = armorCombo(...combo.map(piece => formatArmorC(piece)));

        const result = test(testSet, gear.decos, skills);
        if (result) {
            result.id = counter + 1;
            result._id = inc + 1;
            inc += 1;
            ret.push(result);
            if (findOne) { return ret; }
        }

        counter += 1;
    }

    return ret;
};

const test = (armorSet, decos, desiredSkills) => {
    const have = {};
    const need = {};
    let done = true;
    for (const [skillName, level] of Object.entries(desiredSkills)) {
        have[skillName] = armorSet.skills[skillName] || 0;
        need[skillName] = level - have[skillName];
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
            freeSlots: armorSet.slots,
            // defense: armorSet.defense
        };
    }

    const decosUsed = getDecosToFulfillSkills(decos, desiredSkills, armorSet.slots, armorSet.skills);

    if (decosUsed) {
        const decosSkillsMap = getDecoSkillsFromNames(decosUsed.decoNames);
        const combinedSkills = mergeSumMaps([armorSet.skills, decosSkillsMap]);

        return {
            armorNames: armorSet.names,
            slots: armorSet.slots,
            decoNames: decosUsed.decoNames,
            skills: combinedSkills,
            setSkills: armorSet.setSkills,
            groupSkills: armorSet.groupSkills,
            freeSlots: decosUsed.freeSlots,
            // defense: armorSet.defense
        };
    }

    return null;
};

export const search = parameters => {
    const params = getSearchParameters(parameters);
    const gear = speed(
        getBestArmor, params.skills, params.setSkills, params.groupSkills,
        params.mandatoryArmor, params.blacklistedArmor, params.blacklistedArmorTypes,
        params.dontUseDecos
    );

    decoInventory = { ...DECO_INVENTORY };

    // limit decos to what user has specified they have
    for (const [decoName, decoAmount] of Object.entries(params.decoMods)) {
        if (Object.keys(decoInventory).includes(decoName)) {
            decoInventory[decoName] = decoAmount;
        }
    }

    let rolls = speed(
        rollCombos,
        gear, params.skills, params.setSkills, params.groupSkills, params.limit,
        params.findOne
    );

    rolls = reorder(rolls);
    // searchResults = rolls;
    if (params.verifySlots && !params.findOne) {
        // const passedTest = verify(rolls, params.verifySlots);
    }
    // generateWikiString(params.skills, params.setSkills, params.groupSkills);

    return rolls;
};

export const searchAndSpeed = async parameters => {
    const startTime = performance.now();
    const results = await new Promise(resolve => {
        setTimeout(() => {
            resolve(search(parameters));
        }, 0);
    });
    const endTime = performance.now();
    const seconds = (endTime - startTime) / 1000;

    return {
        results,
        seconds,
    };
};

export const runAllTests = () => {
    for (const [testName, theTest] of Object.entries(allTests)) {
        const results = search(theTest);
        console.log(`%c${testName}: ${results.length}`, "color: aqua");
    }
};
