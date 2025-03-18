import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HEAD from "../data/detailed/armor/head.json";
import CHEST from "../data/detailed/armor/chest.json";
import ARMS from "../data/detailed/armor/arms.json";
import WAIST from "../data/detailed/armor/waist.json";
import LEGS from "../data/detailed/armor/legs.json";
import TALISMANS from "../data/detailed/talisman.json";
import DECORATIONS from "../data/compact/decoration.json";
import { areArmorSetsEqual, armorNameFormat, formatGroupSkills, formatSetSkills, getArmorFromNames, getDecosFromNames, paginate } from '../util/util';
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
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
import { Button, IconButton } from '@mui/material';
import SKILLS from '../data/skills/skills.json';
import { isEmpty } from '../util/tools';

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

const Results = ({ results, skills, elapsedSeconds, showDecoSkills }) => {
    const [selectedResult, setSelectedResult] = useState();
    const [allArmor, setAllArmor] = useState([]);

    const [pageResults, setPageResults] = useState([]);
    const [page, setPage] = useState(-1);
    const [pageSize, setPageSize] = useState(100);
    const [customSlot, setCustomSlot] = useState("slots"); // or defense
    const [savedSets, setSavedSets] = useState([]);

    useEffect(() => {
        const all = [...HEAD, ...CHEST, ...ARMS, ...WAIST, ...LEGS, ...TALISMANS];
        setAllArmor(all);
    }, []);

    useEffect(() => {

    }, [page, results]);

    useEffect(() => {
        setPage(0);
    }, [pageSize]);

    useEffect(() => {
        setSelectedResult(undefined);
    }, [results]);

    const swapCustomSlot = () => {
        if (customSlot === "defense") {
            setCustomSlot("slots");
        } else {
            setCustomSlot("defense");
        }
    };

    const renderDefense = result => {
        return <div className="defense">
            {result.defense}
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

        return <StyledTableRow key={result.id}
            onClick={() => {
                if (selectedResult?.id === result.id) {
                    setSelectedResult(undefined);
                } else {
                    setSelectedResult(result);
                }
            }}
            sx={{ '&:last-child td, &:last-child th': { border: 0 }, "backgroundColor": highlighted ? '#f8e7be !important' : '' }}>
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
                const type = armorTypeMap[i];
                return <div className="armor-piece" key={type}>
                    <img className="armor-img2" src={`images/armor/${type}-${armor.rarity}.png`} />
                    <span className="armor-name">{armor.name}</span>
                    {renderArmorSlots(armor.slots)}
                    <span className="armor-skills">{armor.skills}</span>
                </div>;
            })}
        </div>;
    };

    const renderSelectedResult = () => {
        const hasSelectedResult = Boolean(selectedResult);

        // todo: edit accordion button class to cursor: default
        let details = <AccordionDetails sx={{ cursor: 'default' }} />;
        let summary = <Typography sx={{ marginLeft: '-1em', fontSize: '20px', fontWeight: 'bold', cursor: 'default' }}>
            {results.length > 0 ? "Click on a set below to see details." : "Add skills above and 'Search' to get armor sets."}
        </Typography>;
        let setEffects = null;
        let groupSkills = null;
        let setSpacer = null;
        let freeSlots = null;
        if (selectedResult) {
            const decos = getDecosFromNames(selectedResult.decoNames, showDecoSkills);
            const armor = getArmorFromNames(selectedResult.armorNames);

            summary = renderDecos(decos);
            details = renderArmor(armor);
            const setExist = !isEmpty(selectedResult.setSkills);
            const groupExist = !isEmpty(selectedResult.groupSkills);
            setSpacer = setExist || groupExist ? <div style={{ marginTop: '1em' }}></div> : setSpacer;

            if (setExist) {
                const setMagic = formatSetSkills(selectedResult.setSkills);
                setEffects = <div className="set-skills">
                    <span className="set-label">Set Skills:</span>
                    <span className="set-names set-color">{setMagic}</span>
                </div>;
            }
            if (groupExist) {
                const groupMagic = formatGroupSkills(selectedResult.groupSkills);
                groupSkills = <div className="group-skills">
                    <span className="set-label">Group Skills:</span>
                    <span className="set-names group-color">{groupMagic}</span>
                </div>;
            }

            freeSlots = renderSlots(selectedResult);
        }

        const isSaved = savedSets.filter(x => areArmorSetsEqual(x.armorNames, selectedResult.armorNames))[0];

        return <div style={{ marginBottom: '1em' }}>
            <Accordion expanded={hasSelectedResult} elevation={hasSelectedResult ? 2 : 0}
                sx={{ width: 'auto', backgroundColor: hasSelectedResult ? "#f0f1ff" : "transparent" }}>
                <AccordionSummary
                    expandIcon={null}
                    aria-controls="panel1-content"
                    id="panel1-header"
                    sx={{ cursor: 'default', marginBottom: '1em' }}
                >
                    {summary}
                </AccordionSummary>
                {details}
                {setSpacer}
                {setEffects}
                {groupSkills}
                <div className="free-slots-holder">
                    <span className="set-label">Free Slots:</span>
                    <div className="free-holder">{freeSlots}</div>
                </div>
                <Button className="save-set-button" variant="outlined" color={isSaved ? 'error' : 'info'}>
                    {isSaved ? "Remove From Saved Sets" : "Save Armor Set"}
                </Button>
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

        const armorImages = [
            <img key="head" className="armor-img" src={`images/armor/head-1.png`} />,
            <img key="chest" className="armor-img" src={`images/armor/chest-1.png`} />,
            <img key="arms" className="armor-img" src={`images/armor/arms-1.png`} />,
            <img key="legs" className="armor-img" src={`images/armor/legs-1.png`} />,
            <img key="waist" className="armor-img" src={`images/armor/waist-1.png`} />,
            <img key="talisman" className="armor-img" src={`images/armor/talisman-1.png`} />,
        ];
        const slotImg = <img className="armor-img" src={`images/slot4.png`} />;
        const defImg = <img className="def-icon" src={`images/defense.png`} />;
        // const defUpImg = <img key="talisman" className="armor-img" src={`images/defense-up.png`} />;

        return <Paper id="main1" className="table-paper">
            <TableContainer sx={{ maxHeight: "69vh", overflowY: "auto", width: '100%' }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <StyledTableRow>
                            <StyledTableCell align="left" style={{ textTransform: "capitalize" }}>
                                {customSlot === "slots" && slotImg}
                                {customSlot === "defense" && defImg}
                                <div style={{ display: 'inline', marginLeft: '4px' }}>{customSlot}</div>
                                {/* {<SwapIcon onClick={swapCustomSlot} />} */}
                            </StyledTableCell>
                            <StyledTableCell align="left">{armorImages[0]} Head</StyledTableCell>
                            <StyledTableCell align="left">{armorImages[1]} Chest</StyledTableCell>
                            <StyledTableCell align="left">{armorImages[2]} Arms</StyledTableCell>
                            <StyledTableCell align="left">{armorImages[3]} Legs</StyledTableCell>
                            <StyledTableCell align="left">{armorImages[4]} Waist</StyledTableCell>
                            <StyledTableCell align="left">{armorImages[5]} Talisman</StyledTableCell>
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

    const skillsList = Object.entries(skills).map(([k, v]) => [`${k} Lv. ${v}`]).join(", ");
    const displayStr = `Results for ${skillsList} (${results.length.toLocaleString('en', { useGrouping: true })}` +
        ` hits in ${elapsedSeconds.toFixed(2)} seconds):`;

    return <div className="results">
        {renderSelectedResult()}
        {elapsedSeconds > 0 && <div style={{ marginBottom: '0.5em' }}>
            {displayStr}
        </div>}
        {renderTable()}
    </div>;
};

Results.propTypes = {
    results: PropTypes.array.isRequired,
    skills: PropTypes.object.isRequired,
    elapsedSeconds: PropTypes.number,
    showDecoSkills: PropTypes.bool
};
export default Results;