import React from 'react'
import Navbar from '../../components/Navbar'
import Footer from '../../components/Footer'
import Hero from "../../components/home/Hero";
import Features from "../../components/home/Features";
import HowItWorks from "../../components/home/HowItWorks";
import TopDoctors from "../../components/home/TopDoctors";
import TopHospitals from "../../components/home/TopHospitals";
import WhyUs from "../../components/home/WhyUs";
import OurReviews from "../../components/home/OurReviews";
import ContactUs from "../../components/home/ContactUs";
import ChatbotWidget from "../../components/chatbot/ChatbotWidget";

const Home = ({ user }) => {
  return (<main className="min-h-screen">
    <Navbar user={user} />
    <Hero />
    <Features />
    <HowItWorks />
    <TopDoctors />
    <TopHospitals />
    <WhyUs />
    <OurReviews />
    <ContactUs />
    <Footer />
    <ChatbotWidget />
  </main>


  )
}

export default Home
