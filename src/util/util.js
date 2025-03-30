import SKILLS from '../data/compact/skills.json';
import SET_SKILLS from '../data/compact/set-skills.json';
import GROUP_SKILLS from '../data/compact/group-skills.json';
import HEAD from "../data/detailed/armor/head.json";
import CHEST from "../data/detailed/armor/chest.json";
import ARMS from "../data/detailed/armor/arms.json";
import WAIST from "../data/detailed/armor/waist.json";
import LEGS from "../data/detailed/armor/legs.json";
import TALISMANS from "../data/detailed/talisman.json";
import DECORATIONS from '../data/compact/decoration.json';
import DEFENSE_LEVELS from '../data/compact/defense-levels.json';
import DECO_DB from '../data/detailed/decoration.json';

import HEAD_MAP from '../data/compact/head.json';
import CHEST_MAP from '../data/compact/chest.json';
import ARMS_MAP from '../data/compact/arms.json';
import WAIST_MAP from '../data/compact/waist.json';
import LEGS_MAP from '../data/compact/legs.json';
import TALIS_MAP from '../data/compact/talisman.json';

import SKILLS_DB from '../data/skills/skills.json';
import SET_SKILLS_DB from '../data/skills/set-skills.json';
import GROUP_SKILLS_DB from '../data/skills/group-skills.json';

import SKILL_ID_MAP from '../data/ids/skill-ids.json';

import { renderToStaticMarkup } from 'react-dom/server';
import { isEmpty } from './tools';

export const getArmorTypeList = () => ['head', 'chest', 'arms', 'waist', 'legs', 'talisman'];
export const isGroupSkill = skill => Boolean(skill.pieces);
export const isSetSkill = skill => Boolean(skill.piecesPerLevel);
export const isGroupSkillName = name => GROUP_SKILLS[name] || GROUP_SKILLS_DB.filter(x => x.skill === name).length > 0;
export const isSetSkillName = name => SET_SKILLS[name] || SET_SKILLS_DB.filter(x => x.skill === name).length > 0;
export const getMaxLevel = skillName => {
    const isSet = SET_SKILLS[skillName];
    const isGroup = GROUP_SKILLS[skillName];
    return SKILLS[skillName] || isSet && 2 || isGroup && 1;
};

export const paginateOld = (array, page = 0, pageSize = 10) =>
    array.slice(page * pageSize, (page + 1) * pageSize);
export const paginate = (array, page, pageSize) => {
    return pageSize > 0 ? array.slice(page * pageSize, page * pageSize + pageSize) : array;
};
export const armorNameFormat = name => {
    const alpha = "α";
    const beta = "β";
    const gamma = "γ";

    return name.replaceAll("Alpha", alpha).replaceAll("Beta", beta).replaceAll("Gamma", gamma);
};

export const allArmorMaps = () => {
    return { ...HEAD_MAP, ...CHEST_MAP, ...ARMS_MAP, ...WAIST_MAP, ...LEGS_MAP };
};
export const allArmor = () => {
    return [...HEAD, ...CHEST, ...ARMS, ...WAIST, ...LEGS];
};
const armorByType = type => {
    const typeMap = {
        head: HEAD_MAP,
        chest: CHEST_MAP,
        arms: ARMS_MAP,
        waist: WAIST_MAP,
        legs: LEGS_MAP,
        talisman: TALIS_MAP
    };

    return typeMap[type];
};

export const getArmorDefenseFromName = name => {
    const data = allArmor().filter(x => x.name === name)[0];
    if (!data) { // happens if 'None' piece (excluded)
        // console.warn('getArmorDefenseFromName(): unable to find armor piece - ', name);
        return undefined;
    }

    const base = data.defense;
    const rarity = data.rarity;
    const levels = DEFENSE_LEVELS[rarity] - 1;
    return {
        base,
        upgraded: base + levels * 2
    };
};

export const copyTextToClipboard = (text, postFunc) => {
    if (!navigator.clipboard) {
        fallbackCopyTextToClipboard(text);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        console.log('Async: Copying to clipboard was successful!');
        if (postFunc) {
            postFunc();
        }
    }, err => {
        console.error('Async: Could not copy text: ', err);
    });
};

