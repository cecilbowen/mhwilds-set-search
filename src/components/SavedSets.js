import { useState, useEffect } from "react";
import Results from "./Results";
import { getFromLocalStorage, excludeArmor, pinArmor } from "../util/util";

const SavedSets = () => {
    const [mandatoryArmor, setMandatoryArmor] = useState(['', '', '', '', '', '']);
    const [blacklistedArmor, setBlacklistedArmor] = useState([]);
    const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);
    const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
    const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);
    const [savedSets, setSavedSets] = useState([]);

    useEffect(() => {
        const tempSets = getFromLocalStorage('savedSets');
        if (tempSets) {
            setSavedSets(tempSets);
        }

        const loadedMandatory = getFromLocalStorage('mandatoryArmor') || mandatoryArmor;
        const loadedShowDeco = getFromLocalStorage('showDecoSkillNames') ?? showDecoSkillNames;
        const loadedShowGroup = getFromLocalStorage('showGroupSkillNames') ?? showGroupSkillNames;
        const loadedBlacklist = getFromLocalStorage('blacklistedArmor') || blacklistedArmor;
        const loadedBlacklistTypes = getFromLocalStorage('blacklistedArmorTypes') || blacklistedArmorTypes;

        setMandatoryArmor(loadedMandatory);
        setBlacklistedArmor(loadedBlacklist);
        setBlacklistedArmorTypes(loadedBlacklistTypes);
        setShowDecoSkillNames(loadedShowDeco);
        setShowGroupSkillNames(loadedShowGroup);
    }, []);

    // pins/unpins armor
    const pin = (name, type) => {
        const mm = pinArmor(name, type);
        if (!mm) { return; }

        setMandatoryArmor(mm.mandatoryArmor);
        setBlacklistedArmor(mm.blacklistedArmor);
        setBlacklistedArmorTypes(mm.blacklistedArmorTypes);
    };

    const exclude = name => {
        const mm = excludeArmor(name);
        if (!mm) { return; }
        setBlacklistedArmor(mm.blacklistedArmor);
        setMandatoryArmor(mm.mandatoryArmor);
    };

    const refreshSavedSets = () => {
        const newSavedSets = getFromLocalStorage('savedSets');

        if (newSavedSets) {
            setSavedSets(newSavedSets);
        }
    };

    return (
        <div className="saved-sets">
            <Results results={savedSets} showDecoSkills={showDecoSkillNames} showGroupSkills={showGroupSkillNames}
                pin={pin} exclude={exclude} save
                mandatoryArmor={mandatoryArmor} blacklistedArmor={blacklistedArmor}
                savedSets={savedSets} setShowDecos={x => setShowDecoSkillNames(x)}
                onSaveSet={refreshSavedSets}
                blacklistedArmorTypes={blacklistedArmorTypes} />
        </div>
    );
};

export default SavedSets;
