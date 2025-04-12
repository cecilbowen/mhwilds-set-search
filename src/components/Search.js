import { useState, useEffect, useRef } from "react";
import SkillsPicker from "../components/SkillsPicker";
import { freeOne, freeThree, freeTwo, moreAndSpeed, searchAndSpeed } from "../util/logic";
import SKILLS from '../data/compact/skills.json';
import GROUP_SKILLS from '../data/compact/group-skills.json';
import SET_SKILLS from '../data/compact/set-skills.json';
import SKILLS_DB from '../data/detailed/skills.json';
import SET_SKILLS_DB from '../data/detailed/set-skills.json';
import GROUP_SKILLS_DB from '../data/detailed/group-skills.json';
import {
    getSearchUrl, generateStyle,
    generateWikiString, getMaxLevel, getSkillPopup,
    isGroupSkill, isSetSkill,
    copyTextToClipboard
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
import { useStorage } from "../hooks/StorageContext";

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
    const { fields, updateField, updateMultipleFields } = useStorage();
    const [results, setResults] = useState([]);
    const [moreResults, setMoreResults] = useState({}); // skill name: level
    const [showMore, setShowMore] = useState(false);
    const cancelledRef = useRef(false);
    const [elapsedSeconds, setElapsedSeconds] = useState(-1);
    const [loadProgress, setLoadProgress] = useState(0);

    const [isGenerating, setIsGenerating] = useState(false);

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

    const addMoreSkill = (name, level) => {
        if (level <= 0 || (fields.skills[name] || 0) >= level) {
            return;
        }

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
            Object.entries(fields.skills).filter(x => SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justSetSkills = Object.fromEntries(
            Object.entries(fields.skills).filter(x => SET_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justGroupSkills = Object.fromEntries(
            Object.entries(fields.skills).filter(x => GROUP_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );

        if (DEBUG) {
            const wiki = generateWikiString(
                justSkills, justSetSkills, justGroupSkills,
                fields.slotFilters
            );

            console.log(`https://mhwilds.wiki-db.com/sim/#skills=${wiki}&fee=1`);
        }

        const params = getSearchParameters({
            skills: justSkills,
            setSkills: justSetSkills,
            groupSkills: justGroupSkills,
            slotFilters: fields.slotFilters,
            mandatoryArmor: fields.mandatoryArmor,
            blacklistedArmor: fields.blacklistedArmor,
            blacklistedArmorTypes: fields.blacklistedArmorTypes,
            decoMods: fields.decoInventory,
            cancelToken: cancelledRef
        });

        return params;
    };

    const getResults = event => {
        if (event.ctrlKey) {
            const url = getSearchUrl(fields.skills, fields.slotFilters);
            copyTextToClipboard(url, () => {
                window.snackbar.createSnackbar(`Copied search url to the clipboard`, {
                    timeout: 3000
                });
            });
            return;
        }

        const params = prepareSearch();

        // check if we search is a repeat from last search
        const paramStr = [
            Object.entries(fields.skills).map(x => `${x[0]}-${x[1]}`).sort().join("."),
            Object.entries(params.slotFilters).map(x => `${x[0]}-${x[1]}`).sort().join("."),
            [...params.blacklistedArmor].sort().join("."),
            [...params.blacklistedArmorTypes].sort().join("."),
            [...params.mandatoryArmor].sort().join("."),
            Object.entries(params.decoMods).map(x => `${x[0]}-${x[1]}`).sort().join(".")
        ].join(",");
        let fromTheSto = localStorage.getItem('paramStr');
        if (fromTheSto) {
            fromTheSto = JSON.parse(fromTheSto);
        }
        const same = paramStr === fromTheSto || false;
        updateField('paramStr', paramStr);

        setShowMore(false);
        updateField('searchedSkills', fields.skills);
        updateField('lastParams', params);
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
            // setMoreResults(ret.results);
            setIsGenerating(false);
        });
    };

    const addSkill = (skillName, level) => {
        const tempSkills = { ...fields.skills };
        tempSkills[skillName] = level || SKILLS[skillName] || 1;
        updateField('skills', tempSkills);
    };

    const addSlotFilter = (slot, level = 1) => {
        const tempSlotFilters = { ...fields.slotFilters };
        tempSlotFilters[slot] = level;
        updateField('slotFilters', tempSlotFilters);
    };

    const removeSkill = skillName => {
        const tempSkills = { ...fields.skills };
        delete tempSkills[skillName];
        updateField('skills', tempSkills);
    };

    const removeSlot = slotSize => {
        const tempSlots = { ...fields.slotFilters };
        delete tempSlots[slotSize];
        updateField('slotFilters', tempSlots);
    };

    const levelMod = (name, amount, maxLevel) => {
        const tSkills = { ...fields.skills };
        const currentLevel = fields.skills[name] || 0;
        tSkills[name] = currentLevel + amount;
        if (tSkills[name] > maxLevel || tSkills[name] === 0) {
            return;
        }

        updateField('skills', tSkills);
    };

    const slotLevelMod = (size, amount) => {
        const maxAmountOfSlots = 18; // 3 per armor piece (not that we currently have armor that can reach this)
        const tSlots = { ...fields.slotFilters };
        const currentLevel = tSlots[size] || 0;
        tSlots[size] = currentLevel + amount;
        if (tSlots[size] > maxAmountOfSlots || tSlots[size] === 0) {
            return;
        }

        updateField('slotFilters', tSlots);
    };

    const getArrowStyle = condition => {
        return condition ? {} : { opacity: 0.5 };
    };

    const renderChosenSkill = (skillName, level) => {
        const skill = SKILLS_DB[skillName] ||
            SET_SKILLS_DB[skillName] ||
            GROUP_SKILLS_DB[skillName];
        let skillIcon = skill.icon;
        const isASetSkill = isSetSkill(skill);
        const isAGroupSkill = isGroupSkill(skill);
        if (!skillIcon) {
            skillIcon = isASetSkill ? 'set' : 'group';
        }

        const maxLevel = getMaxLevel(skillName);
        let displayName = skillName;
        if (fields.showGroupSkillNames && (isAGroupSkill || isASetSkill)) {
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
            {Object.entries(fields.slotFilters).map(x => {
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
            {!isEmpty(fields.slotFilters) && renderSlotFilters()}
            {Object.entries(fields.skills).map(x => renderChosenSkill(x[0], x[1]))}
            {(!isEmpty(fields.skills) || !isEmpty(fields.slotFilters)) &&
                <div className="skills-search-bubble clear-all clear-gradient" onClick={() => {
                    updateMultipleFields({
                        skills: {},
                        slotFilters: {}
                    });
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

                    const skill = SKILLS_DB[skillName] ||
                        SET_SKILLS_DB[skillName] ||
                        GROUP_SKILLS_DB[skillName];
                    let skillIcon = skill.icon;
                    const isASetSkill = isSetSkill(skill);
                    const isAGroupSkill = isGroupSkill(skill);
                    if (!skillIcon) {
                        skillIcon = isASetSkill ? 'set' : 'group';
                    }

                    let displayName = skillName;
                    if (fields.showGroupSkillNames && (isAGroupSkill || isASetSkill)) {
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
                showGroupSkillNames={fields.showGroupSkillNames}
                chosenSkillNames={Object.keys(fields.skills)} />
            <div className="button-holder">
                <Button variant="contained" disabled={isGenerating} onClick={getResults}>Search</Button>
                <Button variant="outlined" disabled={isGenerating} onClick={() => getMoreSkills()}>More Skills</Button>
                {isGenerating && <Button sx={{ cursor: 'pointer' }} variant="outlined" color="error" onClick={() => {
                    cancelledRef.current = true;
                }}>Cancel</Button>}
            </div>
            {isGenerating && <LoadingBar className="loading-bar" value={loadProgress}
                variant={loadProgress ? 'determinate' : 'indeterminate'} />}
            {!showMore && <Results results={results} elapsedSeconds={elapsedSeconds} />}
            {showMore && renderMoreResults()}
        </div>
    );
};

export default Search;