const fallbackCopyTextToClipboard = text => {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log(`Fallback: Copying text command was ${msg}`);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
};

export const getSearchUrl = (skills, slotFilters) => {
    const urlParams = new URLSearchParams();
    if (!isEmpty(skills)) {
        urlParams.set('skills', Object.entries(skills).map(x => `${SKILL_ID_MAP[x[0]]}-${x[1]}`).join("_"));
    }
    if (!isEmpty(slotFilters)) {
        urlParams.set('sf', Object.entries(slotFilters).map(x => `${x[0]}-${x[1]}`).join("_"));
    }
    return `${window.location.href}?${urlParams}`;
};

export const addUrlParam = (key, value) => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set(key, value);
    window.location.search = urlParams;
};

export const removeUrlParam = key => {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.delete(key);
    window.location.search = urlParams;
};

// string to unique id
export const stringToId = str => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = (hash << 5) - hash + str.charCodeAt(i);
        hash |= 0; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36); // Base36 for shorter, alphanumeric ID
};

export const getArmorDefenseFromNames = theNames => {
    const names = theNames.length > 5 ? theNames.slice(0, 5) : theNames;
    const baseArr = [];
    let base = 0;
    let upgraded = 0;
    for (const name of names) {
        const data = allArmor().filter(x => x.name === name)[0];
        if (!data) {
            // console.warn('getArmorDefenseFromNames(): unable to find armor piece - ', name);
            continue;
        }
        baseArr.push(data.defense);
        const levels = DEFENSE_LEVELS[data.rarity] - 1;
        base += data.defense;
        upgraded += data.defense + levels * 2;
    }

    return {
        base,
        upgraded,
    };
};

export const saveToLocalStorage = (key, data) => {
    const updatedData = JSON.stringify(data);
    localStorage.setItem(key, updatedData);
};
export const getFromLocalStorage = (key, defaultValue = null) => {
    const data = localStorage.getItem(key);

    if (data === null) {
        return defaultValue;
    }

    try {
        const parsedData = JSON.parse(data);
        return parsedData;
    } catch (e) {
        console.error(`Error parsing JSON from localStorage key: "${key}":`, e);
        return defaultValue;
    }
};

export const isArmorOfType = (type, name) => {
    return armorByType(type)[name] !== undefined;
};

export const notImplemented = text => {
    window.snackbar.createSnackbar(
        `${`'${text}'` || 'Feature'} not implemented yet`, { timeout: 3000 }
    );
};

export const getDecoFromName = (name, showSkillNames = false) => {
    const data = DECORATIONS[name];
    const detailed = DECO_DB.filter(x => x.name === name)[0];
    const decoSkillNames = `${Object.entries(data[1]).map(x => [`${x[0]} Lv. ${x[1]}`]).join("/")} Jewel`;
    return {
        skillNames: Object.entries(data[1]).map(x => x[0]),
        skills: Object.entries(data[1]).map(x => [`${x[0]} Lv. ${x[1]}`]).join(", "),
        name: showSkillNames ? decoSkillNames : name,
        slotSize: data[2],
        altText: showSkillNames ? name : decoSkillNames,
        max: getMaxDecoCount(detailed)
    };
};

export const getDecosFromNames = (names, showSkillNames = false) => {
    const objDecos = [];
    const amount = {};
    for (const name of names) {
        amount[name] = (amount[name] || 0) + 1;
    }
    const decos = Object.fromEntries(names.map(name => [name, DECORATIONS[name]]));
    let key = 1;
    for (const [name, data] of Object.entries(decos)) {
        const decoSkillNames = `${Object.entries(data[1]).map(x => [`${x[0]} Lv. ${x[1]}`]).join("/")} Jewel`;
        objDecos.push({
            skillNames: Object.entries(data[1]).map(x => x[0]),
            skills: Object.entries(data[1]).map(x => [`${x[0]} Lv. ${x[1]}`]).join(", "),
            name: showSkillNames ? decoSkillNames : name,
            slotSize: data[2],
            key,
            amount: amount[name],
            altText: showSkillNames ? name : decoSkillNames
        });
        key++;
    }

    return objDecos;
};

