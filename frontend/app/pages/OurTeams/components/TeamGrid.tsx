"use client";

import React from "react";
import Image from "next/image";
import { FaUserCircle } from "react-icons/fa";

type TeamMember = {
  id: number;
  name: string;
  image: string | null;
  designation: string;
  location?: string;
  short_description: string;
};

const teamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Mr. Khalid Ahmed",
    image: null,
    designation: "MD (CEO) & Founder",
    location: "Jharkhand",
    short_description:
      "Director and Chief Executive Officer with 16 years of experience in microfinance institutions. Architect of the company’s credit policies and oversees operations with strong leadership, collaboration, and target-driven execution.",
  },
  {
    id: 2,
    name: "Mr. Gulam Sarwar",
    image: null,
    designation: "Whole Time Director (WTD)",
    location: "Jharkhand",
    short_description:
      "Brings 16 years of microfinance experience with strong expertise in customer acquisition, portfolio management, and team leadership. Known for credibility, interpersonal skills, and strategic operational support.",
  },
  // {
  //   id: 3,
  //   name: "Mr. Shyam Lal Thakur",
  //   image: null,
  //   designation: "Director (Admin Head)",
  //   location: "Jharkhand",
  //   short_description:
  //     "Leads administrative functions with strong management and organizational skills. His background in education and administration contributes to efficient coordination and smooth operational management.",
  // },
  {
    id: 4,
    name: "Ms. Reqaiyya Naj",
    image: null,
    designation: "Director (Human Resource)",
    location: "Jharkhand",
    short_description:
      "A valued board member serving as Director (HR), focused on strengthening manpower productivity, people management, and organizational development through her leadership and HR expertise.",
  },
];

export default function TeamGrid() {
  return (
    <section className="bg-background text-foreground py-12 sm:py-16 px-4 sm:px-6 md:px-12 lg:px-24">

      {/* Heading */}
      <div className="text-center mb-10 sm:mb-14">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#199A95]">
          Leadership & Management Team
        </h2>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:gap-8 md:grid-cols-2">
        {teamMembers.map((member) => {
          const hasImage = Boolean(member.image);

          return (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-6 bg-white border border-border rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300"
            >
              {/* Image */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-xl overflow-hidden bg-slate-100 shrink-0 mx-auto sm:mx-0">
                {hasImage ? (
                  <Image
                    src={member.image!}
                    alt={member.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <FaUserCircle className="text-primary opacity-60 text-4xl sm:text-5xl" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-col text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-semibold text-primary">
                  {member.name}
                </h3>

                <p className="text-xs sm:text-sm text-[#199A95] font-medium mt-1">
                  {member.designation}
                </p>

                {member.location && (
                  <p className="text-[11px] sm:text-xs text-muted-foreground mt-1">
                    {member.location}
                  </p>
                )}

                <div className="w-8 sm:w-10 h-[2px] bg-[#199A95]/40 my-2 sm:my-3 mx-auto sm:mx-0" />

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  {member.short_description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}