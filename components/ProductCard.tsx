import React from 'react';
import { Product } from '../types';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className="flex bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-2 hover:shadow-md transition-shadow">
      <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
        <img 
          src={product.imageURL} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 flex flex-col justify-between flex-grow">
        <div>
          <h4 className="text-sm font-semibold text-gray-800 line-clamp-1">{product.name}</h4>
          <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm font-bold text-indigo-600">
            10 บาท
          </span>
          <button className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition-colors">
            View
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;