import { useState } from 'react';
import Navbar from '../components/Navbar';
import Banner from '../components/Banner';
import Services from '../components/Services';
import Products from '../components/Products';
import Footer from '../components/Footer';
import Login from '../components/Login';
import Signup from '../components/Signup';
import ChatBot from '../components/ChatBot';

const LandingPage = () => {
    const [showLogin, setShowLogin] = useState(false);
    const [showSignup, setShowSignup] = useState(false);

    const handleLoginClick = () => { setShowLogin(true); setShowSignup(false); };
    const handleSignupClick = () => { setShowSignup(true); setShowLogin(false); };
    const handleCloseModals = () => { setShowLogin(false); setShowSignup(false); };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: '#111111' }}>
            <Navbar onLoginClick={handleLoginClick} onSignupClick={handleSignupClick} />

            <main className="flex-1">
                <Banner />
                <Services />
                <Products />
            </main>

            <Footer />

            <ChatBot />

            {showLogin && <Login onClose={handleCloseModals} />}
            {showSignup && <Signup onClose={handleCloseModals} />}
        </div>
    );
};

export default LandingPage;
