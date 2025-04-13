import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    armorNameFormat, copyTextToClipboard, formatSkillsDiff,
    generateWikiString, getArmorDefenseFromName, getArmorDefenseFromNames,
    getArmorFromNames, getDecosFromNames,
    getSetUrl,
    getSkillDiff, getSkillPopup, isGroupSkillName,
    isSetSkillName, paginate
} from '../util/util';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell, { tableCellClasses } from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import { styled } from '@mui/material/styles';
import TablePagination from '@mui/material/TablePagination';
import TablePaginationActions from './TablePaginationActions';
import Swap from '@mui/icons-material/Sync';
import { Button, IconButton, TextField } from '@mui/material';
import SKILLS from '../data/detailed/skills.json';
import { isEmpty } from '../util/tools';
import Pin from '@mui/icons-material/PushPin';
import Unpin from '@mui/icons-material/PushPinOutlined';
import Exclude from '@mui/icons-material/Block';
import Undo from '@mui/icons-material/Undo';
import Edit from '@mui/icons-material/DriveFileRenameOutline';
import Close from '@mui/icons-material/DisabledByDefaultRounded';
import ArmorSvgWrapper from './ArmorSvgWrapper';
import { useStorage } from '../hooks/StorageContext';
import ArrowForward from '@mui/icons-material/ArrowForwardRounded';
import ArrowBack from '@mui/icons-material/ArrowBackRounded';
import { useWindowWidth } from '../hooks/useWindowWidth';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
    '@media (prefers-color-scheme: dark)': {
        [`&.${tableCellClasses.head}`]: {
            backgroundColor: '#141414',
            color: '#e8ebed',
        },
        [`&.${tableCellClasses.body}`]: {
            fontSize: 14,
            borderColor: '#1b1919',
            color: '#d5d6cd'
        }
    }
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
    '&:nth-of-type(odd)': {
        backgroundColor: theme.palette.action.hover,
    },
    // hide last border
    '&:last-child td, &:last-child th': {
        border: 0,
    },
    '&:hover': {
        backgroundColor: 'lightblue',
    },

    // Dark mode overrides
    '@media (prefers-color-scheme: dark)': {
        "backgroundColor": '#333',
        '&:nth-of-type(odd)': {
            backgroundColor: '#2c2b2b',
        },
        '&:hover': {
            backgroundColor: '#1a3943', // or whatever dark hover color you like
        }
    },
}));

const PaginationBox = styled(Box)`
  display: flex;
`;
const SwapIcon = styled(Swap)`
    width: 12px;
    color: white;
    cursor: pointer;
    vertical-align: middle;
    margin-left: 6px;
    transform: translateY(-2px) scale(1.2);
`;

export const iconCommon = `
    width: 24px;
    height: 24px;
    transform: translateY(-2px);
    cursor: pointer;

    &:hover {
        background-color: lightgray;
        border-radius: 20px;
    }
`;

const PinIcon = styled(Pin)`
    ${iconCommon}
    color: #4747c5;
`;
const UnpinIcon = styled(Unpin)`
    ${iconCommon}
    color: blue;
`;
const ExcludeIcon = styled(Exclude)`
    ${iconCommon}
    color: crimson;
    margin-left: 4px;
    margin-right: 4px;
`;
const UndoExcludeIcon = styled(Undo)`
    ${iconCommon}
    color: forestgreen;
    margin-left: 4px;
    margin-right: 4px;
`;
const EditIcon = styled(Edit)`
    ${iconCommon}
    color: #ff8300;
`;
const CloseIcon = styled(Close)`
    ${iconCommon}
    color: crimson;
`;

