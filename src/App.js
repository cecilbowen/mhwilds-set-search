import "./App.css";
import * as TEST from "./test/tests";
import { runAllTests, search } from "./util/logic";

const App = () => {
  const generate = () => {
    const results = search(TEST.testSingle);
    console.log('results', results, results.length);
  };

  return (
    <div className="App">
      <button onClick={generate}>test</button>
      <button onClick={runAllTests}>run all tests</button>
    </div>
  );
};

export default App;
