import { useState, useEffect } from 'react';
import SKILLS from '../data/skills/skills.json';
import TextField from '@mui/material/TextField';
import { getDecoDisplayName, getDecoFromName, getFromLocalStorage,
    saveToLocalStorage } from '../util/util';
import { Button, Typography } from '@mui/material';
import DECOS from '../data/compact/decoration.json';
import DECO_INVENTORY from '../data/user/deco-inventory.json';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';

const DecoInventory = () => {
    const [namesModded, setNamesModded] = useState({});
    const [inventory, setInventory] = useState([]);
    const [showSkillNames, setShowSkillNames] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [found, setFound] = useState([]);
    const [started, setStarted] = useState(false); // lazy activate

    const refreshDecos = () => {
        const myDecos = getFromLocalStorage('decoInventory') || {};
        const communistDecos = [];
        const armorDecos = Object.fromEntries(Object.entries(DECO_INVENTORY).filter(x => DECOS[x[0]][0] === "armor"));

        // modify deco inventory to reflect user-specified amounts
        for (const [name, quantity] of Object.entries(armorDecos)) {
            let amount = quantity;
            if (myDecos[name] !== undefined) {
                amount = myDecos[name];
            }

            communistDecos.push({
                name,
                amount,
            });
        }

        const modded = {};
        for (const [decoName, amount] of Object.entries(myDecos)) {
            if (amount !== 99) {
                modded[decoName] = amount;
            }
        }

        const foundNames = communistDecos.filter(
            x => !searchText || getDecoDisplayName(x.name, showSkillNames).toLowerCase().includes(searchText.toLowerCase())
        ).map(x => getDecoDisplayName(x.name, showSkillNames));
        communistDecos.sort((a, b) => nameSort(a, b, foundNames));
        setNamesModded(modded);
        setInventory(communistDecos);

        if (!started) {
            setStarted(true);
        }
    };

    useEffect(() => {
        const loadedShowDeco = getFromLocalStorage('showDecoSkillNames') ?? showSkillNames;
        setShowSkillNames(loadedShowDeco);

        refreshDecos();
    }, []);

    const nameSort = (a, b, foundNames) => {
        const aName = getDecoDisplayName(a.name, showSkillNames);
        const bName = getDecoDisplayName(b.name, showSkillNames);

        let priority1 = 0;
        if (foundNames) {
            const aFound = foundNames.includes(aName) ? -1 : 1;
            const bFound = foundNames.includes(bName) ? -1 : 1;
            priority1 = aFound - bFound;
        }

        return priority1 || aName.localeCompare(bName);
    };

    useEffect(() => {
        if (started) {
            const tempInventory = [...inventory];

            const foundNames = tempInventory.filter(
                x => !searchText || getDecoDisplayName(x.name, showSkillNames).toLowerCase().includes(searchText.toLowerCase())
            ).map(x => getDecoDisplayName(x.name, showSkillNames));

            tempInventory.sort((a, b) => nameSort(a, b, foundNames));
            setFound(foundNames);
            setInventory(tempInventory);
        }
    }, [searchText]);

    const updateMod = (decoName, ev) => {
        let amount = parseInt(ev.target.value, 10);
        if (isNaN(amount)) {
            amount = 0;
            ev.target.value = amount;
        }
        const mods = getFromLocalStorage('decoInventory') || {};
        mods[decoName] = amount;
        saveToLocalStorage('decoInventory', mods);
        refreshDecos();
    };

    const restock = () => {
        saveToLocalStorage('decoInventory', {});
        refreshDecos();

        const inputs = document.getElementsByClassName('deco-amount');
        for (const input of inputs) {
            input.value = 99;
        }
    };

    const empty = () => {
        const emptyInv = {};
        const tempInv = { ...DECO_INVENTORY };
        for (const [decoName, amount] of Object.entries(tempInv)) {
            if (DECOS[decoName][0] !== "armor") { continue; }
            emptyInv[decoName] = 0;
        }

        saveToLocalStorage('decoInventory', emptyInv);
        refreshDecos();
        const inputs = document.getElementsByClassName('deco-amount');
        for (const input of inputs) {
            input.value = 0;
        }
    };

    const renderDeco = decoRaw => {
        const decoName = decoRaw.name;
        const amount = decoRaw.amount;
        const deco = getDecoFromName(decoName, showSkillNames);
        const howManyWeGot = namesModded[decoRaw.name] ?? 99;

        // todo: make the red highlight dynamic on change
        const modded = howManyWeGot < deco.max;
        const highlighted = searchText && found.includes(deco.name);
        const highlightClass = highlighted ? "highlighted dhigh" : "";
        const modClass = modded ? 'dmodded' : '';

        const skillIcons = deco.skillNames.map(x => SKILLS.filter(y => y.name === x)[0].icon);
        const singleIcon = skillIcons[0]; // todo: change this should armor decos ever have more than 1 skill each

        return <div key={deco.name} className={`deco dpad ${highlightClass}`} title={deco.altText}>
            <img className="deco-img" src={`images/slot${deco.slotSize}.png`} />
            <div>
                <span className={`deco-name ${modded ? 'name-mod' : ''}`}>{deco.name}</span>
                <input type="number" step={1} max={99} min={0}
                    onBlur={ev => updateMod(decoRaw.name, ev)}
                    className={`deco-amount dinput ${modClass}`} defaultValue={amount} />
            </div>
            <img className="deco-icon" src={`images/icons/${singleIcon}.png`} />
        </div>;
    };

    const renderDecos = () => {
        return <div className="deco-results">
            {inventory.map(renderDeco)}
        </div>;
    };

    const label = showSkillNames ? "Search decorations by skill name" : "Search decorations by name";

    return <div className="deco-inventory">
        <Typography sx={{ marginBottom: '8px', fontSize: '20px', fontWeight: 'bold', cursor: 'default' }}>
            You can limit how many of each decoration the Search can use below.
        </Typography>
        <div style={{ display: "flex", flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <TextField id="deco-search" label={label} variant="outlined" size="small"
                className="deco-search" autoFocus
                onChange={ev => setSearchText(ev.target.value)} value={searchText} />
            <Button className="dbuttons" onClick={empty} variant="outlined" color="error" size="small">Empty Inventory</Button>
            <Button className="dbuttons" onClick={restock} variant="outlined" color="info" size="small">Fill Inventory</Button>
        </div>
        <div className="filters-div">
            <FormControlLabel control={<Switch checked={showSkillNames} />}
                onChange={ev => setShowSkillNames(ev.target.checked)}
                label={showSkillNames ? "Label by Skill Names" : "Label by Decoration Names"} />
        </div>

        {renderDecos()}
    </div>;
};
DecoInventory.propTypes = {

};
export default DecoInventory;
