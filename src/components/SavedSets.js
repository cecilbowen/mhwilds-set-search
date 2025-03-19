import { useState, useEffect } from "react";
import Results from "./Results";
import { getFromLocalStorage, excludeArmor, pinArmor, saveArmorSet } from "../util/util";

const DEFAULT_DISPLAY_LIMIT = 500;

const SavedSets = () => {
    const [skills, setSkills] = useState({});
    const [setEffects, setSetEffects] = useState({});
    const [groupSkills, setGroupSkills] = useState({});
    const [decoInventory, setDecoInventory] = useState({});
    const [mandatoryArmor, setMandatoryArmor] = useState(['', '', '', '', '', '']);
    const [blacklistedArmor, setBlacklistedArmor] = useState([]);
    const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);

    const [dontUseDecos, setDontUseDecos] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);
    const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
    const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);
    const [tab, setTab] = useState(0);

    const [savedSets, setSavedSets] = useState([]);

    useEffect(() => {
        // chicken
        const tempSets = getFromLocalStorage('savedSets');
        if (tempSets) {
            setSavedSets(tempSets);
        }
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
            <Results results={savedSets} showDecoSkills={showDecoSkillNames}
                pin={pin} exclude={exclude} save
                mandatoryArmor={mandatoryArmor} blacklistedArmor={blacklistedArmor}
                savedSets={savedSets}
                onSaveSet={refreshSavedSets}
                blacklistedArmorTypes={blacklistedArmorTypes} />
        </div>
    );
};

export default SavedSets;
