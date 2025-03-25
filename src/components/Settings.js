import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import {
    armorNameFormat,
    excludeArmor,
    getArmorTypeList, getFromLocalStorage,
    isArmorOfType,
    pinArmor,
    saveToLocalStorage
} from '../util/util';
import { Autocomplete, Button, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
import ArmorSvgWrapper from './ArmorSvgWrapper';
import Unpin from '@mui/icons-material/PushPinOutlined';
import Undo from '@mui/icons-material/Undo';
import Remove from '@mui/icons-material/Remove';
import { iconCommon } from './Results';
import styled from 'styled-components';
import Divider from '@mui/material/Divider';
import PropTypes from 'prop-types';
import { getJsonFromType } from '../util/tools';

const UnpinIcon = styled(Unpin)`
    ${iconCommon}
    transform: translateY(0px);
    color: blue;
`;

const RemoveIcon = styled(Remove)`
    ${iconCommon}
    transform: translateY(0px);
    color: crimson;
`;

const UndoExcludeIcon = styled(Undo)`
    ${iconCommon}
    color: forestgreen;
    transform: translateY(0px);
    margin-left: 4px;
    margin-right: 4px;
`;

const Settings = ({ onSourceChanged }) => {
    const [blacklist, setBlacklist] = useState([]);
    const [typeBlacklist, setTypeBlacklist] = useState([]);
    const [mandatory, setMandatory] = useState(['', '', '', '', '', '']);

    const [showDecoSkills, setShowDecoSkills] = useState(false);
    const [showGroupSkills, setShowGroupSkills] = useState(false);
    const [hideSource, setHideSource] = useState(false);
    const [showAll, setShowAll] = useState(true);
    const [showExtra, setShowExtra] = useState(false);

    useEffect(() => {
        const loadedMandatory = getFromLocalStorage('mandatoryArmor') || mandatory;
        const loadedBlacklist = getFromLocalStorage('blacklistedArmor') || blacklist;
        const loadedBlacklistTypes = getFromLocalStorage('blacklistedArmorTypes') || typeBlacklist;
        const loadedShowDeco = getFromLocalStorage('showDecoSkillNames') ?? showDecoSkills;
        const loadedShowGroup = getFromLocalStorage('showGroupSkillNames') ?? showGroupSkills;
        const loadedSource = getFromLocalStorage('hideSource') ?? hideSource;
        const loadedShowAll = getFromLocalStorage('showAll') ?? showAll;
        const loadedShowExtra = getFromLocalStorage('showExtra') ?? showExtra;
        setMandatory(loadedMandatory);
        setBlacklist(loadedBlacklist);
        setTypeBlacklist(loadedBlacklistTypes);
        setShowDecoSkills(loadedShowDeco);
        setShowGroupSkills(loadedShowGroup);
        setHideSource(loadedSource);
        setShowAll(loadedShowAll);
        setShowExtra(loadedShowExtra);
    }, []);

    const types = getArmorTypeList();

    const pin = (name, type) => {
        const mm = pinArmor(name, type);
        if (!mm) { return; }

        setMandatory(mm.mandatoryArmor);
        setBlacklist(mm.blacklistedArmor);
        setTypeBlacklist(mm.blacklistedArmorTypes);
    };

    const exclude = name => {
        const mm = excludeArmor(name);
        if (!mm) { return; }
        setBlacklist(mm.blacklistedArmor);
        setMandatory(mm.mandatoryArmor);
    };

    const toggleBlacklistType = type => {
        let tempTypeBlacklist = [...typeBlacklist];
        const armorTypeList = getArmorTypeList();

        if (typeBlacklist.includes(type)) {
            tempTypeBlacklist = typeBlacklist.filter(x => x !== type);
        } else if (tempTypeBlacklist.length < 5) {
            tempTypeBlacklist = [...typeBlacklist, type];
            const pulledMandatory = getFromLocalStorage('mandatoryArmor') || ['', '', '', '', '', ''];
            pulledMandatory[armorTypeList.indexOf(type)] = '';
            saveToLocalStorage('mandatoryArmor', pulledMandatory);
            setMandatory(pulledMandatory);
        } else {
            window.snackbar.createSnackbar(`You can't exclude all armor types!`, {
                timeout: 3000
            });
            return;
        }

        setTypeBlacklist(tempTypeBlacklist);
        saveToLocalStorage('blacklistedArmorTypes', tempTypeBlacklist);
    };

    const clearBlacklist = (items, type) => {
        const tempBlacklist = [...blacklist].filter(x => !items.includes(x));
        setBlacklist(tempBlacklist);
        saveToLocalStorage('blacklistedArmor', tempBlacklist);

        window.snackbar.createSnackbar(`Cleared all ${type} pieces from the blacklist`, {
            timeout: 3000
        });
    };

    const toggleShowDeco = () => {
        saveToLocalStorage('showDecoSkillNames', !showDecoSkills);
        setShowDecoSkills(!showDecoSkills);
    };

    const toggleShowGroup = () => {
        saveToLocalStorage('showGroupSkillNames', !showGroupSkills);
        setShowGroupSkills(!showGroupSkills);
    };

    const toggleShowAll = () => {
        saveToLocalStorage('showAll', !showAll);
        setShowAll(!showAll);
    };

    const toggleShowExtra = () => {
        saveToLocalStorage('showExtra', !showExtra);
        setShowExtra(!showExtra);
    };

    const toggleHideSource = () => {
        saveToLocalStorage('hideSource', !hideSource);
        setHideSource(!hideSource);
        onSourceChanged();
    };

    const changePin = (type, armor, armorList) => {
        const armorName = armor?.value || "none";
        const isValid = !armorName ||
            armorList.filter(x => x.value.toLowerCase() === armorName.toLowerCase())[0];

        if (isValid) {
            pin(armorName, type);
        }

        document.getElementById(`pinned-${type}`)?.blur();
    };

    const renderBlacklist = armorName => {
        return <div key={armorName} className="blacklist-couple">
            <RemoveIcon onClick={() => exclude(armorName)} />
            <span className="blacklist-name">{armorName}</span>
        </div>;
    };

    const renderList = (type, index) => {
        const svgStyle = { width: '35px', height: '35px', transform: 'translateY(7px)', marginRight: '2px' };
        const noPin = <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>No {type} pinned</span>;
        const hasPin = Boolean(mandatory[index]);
        const myBlacklist = blacklist.filter(x => isArmorOfType(type, x));
        const hasBlacklist = myBlacklist.length > 0;

        const datalist = [{
            label: `No ${type} pinned`,
            value: "none"
        }, ...Object.entries(getJsonFromType(type)).filter(x => x[1][0] === "talisman" ||
            x[1][x[1].length - 2] === "high"
        )
            .map(armor => {
                return {
                    label: armorNameFormat(armor[0]),
                    value: armor[0]
                };
            }).sort()];

        const stilo = {
            '& .MuiOutlinedInput-root': {
                '& fieldset': {
                    borderColor: 'blue',
                }
            },
        };

        const value = hasPin ? { label: armorNameFormat(mandatory[index]), value: mandatory[index] } : datalist[0];

        return <Paper key={type} className="blacklist-rows" elevation={2}>
            <div className="pinlist">
                <ArmorSvgWrapper type={type} style={svgStyle} />
                <div className="pinned">
                    <Autocomplete
                        id={`pinned-${type}`}
                        onChange={(ev, option) => changePin(type, option, datalist)}
                        disablePortal
                        options={datalist}
                        sx={{ width: '250px' }}
                        size="small"
                        disableClearable={!hasPin}
                        isOptionEqualToValue={option => option.value === value.value}
                        value={value}
                        renderInput={params => <TextField {...params} sx={hasPin ? stilo : {}} label={`Pinned ${type} Armor`} />}
                    />
                </div>
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={typeBlacklist.includes(type)} />}
                    onChange={() => toggleBlacklistType(type)}
                    label={`Exclude all '${type}' armor pieces?`} />
            </div>
            {hasBlacklist && <div className="blacklist">
                <Button variant="outlined" color="error" size="small"
                    onClick={() => clearBlacklist(myBlacklist, type)}>Clear</Button>
                {myBlacklist.map(renderBlacklist)}
            </div>}
        </Paper>;
    };

    return <div className="settings">
        <div className="armor-settings">
            <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                General Settings
            </Typography>
            <div className="general-settings">
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={showDecoSkills} />}
                    onChange={() => toggleShowDeco()}
                    label={`Label decorations by skill name`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={showGroupSkills} />}
                    onChange={() => toggleShowGroup()}
                    label={`Label set skills by skill name`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={hideSource} />}
                    onChange={() => toggleHideSource()}
                    label={`Hide source code tab`} />
            </div>
            <Divider component="div" />

            <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                Armor Result Settings
            </Typography>
            <div className="general-settings">
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={showAll} />}
                    onChange={() => toggleShowAll()}
                    label={`Show all skills box`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={showExtra} />}
                    onChange={() => toggleShowExtra()}
                    label={`Show 'Extra Skills' line`} />
            </div>

            <Divider component="div" />
            <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                Pinned & Blacklisted Armor
            </Typography>
            {types.map(renderList)}
            <Typography sx={{ fontSize: '16px', fontStyle: 'italic' }}>
                A pinned armor piece tells the tool that it must include the armor piece in all its results.
                A blacklisted armor piece will never be used to find results.
            </Typography>
        </div>
    </div>;
};
Settings.propTypes = {
    onSourceChanged: PropTypes.func.isRequired,
};
export default Settings;
