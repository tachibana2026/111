import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Groups from './pages/Groups';
import Map from './pages/Map';
import LostFound from './pages/LostFound';
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
          <Route path="/map" element={<Map />} />
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
