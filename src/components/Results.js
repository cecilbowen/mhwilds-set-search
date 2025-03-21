import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
    areArmorSetsEqual, armorNameFormat, formatGroupSkills, formatSetSkills,
    generateWikiString,
    getArmorColorHue,
    getArmorDefenseFromName, getArmorDefenseFromNames, getArmorFromNames, getDecosFromNames,
    getFromLocalStorage, paginate, saveArmorSet, saveToLocalStorage
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
import { Button, TextField } from '@mui/material';
import SKILLS from '../data/skills/skills.json';
import { isEmpty } from '../util/tools';
import Pin from '@mui/icons-material/PushPin';
import Unpin from '@mui/icons-material/PushPinOutlined';
import Exclude from '@mui/icons-material/Block';
import Undo from '@mui/icons-material/Undo';
import Edit from '@mui/icons-material/DriveFileRenameOutline';
import Close from '@mui/icons-material/DisabledByDefault';
import ArmorSvgWrapper from './ArmorSvgWrapper';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
    [`&.${tableCellClasses.head}`]: {
        backgroundColor: theme.palette.common.black,
        color: theme.palette.common.white,
    },
    [`&.${tableCellClasses.body}`]: {
        fontSize: 14,
    },
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
    }
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
    position: absolute;
    top: 5px;
    right: 2px;
