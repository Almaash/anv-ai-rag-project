"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function DPNPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">DPN (Demand Promissory Note)</h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" /> Print DPN
        </Button>
      </div>

      {/* Printable Area */}
      <div 
        ref={componentRef} 
        className="print-container bg-white p-12 text-black leading-relaxed text-sm"
        style={{ fontFamily: "'Times New Roman', serif" }}
      >
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; background: white !important; }
            .print-container { padding: 40px !important; margin: 0 !important; width: 100% !important; }
            @page { margin: 1.5cm; }
          }
          .underline-span { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .clean-text { font-weight: 400; font-size: 0.9rem; line-height: 1.8; }
          .agreement-heading { font-weight: 700; text-decoration: underline; text-transform: uppercase; text-align: center; }
          .hindi-text { font-family: 'Noto Sans Hindi', sans-serif; line-height: 2; }
          .stamp-box { border: 1.5px solid black; width: 90px; height: 100px; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 0.75rem; }
        `}} />
        
        {/* DPN Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl agreement-heading">DPN (Demand Promissory Note)</h2>
        </div>

        <div className="mb-12 space-y-6 clean-text">
          <p>
            To the demand of this Promissory note holder, I <span className="underline-span"></span> (Customer name) W/O, S/O <span className="underline-span"></span> am resides at <span className="underline-span"></span>, Today on date <span className="underline-span"></span>. I avail a credit limit of Rs.<span className="underline-span"></span> from Anavran Livelihood services Pvt Ltd, I promise to pay this immediately whenever demanded by the service provider, without any objection.
          </p>

          <div className="text-center my-6">
            <h2 className="text-2xl agreement-heading hindi-text">मांग वचन पत्र</h2>
          </div>

          <p className="hindi-text">
            इस वचन पत्र धारक की मांग पर, मैं <span className="underline-span"></span> (ग्राहक का नाम) पत्नी, पुत्र <span className="underline-span"></span> पता <span className="underline-span"></span> आज दिनांक <span className="underline-span"></span> को अनवरन लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड से <span className="underline-span"></span> रुपये की क्रेडिट सीमा का लाभ उठाता/लेती हूँ। मैं सेवा प्रदाता द्वारा मांगे जाने पर बिना किसी आपत्ति के इसे तुरंत भुगतान करने का वचन देता/देती हूँ।
          </p>

          <div className="mt-12 grid grid-cols-2">
            <div className="space-y-8">
              <p>Date (दिनांक) <span className="underline-span"></span></p>
              <p>Place (स्थान) <span className="underline-span"></span></p>
            </div>
            <div className="flex flex-col items-end">
              <p className="text-xs mb-2 text-right">Affix Signature/ Thumb impression crossed upon the revenue stamp</p>
              <div className="flex items-center gap-4">
                <span className="text-xs">(राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</span>
                <div className="stamp-box">
                  <span>Revenue</span>
                  <div className="h-4"></div>
                  <span>Stamp</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t-2 border-dashed my-12"></div>

        {/* Vernacular Declaration Section */}
        <div className="text-center mb-8">
          <h2 className="text-2xl agreement-heading">Vernacular declaration along with thumb impression consent</h2>
        </div>

        <div className="clean-text space-y-8">
          <div className="flex gap-20">
            <p>Customer ID <span className="underline-span"></span></p>
            <p>Credit ID <span className="underline-span"></span></p>
          </div>

          <p>
            I <span className="underline-span"></span> agree that all the credit application documents provided by the service provider Anavran Livelihood services Pvt Ltd in which all the mentioned criteria for teaching and explaining and understood in my regional language by the authorized person/employee to me is fully satisfactory. I am giving my consent for this process with my will and good heart.
          </p>
          <p>
            I am giving my consent for acceptance, support and adherence towards terms and conditions and giving my consent by putting my signature/ thumb impression for the conclusion arise from all the mentioned explanations of all the documents.
          </p>

          <div className="text-center my-6">
            <h2 className="text-2xl agreement-heading hindi-text">स्थानीय भाषा में घोषणा और अंगूठे के निशान के साथ सहमति</h2>
          </div>

          <div className="hindi-text space-y-4">
             <div className="flex gap-20">
              <p>ग्राहक आईडी <span className="underline-span"></span></p>
              <p>क्रेडिट आईडी <span className="underline-span"></span></p>
            </div>
            <p>
              मैं <span className="underline-span"></span> सहमत हूँ कि सेवा प्रदाता अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड द्वारा प्रदान किए गए सभी क्रेडिट आवेदन दस्तावेज़, जिनमें उल्लिखित सभी मानदंड मेरी क्षेत्रीय भाषा में अधिकृत व्यक्ति/कर्मचारी द्वारा मुझे समझाए और बताए गए हैं, पूरी तरह से संतोषजनक हैं। मैं अपनी इच्छा और सद्भावना से इस प्रक्रिया के लिए अपनी सहमति दे रहा हूँ। मैं नियमों और शर्तों को स्वीकार करने, उनका समर्थन करने और उनका पालन करने के लिए अपनी सहमति दे रहा हूँ और सभी दस्तावेजों में उल्लिखित सभी स्पष्टीकरणों से निकले निष्कर्ष के लिए अपने हस्ताक्षर/अंगूठे के निशान लगाकर अपनी सहमति दे रहा हूँ।
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2">
            <div className="space-y-4">
              <p>Date (दिनांक) <span className="underline-span"></span></p>
              <p>Place (स्थान) <span className="underline-span"></span></p>
              <p className="mt-10">Witness (गवाह) <span className="underline-span"></span></p>
            </div>
            <div className="flex flex-col items-end">
               <div className="flex items-center gap-4 mb-10">
                <span className="text-xs">(राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</span>
                <div className="stamp-box">
                  <span>Revenue</span>
                  <div className="h-4"></div>
                  <span>Stamp</span>
                </div>
              </div>
              <p className="text-sm mt-10">Authorised person/ employee signature <span className="underline-span w-64"></span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
