import { useState, useEffect, useRef } from "react";
import SkillsPicker from "../components/SkillsPicker";
import { freeOne, freeThree, freeTwo, moreAndSpeed, searchAndSpeed } from "../util/logic";
import SKILLS from '../data/compact/skills.json';
import GROUP_SKILLS from '../data/compact/group-skills.json';
import SET_SKILLS from '../data/compact/set-skills.json';
import SKILLS_DB from '../data/skills/skills.json';
import SET_SKILLS_DB from '../data/skills/set-skills.json';
import GROUP_SKILLS_DB from '../data/skills/group-skills.json';
import {
    excludeArmor, generateStyle,
    generateWikiString,
    getFromLocalStorage, getMaxLevel, getSkillPopup, isGroupSkill, isSetSkill, pinArmor, saveToLocalStorage
} from "../util/util";
import LinearProgress from '@mui/material/LinearProgress';
import ArrowRight from '@mui/icons-material/ArrowForwardIos';
import ArrowLeft from '@mui/icons-material/ArrowBackIos';
import Delete from '@mui/icons-material/DeleteForever';
import styled from "styled-components";
import { getSearchParameters, isEmpty } from "../util/tools";
import { Button } from "@mui/material";
import Results from "./Results";
import { DEBUG } from "../util/constants";

const ArrowL = styled(ArrowLeft)`
    width: 16px !important;
`;
const ArrowR = styled(ArrowRight)`
    width: 16px !important;
`;
const DeleteIcon = styled(Delete)`
    color: crimson;
    width: 20px;
`;

const LoadingBar = styled(LinearProgress)`
    margin-top: 1em;
`;

