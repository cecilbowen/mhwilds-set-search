import { useState, useEffect } from "react";
import "./App.css";
import SkillsPicker from "./components/SkillsPicker";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import * as TEST from "./test/tests";
import { runAllTests, search } from "./util/logic";
import SKILLS from './data/compact/skills.json';
import Search from "./components/Search";
import CustomTabPanel from "./components/CustomTabPanel";

const DEFAULT_DISPLAY_LIMIT = 500;

const App = () => {
  const [skills, setSkills] = useState({});
  const [setEffects, setSetEffects] = useState({});
  const [groupSkills, setGroupSkills] = useState({});
  const [decoInventory, setDecoInventory] = useState({});
  const [blacklistedArmor, setBlacklistedArmor] = useState(['', '', '', '', '', '']);
  const [blacklistedArmorTypes, setBlacklistedArmorTypes] = useState([]);

  const [dontUseDecos, setDontUseDecos] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(DEFAULT_DISPLAY_LIMIT);
  const [showDecoSkillNames, setShowDecoSkillNames] = useState(false);
  const [showGroupSkillNames, setShowGroupSkillNames] = useState(false);

  const [tab, setTab] = useState(0);

  const generate = () => {
    const results = search(TEST.testMandatory);
    console.log('results', results, results.length);
  };

  const addSkill = (skillName, level) => {
    const tempSkills = { ...skills };
    tempSkills[skillName] = level || SKILLS[skillName];
    setSkills(tempSkills);
  };

  const tabProps = index => {
    return {
      "id": `simple-tab-${index}`,
      'aria-controls': `simple-tabpanel-${index}`,
    };
  };

  const handleTabChange = (event, newValue) => {
    if (newValue === "external") {
      window.open(source, '_blank');
      return;
    }

    setTab(newValue);
  };

  const tabs = {
    "Search": 0,
    "Decorations": 1,
    "Settings": 2,
    "Saved Sets": 3
  };

  const renderTab = (name, index) => {
    return <Tab key={name} label={name} {...tabProps(index)} />;
  };

  const source = "https://github.com/cecilbowen/mhwilds-set-search";
  return (
    <div className="App">
      <Tabs value={tab} onChange={handleTabChange} aria-label="tabs" variant="scrollable">
        {Object.entries(tabs).map(([name, index]) => renderTab(name, index))}
        <Tab label={"Source Code"} value="external" onClick={e => e.preventDefault()} />
      </Tabs>
      <CustomTabPanel value={tab} index={0}><Search /></CustomTabPanel>
      <CustomTabPanel value={tab} index={1}>Tab Two Content</CustomTabPanel>
      <CustomTabPanel value={tab} index={2}>Tab Three Content</CustomTabPanel>
      <CustomTabPanel value={tab} index={3}>Tab Four Content</CustomTabPanel>
    </div>
  );
};

export default App;
