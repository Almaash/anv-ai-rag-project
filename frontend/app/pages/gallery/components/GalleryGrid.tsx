"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/* ================= TYPES ================= */
interface GalleryItem {
  id: number;
  image: string;
  category: string;
  title: string;
}

const galleryData: GalleryItem[] = [
  // { id: 1, image: "/slider/announcment.jpeg", category: "Events", title: "Annual Tech Summit" },
  { id: 2, image: "/slider/slider2.jpeg", category: "Events", title: "Annual Tech Summit" },
  { id: 3, image: "/slider/slider3.jpeg", category: "Events", title: "Annual Tech Summit" },
  { id: 4, image: "/slider/slider1.jpeg", category: "Training", title: "Annual Tech Summit" },
  { id: 5, image: "/slider/slider2.jpeg", category: "Products", title: "Annual Tech Summit" },
  { id: 6, image: "/slider/slider3.jpeg", category: "Teams", title: "Annual Tech Summit" },

];

const categories = ["All", "Events", "Training", "Products", "Teams"];

export default function EnhancedGallery() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [index, setIndex] = useState<number | null>(null);

  const filteredImages = galleryData.filter(
    (img) => selectedCategory === "All" || img.category === selectedCategory
  );

  const showNext = () =>
    setIndex((prev) =>
      prev !== null && prev < filteredImages.length - 1 ? prev + 1 : 0
    );

  const showPrev = () =>
    setIndex((prev) =>
      prev !== null && prev > 0 ? prev - 1 : filteredImages.length - 1
    );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (index === null) return;
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "Escape") setIndex(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [index, filteredImages.length]);

  return (
    <section className="bg-slate-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">

        {/* HEADER */}
        <div className="text-center mb-10">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-4xl  font-bold text-slate-900 mb-3"
          >
            Our Visual Journey
          </motion.h2>
          <div className="w-16 h-1 bg-primary mx-auto mb-4 rounded-full" />
          <p className="text-slate-500 max-w-lg mx-auto text-md">
            A curated collection of our best moments, innovations, and community highlights.
          </p>
        </div>

        {/* FILTERS */}
        <div className="flex justify-center flex-wrap gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-md font-medium transition-all duration-300 ${
                selectedCategory === cat
                  ? "bg-primary text-white shadow-md"
                  : "bg-white text-slate-600 hover:bg-slate-100"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* GRID */}
        <motion.div
          layout
          className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredImages.map((image, idx) => (
              <motion.div
                key={image.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.25 }}
                className="relative group cursor-pointer overflow-hidden rounded-lg shadow hover:shadow-md transition-all break-inside-avoid"
                onClick={() => setIndex(idx)}
              >
                <Image
                  src={image.image}
                  alt={image.title}
                  width={600}
                  height={800}
                  className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* OVERLAY */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-300 flex flex-col justify-end p-4">
                  <p className="text-[10px] uppercase tracking-wider text-white/70 mb-1">
                    {image.category}
                  </p>
                  <h3 className="text-sm text-white font-medium">
                    {image.title}
                  </h3>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md p-1.5 rounded-full">
                    <Maximize2 className="text-white w-3 h-3" />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* LIGHTBOX */}
        <Dialog open={index !== null} onOpenChange={() => setIndex(null)}>
          <DialogContent className="max-w-[90vw] h-[80vh] p-0 bg-black/95 border-none overflow-hidden flex items-center justify-center">

            <DialogTitle className="sr-only">Image Viewer</DialogTitle>

            {/* Close */}
            <Button
              variant="ghost"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/10 rounded-full h-9 w-9"
              onClick={() => setIndex(null)}
            >
              <X className="w-6 h-6" />
            </Button>

            {/* Prev */}
            <Button
              variant="ghost"
              className="absolute left-4 z-50 text-white hover:bg-white/10 rounded-full h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
            >
              <ChevronLeft className="w-6 h-6" />
            </Button>

            <div className="relative w-full h-full flex items-center justify-center p-6">
              <AnimatePresence mode="wait">
                {index !== null && (
                  <motion.div
                    key={filteredImages[index].id}
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className="relative w-full h-full"
                  >
                    <Image
                      src={filteredImages[index].image}
                      alt="Full view"
                      fill
                      className="object-contain"
                    />

                    <div className="absolute bottom-0 left-0 right-0 py-4 text-center bg-gradient-to-t from-black/60 to-transparent">
                      <h4 className="text-white text-base font-medium">
                        {filteredImages[index].title}
                      </h4>
                      <p className="text-gray-400 text-xs">
                        {index + 1} / {filteredImages.length}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Next */}
            <Button
              variant="ghost"
              className="absolute right-4 z-50 text-white hover:bg-white/10 rounded-full h-10 w-10"
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
            >
              <ChevronRight className="w-6 h-6" />
            </Button>

          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}