`;

const Results = ({
    results, skills, slotFilters, elapsedSeconds, showDecoSkills, mandatoryArmor,
    blacklistedArmor, blacklistedArmorTypes, pin, exclude,
    onSaveSet, save, showGroupSkills
}) => {
    const [selectedResult, setSelectedResult] = useState();
    const [allArmor, setAllArmor] = useState([]);

    const [pageResults, setPageResults] = useState([]);
    const [page, setPage] = useState(-1);
    const [pageSize, setPageSize] = useState(100);
    const [customSlot, setCustomSlot] = useState("slots"); // or defense
    const [savedSets, setSavedSets] = useState([]);
    const [editingName, setEditingName] = useState(false);

    useEffect(() => {
        // if (!save) {
        const tempSets = getFromLocalStorage('savedSets');
        setSavedSets(tempSets);
        // }

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

    const [isShiftPressed, setIsShiftPressed] = useState(false);
    const [isCtrlPressed, setIsCtrlPressed] = useState(false);
    const [isMouseInside, setIsMouseInside] = useState(false);

    useEffect(() => {

    }, [page, results]);

    useEffect(() => {
        setPage(0);
    }, [pageSize]);

    useEffect(() => {
        setSelectedResult(undefined);
    }, [results]);

    useEffect(() => {
        if (!selectedResult) {
            setEditingName(false);
        }
    }, [selectedResult]);

    useEffect(() => {
        if (editingName) {
            const el = document.getElementById("edit-name").focus();
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
            searchedSkills: skills
        });
        if (tempSets) {
            setSavedSets(tempSets);
        }

        if (onSaveSet) {
            onSaveSet();
        }
    };

    const updateSetName = ev => {
        if (!selectedResult) { return; }
        const tempSavedSets = (getFromLocalStorage('savedSets') || savedSets || []).filter(x => x.id !== selectedResult.id);
        const tempSelectedResult = { ...selectedResult, name: ev.target.value };
        tempSavedSets.push(tempSelectedResult);
        saveToLocalStorage('savedSets', tempSavedSets);
        setSavedSets(tempSavedSets);
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
            {defense.upgraded}
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

    const renderResult = result => {
        const highlighted = result.id === selectedResult?.id;
        const armorNames = result.armorNames;
        const theName = savedSets?.filter(x => x.id === result?.id)[0]?.name || "Unnamed Set";

        return <StyledTableRow key={result.id}
            onClick={() => {
                if (selectedResult?.id === result.id) {
                    setSelectedResult(undefined);
                } else {
                    setSelectedResult(result);
                }
            }}
            sx={{ '&:last-child td, &:last-child th': { border: 0 }, "backgroundColor": highlighted ? '#f8e7be !important' : '' }}>
            {save && <StyledTableCell align="left">{theName}</StyledTableCell>}
            <StyledTableCell align="left">
                {customSlot === "slots" && renderSlots(result)}
                {customSlot === "defense" && renderDefense(result)}
            </StyledTableCell>
            <StyledTableCell align="left" component="th" scope="row">{armorNameFormat(armorNames[0])}</StyledTableCell>
            <StyledTableCell align="left">{armorNameFormat(armorNames[1])}</StyledTableCell>
            <StyledTableCell align="left">{armorNameFormat(armorNames[2])}</StyledTableCell>
            <StyledTableCell align="left">{armorNameFormat(armorNames[3])}</StyledTableCell>
            <StyledTableCell align="left">{armorNameFormat(armorNames[4])}</StyledTableCell>
            <StyledTableCell align="left">{armorNameFormat(armorNames[5])}</StyledTableCell>
        </StyledTableRow>;
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = event => {
        setPageSize(parseInt(event.target.value, 10));
    };

    const wikiSearch = () => {
        if (!selectedResult) { return; }
        const wiki = generateWikiString(
            selectedResult.skills, selectedResult.setSkills, selectedResult.groupSkills,
            slotFilters
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
                const skillIcons = deco.skillNames.map(x => SKILLS.filter(y => y.name === x)[0].icon);
                const singleIcon = skillIcons[0]; // todo: change this should armor decos ever have more than 1 skill each

                return <div key={deco.key} className="deco" title={deco.altText}>
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

    const renderArmor = armorSet => {
        const armorTypeMap = ["head", "chest", "arms", "waist", "legs", "talisman"];

        return <div className="armor-holder">
            {armorSet.map((armor, i) => {
                const defense = getArmorDefenseFromName(armor.name);
                const type = armorTypeMap[i];
                const isBlacklisted = blacklistedArmor.includes(armor.name);
                const isMandatory = mandatoryArmor.includes(armor.name);
                const isTypeBlacklisted = blacklistedArmorTypes.includes(armorTypeMap[i]);
                const pinFunc = () => pin(armor.name, type);
                const disabled = armor.name.toLowerCase() === "none";
                const excludeFunc = () => exclude(armor.name);
                const armorHue = getArmorColorHue(armor.rarity);
                const style = disabled ? { color: 'gray', cursor: 'default', backgroundColor: 'transparent !important' } : {};

                return <div className="armor-piece" key={type}>
                    {isMandatory ? <UnpinIcon sx={style} title="Un-pin" onClick={pinFunc} /> :
                        <PinIcon sx={style} title="Pin" onClick={pinFunc} />}
                    {isBlacklisted ? <UndoExcludeIcon sx={style} title="Undo Exclude"
                        onClick={excludeFunc} /> : <ExcludeIcon sx={style} title="Exclude" onClick={excludeFunc} />}
                    <ArmorSvgWrapper type={type} rarity={armor.rarity} />
                    <span className="armor-name">{armor.name}</span>
                    {type !== "talisman" && <div className="def-holder">
                        <img className="armor-def-img" src={`images/defense-up.png`} />
                        <div className="def-value">{defense?.upgraded || 0}</div>
                    </div>}
                    {renderArmorSlots(armor.slots)}
                    <span className="armor-skills">{armor.skills}</span>
                </div>;
            })}
        </div>;
    };

    const renderSelectedResult = () => {
        const hasSelectedResult = Boolean(selectedResult);
        const pageStr = save ? "Your saved sets will appear below." : "Add skills above and tap 'Search' to get armor sets.";
        const theName = (savedSets || []).filter(x => x.id === selectedResult?.id)[0]?.name;

        const mySetName = theName || "Unnamed Set";
        const nameEl = save ? <Typography className="edit-name" sx={{ cursor: "pointer !important" }}
            onClick={() => setEditingName(true)}
            title="Click to rename set">
            <EditIcon />{mySetName}</Typography> : null;
        const editNameEl = <TextField id="edit-name" label="Rename Set"
            onKeyDown={handleEditKeyDown}
            onFocus={e => e.target.select()}
            onBlur={updateSetName} sx={{ transform: 'translateY(-7px)' }}
            variant="standard" defaultValue={mySetName} />;
        let details = <AccordionDetails sx={{ cursor: 'default' }} />;
        let summary = <Typography sx={{ marginLeft: '-1em', fontSize: '20px', fontWeight: 'bold', cursor: 'default' }}>
            {results.length > 0 ? "Click on a set below to see details." : pageStr}
        </Typography>;
        let setEffects = null;
        let groupSkills = null;
        let freeSlots = null;
        let defenseTotal = null;
        if (selectedResult) {
            const decos = getDecosFromNames(selectedResult.decoNames, showDecoSkills);
            const armor = getArmorFromNames(selectedResult.armorNames);
            const defense = getArmorDefenseFromNames(selectedResult.armorNames);

            summary = renderDecos(decos);
            details = renderArmor(armor);
            const setExist = !isEmpty(selectedResult.setSkills);
            const groupExist = !isEmpty(selectedResult.groupSkills);
            // setSpacer = setExist || groupExist ? <div style={{ marginTop: '1em' }}></div> : setSpacer;

            defenseTotal = <div className="def-total-holder">
                <span className="set-label" style={{ transform: 'translateY(-2px)' }}>Defense:</span>
                <img className="armor-def-img" src={`images/defense-up.png`} />
                <div className="def-value">{defense.upgraded}</div>
                <div className="def-value base">({defense.base} base)</div>
            </div>;

            if (setExist) {
                const setMagic = formatSetSkills(selectedResult.setSkills, showGroupSkills);
                setEffects = <div className="set-skills">
                    <span className="set-label">Set Skills:</span>
                    <span className="set-names set-color">{setMagic}</span>
                </div>;
            }
            if (groupExist) {
                const groupMagic = formatGroupSkills(selectedResult.groupSkills, showGroupSkills);
                groupSkills = <div className="group-skills">
                    <span className="set-label">Group Skills:</span>
                    <span className="set-names group-color">{groupMagic}</span>
                </div>;
            }

            freeSlots = renderSlots(selectedResult);
        }

        const savedVar = save ? results : savedSets;

        const isSaved = !selectedResult ? false :
            (savedVar || []).filter(x => areArmorSetsEqual(x.armorNames, selectedResult.armorNames))[0];

        const queueUpSkills = () => {
            if (!selectedResult && !selectedResult.searchedSkills) { return; }

            const mySkills = isShiftPressed ? selectedResult.searchedSkills : {
                ...selectedResult.skills, ...selectedResult.setSkills, ...selectedResult.groupSkills
            };

            if (!isEmpty(mySkills)) {
                // saveToLocalStorage('skills', selectedResult.searchedSkills);
                saveToLocalStorage('skills', mySkills);
                window.snackbar.createSnackbar(`Added skills to search tab`, {
                    timeout: 3000
                });
            }
        };

        const searchTargetTitle = isShiftPressed ? "Set only skills used to find this set as the search target" :
            "Set all skills from this set as the search target";

        return <div style={{ marginBottom: '1em' }}
            onMouseEnter={() => setIsMouseInside(true)}
            onMouseLeave={() => setIsMouseInside(false)}
        >
            <Accordion expanded={hasSelectedResult} elevation={hasSelectedResult ? 2 : 0}
                sx={{ width: 'auto', backgroundColor: hasSelectedResult ? "#f0f1ff" : "transparent" }}>
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
                {details}
                {defenseTotal}
                {setEffects}
                {groupSkills}
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
                {isCtrlPressed && isMouseInside && <Button className="save-set-button"
                    title="Search for these skills on the wiki armor set search instead"
                    onClick={wikiSearch}
                    variant="outlined" color="warning">
                    Search Wiki
                </Button>}
                <CloseIcon onClick={() => setSelectedResult(undefined)} />
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
                        <StyledTableRow>
                            {save && <StyledTableCell align="left">Name</StyledTableCell>}
                            <StyledTableCell align="left" style={{ textTransform: "capitalize" }}>
                                {customSlot === "slots" && slotImg}
                                {customSlot === "defense" && defImg}
                                <div style={{ display: 'inline', marginLeft: '4px' }}>{customSlot}</div>
                                {/* {<SwapIcon onClick={swapCustomSlot} />} */}
                            </StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[0]} Head</span></StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[1]} Chest</span></StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[2]} Arms</span></StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[3]} Waist</span></StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[4]} Legs</span></StyledTableCell>
                            <StyledTableCell align="left"><span className="fspan">{armorImages[5]} Talisman</span></StyledTableCell>
                        </StyledTableRow>
                    </TableHead>
                    <TableBody>
                        {paginate(results, page, pageSize).map(result => renderResult(result))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
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
                        native: true,
                        sx: { marginRight: '1em', marginLeft: '0em' },
                        title: "Rows Per Page"
                    },
                }}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                ActionsComponent={TablePaginationActions}
            />
        </Paper>;
    };

    elapsedSeconds = elapsedSeconds || -1;
    const skillsList = Object.entries(skills || {}).map(([k, v]) => [`${k} Lv. ${v}`]).join(", ");
    const displayStr = `Results for ${skillsList} (${results.length.toLocaleString('en', { useGrouping: true })}` +
        ` hits in ${elapsedSeconds.toFixed(2)} seconds):`;
    const displayStrEmpty = `No skills specified.  ` +
        `Showing best slotted armor combos (${results.length.toLocaleString('en', { useGrouping: true })}` +
        ` hits in ${elapsedSeconds.toFixed(2)} seconds):`;
    const someArmorBlacklisted = blacklistedArmor.length > 0;
    const someArmorMandatory = mandatoryArmor.filter(x => x).length > 0;
    const someTypesBlacklisted = blacklistedArmorTypes.length > 0;
    const shouldNotify = someArmorBlacklisted || someArmorMandatory || someTypesBlacklisted;

    return <div className="results">
        {renderSelectedResult()}
        {elapsedSeconds > 0 && <div style={{ marginBottom: '0.5em' }}>
            {shouldNotify && <span className="warn">Some armor is pinned/blacklisted - </span>}
            {!isEmpty(slotFilters) && <span className="notice">Deco filters active - </span>}
            {skillsList ? displayStr : displayStrEmpty}
        </div>}
        {renderTable()}
    </div>;
};

Results.propTypes = {
    results: PropTypes.array.isRequired,
    skills: PropTypes.object.isRequired,
    slotFilters: PropTypes.object, // really only used for wikiSearch here
    elapsedSeconds: PropTypes.number,
    showDecoSkills: PropTypes.bool,
    showGroupSkills: PropTypes.bool,
    mandatoryArmor: PropTypes.array,
    blacklistedArmor: PropTypes.array,
    blacklistedArmorTypes: PropTypes.array,
    pin: PropTypes.func,
    exclude: PropTypes.func,
    onSaveSet: PropTypes.func,
    save: PropTypes.bool, // if true, on saved sets page
};
export default Results;