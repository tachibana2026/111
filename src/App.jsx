import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Groups from './pages/Groups';
import LostFound from './pages/LostFound';
import Timetable from './pages/Timetable';
import AdminLogin from './pages/Admin/Login';
import GroupDashboard from './pages/Admin/GroupDashboard';
import HQDashboard from './pages/Admin/HQDashboard';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/groups" element={<Groups />} />
          <Route path="/timetable" element={<Timetable />} />
          <Route path="/lost-found" element={<LostFound />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<GroupDashboard />} />
          <Route path="/ryoun-hq-portal/dashboard" element={<HQDashboard />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
