"use client";

import React from "react";
import Image from "next/image";
import { FaUserCircle, FaQuoteRight, FaStar } from "react-icons/fa";
import { motion } from "framer-motion";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const testimonials = [
  {
    id: 1,
    name: "Amit Kumar",
    image: "",
    role: "Business Associate",
    location: "Patna, Bihar",
    message:
      "Joining this platform completely changed my business journey. The support system and leadership training helped me grow faster than expected.",
  },
  {
    id: 2,
    name: "Rohit Verma",
    image: "",
    role: "Network Marketer",
    location: "Ranchi, Jharkhand",
    message:
      "The mentorship and duplication system are outstanding. I was able to build a strong team within months.",
  },
  {
    id: 3,
    name: "Suman Das",
    role: "Entrepreneur",
    location: "Kolkata, West Bengal",
    message:
      "A transparent and ethical business model. Training sessions are practical and result-oriented.",
  },
  {
    id: 4,
    name: "Nazim Ansari",
    role: "Web Developer",
    location: "Ranchi, Jharkhand",
    message:
      "The UI components and the overall flow of the system are designed for high conversion and scale.",
  },
];

const TestimonialSection = () => {
  return (
    <section className="py-16 bg-[#F7FAF9] overflow-hidden">
      <div className="container max-w-7xl mx-auto px-6">

        {/* Header */}
        <div className="text-center mb-12">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-[#199A95] font-semibold tracking-[0.18em] text-[11px] uppercase"
          >
            Success Stories
          </motion.span>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl md:text-4xl font-bold text-slate-900 mt-3"
          >
            What Our{" "}
            <span className="text-[#199A95] italic font-serif">
              Leaders
            </span>{" "}
            Say
          </motion.h2>

          <div className="w-16 h-1 bg-[#199A95]/20 mx-auto mt-4 rounded-full" />
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="w-full relative px-4 md:px-0"
        >
          <CarouselContent className="-ml-4">
            {testimonials.map((item) => (
              <CarouselItem
                key={item.id}
                className="pl-4 md:basis-1/2 lg:basis-1/3"
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  className="bg-white border border-slate-100 rounded-[2rem] shadow-lg shadow-slate-200/40 flex flex-col h-full p-6 relative overflow-hidden group"
                >
                  {/* Decorative Quote */}
                  <FaQuoteRight className="absolute -top-3 -right-3 text-slate-50 text-6xl group-hover:text-[#199A95]/5 transition-colors" />

                  {/* Stars */}
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <FaStar key={i} className="text-amber-400 text-xs" />
                    ))}
                  </div>

                  {/* Message */}
                  <p className="text-slate-600 leading-relaxed grow text-sm italic mb-6 relative z-10">
                    “{item.message}”
                  </p>

                  {/* Profile */}
                  <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-[#199A95]/10 flex items-center justify-center bg-slate-100 shrink-0">
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <FaUserCircle className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="overflow-hidden">
                      <h4 className="text-sm font-semibold text-slate-900 truncate">
                        {item.name}
                      </h4>
                      <p className="text-[10px] font-medium text-[#199A95] uppercase tracking-wider">
                        {item.role}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {item.location}
                      </p>
                    </div>
                  </div>
                </motion.div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {/* Navigation */}
          <div className="hidden md:flex justify-center gap-4 mt-10">
            <CarouselPrevious className="static translate-y-0 h-10 w-10 rounded-xl border-none bg-white shadow-md text-[#199A95] hover:bg-[#199A95] hover:text-white transition-all" />
            <CarouselNext className="static translate-y-0 h-10 w-10 rounded-xl border-none bg-white shadow-md text-[#199A95] hover:bg-[#199A95] hover:text-white transition-all" />
          </div>
        </Carousel>
      </div>
    </section>
  );
};

export default TestimonialSection;