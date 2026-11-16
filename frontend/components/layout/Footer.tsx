"use client";

import Image from "next/image";
import Link from "next/link";
import {
  FaFacebookF,
  FaInstagram,
  FaXTwitter,
  FaYoutube,
  FaArrowRight,
} from "react-icons/fa6";
import { Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0B1E3D] text-white pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">

        {/* TOP SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-12 border-b border-blue-400/10">

          {/* BRAND */}
          <div className="lg:col-span-4 space-y-6">
            <Image
              src="/images/logo2.png"
              alt="Anavran Logo"
              className="rounded"
              width={100}
              height={100}
            />

            <p className="text-sm text-white/60 leading-relaxed max-w-sm">
              Anavran Livelihood Services Pvt Ltd is committed to delivering
              transparent, responsible, and inclusive financial solutions
              including Fund Management, Credit Facilitation, Consumer Durable Products,
              and Product Finance.
            </p>

            {/* SOCIALS */}
            <div className="flex space-x-4">
              {[FaInstagram, FaFacebookF, FaXTwitter, FaYoutube].map(
                (Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center hover:bg-blue-500 hover:text-white transition-all duration-300"
                  >
                    <Icon size={18} />
                  </a>
                )
              )}
            </div>
          </div>

          {/* LINKS */}
          <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-8">

            {/* COMPANY */}
            <div>
              <h3 className="text-white font-bold mb-6 tracking-wider uppercase text-xs">
                Company
              </h3>
              <ul className="space-y-4 text-sm text-white/60">
                <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/team" className="hover:text-white transition-colors">Leadership Team</Link></li>
                <li><Link href="/services" className="hover:text-white transition-colors">Our Services</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* SERVICES */}
            <div>
              <h3 className="text-white font-bold mb-6 tracking-wider uppercase text-xs">
                Services
              </h3>
              <ul className="space-y-4 text-sm text-white/60">
                <li>Fund Management</li>
                <li>Credit Facilitation</li>
                <li>Consumer Durable Products</li>
                <li>Product Finance</li>
              </ul>
            </div>

            {/* NEWSLETTER */}
            <div className="col-span-2 md:col-span-1">
              <h3 className="text-white font-bold mb-6 tracking-wider uppercase text-xs">
                Stay Updated
              </h3>

              <div className="relative">
                <input
                  type="email"
                  placeholder="Your email address"
                  className="w-full bg-blue-500/10 border border-blue-400/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition-all"
                />
                <button className="absolute right-2 top-2 bottom-2 bg-blue-600 px-3 rounded-lg hover:bg-blue-500 transition-all">
                  <FaArrowRight size={14} />
                </button>
              </div>

              <p className="text-[10px] text-white/40 mt-3 italic">
                Receive financial updates and company announcements.
              </p>
            </div>
          </div>
        </div>

        {/* CONTACT BAR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10">
          <ContactItem
            icon={<Phone size={20} />}
            title="Call Support"
            value="+91 8797374892"
          />
          <ContactItem
            icon={<Mail size={20} />}
            title="Official Email"
            value="ZK.CREDITMITRA@GMAIL.COM"
          />
          <ContactItem
            icon={<MapPin size={20} />}
            title="Registered Office"
            value="Hazaribagh, Jharkhand - 825301"
          />
        </div>

        {/* BOTTOM */}
        <div className="border-t border-blue-400/10  pt-6 text-center text-xs text-white/40 space-y-2">
          <p>
            © {new Date().getFullYear()} <span className="font-medium text-white transition pr-1"
            >

              Anavran Livelihood Services Pvt Ltd. 
            </span> 
             All rights reserved.
          </p>

          <p>
            Designed & Developed by{" "}
            <a
              href="https://www.alibrosinfotech.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-white/70 hover:underline transition"
            >
              Alibros Infotech Pvt. Ltd.
            </a>
          </p>
        </div>

      </div>
    </footer>
  );
};

/* SUB COMPONENT */
const ContactItem = ({
  icon,
  title,
  value,
}: {
  icon: any;
  title: string;
  value: string;
}) => (
  <div className="flex items-center gap-4 bg-blue-500/10 p-5 rounded-2xl border border-blue-400/10 hover:border-blue-400/30 transition-all">
    <div className="p-3 bg-blue-500/10 rounded-xl text-white">
      {icon}
    </div>
    <div>
      <p className="text-[10px] uppercase font-bold tracking-widest text-white/40">
        {title}
      </p>
      <p className="text-sm font-medium text-white/80">
        {value}
      </p>
    </div>
  </div>
);

export default Footer;