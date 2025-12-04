import React from 'react';
import ChatWidget from './components/ChatWidget';
import { PRODUCTS } from './data';
import ProductCard from './components/ProductCard';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <ChatWidget />
    </div>
  );
};

export default App;