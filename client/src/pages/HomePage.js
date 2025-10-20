import React from 'react';
import Header from '../components/Header';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Учитесь вместе - 
            <span className="text-blue-600"> эффективнее</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Создавайте группы, делитесь заметками и готовьтесь к экзаменам вместе. 
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/signup" className="bg-blue-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600">
              Начать бесплатно
            </a>
            <a href="/login" className="border border-blue-500 text-blue-500 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-50">
              Уже есть аккаунт
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
