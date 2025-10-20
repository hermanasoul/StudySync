import React from 'react';

const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Логотип */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-primary-600">StudySync</h1>
            </div>
            <nav className="hidden md:ml-6 md:flex space-x-8">
              <a href="/" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                Главная
              </a>
              <a href="/dashboard" className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium">
                Личный кабинет
              </a>
            </nav>
          </div>

          {/* Кнопки входа/регистрации */}
          <div className="flex items-center space-x-4">
            <a 
              href="/login" 
              className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm font-medium"
            >
              Вход
            </a>
            <a 
              href="/signup" 
              className="bg-primary-500 text-white hover:bg-primary-600 px-4 py-2 rounded-md text-sm font-medium"
            >
              Регистрация
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
