import { useState, useEffect } from "react";
import SkillsPicker from "../components/SkillsPicker";
import { searchAndSpeed } from "../util/logic";
import SKILLS from '../data/compact/skills.json';
import GROUP_SKILLS from '../data/compact/group-skills.json';
import SET_SKILLS from '../data/compact/set-skills.json';
import SKILLS_DB from '../data/skills/skills.json';
import SET_SKILLS_DB from '../data/skills/set-skills.json';
import GROUP_SKILLS_DB from '../data/skills/group-skills.json';
import { generateStyle, getMaxLevel, isGroupSkill, isSetSkill } from "../util/util";
import LinearProgress from '@mui/material/LinearProgress';
import ArrowRight from '@mui/icons-material/ArrowForwardIos';
import ArrowLeft from '@mui/icons-material/ArrowBackIos';
import Delete from '@mui/icons-material/DeleteForever';
import styled from "styled-components";
import { getSearchParameters, isEmpty } from "../util/tools";
import { Button } from "@mui/material";
import Results from "./Results";

const DEFAULT_DISPLAY_LIMIT = 500;

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
    const [setEffects, setSetEffects] = useState({});
    const [groupSkills, setGroupSkills] = useState({});
    const [decoInventory, setDecoInventory] = useState({});
    const [blacklistedArmor, setBlacklistedArmor] = useState(['', '', '', '', '', '']);
    const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);

    const [dontUseDecos, setDontUseDecos] = useState(false);
    const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);
    const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
    const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);

    const [results, setResults] = useState([]);
    const [elapsedSeconds, setElapsedSeconds] = useState(-1);

    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        // todo: load chosen skills from localStorage
    }, []);

    useEffect(() => {
        if (results) {
            setIsGenerating(false);
            console.log("results", results);
        }
    }, [results]);

    const getResults = () => {
        const justSkills = Object.fromEntries(
            Object.entries(skills).filter(x => SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justSetSkills = Object.fromEntries(
            Object.entries(skills).filter(x => SET_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );
        const justGroupSkills = Object.fromEntries(
            Object.entries(skills).filter(x => GROUP_SKILLS[x[0]]).map(x => [x[0], x[1]])
        );

        const cancel = isEmpty(justSkills) && isEmpty(justSetSkills) && isEmpty(justGroupSkills);
        if (cancel) {
            console.warn("Tried to get results with no skills");
            return;
        }

        setIsGenerating(true);
        const params = getSearchParameters({
            skills: justSkills,
            setSkills: justSetSkills,
            groupSkills: justGroupSkills,
        });
        console.log("PARAMS", params);
        setSearchedSkills(skills);
        setLastParams(params);
        const cache = searchAndSpeed(params);
        cache.then(ret => {
            setElapsedSeconds(ret.seconds);
            setResults(ret.results);
        });
    };

    const addSkill = (skillName, level) => {
        const tempSkills = { ...skills };
        tempSkills[skillName] = level || SKILLS[skillName] || 1;
        setSkills(tempSkills);
    };

    const removeSkill = skillName => {
        const tempSkills = { ...skills };
        delete tempSkills[skillName];
        setSkills(tempSkills);
    };

    const levelMod = (name, amount, maxLevel) => {
        const tSkills = { ...skills };
        const currentLevel = skills[name] || 0;
        tSkills[name] = currentLevel + amount;
        if (tSkills[name] > maxLevel || tSkills[name] === 0) {
            return;
        }

        setSkills(tSkills);
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

        const description = skill.description;
        const nameDiv = <div className={`skills-search-bubble-text`} style={{ marginRight: '4px' }}>
            {displayName}
        </div>;
        const iconImg = skillIcon ?
            <img className="skills-search-bubble-icon" src={`images/icons/${skillIcon}.png`} alt={skillIcon} /> :
            null;

        const bubbleDiv = <div className="skill-level-edit">
            {nameDiv}
            <ArrowL onClick={() => levelMod(skillName, -1, maxLevel)} style={ getArrowStyle(level > 1) } />
            {<div style={{ fontSize: '16px', marginLeft: '-3px' }}>{level}</div>}
            <ArrowR onClick={() => levelMod(skillName, 1, maxLevel)} style={ getArrowStyle(level < maxLevel) } />
            <DeleteIcon className="delete-icon" title="Remove skill" onClick={() => removeSkill(skillName)} />
        </div>;

        const gradientStyle = generateStyle("#6ba6fd");
        return <div className={`skills-search-bubble`} style={gradientStyle} key={skillName}
            title={description}>
            {iconImg}
            {bubbleDiv}
        </div>;
    };

    const renderChosenSkills = () => {
        const gradientStyle = generateStyle("#d14848");
        return <div className="chosen-skills">
            {Object.entries(skills).map(x => renderChosenSkill(x[0], x[1]))}
            {!isEmpty(skills) && <div className="skills-search-bubble clear-all" onClick={() => setSkills({})}
                style={gradientStyle}
                title="Clear all chosen skills">
                Clear All
            </div>}
        </div>;
    };

    return (
        <div className="search">
            {renderChosenSkills()}
            <SkillsPicker addSkill={addSkill}
                showGroupSkillNames={showGroupSkillNames}
                chosenSkillNames={Object.keys(skills)} />
            <div className="button-holder">
                <Button variant="contained" onClick={() => getResults()}>Search</Button>
                <Button variant="outlined">More Skills</Button>
            </div>
            {isGenerating && <LoadingBar />}
            <Results results={results} showDecoSkills={showDecoSkillNames}
                skills={searchedSkills} elapsedSeconds={elapsedSeconds} />
        </div>
    );
};

export default Search;
