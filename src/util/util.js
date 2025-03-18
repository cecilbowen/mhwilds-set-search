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

export const isGroupSkill = skill => Boolean(skill.pieces);
export const isSetSkill = skill => Boolean(skill.piecesPerLevel);
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

    return name.replaceAll("Alpha", alpha).replaceAll("Beta", beta);
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

export const areArmorSetsEqual = (a, b) => {
    if (a === b) { return true; }
    if (a === null || b === null) { return false; }
    if (a.length !== b.length) { return false; }

    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false; }
    }
    return true;
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
                skills: "",
                slots: []
            });
            continue;
        }

        ret.push({
            name,
            rarity: found.rarity,
            skills: found.skills.map(x => `${x.name} Lv. ${x.level}`).join(", "),
            slots: found.slots || [],
        });
    }

    return ret;
};

export const formatSetSkills = (setSkills, showSkillNames = false) => {
    return Object.entries(setSkills).map(x => `${showSkillNames ? SET_SKILLS[x[0]] : x[0]} Lv. ${x[1]}`).join(", ");
};

export const formatGroupSkills = (groupSkills, showSkillNames = false) => {
    return Object.entries(groupSkills).map(x => `${showSkillNames ? GROUP_SKILLS[x[0]] : x[0]} Lv. ${x[1]}`).join(", ");
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
