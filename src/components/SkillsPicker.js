import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import SKILLS from '../data/detailed/skills.json';
import SET_SKILLS from '../data/detailed/set-skills.json';
import GROUP_SKILLS from '../data/detailed/group-skills.json';
import TextField from '@mui/material/TextField';
import { getSkillPopup, isGroupSkill, isSetSkill } from '../util/util';
import Image from '@mui/icons-material/Image';
import HideImage from '@mui/icons-material/HideImage';
import Expand from '@mui/icons-material/Expand';
import Minimize from '@mui/icons-material/CloseFullscreen';
import styled from 'styled-components';
import { IconButton } from '@mui/material';
import INTERNAL_BLACKLIST from '../data/internal-blacklist.json';

const ImageIcon = styled(Image)`
    width: 24px;
    color: blueviolet;
`;
const AntiImageIcon = styled(HideImage)`
    width: 24px;
    color: sienna;
`;
const ExpandIcon = styled(Expand)`
    width: 24px;
    color: black;
`;
const MinimizeIcon = styled(Minimize)`
    width: 24px;
    color: black;
`;

const INTERNAL_BLACKMAP = Object.fromEntries(INTERNAL_BLACKLIST.map(x => [x, true]));

const SkillsPicker = ({ addSkill, addSlotFilter, showGroupSkillNames, chosenSkillNames }) => {
    const [searchText, setSearchText] = useState('');
    const [foundSkillNames, setFoundSkillNames] = useState([]);
    const [allSkills, setAllSkills] = useState([]);
    const [showIcons, setShowIcons] = useState(true);
    const [hideBlur, setHideBlur] = useState(false);
    const [expanded, setExpanded] = useState(true);

    const combinedSkills = () => {
        const combo = Object.entries({ ...SKILLS, ...SET_SKILLS, ...GROUP_SKILLS })
            .filter(x => !INTERNAL_BLACKMAP[x[0]] && (!x[1].type || x[1].type === "armor")).map(y => {
            const x = y[1];
            const isAGroupSkill = isGroupSkill(x);
            const isASetSkill = isSetSkill(x);

            let iconName = x.icon;
            const name = y[0];
            let displayName = name;
            if (isAGroupSkill || isASetSkill) {
                iconName = isAGroupSkill ? "group" : "set";
                if (showGroupSkillNames) {
                    displayName = x.skill;
                }
            }

            return {
                name,
                displayName,
                groupSkill: x.skill,
                description: x.description,
                levels: x.levels,
                maxLevel: x.levels?.length || 1,
                icon: iconName
            };
        }).sort((a, b) => a.displayName - b.displayName);
        return combo;
    };

    useEffect(() => {
        const all = combinedSkills();
        setAllSkills(all);
    }, [showGroupSkillNames]);

    useEffect(() => {
        const all = combinedSkills();

        if (searchText) {
            const foundSkills = all.filter(x => x.displayName.toLowerCase().includes(searchText.toLowerCase()));
            const foundNames = new Set(foundSkills.map(x => x.displayName.toLowerCase()).sort());
            setFoundSkillNames(Array.from(foundNames));

            all.sort((a, b) => {
                const aFound = foundNames.has(a.displayName.toLowerCase()) ? -1 : 1;
                const bFound = foundNames.has(b.displayName.toLowerCase()) ? -1 : 1;

                return aFound - bFound || a.displayName.localeCompare(b.displayName);
            });
        }

        const scroller = document.getElementById('skills-search');
        if (scroller) {
            scroller.scrollTop = 0;
        }
        setAllSkills(all);
    }, [searchText]);

    const renderSkills = skills => {
        const chosen = (chosenSkillNames || []).map(x => x.toLowerCase());
        return skills.filter(x => !chosen.includes(x.name.toLowerCase())).map(renderSkill);
    };

    const renderSkill = skill => {
        const highlighted = searchText ? foundSkillNames.includes(skill.displayName.toLowerCase()) : false;
        const blurred = searchText ? !foundSkillNames.includes(skill.displayName.toLowerCase()) : false;
        const highlightClass = highlighted ? "highlighted" : "";
        const whichBlur = hideBlur ? "blurred-gone" : "blurred";
        const blurredClass = blurred ? whichBlur : "";
        const description = getSkillPopup(skill.name);
        const nameDiv = <div className={`skills-search-bubble-text ${highlightClass}-text`}>
            {skill.displayName}
        </div>;
        const iconImg = skill.icon ?
            <img className="skills-search-bubble-icon" src={`images/icons/${skill.icon}.png`} alt={skill.icon} /> :
            null;

        return <div className={`skills-search-bubble underline ${highlightClass} ${blurredClass}`}
            title={description} onClick={() => addSkill(skill.name)} key={skill.name}>
            {showIcons && iconImg}
            {nameDiv}
        </div>;
    };

    return <div className="skills-picker">
        <div style={{ display: "flex", gap: '8px' }}>
            <TextField id="skill-name-search" label="Search Skills" variant="outlined" size="small"
                className="skills-search-textfield" autoFocus
                onChange={ev => setSearchText(ev.target.value)} value={searchText} />
            {showIcons && <IconButton title="Hide Icons" onClick={() => setShowIcons(!showIcons)}><AntiImageIcon /></IconButton>}
            {!showIcons && <IconButton title="Show Icons" onClick={() => setShowIcons(!showIcons)}>
                <ImageIcon className="image-icon" /></IconButton>}
            {!expanded && <IconButton title="Expand Skills Box" onClick={() => setExpanded(!expanded)}><ExpandIcon /></IconButton>}
            {expanded && <IconButton title="Minimize Skills Box"
                onClick={() => setExpanded(!expanded)}><MinimizeIcon /></IconButton>}
        </div>

        <div id="skills-search" className={expanded ? "skills-search" : "skills-search-mini"}>
            {renderSkills(allSkills)}
            <div className="slots-filter">
                {[1, 2, 3].map(x => {
                    const highlighted = searchText && `${x} slot deco filter`.includes(searchText.toLowerCase());
                    const highlightClass = highlighted ? "highlighted" : "";
                    const blurred = searchText && !highlighted;
                    const whichBlur = hideBlur ? "blurred-gone" : "blurred";
                    const blurredClass = blurred ? whichBlur : "";

                    return <div key={`slot-filter-${x}`}
                        className={`skills-search-bubble underline ${highlightClass} ${blurredClass} slot-filter`}
                        title={`Specify how many ${x} slot decos you want to be able to fit into the free slots`}
                        onClick={() => addSlotFilter(x)}>
                        {showIcons && <img
                            className="skills-search-bubble-icon" src={`images/slot${x}.png`} alt={x} />}
                        <div className={`skills-search-bubble-text`}>
                            {`${x} Slot Deco Filter`}
                        </div>
                    </div>;
                })}
            </div>
        </div>
    </div>;
};
SkillsPicker.propTypes = {
    addSkill: PropTypes.func.isRequired,
    addSlotFilter: PropTypes.func.isRequired,
    showGroupSkillNames: PropTypes.bool,
    chosenSkillNames: PropTypes.array,
};
export default SkillsPicker;
