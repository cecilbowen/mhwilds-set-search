import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import HEAD from "../data/detailed/armor/head.json";
import CHEST from "../data/detailed/armor/chest.json";
import ARMS from "../data/detailed/armor/arms.json";
import WAIST from "../data/detailed/armor/waist.json";
import LEGS from "../data/detailed/armor/legs.json";
import TALISMANS from "../data/detailed/talisman.json";
import DECORATIONS from "../data/compact/decoration.json";
import { paginate } from '../util/util';
import Accordion from '@mui/material/Accordion';
import AccordionActions from '@mui/material/AccordionActions';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TablePagination from '@mui/material/TablePagination';

const Results = ({ results, skills, elapsedSeconds }) => {
    const [selectedResult, setSelectedResult] = useState();
    const [allArmor, setAllArmor] = useState([]);

    const [pageResults, setPageResults] = useState([]);
    const [page, setPage] = useState(-1);
    const [pageSize, setPageSize] = useState(100);

    useEffect(() => {
        const all = [...HEAD, ...CHEST, ...ARMS, ...WAIST, ...LEGS, ...TALISMANS];
        setAllArmor(all);
    }, []);

    useEffect(() => {
        updatePageResults();
    }, [page]);

    useEffect(() => {
        setPage(0);
    }, [pageSize]);

    useEffect(() => {
        if (results && results.length > 0) {
            setPage(0);
        }
    }, [results]);

    const updatePageResults = () => {
        setPageResults(paginate(results, page, pageSize));
    };

    const armorTypeArr = ['head', 'chest', 'arms', 'waist', 'legs', 'talisman'];
    const renderArmor = (name, index) => {
        const tt = armorTypeArr[index];
        let detailedArmor = allArmor.filter(x => x.name === name)[0];
        if (!detailedArmor) {
            console.warn("couldn't find detailed armor", name);
            detailedArmor = { rarity: 1 };
        }

        return <div className="armor" key={`${name}-${tt}`}>
            <img className="armor-img" src={`images/armor/${tt}-${detailedArmor.rarity}.png`} />
            {name}
        </div>;
    };

    const renderArmorSet = armorSet => {
        return <div className="armor-list">
            {armorSet.map((name, index) => renderArmor(name, index))}
        </div>;
    };

    const renderDefense = defense => {
        return <div className="defense">
            {defense}
        </div>;
    };

    const renderResult = result => {
        const highlighted = result.id === selectedResult?.id;

        return <div className="result" key={result.id} onClick={() => setSelectedResult(result)}>
            {renderDefense(result.defense)}
            {renderArmorSet(result.armorNames)}
        </div>;
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
        console.log('newPage', newPage);
    };

    const handleChangeRowsPerPage = event => {
        setPageSize(parseInt(event.target.value, 10));
    };

    const renderSelectedResult = () => {
        const hasSelectedResult = Boolean(selectedResult);

        return <div style={{ marginBottom: '1em' }}>
            <Accordion expanded={hasSelectedResult} elevation={hasSelectedResult ? 2 : 0}>
                <AccordionSummary
                    expandIcon={null}
                    aria-controls="panel1-content"
                    id="panel1-header"
                >
                    <TablePagination
                        rowsPerPageOptions={[20, 50, 100, { label: 'All', value: -1 }]}
                        colSpan={3}
                        count={results.length}
                        rowsPerPage={pageSize}
                        labelRowsPerPage="Results per page"
                        page={page}
                        component="div"
                        slotProps={{
                            select: {
                                inputProps: {
                                    'aria-label': 'rows per page',
                                },
                                native: true,
                            },
                        }}
                        onPageChange={handleChangePage}
                        onRowsPerPageChange={handleChangeRowsPerPage}
                        // ActionsComponent={TablePaginationActions}
                    />
                    <Typography component="span">Accordion 1</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Suspendisse
                    malesuada lacus ex, sit amet blandit leo lobortis eget.
                </AccordionDetails>
            </Accordion>
        </div>;
    };

    return <div className="results">
        {renderSelectedResult()}
        {elapsedSeconds > 0 && <div>
            Showing {pageResults.length} out of {results.length} total results ({elapsedSeconds.toFixed(2)} seconds).
        </div>}
        {pageResults.map(x => renderResult(x))}
    </div>;
};

Results.propTypes = {
    results: PropTypes.array.isRequired,
    skills: PropTypes.object.isRequired,
    elapsedSeconds: PropTypes.number
};
export default Results;