export const getMaxDecoCount = deco => {
    const maxWeaponSlots = deco.type === "weapon" ? 3 : 99;
    const skill1 = deco.skills[0];
    const skill2 = deco.skills[1];

    const s1 = SKILLS_DB.filter(x => x.name.toLowerCase() === skill1.name.toLowerCase())[0];

    if (!s1) {
        console.warn("Failed to getMaxDecoCount()", deco);
        return 99;
    }

    const max1 = Math.ceil(s1.levels.length / skill1.level);
    let max2 = 3;

    if (skill2) {
        const s2 = SKILLS_DB.filter(x => x.name.toLowerCase() === skill2.name.toLowerCase())[0];
        max2 = Math.ceil(s2.levels.length / skill2.level);
    }

    return Math.min(max1, maxWeaponSlots);
};

export const getDecoDisplayName = (decoName, showSkills = false) => {
    if (!showSkills) { return decoName; }
    return `${Object.entries(DECORATIONS[decoName][1]).map(x => [`${x[0]} Lv. ${x[1]}`]).join("/")} Jewel`;
};

export const areArmorSetsEqual = (a, b) => {
    if (a === b) { return true; }
    if (a === null || b === null) { return false; }
    if (a.length !== b.length) { return false; }

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false; }
    }
    return true;
};

export const getArmorColorHue = rarity => {
    const rarityToColor = {
        1: "White",
        2: "White",
        3: "Light Green",
        4: "Green",
        5: "Light Blue",
        6: "Indigo",
        7: "Dark Purple",
        8: "Orange",
        9: "Red",
        10: "Sky Blue",
        11: "Yellow",
        12: "Light Grey"
    };

    const colorToDeg = {
        "White": 30,
        "Dark Grey": 160,
        "Light Green": 260,
        "Green": 245,
        "Light Blue": 30,
        "Indigo": 330,
        "Dark Purple": 330,
        "Orange": 200,
        "Red": 160,
        "Sky Blue": 30,
        "Yellow": 200,
        "Light Grey": 30
    };

    return `hue-rotate(${colorToDeg[rarityToColor[rarity]]}deg)`;
};

export const generateWikiString = (skills, setSkills, groupSkills, slotFilters = {}) => {
    const skillsWikiFormat = [];

    for (const [key, value] of Object.entries(skills)) {
        skillsWikiFormat.push(`${key} Lv${value}`);
    }

    for (const [key, value] of Object.entries(setSkills)) {
        skillsWikiFormat.push(`${SET_SKILLS[key][0]} ${'I'.repeat(value)}`);
    }

    for (const key of Object.keys(groupSkills)) {
        skillsWikiFormat.push(`${GROUP_SKILLS[key][0]}`);
    }

    for (const [slotSize, amount] of Object.entries(slotFilters)) {
        const truncatedAmount = Math.min(amount, 7); // wiki tool only allows up to 7
        skillsWikiFormat.push(`LV${slotSize} Slot Skill Lv${truncatedAmount}`);
    }

    return skillsWikiFormat.join("%2C");
};

export const getSkillDiff = (skillsA, skillsB) => {
    const result = {};
    const keys = new Set([...Object.keys(skillsA), ...Object.keys(skillsB)]);

    for (const key of keys) {
        const val1 = skillsA[key] ?? 0;
        const val2 = skillsB[key] ?? 0;
        result[key] = Math.abs(val1 - val2);
    }

    return result;
};

export const getSkillPopup = skillName => {
    let skill = skillName;

    if (!skill.description) {
        skill = SKILLS_DB.filter(x => x.name === skillName)[0] ||
            SET_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0] ||
            GROUP_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0];
    }

    if (!skill) { return ""; }

    let levelsDesc = skill?.levels?.map((desc, i) => `Level ${i + 1}: ${desc}`).join('\n') || '';
    if (levelsDesc) { levelsDesc = `\n\n${levelsDesc}`; }
    return `${skill.description}${levelsDesc}`;
};

