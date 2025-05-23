import KIRA_ARMOR from '../data/kiranico/armor.json';
// import KIRA_SERIES from '../data/kiranico/armor-series.json';
// import TALISMANS from "../data/detailed/talisman.json";
import { allArmor, armorNameFormat, isGroupSkillName, isSetSkillName } from './util';

export const compareArmor = (resistances = false, slots = true, skills = true) => {
    const allDetailedArmor = allArmor(); // not talismans

    for (const armor of allDetailedArmor) {
        const formattedName = armorNameFormat(armor.name).replace("G ", "G. ");
        const kira = KIRA_ARMOR[formattedName];
        let titled = false;

        if (!kira) {
            console.error('No kira match for:', formattedName);
            continue;
        }

        const parallelFields = [
            'defense', 'fireResistance', 'waterResistance',
            'thunderResistance', 'iceResistance', 'dragonResistance'
        ];

        if (resistances) {
            for (const field of parallelFields) {
                if (armor[field] !== kira[field]) { console.log(`${armor.name} - ${field}`, armor[field], kira[field]); }
            }
        }

        if (slots) {
            for (const slot of kira.slots) {
                if (slot && !armor.slots.includes(slot)) {
                    console.log(`${armor.name} - slots:`, armor.slots, kira.slots);
                    break;
                }
            }
        }

        if (skills) {
            for (const [skillName, skillLevel] of Object.entries(kira.skills)) {
                const armorSkill = armor.skills.filter(x => x.name === skillName)[0];
                if (isSetSkillName(skillName) || isGroupSkillName(skillName)) { continue; }
                if (!armorSkill || armorSkill.level !== skillLevel) {
                    if (!titled) {
                        titled = true;
                        console.log(armor.name);
                    }
                    console.log(`%c\t${armor.name} - ${armorSkill?.name}: ${armorSkill?.level}`, 'color: red');
                    console.log(`%c\t${armor.name} - ${skillName}: ${skillLevel}`, 'color: green');
                    // console.warn(`${armor.name} - skills:`, armor.skills.map(x => `${x.name}: ${x.level}`),
                    //     Object.entries(kira.skills).map(x => `${x[0]}: ${x[1]}`));
                }
            }
        }
    }
};