import { useState, useEffect } from 'react';
import TextField from '@mui/material/TextField';
import {
    excludeArmor,
    getArmorTypeList, getDecoDisplayName, getDecoFromName, getFromLocalStorage,
    isArmorOfType,
    pinArmor,
    saveToLocalStorage
} from '../util/util';
import { Button, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
import ArmorSvgWrapper from './ArmorSvgWrapper';
import Pin from '@mui/icons-material/PushPin';
import Unpin from '@mui/icons-material/PushPinOutlined';
import Exclude from '@mui/icons-material/Block';
import Undo from '@mui/icons-material/Undo';
import Remove from '@mui/icons-material/Remove';
import { iconCommon } from './Results';
import styled from 'styled-components';
import Divider from '@mui/material/Divider';
import PropTypes from 'prop-types';

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

    useEffect(() => {
        const loadedMandatory = getFromLocalStorage('mandatoryArmor') || mandatory;
        const loadedBlacklist = getFromLocalStorage('blacklistedArmor') || blacklist;
        const loadedBlacklistTypes = getFromLocalStorage('blacklistedArmorTypes') || typeBlacklist;
        const loadedShowDeco = getFromLocalStorage('showDecoSkillNames') ?? showDecoSkills;
        const loadedShowGroup = getFromLocalStorage('showGroupSkillNames') ?? showGroupSkills;
        const loadedSource = getFromLocalStorage('hideSource') ?? hideSource;
        setMandatory(loadedMandatory);
        setBlacklist(loadedBlacklist);
        setTypeBlacklist(loadedBlacklistTypes);
        setShowDecoSkills(loadedShowDeco);
        setShowGroupSkills(loadedShowGroup);
        setHideSource(loadedSource);
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

        if (typeBlacklist.includes(type)) {
            tempTypeBlacklist = typeBlacklist.filter(x => x !== type);
        } else if (tempTypeBlacklist.length < 5) {
            tempTypeBlacklist = [...typeBlacklist, type];
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

    const toggleHideSource = () => {
        saveToLocalStorage('hideSource', !hideSource);
        setHideSource(!hideSource);
        onSourceChanged();
    };

    const renderBlacklist = armorName => {
        return <div key={armorName} className="blacklist-couple">
            <RemoveIcon onClick={() => exclude(armorName)} />
            <span className="blacklist-name">{armorName}</span>
        </div>;
    };

    const renderList = (type, index) => {
        const svgStyle = { width: '35px', height: '35px', transform: 'translateY(0px)', marginRight: '2px' };
        const noPin = <span style={{ fontStyle: 'italic', fontWeight: 'normal' }}>No {type} pinned</span>;
        const hasPin = Boolean(mandatory[index]);
        const myBlacklist = blacklist.filter(x => isArmorOfType(type, x));
        const hasBlacklist = myBlacklist.length > 0;

        return <Paper key={type} className="blacklist-rows" elevation={2}>
            <div className="pinlist">
                <ArmorSvgWrapper type={type} style={svgStyle} />
                <div className="pinned">
                    {hasPin && <UnpinIcon onClick={() => pin(mandatory[index], type)} />}
                    {hasPin ? mandatory[index] : noPin}
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
