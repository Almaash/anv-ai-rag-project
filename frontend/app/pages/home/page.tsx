"use client";

import Header from "@/components/layout/Header";
import BusinessOpportunity from "./components/BusinessOpportunity";

import Footer from "@/components/layout/Footer";
import Slider from "./components/Slider";

import TestimonialSection from "./components/TestimonialSection";
import ImageSlider2 from "./components/ImageSlider2";
import ServiceGrid from "./components/ServiceGrid";
import { EMICalculator } from "./EMICalculator";
import BusinessCommandCenter from "./components/BusinessCommandCenter";
import AnavranCalculator from "./AnavranCalculator";

export default function HomePage() {
  return (
    <>
      <Header />
      <ImageSlider2 />
      <Slider />
      <BusinessOpportunity />
      <ServiceGrid/>
      <AnavranCalculator/>
      {/* <EMICalculator/> */}
      <BusinessCommandCenter/>
      <TestimonialSection />
      <Footer />
    </>
  );
}