const Results = ({
    elapsedSeconds, onSaveSet, results, save
}) => {
    const { fields, updateField, pinArmor, excludeArmor, saveArmorSet, setId, setSetId } = useStorage();
    const [selectedResult, setSelectedResult] = useState();
    const [page, setPage] = useState(-1);
    const [pageSize, setPageSize] = useState(100);
    const [customSlot, setCustomSlot] = useState("slots"); // or defense
    const [editingName, setEditingName] = useState(false);

    const [rIndex, setRIndex] = useState(0);
    const [rArr, setRArr] = useState([]);

    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [isMouseInside, setIsMouseInside] = useState(false);
    const width = useWindowWidth();
    const isMobile = !fields.forceDesktop && width < 640;

    useEffect(() => {
        const handleKeyDown = event => {
            if (event.ctrlKey) { setIsCtrlPressed(true); }
            if (event.shiftKey) { setIsShiftPressed(true); }
        };

        const handleKeyUp = event => {
            if (!event.ctrlKey) { setIsCtrlPressed(false); }
            if (!event.shiftKey) { setIsShiftPressed(false); }
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);

    useEffect(() => {
        setRArr([]);
        setRIndex(0);
    }, [page]);

    useEffect(() => {
        setPage(0);
    }, [pageSize]);

    useEffect(() => {
        if (!save) {
            setSelectedResult(undefined);
        } else if (setId) {
            const instantResult = results.filter(x => x.id === setId)[0];
            if (instantResult) {
                setSelectedResult(instantResult);
            }
            setSetId(undefined);
        }
    }, [results]);

    useEffect(() => {
        if (!selectedResult) {
            setEditingName(false);
            setRArr([]);
            setRIndex(0);
        }
    }, [selectedResult]);

    useEffect(() => {
        if (editingName) {
            document.getElementById("edit-name").focus();
        }
    }, [editingName]);

    const swapCustomSlot = () => {
        if (customSlot === "defense") {
            setCustomSlot("slots");
        } else {
            setCustomSlot("defense");
        }
    };

    const saveSet = () => {
        const tempSets = saveArmorSet({
            ...selectedResult,
            searchedSkills: fields.skills
        });
        if (tempSets) {
            updateField('savedSets', tempSets);

            // only close selected result window on set removal if on saved sets page
            if (save && !tempSets.filter(x => x.id === selectedResult.id)[0]) {
                setSelectedResult(undefined);
            }
        }

        if (onSaveSet) {
            onSaveSet();
        }
    };

    const updateSetName = ev => {
        if (!selectedResult) { return; }
        const tempSavedSets = (
            fields.savedSets || []
        ).filter(x => x.id !== selectedResult.id);
        const name = ev.target.value;
        const tempSelectedResult = { ...selectedResult, name };
        selectedResult.name = name;
        tempSavedSets.push(tempSelectedResult);
        updateField('savedSets', tempSavedSets);
        setEditingName(false);
    };

    const handleEditKeyDown = event => {
        if (event.key === "Enter") {
            event.target.blur();
        }
    };

    const renderDefense = result => {
        const defense = getArmorDefenseFromNames(result.armorNames);

        return <div className="defense">
            {`${defense.upgraded} (${defense.base} base)`}
        </div>;
    };

    const renderSlots = result => {
        // const numFours = result.freeSlots.filter(x => x === 4);
        const numThrees = result.freeSlots.filter(x => x === 3).length;
        const numTwos = result.freeSlots.filter(x => x === 2).length;
        const numOnes = result.freeSlots.filter(x => x === 1).length;
        const zeroStyle = { opacity: 0.4, filter: 'blur(0.5px)' };

        return <div style={{ display: 'inline-flex', gap: '7px' }} key={result.id}>
            <div className="slot-holder">
                <img className="slot-img" style={!numThrees && zeroStyle || {}} src={`images/slot3.png`} />
                <div className="slot-num">{numThrees}</div>
            </div>
            <div className="slot-holder">
                <img className="slot-img" style={!numTwos && zeroStyle || {}} src={`images/slot2.png`} />
                <div className="slot-num">{numTwos}</div>
            </div>
            <div className="slot-holder">
                <img className="slot-img" style={!numOnes && zeroStyle || {}} src={`images/slot1.png`} />
                <div className="slot-num">{numOnes}</div>
            </div>
        </div>;
    };

    const renderResult = (result, resultIndex, resultArr) => {
        const highlighted = result.id === selectedResult?.id;
        const armorNames = result.armorNames;
        const savedMatch = fields.savedSets?.filter(x => x.id === result?.id)[0];
        const theName = savedMatch?.name || "Unnamed Set";
        let cls = "";
        if (!save && savedMatch) { cls += 'striped'; }
        if (highlighted) { cls += ' row-shine'; }

        return <StyledTableRow key={result.id} className={cls}
            onClick={() => {
                if (selectedResult?.id === result.id) {
                    setSelectedResult(undefined);
                } else {
                    setRArr(resultArr);
                    setRIndex(resultIndex);
                    setSelectedResult(result);
                }
            }}
            sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
            {save && <StyledTableCell align="left">{theName}</StyledTableCell>}
            <StyledTableCell align="left">
                {customSlot === "slots" && renderSlots(result)}
                {customSlot === "defense" && renderDefense(result)}
            </StyledTableCell>
            {isMobile && <StyledTableCell align="left" scope="row">{renderDefense(result)}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left" scope="row">{armorNameFormat(armorNames[0])}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left">{armorNameFormat(armorNames[1])}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left">{armorNameFormat(armorNames[2])}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left">{armorNameFormat(armorNames[3])}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left">{armorNameFormat(armorNames[4])}</StyledTableCell>}
            {!isMobile && <StyledTableCell align="left">{armorNameFormat(armorNames[5])}</StyledTableCell>}
        </StyledTableRow>;
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = event => {
        setPageSize(parseInt(event.target.value, 10));
    };

    const cycleSelectedResult = amount => {
        if (!selectedResult) { return; }
        const next = rArr[rIndex + amount];
        if (!next) { return; }
        setRIndex(rIndex + amount);
        setSelectedResult(next);
    };

    const wikiSearch = () => {
        if (!selectedResult) { return; }
        const wiki = generateWikiString(
            selectedResult.skills, selectedResult.setSkills, selectedResult.groupSkills,
            fields.slotFilters
        );

        // god the wiki site is so shit without an adblock
        window.open(`https://mhwilds.wiki-db.com/sim/#skills=${wiki}&fee=1`, "_blank");
    };

    const renderDecos = decos => {
        if (decos.length === 0) {
            return <Typography>No decorations required</Typography>;
        }

        return <div className="decos-selected">
            {decos.map(deco => {
                const skillIcons = deco.skillNames.map(x => SKILLS[x].icon);
                const singleIcon = skillIcons[0]; // todo: change this should armor decos ever have more than 1 skill each

                return <div key={deco.key} className="deco" style={{ cursor: 'help' }}
                    title={deco.altText} onClick={() => updateField('showDecoSkillNames', !fields.showDecoSkillNames)}>
                    <img className="deco-img" src={`images/slot${deco.slotSize}.png`} />
                    <div>
                        <span className="deco-name">{deco.name}</span>
                        <span className="deco-amount">x{deco.amount}</span>
                    </div>
                    <img className="deco-icon" src={`images/icons/${singleIcon}.png`} />
                </div>;
            })}
        </div>;
    };

    const renderArmorSlots = slots => {
        return <div className="armor-slots">
            {slots.map((size, index) => {
                return <img key={index} className="armor-slot" src={`images/slot${size}.png`} />;
            })}
        </div>;
    };

    const renderSkill = (skM, j, arr, searchedSkills, showLevelMods = false) => {
        const sk = skM.name ? skM : { name: skM[0], level: skM[1] };
        const comma = j < arr.length - 1;
        const want = searchedSkills?.[sk.name] || 0;
        const isWantedSkill = Boolean(want);
        let wantedCls = !isWantedSkill ? 'wanted' : '';
        if (searchedSkills === undefined) {
            wantedCls = '';
        }
        let levelModSpan = null;
        if (showLevelMods && isWantedSkill && want < sk.level) {
            levelModSpan = <span className="wanted left-space">{`(+${sk.level - want})`}</span>;
        }
        const title = getSkillPopup(sk.name);
        const setTag = isGroupSkillName(sk.name) ? 'set-names set-color' : '';
        const groupTag = isSetSkillName(sk.name) ? 'set-names group-color' : '';
        const tag = setTag || groupTag || '';

        return <div key={sk.name} className={`result-skill ${tag}`} title={title}>
            <span className={`${wantedCls} sk-name`}>{`${sk.name} `}</span>
            <span className={`${wantedCls}`}>{`Lv. ${sk.level}`}{levelModSpan}</span>
            {comma && ', '}
        </div>;
    };

    const renderArmor = (armorSet, result) => {
        const armorTypeMap = ["head", "chest", "arms", "waist", "legs", "talisman"];
        const searchedSkills = fields.skills || result.searchedSkills || {};

        return <div className="armor-holder">
            {armorSet.map((armor, i) => {
                const defense = getArmorDefenseFromName(armor.name);
                const type = armorTypeMap[i];
                const isBlacklisted = fields.blacklistedArmor.includes(armor.name);
                const isMandatory = fields.mandatoryArmor.includes(armor.name);
                // const isTypeBlacklisted = blacklistedArmorTypes.includes(armorTypeMap[i]);
                const pinFunc = () => pinArmor(armor.name, type);
                const disabled = armor.name.toLowerCase() === "none";
                const excludeFunc = () => excludeArmor(armor.name);
                const cls = disabled ? 'disabled' : '';

                return <div className="armor-piece" key={type}>
                    {isMandatory ? <UnpinIcon className={cls || 'pin-icon'} title="Un-pin" onClick={pinFunc} /> :
                        <PinIcon className={cls || 'pin-icon'} title="Pin" onClick={pinFunc} />}
                    {isBlacklisted ? <UndoExcludeIcon className={cls || 'blacklist-icon'} title="Undo Exclude"
                        onClick={excludeFunc} /> : <ExcludeIcon className={cls || 'blacklist-icon'}
                            title="Exclude" onClick={excludeFunc} />}
                    <ArmorSvgWrapper type={type} rarity={armor.rarity} />
                    <span className="armor-name">{armorNameFormat(armor.name)}</span>
                    {type !== "talisman" && !isMobile && <div className="def-holder">
                        <img className="armor-def-img" src={`images/defense-up.png`} />
                        <div className="def-value">{defense?.upgraded || 0}</div>
                    </div>}
                    {!isMobile && renderArmorSlots(armor.slots)}
                    {!isMobile && <span className="armor-skills">
                        {Object.entries(armor.skills).map((sk, j, arr) => renderSkill(sk, j, arr, searchedSkills))}
                    </span>}
                </div>;
            })}
        </div>;
    };

    const renderSelectedResult = () => {
        const hasSelectedResult = Boolean(selectedResult);
        const pageStr = save ? "Your saved sets will appear below." : "Add skills above and tap 'Search' to get armor sets.";
        const theName = (fields.savedSets || []).filter(x => x.id === selectedResult?.id)[0]?.name;

        const mySetName = theName || "Unnamed Set";
        const nameEl = save ? <Typography className="edit-name" sx={{ cursor: "pointer !important" }}
            onClick={() => setEditingName(true)}
            title="Click to rename set">
            <EditIcon className="edit-icon" />{mySetName}</Typography> : null;
        const editNameEl = <TextField id="edit-name" label="Rename Set"
            onKeyDown={handleEditKeyDown}
            onFocus={e => e.target.select()}
            onBlur={updateSetName} sx={{ transform: 'translateY(-7px)' }}
            variant="standard" defaultValue={mySetName} />;
        let details = <AccordionDetails sx={{ cursor: 'default' }} />;
        let summary = <Typography sx={{ marginLeft: '-1em', fontSize: '20px', fontWeight: 'bold', cursor: 'default' }}>
            {results.length > 0 ? "Click on a set below to see details." : pageStr}
        </Typography>;
        let all = null;
        let setEffects = null;
        let groupSkills = null;
        let extraSkillsDiv = null;
        let freeSlots = null;
        let defenseTotal = null;
        if (selectedResult) {
            const decos = getDecosFromNames(selectedResult.decoNames, fields.showDecoSkillNames);
            const armor = getArmorFromNames(selectedResult.armorNames);
            const defense = getArmorDefenseFromNames(selectedResult.armorNames);

            summary = renderDecos(decos);
            details = renderArmor(armor, selectedResult);
            const extras = fields.skills || selectedResult.searchedSkills;
            const extraSkills = extras ? getSkillDiff(extras, {
                ...selectedResult.skills,
                ...selectedResult.setSkills,
                ...selectedResult.groupSkills
            }) : {};
            const setExist = !isEmpty(selectedResult.setSkills);
            const groupExist = !isEmpty(selectedResult.groupSkills);
            const extraExist = !isEmpty(extraSkills);
            // setSpacer = setExist || groupExist ? <div style={{ marginTop: '1em' }}></div> : setSpacer;

            defenseTotal = <div className="def-total-holder">
                <span className="set-label" style={{ transform: 'translateY(-2px)' }}>Defense:</span>
                <img className="armor-def-img" src={`images/defense-up.png`} />
                <div className="def-value">{defense.upgraded}</div>
                <div className="def-value base">({defense.base} base)</div>
            </div>;

            all = <div className="all-skills">
                {Object.entries(selectedResult.skills).map(x => {
                    return { name: x[0], level: x[1] };
                }).map((sk, j, arr) => renderSkill(sk, j, arr, fields.skills, true))}
            </div>;

            if (setExist) {
                setEffects = <div className="set-skills">
                    <span className="set-label">Set Skills:</span>
                    {Object.entries(selectedResult.setSkills).map(x => {
                        return { name: x[0], level: x[1] };
                    }).map(renderSkill)}
                </div>;
            }
            if (groupExist) {
                groupSkills = <div className="set-skills">
                    <span className="set-label">Group Skills:</span>
                    {Object.entries(selectedResult.groupSkills).map(x => {
                        return { name: x[0], level: x[1] };
                    }).map(renderSkill)}
                </div>;
            }
            if (extraExist) {
                const extraMagic = formatSkillsDiff(extraSkills, fields.showGroupSkillNames, '+');
                extraSkillsDiv = <div className="group-skills">
                    <span className="set-label"
                        title="Bonus skill levels you didn't search for">Extra Skills:</span>
                    <span className="set-names wanted">{extraMagic}</span>
                </div>;
            }

            freeSlots = renderSlots(selectedResult);
        }

        const savedVar = save ? results : fields.savedSets;

        const isSaved = selectedResult &&
            (savedVar || []).filter(x => x.id === selectedResult.id)[0];

        const queueUpSkills = () => {
            if (!selectedResult && !selectedResult.searchedSkills) { return; }

            const mySkills = isShiftPressed ? selectedResult.searchedSkills : {
                ...selectedResult.skills, ...selectedResult.setSkills, ...selectedResult.groupSkills
            };

            if (!isEmpty(mySkills)) {
                updateField('skills', mySkills);
                window.snackbar.createSnackbar(`Added skills to search tab`, {
                    timeout: 3000
                });
            }
        };

        const shareSet = () => {
            if (!selectedResult) { return; }

            const url = getSetUrl(selectedResult.armorNames, selectedResult.decoNames, selectedResult?.name);
            copyTextToClipboard(url, () => {
                window.snackbar.createSnackbar(`Copied armor set ${selectedResult?.name || ""} url to clipboard!`, {
                    timeout: 3000
                });
            });
        };

        const searchTargetTitle = isShiftPressed ? "Set only skills used to find this set as the search target" :
            "Set all skills from this set as the search target";
        const paperStyle = hasSelectedResult ? "full" : "empty";

        const disabledRight = !rArr[rIndex + 1];
        const disabledLeft = !rArr[rIndex - 1];

        return <div style={{ marginBottom: '1em' }}
            onMouseEnter={() => setIsMouseInside(true)}
            onMouseLeave={() => setIsMouseInside(false)}
        >
            <Accordion expanded={hasSelectedResult} elevation={hasSelectedResult ? 2 : 0}
                className={`result-paper ${paperStyle}`}>
                <AccordionSummary
                    expandIcon={null}
                    aria-controls="panel1-content"
                    id="panel1-header"
                    sx={{ cursor: 'default !important', marginBottom: '1em' }}
                >
                    {editingName && editNameEl}
                    {!editingName && hasSelectedResult && nameEl}
                    {summary}
                </AccordionSummary>
                {fields.showAll && all}
                {details}
                {defenseTotal}
                {setEffects}
                {groupSkills}
                {fields.showExtra && extraSkillsDiv}
                <div className="free-slots-holder">
                    <span className="set-label">Free Slots:</span>
                    <div className="free-holder">{freeSlots}</div>
                </div>
                <Button className="save-set-button" onClick={saveSet}
                    variant="outlined" color={isSaved ? 'error' : 'info'}>
                    {isSaved ? "Remove From Saved Sets" : "Save Armor Set"}
                </Button>
                {save && <Button className="save-set-button" onClick={queueUpSkills}
                    title={searchTargetTitle}
                    variant="outlined" color="info">
                    {isShiftPressed ? "Set as Search Target 🔍" : "Set as Search Target"}
                </Button>}
                {save && <Button className="save-set-button" onClick={shareSet}
                    title={"Copy armor set url to clipboard"}
                    variant="outlined" color="info">
                    Share Set
                </Button>}
                {isCtrlPressed && isMouseInside && <Button className="save-set-button"
                    title="Search for these skills on the wiki armor set search instead"
                    onClick={wikiSearch}
                    variant="outlined" color="warning">
                    Search Wiki
                </Button>}
                <div className="result-cyclers">
                    <IconButton className="cycle" title="Previous Result"
                        disabled={disabledLeft} onClick={() => cycleSelectedResult(-1)}><ArrowBack /></IconButton>
                    <IconButton className="cycle" title="Next Result"
                        disabled={disabledRight} onClick={() => cycleSelectedResult(1)}><ArrowForward /></IconButton>
                    <CloseIcon className="close-icon" onClick={() => setSelectedResult(undefined)} />
                </div>
            </Accordion>
        </div>;
    };

    const renderTable = () => {
        const pageOptions = [
            { label: '30', value: 30 },
            { label: '50', value: 50 },
            { label: '100', value: 100 },
            { label: 'All', value: -1 }
        ];

        const svgStyle = { width: '20px', height: '20px', transform: 'translateY(2px)', marginRight: '2px' };

        const armorImages = [
            <ArmorSvgWrapper key="head" type="head" style={svgStyle} />,
            <ArmorSvgWrapper key="chest" type="chest" style={svgStyle} />,
            <ArmorSvgWrapper key="arms" type="arms" style={svgStyle} />,
            <ArmorSvgWrapper key="waist" type="waist" style={svgStyle} />,
            <ArmorSvgWrapper key="legs" type="legs" style={svgStyle} />,
            <ArmorSvgWrapper key="talisman" type="talisman" style={svgStyle} />,
        ];
        const slotImg = <img className="armor-img" src={`images/slot4.png`} />;
        const defImg = <img className="def-icon" src={`images/defense.png`} />;
        // const defUpImg = <img key="talisman" className="armor-img" src={`images/defense-up.png`} />;

        return <Paper id="main1" className="table-paper">
            <TableContainer sx={{ maxHeight: "69vh", overflowY: "auto", width: '100%' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <StyledTableRow className="table-row">
                            {save && <StyledTableCell component="th" align="left">Name</StyledTableCell>}
                            <StyledTableCell align="left" component="th" style={{ textTransform: "capitalize" }}>
                                {customSlot === "slots" && slotImg}
                                {customSlot === "defense" && defImg}
                                <div style={{ display: 'inline', marginLeft: '4px' }}>{customSlot}</div>
                                {/* {<SwapIcon onClick={swapCustomSlot} />} */}
                            </StyledTableCell>
                            {isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{defImg} Defense</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[0]} Head</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[1]} Chest</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[2]} Arms</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[3]} Waist</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[4]} Legs</span></StyledTableCell>}
                            {!isMobile && <StyledTableCell align="left" component="th">
                                <span className="fspan">{armorImages[5]} Talisman</span></StyledTableCell>}
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {paginate(results, page, pageSize).map((result, index, arr) => renderResult(result, index, arr))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                className="pagination-row"
                component={PaginationBox}
                rowsPerPageOptions={pageOptions}
                colSpan={3}
                count={results.length}
                rowsPerPage={pageSize}
                labelRowsPerPage="" // ideally add words if screen wide enough
                page={page}
                slotProps={{
                    select: {
                        inputProps: {
                            'aria-label': 'rows per page',
                        },
                        native: false,
                        sx: { marginRight: '1em', marginLeft: '0em' },
                        title: "Rows Per Page",
                    }
                }}

                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
            />
        </Paper>;
    };

    elapsedSeconds = elapsedSeconds || -1;
    const skillsList = Object.entries(fields.skills || {}).map(([k, v]) => [`${k} Lv. ${v}`]).join(", ");
    const displayStr = `Results for ${skillsList} (${results.length.toLocaleString('en', { useGrouping: true })}` +
        ` hits in ${elapsedSeconds.toFixed(2)} seconds):`;
    const displayStrEmpty = `No skills specified.  ` +
        `Showing best slotted armor combos (${results.length.toLocaleString('en', { useGrouping: true })}` +
        ` hits in ${elapsedSeconds.toFixed(2)} seconds):`;
    const someArmorBlacklisted = fields.blacklistedArmor.length > 0;
    const someArmorMandatory = fields.mandatoryArmor.filter(x => x).length > 0;
    const someTypesBlacklisted = fields.blacklistedArmorTypes.length > 0;
    const shouldNotify = someArmorBlacklisted || someArmorMandatory || someTypesBlacklisted;

    return <div className="results">
        {renderSelectedResult()}
        {elapsedSeconds > 0 && <div style={{ marginBottom: '0.5em' }}>
            {shouldNotify && <span className="warn">Some armor is pinned/blacklisted - </span>}
            {!isEmpty(fields.slotFilters) && <span className="notice">Deco filters active - </span>}
            {skillsList ? displayStr : displayStrEmpty}
        </div>}
        {renderTable()}
    </div>;
};

Results.propTypes = {
    results: PropTypes.array.isRequired,
    elapsedSeconds: PropTypes.number,
    onSaveSet: PropTypes.func,
    save: PropTypes.bool, // if true, on saved sets page
};
export default Results;