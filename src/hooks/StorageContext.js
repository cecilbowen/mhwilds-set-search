// handles anything that modifies local storage
/* eslint-disable react/prop-types */
import { createContext, useContext, useEffect, useState } from "react";
import { areArmorSetsEqual, getArmorTypeList, getFromLocalStorage, saveToLocalStorage, stringToId } from "../util/util";
import SKILL_ID_MAP from '../data/ids/skill-ids.json';
import { renderToStaticMarkup } from "react-dom/server";

const StorageContext = createContext();

const DEFAULTS = {
    // search parameters
    skills: {},
    slotFilters: {},
    decoInventory: {},
    mandatoryArmor: ['', '', '', '', '', ''],
    blacklistedArmor: [],
    blacklistedArmorTypes: [],
    dontUseDecos: false,

    // search page
    searchedSkills: {},
    lastParams: {},
    paramStr: '',

    // saved sets page
    savedSets: [],

    // common
    showDecoSkillNames: false,
    showGroupSkillNames: false,
    updatedIds: undefined,

    // settings page
    hideSource: false,
    showAll: true,
    showExtra: false,
};

export const StorageProvider = ({ children }) => {
    const [fields, setFields] = useState(DEFAULTS);

    useEffect(() => {
        // honestly, should probably combine all these into one localStorage object
        const tempFields = {};
        for (const [fieldName, defaultValue] of Object.entries(DEFAULTS)) {
            tempFields[fieldName] = getFromLocalStorage(fieldName, defaultValue);
        }

        // handle getting skills from url
        const urlParams = new URLSearchParams(window.location.search);
        const skillsStr = urlParams.get('skills');
        let moddedSearch = false;
        if (skillsStr) {
            const skillsStrArr = skillsStr.split('_');
            tempFields.skills = Object.fromEntries(skillsStrArr.map(x => {
                const split = x.split("-");
                const id = parseInt(split[0], 10);
                const level = parseInt(split[1], 10);
                const name = Object.entries(SKILL_ID_MAP).filter(sk => sk[1] === id)[0]?.[0];

                return [name, level];
            }).filter(x => x[0]));
            urlParams.delete('skills');
            moddedSearch = true;
            saveToLocalStorage('skills', tempFields.skills);
        }

        // handle getting slot filters from url
        const sfStr = urlParams.get('sf');
        if (sfStr) {
            const slotFilterArr = sfStr.split('_');
            tempFields.slotFilters = Object.fromEntries(slotFilterArr.map(x => {
                const split = x.split("-");
                const slotSize = split[0];
                const amount = parseInt(split[1], 10);

                return [slotSize, amount];
            }).filter(x => x[0]));
            urlParams.delete('sf');
            moddedSearch = true;
            saveToLocalStorage('slotFilters', tempFields.slotFilters);
        }

        // update any deprecated saved set ids to new format
        if (!tempFields.updatedIds && tempFields.savedSets.length > 0) {
            for (const armor of tempFields.savedSets) {
                armor.id = stringToId(`${armor.armorNames.join(",")}_${armor.decoNames.join(",")}`);
            }
            updateMultipleFields({
                savedSets: tempFields.savedSets,
                updatedIds: true,
            });
            console.log("updated deprecated saved set ids");
        }

        // remove search string from url
        if (moddedSearch) {
            window.history.replaceState({}, document.title, window.location.pathname + urlParams);
        }
        setFields(tempFields);
    }, []);

    const updateField = (name, value) => {
        const tempFields = { ...fields };
        tempFields[name] = value;
        setFields(tempFields);
        saveToLocalStorage(name, value);
    };

    const updateMultipleFields = multiple => {
        const tempFields = {
            ...fields,
            ...multiple
        };
        setFields(tempFields);

        for (const [name, data] of Object.entries(multiple)) {
            saveToLocalStorage(name, data);
        }
    };

    const pinArmor = (name, type) => {
        const tempMandatory = [...fields.mandatoryArmor];
        let tempBlacklist = [...fields.blacklistedArmor];
        let tempTypeBlacklist = [...fields.blacklistedArmorTypes];

        if (name.toLowerCase() === "none") {
            const typeIndex = getArmorTypeList().indexOf(type);
            tempMandatory[typeIndex] = '';
            updateMultipleFields({
                mandatoryArmor: tempMandatory,
                blacklistedArmor: tempBlacklist,
                blacklistedArmorTypes: tempTypeBlacklist
            });
            return;
        }

        let notifyStr = ["Pinned ", ""];

        const alreaddyPinnedIndex = tempMandatory.indexOf(name);
        if (alreaddyPinnedIndex !== -1) {
            tempMandatory[alreaddyPinnedIndex] = '';
            notifyStr = ["Unpinned ", ''];
        } else {
            const typeIndex = getArmorTypeList().indexOf(type);
            tempMandatory[typeIndex] = name;

            // if a newly-mandated armor piece is in the blacklist, remove it
            if (tempBlacklist.includes(name)) {
                tempBlacklist = tempBlacklist.filter(x => x !== name);
            }

            // likewise, if a newly-mandated armor piece is type blacklisted, remove that restriction
            if (tempTypeBlacklist.includes(type)) {
                tempTypeBlacklist = tempTypeBlacklist.filter(x => x !== type);
            }
        }

        const bite = <span>{notifyStr[0]}<span style={{ color: 'skyblue' }}>{name}</span>{notifyStr[1]}</span>;
        const message = document.createElement('div');
        message.innerHTML = renderToStaticMarkup(bite);

        window.snackbar.createSnackbar(
            message, { timeout: 3000 }
        );

        updateMultipleFields({
            mandatoryArmor: tempMandatory,
            blacklistedArmor: tempBlacklist,
            blacklistedArmorTypes: tempTypeBlacklist
        });
    };

    const excludeArmor = name => {
        if (name.toLowerCase() === "none") { return; }
        let tempMandatory = [...fields.mandatoryArmor];
        let tempBlacklist = [...fields.blacklistedArmor];

        let notifyStr = ["Added ", " to "];
        if (tempBlacklist.includes(name)) {
            tempBlacklist = tempBlacklist.filter(x => x !== name);
            notifyStr = ["Removed ", ' from '];
        } else {
            tempBlacklist.push(name);

            // if a newly-blacklisted armor piece is in the mandatory list, remove it
            if (tempMandatory.includes(name)) {
                // eslint-disable-next-line no-confusing-arrow
                tempMandatory = tempMandatory.map(x => x === name ? '' : x);
            }
        }

        const bite = <span>
            {notifyStr[0]}<span style={{ color: 'crimson' }}>{name}</span>{`${notifyStr[1]} the blacklist`}
        </span>;
        const message = document.createElement('div');
        message.innerHTML = renderToStaticMarkup(bite);

        window.snackbar.createSnackbar(message, { timeout: 3000 });

        updateMultipleFields({
            mandatoryArmor: tempMandatory,
            blacklistedArmor: tempBlacklist
        });
    };

    const saveArmorSet = result => {
        if (!result) { return undefined; }
        let currentSets = getFromLocalStorage('savedSets') || [];
        const alreadyHas = currentSets.filter(x => x.id === result.id); // currentSets.filter(x => areArmorSetsEqual(result.armorNames, x.armorNames));

        if (alreadyHas.length > 0) {
            currentSets = currentSets.filter(x => x.id !== result.id); // currentSets.filter(x => !areArmorSetsEqual(result.armorNames, x.armorNames));
        } else {
            // const nextId = (currentSets[currentSets.length - 1]?.id || 1) + 1;
            currentSets.push({ ...result });
        }

        updateField('savedSets', currentSets);
        return currentSets;
    };

    return (
        <StorageContext.Provider value={{
            fields, updateField, updateMultipleFields,
            pinArmor, excludeArmor, saveArmorSet
        }}>
            {children}
        </StorageContext.Provider>
    );
};

export const useStorage = () => useContext(StorageContext);
