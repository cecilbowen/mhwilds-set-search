import TextField from '@mui/material/TextField';
import {
    armorNameFormat,
    getArmorTypeList,
    isArmorOfType
} from '../util/util';
import { Autocomplete, Button, FormControlLabel, Paper, Switch, Typography } from '@mui/material';
import ArmorSvgWrapper from './ArmorSvgWrapper';
import Remove from '@mui/icons-material/Remove';
import { iconCommon } from './Results';
import styled from 'styled-components';
import Divider from '@mui/material/Divider';
import PropTypes from 'prop-types';
import { getJsonFromType } from '../util/tools';
import { useStorage } from '../hooks/StorageContext';

const RemoveIcon = styled(Remove)`
    ${iconCommon}
    transform: translateY(0px);
    color: crimson;
`;

const Settings = ({ onSourceChanged }) => {
    const { fields, updateField, pinArmor, excludeArmor } = useStorage();
    const types = getArmorTypeList();

    const toggleBlacklistType = type => {
        let tempTypeBlacklist = [...fields.blacklistedArmorTypes];
        const armorTypeList = getArmorTypeList();

        if (fields.blacklistedArmorTypes.includes(type)) {
            tempTypeBlacklist = fields.blacklistedArmorTypes.filter(x => x !== type);
        } else if (tempTypeBlacklist.length < 5) {
            tempTypeBlacklist = [...fields.blacklistedArmorTypes, type];
            const pulledMandatory = fields.mandatoryArmor;
            pulledMandatory[armorTypeList.indexOf(type)] = '';
            updateField('mandatoryArmor', pulledMandatory);
        } else {
            window.snackbar.createSnackbar(`You can't exclude all armor types!`, {
                timeout: 3000
            });
            return;
        }

        updateField('blacklistedArmorTypes', tempTypeBlacklist);
    };

    const clearBlacklist = (items, type) => {
        const tempBlacklist = [...fields.blacklistedArmor].filter(x => !items.includes(x));
        updateField('blacklistedArmor', tempBlacklist);

        window.snackbar.createSnackbar(`Cleared all ${type} pieces from the blacklist`, {
            timeout: 3000
        });
    };

    const toggleShowDeco = () => {
        updateField('showDecoSkillNames', !fields.showDecoSkillNames);
    };

    const toggleShowGroup = () => {
        updateField('showGroupSkillNames', !fields.showGroupSkillNames);
    };

    const toggleShowAll = () => {
        updateField('showAll', !fields.showAll);
    };

    const toggleShowExtra = () => {
        updateField('showExtra', !fields.showExtra);
    };

    const toggleHideSource = () => {
        updateField('hideSource', !fields.hideSource);
        onSourceChanged?.();
    };

    const changePin = (type, armor, armorList) => {
        const armorName = armor?.value || "none";
        const isValid = !armorName ||
            armorList.filter(x => x.value.toLowerCase() === armorName.toLowerCase())[0];

        if (isValid) {
            pinArmor(armorName, type);
        }

        document.getElementById(`pinned-${type}`)?.blur();
    };

    const renderBlacklist = armorName => {
        return <div key={armorName} className="blacklist-couple">
            <RemoveIcon onClick={() => excludeArmor(armorName)} />
            <span className="blacklist-name">{armorName}</span>
        </div>;
    };

    const renderList = (type, index) => {
        const svgStyle = { width: '35px', height: '35px', transform: 'translateY(7px)', marginRight: '2px' };
        const hasPin = Boolean(fields.mandatoryArmor[index]);
        const myBlacklist = fields.blacklistedArmor.filter(x => isArmorOfType(type, x));
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
                    borderColor: '#165493',
                }
            },
        };

        const value = hasPin ? {
            label: armorNameFormat(fields.mandatoryArmor[index]),
            value: fields.mandatoryArmor[index]
        } : datalist[0];

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
                        renderInput={
                            params => <TextField {...params} sx={hasPin ? stilo : {}} label={`Pinned ${type} Armor`} />
                        }
                    />
                </div>
                <FormControlLabel sx={{ marginLeft: '1em' }}
                    control={<Switch checked={fields.blacklistedArmorTypes.includes(type)} />}
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
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={fields.showDecoSkillNames} />}
                    onChange={() => toggleShowDeco()}
                    label={`Label decorations by skill name`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={fields.showGroupSkillNames} />}
                    onChange={() => toggleShowGroup()}
                    label={`Label set skills by skill name`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={fields.hideSource} />}
                    onChange={() => toggleHideSource()}
                    label={`Hide source code tab`} />
            </div>
            <Divider component="div" />

            <Typography sx={{ fontSize: '20px', fontWeight: 'bold' }}>
                Armor Result Settings
            </Typography>
            <div className="general-settings">
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={fields.showAll} />}
                    onChange={() => toggleShowAll()}
                    label={`Show all skills box`} />
                <FormControlLabel sx={{ marginLeft: '1em' }} control={<Switch checked={fields.showExtra} />}
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
    onSourceChanged: PropTypes.func,
};
export default Settings;
