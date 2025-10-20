import React from 'react';
import Header from '../components/Header';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      
      {/* ???Герой секция */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Учитесь вместе - 
            <span className="text-primary-600"> эффективнее</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Создавайте группы, делитесь заметками и готовьтесь к экзаменам вместе. 
            StudySync делает обучение социальным и продуктивным.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/signup" 
              className="bg-primary-500 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary-600 transition-colors"
            >
              Начать бесплатно
            </a>
            <a 
              href="/login" 
              className="border border-primary-500 text-primary-500 px-8 py-3 rounded-lg text-lg font-semibold hover:bg-primary-50 transition-colors"
            >
              Уже есть аккаунт
            </a>
          </div>
        </div>

        {/* Преимущества */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Создавайте группы</h3>
            <p className="text-gray-600">Объединяйтесь с однокурсниками для совместной подготовки</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📝</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Общие заметки</h3>
            <p className="text-gray-600">Делитесь материалами и работайте над конспектами вместе</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Карточки и тесты</h3>
            <p className="text-gray-600">Создавайте флеш-карточки и проверяйте знания с помощью тестов</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
