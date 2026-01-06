import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './pages/Header';
import Footer from './pages/Footer';
// Importa le pagine (aggiungi i files .tsx)
import Homepage from './pages/Homepage';
import Product from './pages/Product';
import Contatti from './pages/Contact';
import About from './pages/About';
import Login from './pages/Login';
import EditProducts from './pages/EditProducts';
import ManageOrders from './pages/ManageOrders';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-900">
        <Header />{}
          <main className="flex-1 p-4">
          <Routes>
            <Route path="/" element={<Homepage />} />
            <Route path="/product" element={<Product />} />
            <Route path="/contact" element={<Contatti />} />
            <Route path="/about" element={<About />} />
            <Route path="/login" element={<Login />} />
              <Route path="/admin/products" element={<EditProducts />} />
              <Route path="/admin/orders" element={<ManageOrders />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
