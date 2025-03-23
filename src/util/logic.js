import TALISMANS from "../data/compact/talisman.json";
import DECO_INVENTORY from "../data/user/deco-inventory.json";
import SKILL_DB from "../data/compact/skills.json";
import SET_SKILL_DB from '../data/compact/set-skills.json';
import GROUP_SKILL_DB from '../data/compact/group-skills.json';
import {
    _x,
    emptyGearPiece,
    emptyGearSet, formatArmorC, getArmorSkillNames, getBestDecos, getDecoSkillsFromNames,
    getInclusiveRemainingSlots,
    getJsonFromType, getSearchParameters, groupArmorIntoSets,
    hasBetterSlottage, hasLongerSlottage, hasNeededSkill, isEmpty, isInGroups,
    isInSets, mergeSumMaps, slottageLengthCompare, slottageLengthCompareSort,
    slottageSizeCompare, speed, speedAsync, updateSkillPotential
} from "./tools";
import { CHOSEN_ARMOR_DEBUG, DEBUG } from "./constants";
import { allTests } from "../test/tests";
import { isGroupSkillName, isSetSkillName } from "./util";

let totalPossibleCombinations = 0;
let decoInventory = { ...DECO_INVENTORY };

// getting lazier..
let currentSlotFilters = {};
export let freeThree = [];
export let freeTwo = [];
export let freeOne = [];

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
            console.log(category.toUpperCase()); // Print category name

            for (const [aName, aData] of Object.entries(data)) {
                if (category === "talisman" || category === "decos") {
                    console.log(`\t${aName}, ${JSON.stringify(aData[1])}`);
                    continue;
                }

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

const getDecosToFulfillSkills = (decos, desiredSkills, slotsAvailable, startingSkills) => {
  if (!decos || Object.keys(decos).length === 0) { return null; }

  // Clone and adjust required skills
  const skillsNeeded = { ...desiredSkills };
  for (const skill in startingSkills) {
    if (skillsNeeded[skill] !== undefined) {
      skillsNeeded[skill] -= startingSkills[skill];
      if (skillsNeeded[skill] <= 0) {
        delete skillsNeeded[skill];
      }
    }
  }

  if (Object.keys(skillsNeeded).length === 0) {
    return {
      decoNames: [],
      freeSlots: slotsAvailable
    };
  }

  // Sort slots in ascending order to fill smallest first
  const slotPool = [...slotsAvailable].sort((a, b) => a - b);

  // Sort decorations: prioritize highest total skill points, then smaller slot size
  const sortedDecos = Object.entries(decos).sort((a, b) => {
    const [_, __, slotA] = a[1];
    const [___, ____, slotB] = b[1];
    const totalSkillA = Object.values(a[1][1]).reduce((sum, val) => sum + val, 0);
    const totalSkillB = Object.values(b[1][1]).reduce((sum, val) => sum + val, 0);
    if (totalSkillB !== totalSkillA) { return totalSkillB - totalSkillA; }
    return slotA - slotB;
  });

  const usedDecos = [];
  const usedDecosCount = {};
  const usedSlots = [];

  for (const [skill, neededPoints] of Object.entries(skillsNeeded)) {
    let remaining = neededPoints;
    while (remaining > 0) {
      let foundMatch = false;

      for (const [decoName, [decoType, decoSkills, decoSlot]] of sortedDecos) {
        if (!(skill in decoSkills)) { continue; }
        if ((usedDecosCount[decoName] || 0) >= (decoInventory[decoName] || 0)) { continue; }

        // Try to find the smallest slot that fits
        for (let i = 0; i < slotPool.length; i++) {
          const slotSize = slotPool[i];
          if (slotSize >= decoSlot) {
            // Use this decoration
            usedDecos.push(decoName);
            usedDecosCount[decoName] = (usedDecosCount[decoName] || 0) + 1;
            usedSlots.push(slotSize);
            slotPool.splice(i, 1);

            remaining -= decoSkills[skill];
            foundMatch = true;
            break;
          }
        }

        if (foundMatch) { break; }
      }

      if (!foundMatch) { return null; } // Cannot fulfill the skill
    }
  }

  return {
    decoNames: usedDecos,
    freeSlots: slotPool
  };
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

const rollCombos = async(gear, skills, setSkills, groupSkills, limit, findOne = false, cancelToken = undefined) => {
    if (!gear) {
        console.warn("rollCombos(): gear is null, something went wrong");
        return [];
    }

    let counter = 0, inc = 0, allCounter = 0;
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

    const setSkillsCheck = new Set(Object.keys(setSkills));
    const groupSkillsCheck = new Set(Object.keys(groupSkills));

    // Use cartesianProduct to generate all combinations in the same order as Python's itertools.product
    const allCombos = cartesianProduct(headList, chestList, armsList, waistList, legsList, talismanList);

    for (const combo of allCombos) {
        allCounter++;
        if (counter >= limit) {
            console.warn("rollCombos() - limit reached, exiting");
            return ret;
        }

        if (allCounter % 1000 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (cancelToken && cancelToken.current) {
            console.warn('rollCombos() cancel pressed, returning early');
            return ret;
        }

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

export const isSkillInResults = (results, skillName, level) => {
    for (const res of results) {
        if (res.skills?.[skillName] >= level ||
            res.setSkills?.[skillName] >= level ||
            res.groupSkills?.[skillName] >= level
        ) {
            return true;
        }

        if (isSetSkillName(skillName) || isGroupSkillName(skillName)) {
            return false;
        }

        const decos = getBestDecos({ [skillName]: level });
        const fits = getDecosToFulfillSkills(decos, { [skillName]: level }, res.freeSlots, res.skills);

        if (fits) { return true; }
    }

    return false;
};

export const getAddableSkills = async parameters => {
    const params = getSearchParameters(parameters);
    const exhaustive = params.exhaustive;

    currentSlotFilters = { ...params.slotFilters };
    params.slotFilters = {};
    const priorResults = await search(parameters);

    const skillsCanAdd = {};
    const baseSkills = { ...params.skills, ...params.setSkills, ...params.groupSkills };

    const numberTuple = (n, stop = 1) => {
        const result = [1];
        for (let i = n; i > stop; i--) {
            result.push(i);
        }
        return result;
    };
    const armorSkillsList = getArmorSkillNames();

    if (DEBUG) { console.log("beginning skill iterations..."); }
    const trimmedSkills = Object.fromEntries(
        Object.entries(SKILL_DB).filter(([name]) => armorSkillsList.includes(name))
    );
    const trimmedSetSkills = Object.fromEntries(
        Object.entries(SET_SKILL_DB).map(x => [x[0], 2])
    );
    const trimmedGroupSkills = Object.fromEntries(
        Object.entries(GROUP_SKILL_DB).map(x => [x[0], 1])
    );
    const combinedSkills = { ...trimmedSkills, ...trimmedSetSkills, ...trimmedGroupSkills };

    const totalSkills = Object.keys(combinedSkills).length;
    let counter = 0, lastProgress = 0;

    for (const [skillName, maxSkillLevel] of Object.entries(combinedSkills)) {
        // visual progress updating
        const percentDone = counter++ / totalSkills * 100;
        if (params.updateProgressFunc) {
            const rounded = Math.round(percentDone);
            if (rounded > lastProgress) {
                lastProgress = rounded;
                params.updateProgressFunc(rounded);
            }
        }
        if (counter % 10 === 0) {
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        if (DEBUG) {
            console.log(`getMoreSkills Progress: ${percentDone.toFixed(2)}%...`);
        }

        // early exit check (if user presses "cancel")
        if (params.cancelToken?.current) {
            console.log("getMoreSkills() cancelled, exiting early");
            return skillsCanAdd;
        }

        const existingSkillLevel = baseSkills[skillName] ?? 0;
        if (existingSkillLevel >= maxSkillLevel) { continue; }

        const levelsToTry = numberTuple(maxSkillLevel, Math.max(1, existingSkillLevel));

        for (const level of levelsToTry) {
            if (level <= existingSkillLevel) { continue; }
            const good = isSkillInResults(priorResults, skillName, level);
            if (good) {
                if (DEBUG) { console.log(`-+ ${skillName} ${level}: yes`); }
                skillsCanAdd[skillName] = level;
                if (params.addMoreFunc) { params.addMoreFunc(skillName, level); }
                if (level > 1) { break; }
                continue;
            } else if (level === 1) {
                if (DEBUG) { console.log(`-+ ${skillName} ${level}: no`); }
            }

            if (!exhaustive) { continue; }

            let skills = { ...params.skills };
            let setSkills = { ...params.setSkills };
            let groupSkills = { ...params.groupSkills };
            if (isSetSkillName(skillName)) {
                setSkills = { ...setSkills, [skillName]: level };
            } else if (isGroupSkillName(skillName)) {
                groupSkills = { ...groupSkills, [skillName]: level };
            } else {
                skills = { ...skills, [skillName]: level };
            }

            const rolls = await search({
                ...params,
                skills,
                setSkills,
                groupSkills,
                findOne: true
            });

            const found = rolls.length > 0;
            if (found) {
                if (DEBUG) { console.log(`-- ${skillName} ${level}: yes`); }
                skillsCanAdd[skillName] = level;
                if (params.addMoreFunc) { params.addMoreFunc(skillName, level); }
                if (level > 1) { break; }
            } else if (level === 1) {
                if (DEBUG) { console.log(`-- ${skillName} ${level}: no`); }
                break;
            }
        }
    }

    return skillsCanAdd;
};

export const search = async parameters => {
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

    let rolls = await rollCombos(
        gear, params.skills, params.setSkills, params.groupSkills, params.limit,
        params.findOne, params.cancelToken
    );

    // lazily handle slotFilters filtering here
    if (!isEmpty(params.slotFilters)) {
        const desiredSlots = Object.entries(params.slotFilters)
            .flatMap(([num, count]) => Array(count).fill(Number(num)))
            .sort((a, b) => b - a);
        const filteredRolls = [];
        for (const roll of rolls) {
            const rollFree = roll.freeSlots.sort((a, b) => b - a);
            if (rollFree.length < desiredSlots.length) { continue; } // not enough slots
            let pass = false;
            for (let i = 0; i < desiredSlots.length; i++) {
                const wantSlot = desiredSlots[i];
                const haveSlot = rollFree[i];
                if (wantSlot > haveSlot) {
                    pass = true;
                    break;
                }
            }
            if (pass) { continue; }
            filteredRolls.push(roll);
        }
        rolls = filteredRolls;
    }

    if (!params.findOne) {
        freeThree = [];
        freeTwo = [];
        freeOne = [];
        for (const roll of rolls) {
            const remaining = getInclusiveRemainingSlots(roll.freeSlots, currentSlotFilters);
            if (remaining) {
                freeThree = Math.max(freeThree, remaining[3]);
                freeTwo = Math.max(freeTwo, remaining[2]);
                freeOne = Math.max(freeOne, remaining[1]);
            }
        }
    }

    rolls = reorder(rolls);

    return rolls;
};

export const searchAndSpeed = async parameters => {
    const startTime = performance.now();

    await new Promise(resolve => setTimeout(resolve, 0)); // allow UI update before blocking
    const results = await search(parameters);
    const endTime = performance.now();
    const seconds = (endTime - startTime) / 1000;

    return {
        results,
        seconds,
    };
};

export const moreAndSpeed = async parameters => {
    const startTime = performance.now();
    const results = await new Promise(resolve => {
        setTimeout(() => {
            resolve(getAddableSkills(parameters));
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
        search(theTest).then(results => {
            console.log(`%c${testName}: ${results.length}`, "color: aqua");
        });
    }
};
