"use client";

import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

const images = [
  "/slider/slider1.jpeg",
  "/slider/slider2.jpeg",
  "/slider/slider3.jpeg",
];

export default function ImageSlider() {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const nextSlide = useCallback(() => {
    setDirection(1);
    setIndex((prev) => (prev + 1) % images.length);
  }, []);

  const prevSlide = useCallback(() => {
    setDirection(-1);
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [nextSlide]);

  return (
    <section className="relative w-full h-[60vh] md:h-[80vh] lg:h-[90vh] overflow-hidden bg-black">
      {/* IMAGES CONTAINER */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={index}
          custom={direction}
          initial={{ opacity: 0, scale: 1.2 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 1.2, ease: [0.4, 0, 0.2, 1] }}
          className="absolute inset-0"
        >
          {/* Soft Overlay for depth */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40 z-10" />
          
          <motion.img
            src={images[index]}
            alt={`Slide ${index}`}
            className="w-full h-full object-cover shadow-2xl"
            // Slow continuous zoom effect (Ken Burns)
            animate={{ scale: 1.1 }}
            transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "linear" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* MINIMAL NAVIGATION - Floating Glass Style */}
      <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-between px-4 md:px-10">
        <button
          onClick={prevSlide}
          className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group"
        >
          <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
        </button>
        <button
          onClick={nextSlide}
          className="pointer-events-auto w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white flex items-center justify-center hover:bg-primary hover:border-primary transition-all duration-300 group"
        >
          <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* DOTS INDICATORS - Modern Pill Shape */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`transition-all duration-500 rounded-full h-1.5 ${
              i === index ? "w-8 bg-primary" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>

      {/* SIDE SCROLL PROGRESS - Vertical line (Optional Premium touch) */}
      <div className="absolute left-0 top-0 h-full w-1 z-20">
        <motion.div 
          key={index}
          initial={{ height: "0%" }}
          animate={{ height: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="bg-primary/60"
        />
      </div>
    </section>
  );
}