export const getArmorFromNames = names => {
    const all = [...HEAD, ...CHEST, ...ARMS, ...WAIST, ...LEGS, ...TALISMANS];
    const ret = [];

    for (const name of names) {
        const found = all.filter(x => x.name === name)[0];
        if (!found) {
            ret.push({
                name, // should be None
                rarity: 1,
                skills: [], // "",
                slots: []
            });
            continue;
        }

        ret.push({
            name,
            rarity: found.rarity,
            skills: found.skills, // .map(x => `${x.name} Lv. ${x.level}`).join(", "),
            slots: found.slots || [],
        });
    }

    return ret;
};

export const formatSkillsDiff = (skillDiff, showSkillNames = false, levelPre = '') => {
    const skills = {};
    const setSkills = {};
    const groupSkills = {};

    for (const [name, level] of Object.entries(skillDiff)) {
        if (!level) { continue; }
        if (isSetSkillName(name)) {
            setSkills[name] = level;
        } else if (isGroupSkillName(name)) {
            groupSkills[name] = level;
        } else {
            skills[name] = level;
        }
    }

    const str = Object.entries(skills)
        .map(x => `${x[0]} Lv. ${levelPre}${x[1]}`).join(", ");
    const setStr = formatSetSkills(setSkills, showSkillNames, levelPre);
    const groupStr = formatGroupSkills(groupSkills, showSkillNames, levelPre);

    return [str, setStr, groupStr].filter(x => x).join(", ");
};

export const formatSetSkills = (setSkills, showSkillNames = false, levelPre = '') => {
    return Object.entries(setSkills)
        .map(x => `${showSkillNames ? SET_SKILLS[x[0]][0] : x[0]} Lv. ${levelPre}${x[1]}`).join(", ");
};

export const formatGroupSkills = (groupSkills, showSkillNames = false, levelPre = '') => {
    return Object.entries(groupSkills)
        .map(x => `${showSkillNames ? GROUP_SKILLS[x[0]][0] : x[0]} Lv. ${levelPre}${x[1]}`).join(", ");
};

export const hexToRgba = hex => {
    // Remove '#' if present
    hex = hex.replace(/^#/, "");

    // Parse r, g, b, and optional alpha
    let r, g, b, a = 255;

    if (hex.length === 8) { // #RRGGBBAA
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
        a = parseInt(hex.substring(6, 8), 16) / 255; // Normalize alpha to 0-1
    } else if (hex.length === 6) { // #RRGGBB
        r = parseInt(hex.substring(0, 2), 16);
        g = parseInt(hex.substring(2, 4), 16);
        b = parseInt(hex.substring(4, 6), 16);
    } else {
        throw new Error("Invalid hex format");
    }

    return `rgba(${r}, ${g}, ${b}, ${a})`;
};

const standardizeColor = str => {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = str;
    return ctx.fillStyle;
};

export const shadeColor = (color, percent = 30) => {
    color = isNaN(color) ? standardizeColor(color) : color;

    let R = parseInt(color.substring(1, 3), 16);
    let G = parseInt(color.substring(3, 5), 16);
    let B = parseInt(color.substring(5, 7), 16);

    R = parseInt(R * (100 + percent) / 100, 10);
    G = parseInt(G * (100 + percent) / 100, 10);
    B = parseInt(B * (100 + percent) / 100, 10);

    R = R < 255 ? R : 255;
    G = G < 255 ? G : 255;
    B = B < 255 ? B : 255;

    const RR = R.toString(16).length === 1 ? `0${R.toString(16)}` : R.toString(16);
    const GG = G.toString(16).length === 1 ? `0${G.toString(16)}` : G.toString(16);
    const BB = B.toString(16).length === 1 ? `0${B.toString(16)}` : B.toString(16);

    return `#${RR}${GG}${BB}`;
};

export const generateStyle = hex => {
    // const color = hexToRgba(hex);
    const color = isNaN(hex) ? standardizeColor(hex) : hex;
    const lighterColor = shadeColor(hex); // hexToRgba(`${hex.slice(0, 7) }13`); // Lighten by changing alpha

    return {
        backgroundColor: color,
        borderColor: color,
        backgroundImage: `-webkit-linear-gradient(100deg, ${lighterColor} 30%, ${color} 50%)`,
    };
};
