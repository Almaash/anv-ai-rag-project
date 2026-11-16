"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function FacilitatorAgreementPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">Credit (Facilitator) Agreement</h1>
        <Button onClick={() => handlePrint()} className="flex items-center gap-2">
          <Printer className="w-4 h-4" /> Print Agreement
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
            @page { margin: 1cm; }
          }
          .underline-span { border-bottom: 1px dotted #000; min-width: 150px; display: inline-block; padding: 0 5px; }
          .clean-text { font-weight: 400; font-size: 0.85rem; line-height: 1.5; }
          .agreement-heading { font-weight: 700; text-decoration: underline; text-transform: uppercase; text-align: center; }
        `}} />
        
        <div className="text-center mb-10">
          <h2 className="text-2xl agreement-heading">Credit (Facilitator) Agreement</h2>
        </div>

        <div className="mb-6 space-y-6 clean-text">
          <p>
            I <span className="underline-span"></span> am availing a (Credit limit) of Rs.<span className="underline-span"></span> as on (Date)<span className="underline-span"></span>.
          </p>

          <p>
            A sum of amount <span className="underline-span"></span> is deducted from my credit limit in favor of all the service fee including GST 18% (PF @....% and CLI). I will repay the credit limit with an interest charged @ .....% (per annum) which will be pay as per the credit service provider's instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).
          </p>

          <div className="grid grid-cols-2 gap-y-4 mt-6">
            <p>Cheque details : Cheque Number <span className="underline-span"></span></p>
            <p className="ml-20">Drawee Bank <span className="underline-span"></span></p>
            <p className="col-span-2 text-right md:pr-10">A/c Number <span className="underline-span"></span></p>
          </div>

          <div className="grid grid-cols-2 mt-4">
            <p>Name of the payee <span className="underline-span">Anavran Livelihood services Pvt Ltd</span></p>
            <p>Name of the remitter <span className="underline-span"></span></p>
          </div>

          <div className="mt-8">
            <p className="font-semibold mb-4 underline">The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
            <ol className="list-decimal pl-8 space-y-2 text-sm italic">
              <li>Availed credit limit will not be shared with any member or group or with any relatives/Friends, if shared then the service provider would have rights to recover the outstanding amount through DPN agreement.</li>
              <li>I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
              <li>I will pay all the scheduled Installment on stipulated time with in the credit tenure.</li>
              <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
              <li>Once I avail the credit limit then it will necessary to purchase Credit linked Insurance for unwanted situations (Death circumstances).</li>
              <li>Once I avail the credit limit then it will not cancelled, if want to canceled then the interest for one year will be chargeable.</li>
              <li>The provided Bank details is mine and it is correct according to my knowledge and I am availing the credit limit on this bank details.</li>
              <li>If credit default by me, will be subject to Jurisdiction.</li>
              <li>If any Installment will be stopped by me then service provider will be the right to take legal action against me. Also he can proceed the legal action through bouncing my cheque.</li>
              <li>Any dispute will be subject to the Jurisdiction under arbitration act/ 138 act and as per the applicable law.</li>
            </ol>
          </div>
        </div>

        {/* Hindi Section */}
        <div className="mt-12 border-t pt-10 space-y-6 clean-text" style={{ fontFamily: "'Noto Sans Hindi', sans-serif" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl agreement-heading">ऋण (सुविधाकर्ता) समझौता</h2>
          </div>

          <p>
            मैं <span className="underline-span"></span> (दिनांक) <span className="underline-span"></span> को ₹ <span className="underline-span"></span> की क्रेडिट सीमा का लाभ उठा रहा हूँ।
          </p>

          <p>
            मेरी क्रेडिट सीमा से <span className="underline-span"></span> राशि की कटौती की गई है, जिसमें 18% जीएसटी (पीएफ @...... और सीएलआई) सहित सभी सेवा शुल्क शामिल हैं। मैं क्रेडिट सीमा का भुगतान ....% (प्रति वर्ष) की दर से ब्याज सहित करूँगा, जो क्रेडिट सेवा प्रदाता के निर्देशों के अनुसार होगा, क्योंकि मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के निर्देशों (नियम और विनियम) का पालन करने के लिए बाध्य हूँ। इस संदर्भ में, मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पक्ष में सुरक्षा उद्देश्य से अपने बैंक खाते का चेक दे रहा हूँ।
          </p>

          <div className="grid grid-cols-2 gap-y-4 mt-6">
            <p>चेक विवरण: चेक संख्या <span className="underline-span"></span></p>
            <p>आहरित बैंक <span className="underline-span"></span></p>
            <p className="col-span-2 text-right md:pr-10">खाता संख्या <span className="underline-span"></span></p>
          </div>

          <div className="grid grid-cols-2 mt-4">
            <p>प्राप्तकर्ता का नाम <span className="underline-span">Anavran Livelihood services Pvt Ltd</span></p>
            <p>प्रेषक का नाम <span className="underline-span"></span></p>
          </div>

          <div className="mt-8">
            <ol className="list-decimal pl-8 space-y-4 text-sm italic">
              <li>दी गई क्रेडिट सीमा किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं की जाएगी। साझा करने पर, सेवा प्रदाता को डीपीएन समझौते के माध्यम से बकाया राशि वसूलने का अधिकार होगा।</li>
              <li>मैं भुगतान के उस तरीके से सहमत हूँ जिस पर मैंने सीएएफ भरते समय हस्ताक्षर किए थे।</li>
              <li>मैं क्रेडिट अवधि के भीतर सभी निर्धारित किस्तें समय पर चुकाऊंगा/चुकाऊंगी।</li>
              <li>मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
              <li>क्रेडिट सीमा का लाभ उठाने के बाद, अप्रत्याशित परिस्थितियों (मृत्यु जैसी स्थिति) के लिए क्रेडिट लिंक्ड बीमा खरीदना आवश्यक होगा।</li>
              <li>क्रेडिट सीमा का लाभ उठाने के बाद, इसे रद्द नहीं किया जा सकता। यदि रद्द करना हो, तो एक वर्ष का ब्याज लागू होगा।</li>
              <li>प्रदान किए गए बैंक विवरण मेरे हैं और मेरी जानकारी के अनुसार सही हैं, और मैं इसी बैंक विवरण पर क्रेडिट सीमा का लाभ उठा रहा/रही हूँ।</li>
              <li>यदि मैं भुगतान में चूक करता हूँ, तो यह क्षेत्राधिकार के अधीन होगा।</li>
              <li>यदि मैं कोई क़िस्त रोक देता हूँ, तो सेवा प्रदाता को मेरे विरुद्ध कानूनी कार्रवाई करने का अधिकार होगा। वह मेरे चेक को बाउंस करके भी कानूनी कार्रवाई कर सकता है।</li>
              <li>कोई भी विवाद मध्यस्थता अधिनियम/138 अधिनियम और लागू कानूनों के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
            </ol>
          </div>

          <div className="mt-12 space-y-8">
            <p className="clean-text">
              I <span className="underline-span"></span> Obliged with adherence of all above mentioned terms with my own consent.
            </p>
            <p className="clean-text">
              मैं <span className="underline-span"></span> अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूं।
            </p>

            <div className="mt-10">
              <div className="border border-black w-32 h-32 flex flex-col items-center justify-center text-sm mb-4">
                <span>Revenue</span>
                <span>Stamp</span>
              </div>
              <p className="font-bold text-sm">
                Affix Signature/ Thumb impression crossed upon the revenue stamp (राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
