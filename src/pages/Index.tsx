import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, Users, Clock, Shield, CheckCircle2, ArrowRight, HeartPulse, Brain, Activity, Stethoscope, Star, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Swiper, SwiperSlide } from 'swiper/react';
import { EffectCoverflow, Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/effect-coverflow';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const Index = () => {
  const navigate = useNavigate();


  const handleBookingClick = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      navigate('/book-appointment');
    } else {
      navigate('/auth?returnTo=/book-appointment');
    }
  };



  const specialties = [
    { icon: HeartPulse, title: "Cardiology", description: "Expert care for your heart and cardiovascular system." },
    { icon: Brain, title: "Neurology", description: "Advanced treatments for brain and nervous system disorders." },
    { icon: Activity, title: "Orthopedics", description: "Comprehensive care for bones, joints, and muscles." },
    { icon: Stethoscope, title: "General Practice", description: "Primary care and routine medical check-ups." },
  ];

  const testimonials = [
    { name: "Sarah Jenkins", role: "Patient", text: "MedBud has completely transformed how I handle my family's medical needs. Booking appointments is instant, and the doctors are incredible!", rating: 5, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuC2LOKZ6zG1Zl-W4KQgKVQqS1BdFJirsE2CZxi8C1Sx61VGn7ZJEhV7PlY3O-T0ZXsR9FaRjc9p1LQedwGXVMRzRCSu4KMsSzfDgyElDVgAfAOGP3Q9lgCfmxy5dO4pHPvsoCHNSBpb2pW3yIche4lz9m2P8xtrVk8fAS6FXsopw4GQJAv0VmMMJH_UKiuJ9wZ1GUD_6H5oCl9ifGCuZv7O2UJQoVlo29PQOwBhchkzAcyabNbxmNtJzPvYsiCY9i8EFYBlilHv4PAE" },
    { name: "David Lawson", role: "Executive", text: "As a working professional, the 24/7 care and accurate token system saves me hours. I no longer wait in crowded clinic lobbies!", rating: 5, image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCHoeHx43VSkm7jFjvcUFmzGnSjXH65U0W7y9WZwzdnSjpfEEvu3JONqCIYW-hNTDeZR9fLEpNacWxPbhpvpyC8c16fP0K5psyEjeShrkeuOLI5Rjolcga7oxwbfQFi_4WQoqIUK3XQq2wS-2nkWp8RUlBCbjEAbOlMDC0elW14d0g0hsHXAjUSmwtzGUdi7Qu_h84oEMfYAzinfU7yLixlZsWh9NeF3kdHn2T-zcPWMnF8LwiflK0E73S0omR5w1Q_5aL_mhBSAfQ5" },
    { name: "Kiara Clifton", role: "Patient", text: "The doctors here listen patiently. I had my consultation exactly on time, and the post-care follow-up showed they genuinely care about proper recovery.", rating: 5, image: "https://randomuser.me/api/portraits/women/44.jpg" },
    { name: "Jacob Arthur", role: "Patient", text: "I've been dealing with a chronic issue, and MedBud's platform seamlessly matched me with top-tier specialists. Absolutely a life saver.", rating: 5, image: "https://randomuser.me/api/portraits/men/32.jpg" },
    { name: "Annabelle Collins", role: "Patient", text: "Bank-grade secure records and zero confusion during hospital visits. MedBud completely sets the standard for modern healthcare experiences.", rating: 5, image: "https://randomuser.me/api/portraits/women/68.jpg" }
  ];

  const faqs = [
    { question: "How do I book an appointment?", answer: "Simply click on 'Book Appointment', choose your preferred doctor, select a time slot, and confirm. You will receive a token instantly." },
    { question: "Is my medical data secure?", answer: "Yes, we use industry-standard encryption and security protocols to ensure your personal health information is strictly confidential and protected." },
    { question: "Can I cancel or reschedule?", answer: "You can easily cancel or reschedule your appointment through your Patient Dashboard up to 2 hours before the scheduled time." },
    { question: "How does the token system work?", answer: "Once you book, you receive a digital token number. You can track the current active token live on the app so you reach the clinic exactly when needed." },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section id="home" className="pt-32 pb-20 px-6 lg:px-8 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -30 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ duration: 0.6 }}
            className="flex-1 text-center lg:text-left"
          >
            <h1 className="text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Your Personal Health Companion for <span className="text-primary">Guided Care</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto lg:mx-0">
              Empowering your wellness journey with precision medicine and empathetic support. Access 24/7 care tailored specifically to your needs.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button size="lg" onClick={handleBookingClick} className="text-lg px-8 shadow-md">
                Book a Consultant
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/doctor-auth")} className="text-lg px-8 border-2 border-primary text-primary">
                Doctor Login
              </Button>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            animate={{ opacity: 1, scale: 1 }} 
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 w-full relative"
          >
            <div className="rounded-3xl overflow-hidden shadow-2xl">
              <img alt="MedBud medical team" className="w-full h-auto object-cover" src="/medpic.jpeg"/>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-card p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
              <div className="bg-primary/10 p-2 rounded-full">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Certified Care</p>
                <p className="text-sm font-semibold text-foreground">100% Trusted Experts</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* About Us Section */}
      <section className="py-20 bg-muted/30 px-6" id="about">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-2 lg:order-1 grid grid-cols-2 gap-4"
            >
              <div className="space-y-4">
                <img alt="Medical lab" className="rounded-2xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBi1yRGX6BT8V5jr6WL0YDFb9mgQ20eH0PN-urgHeS37ZcJ6IffPkqEirGleZrUMam5XfWD6ty18jZ3-uunsPPKYDL2WyTg4aDaqjYmrXPtjN_QdeluZdjNyuGEXAf5h3kJq0bU-8OjkfkVxwpYczBFEmUs28g-5wc_b1GTYfw1ven3aCA8oB375EpGjZxsjtKl1F8h7c4zDkrgF297M5OBJNTyHPgVsnO4feqgtZTiLhW4TqG9w_uSCAvgnE6X1CuoK2uKboi9cmXd"/>
                <img alt="Hospital hallway" className="rounded-2xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAAKkpmnKKms7lYDGTsel3161mzC9JWOUTPkDNuEeMHAYpqY7TsAYglgxpLCeVI_4jelOU-yzohKq73TQcW3yO_n0kFz8r5mxTzDFyUyVdQM76QxzCsgsnvwkbJvj0AYEy6SFZ8rzlz0PQ1clDI3cMp6HBxXISIwCJSbUJKcrvUV1wsBXvFBvUxkbdNYDTsMf1GsnaQRm8lfl38hMEc5ZenaszrLNaPs1Lk0MOnku27mCxqSR34f9z9hnMnBXJPYlfe_KycVbi4wV0H"/>
              </div>
              <div className="pt-8 space-y-4">
                <img alt="Doctor consulting" className="rounded-2xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl-tkNbu91XUR8okZOlbMgjiINDjqK4z8SNM10h8x-r-oWbB0oiy8U-BEMxFjrwIMkUcfff84jaDmFzoDEtaP_1jR8v7p874ceiij9uSjfTqIwxRBqwodJ4qyY4OHD1YKMXA6Sep-bTj7b6E13mex6dRPETgFLtinwfCxnRCe4-O3HoF3mM4--k6yY9NqbSrV9aT5SU-FzPGX2wiRS4C4Q-fUmWvAXwatgf51c1ydvSbjNpTV1_y9TMzRJkt1ZoZ9RTCv0NU_BebJV"/>
                <img alt="Healthy lifestyle" className="rounded-2xl shadow-md" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBedQBtWxINeOrKVA0ndOdMLtuSgwRVLGb4kiv9lo1bgbPtCLMaGIFNG3iQy67Z62MwU6nbVaogvz0LiPO4eXlqUp8D9yGxTgtj2T9FWy8hpfv11zSz-ewaZ3ZHdlfaAKCBGg69hp1xXZUQAbE4V5LJaJ-N8kwIaAQfzrnrcfdkP2tNQkLCxZYTZJLW2jFuS5To6QZMDX53VYrT9XWwUzs0GfP45LPU997N_FwntwleDQUKbUjR-QWIvEaz49XVZbqkaPW9lKIMCL8t"/>
              </div>
            </motion.div>
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="order-1 lg:order-2"
            >
              <h2 className="text-4xl lg:text-5xl font-bold mb-4 text-foreground">About Us</h2>
              <span className="text-primary font-bold uppercase tracking-widest text-sm block mb-4 italic">Our Mission</span>
              <h2 className="text-3xl lg:text-4xl font-bold mb-6 text-foreground">Bridging Precision Science with Compassionate Care</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                  At MedBud, we believe that healthcare should be more than just prescriptions and appointments. Our platform is built on the foundation of 'Guided Care'—a unique approach that combines cutting-edge medical analytics with the human touch of dedicated companions.
              </p>
              <p className="text-muted-foreground mb-8 leading-relaxed">
                  We've reimagined the digital health experience to be stress-free, intuitive, and profoundly personalized. Whether you're managing a chronic condition or optimizing your wellness, we're here to walk the path with you.
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-4">
                  <div className="w-12 h-12 rounded-full border-4 border-card bg-slate-300"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-card bg-slate-400"></div>
                  <div className="w-12 h-12 rounded-full border-4 border-card bg-slate-500"></div>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">Joined by 10k+ happy members this month</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section (Bento Grid) */}
      <section className="py-24 px-6 lg:px-8 bg-background" id="features">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Features Designed for You</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Discover how our platform simplifies your healthcare journey with smart tools and round-the-clock support.</p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            <motion.div whileHover={{ scale: 1.02 }} className="bg-card shadow-soft border border-border p-8 rounded-2xl md:col-span-2 flex flex-col justify-between hover:border-primary/30 transition-colors">
              <div>
                <Calendar className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-2xl font-semibold mb-3 text-foreground">Smart Scheduling</h3>
                <p className="text-muted-foreground">Book appointments in seconds with your preferred specialists. Our AI matches your schedule with doctor availability automatically.</p>
              </div>
              <div onClick={handleBookingClick} className="mt-8 text-primary font-semibold flex items-center gap-2 cursor-pointer hover:underline">
                  Try it now <ArrowRight className="w-4 h-4" />
              </div>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-card shadow-soft border border-border p-8 rounded-2xl flex flex-col hover:border-primary/30 transition-colors">
              <Stethoscope className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-foreground">24/7 Care</h3>
              <p className="text-muted-foreground text-sm">Access to medical assistance anytime, anywhere. We're always here when you need us most.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-card shadow-soft border border-border p-8 rounded-2xl flex flex-col hover:border-primary/30 transition-colors">
              <HeartPulse className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-foreground">Vitals Sync</h3>
              <p className="text-muted-foreground text-sm">Connect your wearable devices to monitor your health trends in real-time.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-card shadow-soft border border-border p-8 rounded-2xl flex flex-col hover:border-primary/30 transition-colors">
              <Shield className="w-10 h-10 text-primary mb-6" />
              <h3 className="text-xl font-semibold mb-3 text-foreground">Bank-Grade Security</h3>
              <p className="text-muted-foreground text-sm">Your medical records are encrypted and stored with the highest security standards.</p>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} className="bg-card shadow-soft border border-border p-8 rounded-2xl md:col-span-2 lg:col-span-3 flex flex-col md:flex-row items-center gap-8 hover:border-primary/30 transition-colors">
              <div className="flex-1">
                <Brain className="w-10 h-10 text-primary mb-6" />
                <h3 className="text-2xl font-semibold mb-3 text-foreground">Personalized Health Insights</h3>
                <p className="text-muted-foreground">Get data-driven health reports and proactive tips tailored to your specific lifestyle and medical history.</p>
              </div>
              <div className="w-full md:w-1/3 h-40 bg-muted/50 rounded-xl overflow-hidden">
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Activity className="w-16 h-16 text-primary opacity-40" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-muted/10 px-6" id="how-it-works">
        <div className="max-w-7xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-20">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4 text-foreground">Simple Steps to Better Health</h2>
            <p className="text-muted-foreground">Getting started with MedBud is as easy as 1-2-3.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line for desktop */}
            <div className="hidden md:block absolute top-[2rem] left-1/4 right-1/4 h-0.5 border-t-2 border-dashed border-border -z-10"></div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} viewport={{ once: true }} className="text-center px-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary/20">1</div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">Create Your Profile</h4>
              <p className="text-muted-foreground text-sm">Sign up and tell us about your health goals and history in a few simple questions.</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }} viewport={{ once: true }} className="text-center px-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary/20">2</div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">Connect with Experts</h4>
              <p className="text-muted-foreground text-sm">Get matched with a dedicated care team and schedule your first digital check-up.</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }} viewport={{ once: true }} className="text-center px-4">
              <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 shadow-lg shadow-primary/20">3</div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">Receive Ongoing Care</h4>
              <p className="text-muted-foreground text-sm">Enjoy regular check-ins, personalized health plans, and 24/7 chat support.</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section id="specialties" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Our Medical Specialties
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Access top-rated specialists across various medical departments
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {specialties.map((spec, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: index * 0.1 }} viewport={{ once: true }} whileHover={{ y: -8, scale: 1.02 }} className="bg-card p-8 rounded-2xl shadow-soft hover:shadow-medium transition-smooth border border-border group text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-smooth">
                  <spec.icon className="w-8 h-8 text-primary group-hover:text-white transition-smooth" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-3">
                  {spec.title}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {spec.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 3D Testimonials Carousel section */}
      <section id="testimonials" className="py-24 px-6 overflow-hidden relative bg-primary">
        <div className="max-w-7xl mx-auto flex flex-col relative w-full items-center">
          <h2 className="text-3xl lg:text-5xl font-bold mb-12 text-white text-center font-serif">
            Know thyself. Know the customer. Innovate.
          </h2>

          <Swiper
            effect={'coverflow'}
            grabCursor={true}
            centeredSlides={true}
            slidesPerView={'auto'}
            loop={true}
            coverflowEffect={{
              rotate: 15,
              stretch: 0,
              depth: 300,
              modifier: 1,
              slideShadows: false,
            }}
            pagination={{ clickable: true }}
            navigation={true}
            modules={[EffectCoverflow, Pagination, Navigation]}
            className="w-full max-w-4xl py-10"
            initialSlide={1}
          >
            {testimonials.map((testi, i) => (
              <SwiperSlide key={i} className="max-w-sm w-full">
                <div className="bg-primary/20 backdrop-blur-md border border-white/20 p-8 rounded-2xl h-[400px] flex flex-col items-center justify-between shadow-2xl">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white/30 shadow-lg mb-4">
                    <img src={testi.image} alt={testi.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="relative w-full text-center flex-1 flex flex-col justify-center">
                    <Quote className="absolute top-0 left-0 w-5 h-5 text-white/30 rotate-180" />
                    <p className="text-white italic text-center text-sm leading-relaxed font-light px-6">
                      {testi.text}
                    </p>
                    <Quote className="absolute bottom-0 right-0 w-5 h-5 text-white/30" />
                  </div>
                  <div className="flex gap-1 text-white mb-2 mt-6">
                    {[...Array(testi.rating)].map((_, i) => <Star key={i} className="w-4 h-4 fill-current" />)}
                  </div>
                  <p className="text-white font-medium text-sm">{testi.name}</p>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        
        <style>{`
          .swiper-pagination-bullet { background: rgba(255, 255, 255, 0.5); opacity: 1; margin: 0 6px !important; width: 12px; height: 12px; transition: all 0.3s ease; }
          .swiper-pagination-bullet-active { background: #fff; width: 32px; border-radius: 6px; }
          .swiper-button-next, .swiper-button-prev { color: #fff; }
          .swiper-button-next::after, .swiper-button-prev::after { font-size: 24px; font-weight: bold; }
          .swiper-slide { transition: all 0.3s ease; }
          .swiper-slide:not(.swiper-slide-active) { opacity: 0.6; }
        `}</style>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-background">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Got questions? We've got answers.
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`} className="border-border">
                <AccordionTrigger className="text-left text-lg font-medium text-foreground hover:text-primary transition-colors">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section / For Doctors Section */}
      <section id="doctors" className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary" />
        <div className="container mx-auto px-4 relative max-w-7xl">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center max-w-3xl mx-auto">
            <h2 className="text-3xl lg:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Healthcare Experience?
            </h2>
            <p className="text-lg mb-8 text-white/90">
              Join thousands of patients and doctors already using MedBud
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" variant="secondary" onClick={() => navigate("/book-appointment")} className="text-lg px-8 shadow-large hover:scale-105 transition-smooth">
                Get Started Now
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })} className="text-lg px-8 bg-white/10 border-white text-white hover:bg-white hover:text-primary">
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;