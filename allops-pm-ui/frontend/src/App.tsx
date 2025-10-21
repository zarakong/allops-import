import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Report from './pages/Report';
import Customer from './pages/Customer';
import TaskPM from './pages/TaskPM';
import UploadPM from './pages/UploadPM';

const App: React.FC = () => {
  return (
    <Router>
      <div style={{ display: 'flex' }}>
        <Sidebar />
        <div style={{ flex: 1, padding: '20px' }}>
          <Switch>
            <Route path="/report" component={Report} />
            <Route path="/customer" component={Customer} />
            <Route path="/task-pm" component={TaskPM} />
            <Route path="/upload-pm" component={UploadPM} />
            <Route path="/" exact component={Report} />
          </Switch>
        </div>
      </div>
    </Router>
  );
};

export default App;