const Search = () => {
    const [skills, setSkills] = useState({});
    const [searchedSkills, setSearchedSkills] = useState({});
    const [lastParams, setLastParams] = useState(); // parameters used to get the most recent search results
    const [decoInventory, setDecoInventory] = useState({});
    const [mandatoryArmor, setMandatoryArmor] = useState(['', '', '', '', '', '']);
    const [blacklistedArmor, setBlacklistedArmor] = useState([]);
    const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);

    const [dontUseDecos, setDontUseDecos] = useState(false);
    const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
    const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);

    const [results, setResults] = useState([]);
    const [moreResults, setMoreResults] = useState({}); // skill name: level
    const [showMore, setShowMore] = useState(false);
    const cancelledRef = useRef(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(-1);
    const [loadProgress, setLoadProgress] = useState(0);

    const [slotFilters, setSlotFilters] = useState({});

    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        const loadedParams = getFromLocalStorage('lastParams') || lastParams;
        const loadedSkills = getFromLocalStorage('skills') || skills;
        const loadedSlotFilters = getFromLocalStorage('slotFilters') || slotFilters;
        const loadedSearchedSkills = getFromLocalStorage('searchedSkills') || searchedSkills;
        const loadedDecoInventory = getFromLocalStorage('decoInventory') || decoInventory;
        const loadedMandatory = getFromLocalStorage('mandatoryArmor') || mandatoryArmor;
        const loadedBlacklist = getFromLocalStorage('blacklistedArmor') || blacklistedArmor;
        const loadedBlacklistTypes = getFromLocalStorage('blacklistedArmorTypes') || blacklistedArmorTypes;
        const loadedDontUseDecos = getFromLocalStorage('dontUseDecos') || dontUseDecos;
        const loadedShowDeco = getFromLocalStorage('showDecoSkillNames') ?? showDecoSkillNames;
        const loadedShowGroup = getFromLocalStorage('showGroupSkillNames') ?? showGroupSkillNames;

        setLastParams(loadedParams);
        setSkills(loadedSkills);
        setSlotFilters(loadedSlotFilters);
        setSearchedSkills(loadedSearchedSkills);
        setDecoInventory(loadedDecoInventory);
        setMandatoryArmor(loadedMandatory);
        setBlacklistedArmor(loadedBlacklist);
        setBlacklistedArmorTypes(loadedBlacklistTypes);
        setDontUseDecos(loadedDontUseDecos);
        setShowDecoSkillNames(loadedShowDeco);
        setShowGroupSkillNames(loadedShowGroup);
    }, []);

    useEffect(() => {
        if (!isEmpty(moreResults)) {
            setShowMore(true);
            setResults([]);
        }
    }, [moreResults]);

    useEffect(() => {
        if (!isGenerating) {
            setLoadProgress(0);
        }
    }, [isGenerating]);

    const local = (name, data) => {
        const storageMap = {
            lastParams: lastParams,
            loadedSkills: skills,
            searchedSkills: searchedSkills,
            decoInventory: decoInventory,
            mandatoryArmor: mandatoryArmor,
            blacklistedArmor: blacklistedArmor,
            blacklistedArmorTypes: blacklistedArmorTypes,
            dontUseDecos: dontUseDecos,
            showDecoSkillNames: showDecoSkillNames,
            showGroupSkillNames: showGroupSkillNames
        };
        saveToLocalStorage(name, data || storageMap[name]);
    };

    const addMoreSkill = (name, level) => {
        setMoreResults(prev => {
            const tMore = { ...prev };
            tMore[name] = level;
            return tMore;
        });
    };

    const prepareSearch = () => {
        setElapsedSeconds(-1);
        setMoreResults({});
        setIsGenerating(true);

        cancelledRef.current = false;
        const justSkills = Object.fromEntries(
            Object.entries(skills).filter(x => SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justSetSkills = Object.fromEntries(
            Object.entries(skills).filter(x => SET_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justGroupSkills = Object.fromEntries(
            Object.entries(skills).filter(x => GROUP_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );

        if (DEBUG) {
            const wiki = generateWikiString(
                justSkills, justSetSkills, justGroupSkills,
                slotFilters
            );

            console.log(`https://mhwilds.wiki-db.com/sim/#skills=${wiki}&fee=1`);
        }

        const params = getSearchParameters({
            skills: justSkills,
            setSkills: justSetSkills,
            groupSkills: justGroupSkills,
            slotFilters: slotFilters,
            blacklistedArmor,
            blacklistedArmorTypes,
            mandatoryArmor,
            decoMods: decoInventory,
            cancelToken: cancelledRef
        });

        return params;
    };

    const getResults = () => {
        const params = prepareSearch();

        // check if we search is a repeat from last search
        const paramStr = [
            Object.entries(skills).map(x => `${x[0]}-${x[1]}`).sort().join("."),
            Object.entries(params.slotFilters).map(x => `${x[0]}-${x[1]}`).sort().join("."),
            [...params.blacklistedArmor].sort().join("."),
            [...params.blacklistedArmorTypes].sort().join("."),
            [...params.mandatoryArmor].sort().join("."),
            Object.entries(params.decoMods).map(x => `${x[0]}-${x[1]}`).sort().join(".")
        ].join(",");
        const fromTheSto = JSON.parse(localStorage.getItem('paramStr') || '');
        const same = paramStr === fromTheSto || false;
        local('paramStr', paramStr);

        setShowMore(false);
        setSearchedSkills(skills);
        setLastParams(params);
        local('lastParams', params);
        local('searchedSkills', skills);
        // console.log('params', params);
        const cache = searchAndSpeed(params, same);
        cache.then(ret => {
            setElapsedSeconds(ret.seconds);
            setResults(ret.results);
            setIsGenerating(false);
        }).catch(err => {
            console.error("Error during searchAndSpeed:", err);
        });
    };

    const getMoreSkills = () => {
        const params = prepareSearch();
        params.priorResults = results;
        params.exhaustive = true;
        params.updateProgressFunc = setLoadProgress;
        params.addMoreFunc = addMoreSkill;

        const cache = moreAndSpeed(params);
        cache.then(ret => {
            setElapsedSeconds(ret.seconds);
            setMoreResults(ret.results);
            setIsGenerating(false);
        });
    };

    const addSkill = (skillName, level) => {
        const tempSkills = { ...skills };
        tempSkills[skillName] = level || SKILLS[skillName] || 1;
        setSkills(tempSkills);
        local('skills', tempSkills);
    };

    const addSlotFilter = (slot, level = 1) => {
        const tempSlotFilters = { ...slotFilters };
        tempSlotFilters[slot] = level;
        setSlotFilters(tempSlotFilters);
        local('slotFilters', tempSlotFilters);
    };

    const removeSkill = skillName => {
        const tempSkills = { ...skills };
        delete tempSkills[skillName];
        setSkills(tempSkills);
        local('skills', tempSkills);
    };

    const removeSlot = slotSize => {
        const tempSlots = { ...slotFilters };
        delete tempSlots[slotSize];
        setSlotFilters(tempSlots);
        local('slotFilters', tempSlots);
    };

    const levelMod = (name, amount, maxLevel) => {
        const tSkills = { ...skills };
        const currentLevel = skills[name] || 0;
        tSkills[name] = currentLevel + amount;
        if (tSkills[name] > maxLevel || tSkills[name] === 0) {
            return;
        }

        setSkills(tSkills);
        local('skills', tSkills);
    };

    const slotLevelMod = (size, amount) => {
        const maxAmountOfSlots = 18; // 3 per armor piece (not that we currently have armor that can reach this)
        const tSlots = { ...slotFilters };
        const currentLevel = tSlots[size] || 0;
        tSlots[size] = currentLevel + amount;
        if (tSlots[size] > maxAmountOfSlots || tSlots[size] === 0) {
            return;
        }

        setSlotFilters(tSlots);
        local('slotFilters', tSlots);
    };

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

    const getArrowStyle = condition => {
        return condition ? {} : { opacity: 0.5 };
    };

    const renderChosenSkill = (skillName, level) => {
        const skill = SKILLS_DB.filter(x => x.name === skillName)[0] ||
            SET_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0] ||
            GROUP_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0];
        let skillIcon = skill.icon;
        const isASetSkill = isSetSkill(skill);
        const isAGroupSkill = isGroupSkill(skill);
        if (!skillIcon) {
            skillIcon = isASetSkill ? 'set' : 'group';
        }

        const maxLevel = getMaxLevel(skillName);
        let displayName = skillName;
        if (showGroupSkillNames && (isAGroupSkill || isASetSkill)) {
            displayName = skill.skill;
        }

        const description = getSkillPopup(skill);
        const nameDiv = <div className={`skills-search-bubble-text`} style={{ marginRight: '4px' }}>
            {displayName}
        </div>;
        const iconImg = skillIcon ?
            <img className="skills-search-bubble-icon" src={`images/icons/${skillIcon}.png`} alt={skillIcon} /> :
            null;

        const bubbleDiv = <div className="skill-level-edit">
            {nameDiv}
            <ArrowL onClick={() => levelMod(skillName, -1, maxLevel)} style={getArrowStyle(level > 1)} />
            {<div style={{ fontSize: '16px', marginLeft: '-3px' }}>{level}</div>}
            <ArrowR onClick={() => levelMod(skillName, 1, maxLevel)} style={getArrowStyle(level < maxLevel)} />
            <DeleteIcon className="delete-icon" title="Remove skill" onClick={() => removeSkill(skillName)} />
        </div>;

        const gradientStyle = generateStyle("#6ba6fd");
        return <div className={`skills-search-bubble skill-gradient`} style={gradientStyle} key={skillName}
            title={description}>
            {iconImg}
            {bubbleDiv}
        </div>;
    };

    const renderSlotFilters = () => {
        const gradientStyle = generateStyle("#c5abc5");

        return <div className="chosen-slot-filters">
            {Object.entries(slotFilters).map(x => {
                const slotSize = x[0];
                const amount = x[1];

                return <div className={`skills-search-bubble slot-filter slot-gradient`} style={gradientStyle} key={slotSize}
                    title={`Specify how many ${slotSize} slot decos you want to be able to fit into the free slots`}>
                    <img className="skills-search-bubble-icon darken" src={`images/slot${slotSize}.png`} alt={slotSize} />
                    <div className="skill-level-edit">
                        <div className={`skills-search-bubble-text`}>
                            {`${slotSize} Slot Deco Filter`}
                        </div>
                        <ArrowL onClick={() => slotLevelMod(slotSize, -1)} style={getArrowStyle(amount > 1)} />
                        {<div style={{ fontSize: '16px', marginLeft: '-3px' }}>{amount}</div>}
                        <ArrowR onClick={() => slotLevelMod(slotSize, 1)} style={getArrowStyle(amount < 18)} />
                        <DeleteIcon className="delete-icon" title="Remove skill" onClick={() => removeSlot(slotSize)} />
                    </div>
                </div>;
            })}
        </div>;
    };

    const renderChosenSkills = () => {
        const gradientStyle = generateStyle("#d14848");
        return <div className="chosen-skills">
            {!isEmpty(slotFilters) && renderSlotFilters()}
            {Object.entries(skills).map(x => renderChosenSkill(x[0], x[1]))}
            {(!isEmpty(skills) || !isEmpty(slotFilters)) &&
            <div className="skills-search-bubble clear-all clear-gradient" onClick={() => {
                setSkills({});
                setSlotFilters({});
                local('skills', {});
                local('slotFilters', {});
            }}
                style={gradientStyle}
                title="Clear all chosen skills">
                Clear All
            </div>}
        </div>;
    };

    const renderMoreResults = () => {
        const time = elapsedSeconds > -1 ? `(${elapsedSeconds.toFixed(2)} seconds)` : '';

        const displayStr = isEmpty(moreResults) ? `No more skills can be added to your search ${time}.` :
            `Showing skills with the max levels of each that can be added to your search ` +
            `parameters and still return results ${time}:`;

        const freeSlots = {};
        if (freeThree) { freeSlots[3] = freeThree; }
        if (freeTwo) { freeSlots[2] = freeTwo; }
        if (freeOne) { freeSlots[1] = freeOne; }

        return <div className="more-results">
            <div style={{ marginTop: '1em', marginBottom: '0.5em' }}>{displayStr}</div>
            <div className="more-skills">
                {!isEmpty(freeSlots) && <div className="chosen-slot-filters">
                    {Object.entries(freeSlots).map(x => {
                        const gradientStyle = generateStyle("#c5abc5");
                        const slotSize = x[0];
                        const amount = x[1];

                        return <div className={`skills-search-bubble slot-filter more slot-gradient`}
                            style={gradientStyle} key={slotSize} onClick={() => addSlotFilter(slotSize, amount)}
                            title={`Specify how many ${slotSize} slot decos you want to be able to fit into the free slots`}>
                            <img className="skills-search-bubble-icon" src={`images/slot${slotSize}.png`} alt={slotSize} />
                            <div className="skill-level-edit">
                                <div className={`skills-search-bubble-text`}>
                                    {`${slotSize} Slot Deco Filter`}
                                </div>
                                {<div style={{ fontSize: '16px', marginLeft: '0px', fontWeight: 'bold' }}>{amount}</div>}
                            </div>
                        </div>;
                    })}
                </div>}
                {Object.entries(moreResults).map(sk => {
                    const skillName = sk[0];
                    const maxLevel = sk[1];

                    const skill = SKILLS_DB.filter(x => x.name === skillName)[0] ||
                        SET_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0] ||
                        GROUP_SKILLS_DB.filter(x => x.name === skillName || x.skill === skillName)[0];
                    let skillIcon = skill.icon;
                    const isASetSkill = isSetSkill(skill);
                    const isAGroupSkill = isGroupSkill(skill);
                    if (!skillIcon) {
                        skillIcon = isASetSkill ? 'set' : 'group';
                    }

                    let displayName = skillName;
                    if (showGroupSkillNames && (isAGroupSkill || isASetSkill)) {
                        displayName = skill.skill;
                    }

                    const description = getSkillPopup(skill);
                    const nameDiv = <div className={`skills-search-bubble-text`} style={{ marginRight: '4px' }}>
                        {displayName}
                    </div>;
                    const iconImg = skillIcon ?
                        <img className="skills-search-bubble-icon" src={`images/icons/${skillIcon}.png`} alt={skillIcon} /> :
                        null;

                    const bubbleDiv = <div className="skill-level-edit">
                        {nameDiv}
                        {<div style={{ fontSize: '16px', marginLeft: '-3px', fontWeight: 'bold' }}>{maxLevel}</div>}
                    </div>;

                    const gradientStyle = generateStyle("#b4dff1");
                    return <div className={`skills-search-bubble more skill-gradient`}
                        onClick={() => addSkill(skillName, maxLevel)}
                        style={gradientStyle} key={skillName}
                        title={description}>
                        {iconImg}
                        {bubbleDiv}
                    </div>;
                })}
            </div>
        </div>;
    };

    return (
        <div className="search">
            {renderChosenSkills()}
            <SkillsPicker addSkill={addSkill} addSlotFilter={addSlotFilter}
                showGroupSkillNames={showGroupSkillNames}
                chosenSkillNames={Object.keys(skills)} />
            <div className="button-holder">
                <Button variant="contained" disabled={isGenerating} onClick={() => getResults()}>Search</Button>
                <Button variant="outlined" disabled={isGenerating} onClick={() => getMoreSkills()}>More Skills</Button>
                {isGenerating && <Button sx={{ cursor: 'pointer' }} variant="outlined" color="error" onClick={() => {
                    cancelledRef.current = true;
                }}>Cancel</Button>}
            </div>
            {isGenerating && <LoadingBar className="loading-bar" value={loadProgress}
                variant={loadProgress ? 'determinate' : 'indeterminate'} />}
            {!showMore && <Results results={results} showDecoSkills={showDecoSkillNames}
                showGroupSkills={showGroupSkillNames} setShowDecos={x => setShowDecoSkillNames(x)}
                pin={pin} exclude={exclude} slotFilters={slotFilters}
                mandatoryArmor={mandatoryArmor} blacklistedArmor={blacklistedArmor}
                blacklistedArmorTypes={blacklistedArmorTypes}
                skills={searchedSkills} elapsedSeconds={elapsedSeconds} />}
            {showMore && renderMoreResults()}
        </div>
    );
};

export default Search;
