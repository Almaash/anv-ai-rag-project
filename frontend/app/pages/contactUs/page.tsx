"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import {
  Mail,
  Phone,
  MapPin,
  Send,
  MessageCircle,
  Clock,
} from "lucide-react";
import toast from "react-hot-toast";

import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "./components/ConfirmModal";

interface ContactFormInputs {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
}

export default function ContactPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tempData, setTempData] = useState<ContactFormInputs | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormInputs>();

  const handleFormSubmit = (data: ContactFormInputs) => {
    setTempData(data);
    setIsModalOpen(true);
  };

  const submitConfirmed = async () => {
    if (!tempData) return;
    setSubmitting(true);
    await new Promise((res) => setTimeout(res, 1500));
    toast.success("Message received! We'll be in touch.");
    reset();
    setSubmitting(false);
    setIsModalOpen(false);
  };


  const services = [
  {
    title: "Fund Management",
    desc: "Manage/raise funds from HNIs (High Net Worth Individuals), promoters, and corporate investors (identified individually) under private contractual arrangements. The company acts as a facilitator/administrator/servicing entity. The company does not raise public deposits.",
  },
  {
    title: "Credit Facilitation",
    desc: "The credit facilitation model adopted by Anavaran Livelihood Services Pvt. Ltd. (the company), which operates without holding an NBFC license, ensures full transparency of fund flow and does not involve deposit-taking from the public.",
  },
  {
    title: "Consumer Products",
    desc: "Home appliances, kitchen appliances, furniture, electronics, electrical products, machinery, and equipment — all at your doorstep with smart credit facilities.",
  },
  {
    title: "Product Finance",
    desc: "Hire purchase / sales in installments Credit facilitation with secure, transparent, and structured financial solutions tailored to your needs.",
  },
];

  return (
    <div className="bg-[#F8FAFC]">
      <Header />

      <ConfirmModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={submitConfirmed}
      />

      {/* HERO SECTION */}
      <section className="relative py-24 bg-[#199A95] overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/80 font-bold tracking-[0.2em] text-xs uppercase"
          >
            Anavran Livelihood Services Pvt Ltd.
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-serif text-white mt-4"
          >
            Connect With  <span className="italic text-white/90">Anavran</span>
          </motion.h1>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <section className="relative -mt-16 pb-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* LEFT INFO */}
            <div className="lg:col-span-4 space-y-4">
              <InfoCard
                icon={<Phone className="w-5 h-5" />}
                title="Call Support"
                value="+91 8797374892"
                desc="Mon–Sat, 10am – 6pm"
              />

              <InfoCard
                icon={<Mail className="w-5 h-5" />}
                title="Email Inquiry"
                value="ZK.CREDITMITRA@GMAIL.COM"
                desc="Response within 24 hours"
              />

              <InfoCard
                icon={<MapPin className="w-5 h-5" />}
                title="Head Office"
                value="Hazaribagh, Jharkhand - 825301"
                desc="Pin: 825301"
              />

              {/* WhatsApp */}
              {/* <div className="p-6 bg-[#199A95] rounded-[2rem] text-white shadow-xl flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-full">
                  <MessageCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs opacity-80">Quick Help?</p>
                  <p className="font-bold">Chat on WhatsApp</p>
                </div>
              </div> */}
            </div>

            {/* FORM */}
            <div className="lg:col-span-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl shadow-slate-200/60 border border-slate-100"
              >
                <div className="mb-10">
                  <h2 className="text-2xl font-bold text-slate-800">
                    Send a Message
                  </h2>
                  <p className="text-slate-500 mt-2">
                    Required fields are marked with *
                  </p>
                </div>

                <form
                  onSubmit={handleSubmit(handleFormSubmit)}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <FormField label="Full Name *" error={errors.name?.message}>
                    <Input
                      className="rounded-xl h-12 bg-slate-50 border-none"
                      {...register("name", { required: "Name is required" })}
                    />
                  </FormField>

                  <FormField label="Email Address *" error={errors.email?.message}>
                    <Input
                      type="email"
                      className="rounded-xl h-12 bg-slate-50 border-none"
                      {...register("email", { required: "Email required" })}
                    />
                  </FormField>

                  <FormField label="Phone Number" full>
                    <Input
                      className="rounded-xl h-12 bg-slate-50 border-none"
                      {...register("phone")}
                    />
                  </FormField>

                  <FormField label="Subject *" full error={errors.subject?.message}>
                    <Input
                      className="rounded-xl h-12 bg-slate-50 border-none"
                      {...register("subject", { required: "Subject is required" })}
                    />
                  </FormField>

                  <FormField label="Message *" full error={errors.message?.message}>
                    <textarea
                      rows={5}
                      className="w-full rounded-2xl bg-slate-50 border-none p-4 text-sm focus:ring-2 focus:ring-[#199A95] outline-none transition-all"
                      {...register("message", { required: "Message is required" })}
                    />
                  </FormField>

                  <div className="md:col-span-2 pt-4">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full md:w-auto px-12 h-14 rounded-full bg-[#199A95] hover:bg-[#147C78] text-white font-bold flex gap-3 transition-all shadow-lg shadow-[#199A95]/20"
                    >
                      {submitting ? "Sending..." : <>Send Message <Send className="w-4 h-4" /></>}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>

          </div>

          {/* SERVICES SECTION */}
    <section className="py-20 bg-white mt-10 rounded-lg">
  <div className="max-w-7xl mx-auto px-6">
    
    <h2 className="text-3xl font-bold text-center text-slate-900 mb-12">
      Our Services
    </h2>

    {/* GRID BACK (important) */}
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      
      {services.map((service, i) => (
        <div
          key={i}
          className="p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg transition-all bg-[#F8FAFC]"
        >
         <h3 className="font-bold text-[#199A95] mb-2">
    {service.title}
  </h3>

  <p className="text-sm text-slate-500 leading-relaxed flex-grow">
    {service.desc}
  </p>
        </div>
      ))}

    </div>
  </div>
</section>
        </div>


      </section>

      <Footer />
    </div>
  );
}

/* INFO CARD */
function InfoCard({ icon, title, value, desc }: any) {
  return (
    <div className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-all group">
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-[#199A95]/10 text-[#199A95] group-hover:bg-[#199A95] group-hover:text-white transition-colors">
          {icon}
        </div>
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            {title}
          </h3>
          <p className="text-slate-800 font-bold mt-0.5">{value}</p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {desc}
          </p>
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children, error, full }: any) {
  return (
    <div className={`${full ? "md:col-span-2" : ""} flex flex-col space-y-2`}>
      <label className="text-sm font-bold text-slate-700 ml-1">{label}</label>
      {children}
      {error && (
        <span className="text-red-500 text-xs font-medium ml-1">{error}</span>
      )}
    </div>
  );
}