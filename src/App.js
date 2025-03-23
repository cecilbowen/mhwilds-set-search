import { useState, useEffect } from "react";
import "./App.css";
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Search from "./components/Search";
import CustomTabPanel from "./components/CustomTabPanel";
import SavedSets from "./components/SavedSets";
import DecoInventory from "./components/DecoInventory";
import Settings from "./components/Settings";
import { getFromLocalStorage } from "./util/util";
import { DEBUG } from "./util/constants";
import { runAllTests } from "./util/logic";

const App = () => {
  const [tab, setTab] = useState(0);
  const [hideSource, setHideSource] = useState(false);

  const reSource = () => {
    const loadedSource = getFromLocalStorage('hideSource') ?? hideSource;
    setHideSource(loadedSource);
  };

  useEffect(() => {
    if (DEBUG) {
      window.runAllTests = runAllTests;
    }
  }, []);

  useEffect(() => {
    reSource();
  }, [hideSource]);

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
    "Saved Sets": 1,
    "Decorations": 2,
    "Settings": 3
  };

  const renderTab = (name, index) => {
    return <Tab key={name} label={name} {...tabProps(index)} />;
  };

  const source = "https://github.com/cecilbowen/mhwilds-set-search";
  const github = <img src={`images/github.png`} style={{ width: '14px', height: '14px' }} />;
  return (
    <div className="App">
      <Tabs value={tab} onChange={handleTabChange} aria-label="tabs" variant="scrollable"
        allowScrollButtonsMobile className="tab-root">
        {Object.entries(tabs).map(([name, index]) => renderTab(name, index))}
        {!hideSource && <Tab label={"Source Code"} icon={github} iconPosition="start"
          sx={{ color: '#873777', minHeight: 'unset' }}
          value="external" onClick={e => e.preventDefault()} />}
      </Tabs>
      <CustomTabPanel value={tab} index={0}><Search /></CustomTabPanel>
      <CustomTabPanel value={tab} index={1}>
        <SavedSets />
      </CustomTabPanel>
      <CustomTabPanel value={tab} index={2}><DecoInventory /></CustomTabPanel>
      <CustomTabPanel value={tab} index={3}><Settings onSourceChanged={reSource} /></CustomTabPanel>
    </div>
  );
};

export default App;
