/* eslint-disable max-len */
import PropTypes from 'prop-types';
import HeadSVG from '../svg/HeadSvg';
import ChestSVG from '../svg/ChestSvg';
import ArmsSVG from '../svg/ArmsSvg';
import WaistSVG from '../svg/WaistSvg';
import LegsSVG from '../svg/LegsSvg';
import TalismanSVG from '../svg/TalismanSvg';

const typeMap = {
    head: <HeadSVG />,
    chest: <ChestSVG />,
    arms: <ArmsSVG />,
    waist: <WaistSVG />,
    legs: <LegsSVG />,
    talisman: <TalismanSVG />
};

const ArmorSvgWrapper = ({ type, rarity = 1, style = {} }) => {
    return <div className={`svg-armor-${rarity} svg-armor`} style={ style }>
        {typeMap[type]}
    </div>;
};

ArmorSvgWrapper.propTypes = {
    type: PropTypes.string.isRequired,
    rarity: PropTypes.number,
    style: PropTypes.object,
};
export default ArmorSvgWrapper;