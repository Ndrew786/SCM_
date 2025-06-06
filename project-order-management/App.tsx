
import React, { useState, useCallback, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import OrdersPage from './components/OrdersPage';
import { SupplierPricePage } from './components/SupplierPricePage';
import DashboardPage from './components/DashboardPage';
import { Page, Order } from './types';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<Page>(Page.Home);
  
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const savedOrders = localStorage.getItem('projectOrders');
      return savedOrders ? JSON.parse(savedOrders) : [];
    } catch (error) {
      console.error("Error parsing orders from localStorage:", error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('projectOrders', JSON.stringify(orders));
    } catch (error) {
      console.error("Error saving orders to localStorage:", error);
    }
  }, [orders]);


  const handleLogin = useCallback((username: string, pass: string) => {
    if (username === 'user' && pass === 'password') {
      setIsLoggedIn(true);
      setLoginError(null);
      setActivePage(Page.Home); 
    } else {
      setLoginError('Invalid username or password. Try "user" and "password".');
      setIsLoggedIn(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    setIsLoggedIn(false);
    setActivePage(Page.Home); 
    setOrders([]); 
    localStorage.removeItem('projectOrdersGoogleSheetUrl');
    localStorage.removeItem('projectOrdersLastRefreshTime');
  }, []);

  const NavLink: React.FC<{ page: Page; current: Page; onClick: (page: Page) => void; children: React.ReactNode; icon?: React.ReactNode }> = ({ page, current, onClick, children, icon }) => {
    const isActive = page === current;
    return (
      <button
        onClick={() => onClick(page)}
        className={`flex items-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 ease-in-out group
                    ${isActive 
                      ? 'bg-sky-600 text-white shadow-lg transform scale-105' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white focus:bg-slate-700 focus:text-white'
                    }
                    focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-75`}
        aria-current={isActive ? 'page' : undefined}
      >
        {icon}
        <span>{children}</span>
      </button>
    );
  };
  
  const PlaceholderPage: React.FC<{ title: string; icon?: React.ReactNode }> = ({ title, icon }) => (
    <div className="p-6 md:p-10 lg:p-12">
      <header className="mb-8 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-sky-100 text-sky-600 rounded-full mb-4 text-3xl">
          {icon || (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          )}
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">{title}</h1> 
        <p className="mt-3 text-lg text-slate-700 max-w-2xl mx-auto">This page is currently under construction. Exciting features for '{title}' are coming soon!</p>
      </header>
      <div className="mt-10 p-6 bg-white rounded-xl shadow-xl">
        <div className="aspect-w-16 aspect-h-9">
            <img 
                src={`https://source.unsplash.com/random/1200x600?query=${title.toLowerCase().replace(/\s/g,',')},technology,office,data&random=${Math.random()}`} 
                alt={`${title} placeholder image`} 
                className="rounded-lg shadow-md w-full h-full object-cover" 
            />
        </div>
        <p className="mt-6 text-sm text-slate-500 text-center">Illustrative image. Actual content will vary.</p>
      </div>
    </div>
  );

  // Placeholder Icons for NavLinks (Example)
  const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h7.5" /></svg>;
  const PriceIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 11.219 12.768 11 12 11c-.768 0-1.536.219-2.121.782l-.879.659M7.5 12m0 0l1.409-1.409c1.172-.879 3.07-.879 4.243 0l1.409 1.409M7.5 12l.75.75M7.5 12h.75m0 0l.75-.75M16.5 12m0 0l-.75.75M16.5 12h-.75m0 0l-.75-.75M9 15l.75.75M9 15h.75m0 0l.75-.75M13.5 15l.75.75M13.5 15h.75m0 0l.75-.75M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" /></svg>;
  const OrdersIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>;
  const DashboardIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v16.5h16.5V3H3.75zm0 3.75h16.5M9 3v16.5M15 3v16.5M3.75 9h16.5M3.75 15h16.5" /></svg>;
  const HelpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" /></svg>;


  const HomePageContent = () => <PlaceholderPage title="Welcome to OrderFlow" icon={<HomeIcon />} />;
  const HelpPageContent = () => <PlaceholderPage title="Help & Support" icon={<HelpIcon />}/>;

  const renderPage = () => {
    switch (activePage) {
      case Page.Home:
        return <HomePageContent />;
      case Page.SupplierPrice:
        return <SupplierPricePage orders={orders} setOrders={setOrders} />;
      case Page.Orders:
        return <OrdersPage orders={orders} setOrders={setOrders} />;
      case Page.Dashboard:
        return <DashboardPage orders={orders} />;
      case Page.Help:
        return <HelpPageContent />;
      default:
        return <HomePageContent />;
    }
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <nav className="bg-slate-900 shadow-2xl sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                 <span className="text-3xl font-bold text-white tracking-tight">
                    Order<span className="text-sky-400">Flow</span>
                </span>
              </div>
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-2 lg:space-x-3">
                  <NavLink page={Page.Home} current={activePage} onClick={setActivePage} icon={<HomeIcon />}>Home</NavLink>
                  <NavLink page={Page.SupplierPrice} current={activePage} onClick={setActivePage} icon={<PriceIcon />}>Supplier Price</NavLink>
                  <NavLink page={Page.Orders} current={activePage} onClick={setActivePage} icon={<OrdersIcon />}>Orders</NavLink>
                  <NavLink page={Page.Dashboard} current={activePage} onClick={setActivePage} icon={<DashboardIcon />}>Dashboard</NavLink>
                  <NavLink page={Page.Help} current={activePage} onClick={setActivePage} icon={<HelpIcon />}>Help</NavLink>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2.5 rounded-md text-sm font-medium text-slate-300 bg-slate-800 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500 transition-all duration-150 ease-in-out group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 group-hover:text-white transition-colors">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
            <div className="-mr-2 flex md:hidden">
              <button type="button" className="bg-slate-800 inline-flex items-center justify-center p-2 rounded-md text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-white" aria-expanded="false">
                <span className="sr-only">Open main menu</span>
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        {/* Mobile menu (can be expanded later) */}
      </nav>

      <main className="flex-grow">
        {loginError && !isLoggedIn && (
           <div className="fixed top-5 right-5 z-[100] w-full max-w-sm p-4" role="alert">
            <div className="bg-red-500 text-white font-bold rounded-t px-4 py-2 shadow-lg">
              Login Failed
            </div>
            <div className="border border-t-0 border-red-400 rounded-b bg-red-100 px-4 py-3 text-red-700 shadow-lg">
              <p>{loginError}</p>
            </div>
          </div>
        )}
        <div className="py-6 md:py-8 lg:py-10"> 
          {renderPage()}
        </div>
      </main>

      <footer className="bg-slate-900 text-slate-400 text-center p-6 text-sm border-t border-slate-700">
        &copy; {new Date().getFullYear()} OrderFlow Solutions. All rights reserved.
        <p className="mt-1 text-slate-500">Built with Precision and Care.</p> {/* Slightly lighter footer subtext */}
      </footer>
    </div>
  );
};

export default App;
