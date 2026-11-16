"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function CreditAgreementPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">Credit Agreement (Hypothecation)</h1>
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
          .clean-text { font-weight: 400; font-size: 0.875rem; line-height: 1.6; }
          .agreement-heading { font-weight: 700; text-decoration: underline; text-transform: uppercase; text-align: center; }
        `}} />
        
        <div className="text-center mb-10">
          <h2 className="text-2xl agreement-heading">Credit (Hypothecation) Agreement</h2>
        </div>

        <div className="mb-6 space-y-6 clean-text">
          <p>
            I <span className="underline-span"></span> am purchasing a (product) <span className="underline-span"></span> as on (Date) <span className="underline-span"></span>.
          </p>

          <p>
            The Price of the product is Rs <span className="underline-span"></span>. I paid a sum of amount <span className="underline-span"></span>. As a down payment @ <span className="underline-span"></span>% of the cost of the product. Rest of the amount <span className="underline-span"></span> will be pay as per the credit service provider's instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).
          </p>

          <div className="grid grid-cols-2 gap-y-6 mt-8">
            <p>Cheque details : Cheque Number <span className="underline-span"></span></p>
            <p className="ml-20">Drawee Bank <span className="underline-span"></span></p>
            <p className="col-span-2 text-right md:pr-10">A/c Number <span className="underline-span"></span></p>
          </div>

          <div className="grid grid-cols-2 mt-6">
            <p>Name of the payee <span className="underline-span">Anavran Livelihood services Pvt Ltd</span></p>
            <p>Name of the remitter <span className="underline-span"></span></p>
          </div>

          <div className="mt-10">
            <p className="mb-4">The definition of the Rule and regulation of the Service provider are accepted by me which is described below :</p>
            <ol className="list-decimal pl-8 space-y-2 text-sm italic">
              <li>Purchased product will not be shared with any member or group or with any relatives/Friends till the completion of Credit limit.</li>
              <li>I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
              <li>I will pay all the Installment on stipulated time with in the credit tenure.</li>
              <li>I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
              <li>Product warranty and Guarantee will be provided as per the product's company norms.</li>
              <li>Product will not be changed once sold.</li>
              <li>Product manufacturing defects will be entertained as per the norms of manufacturer/ company.</li>
              <li>If credit default by me, will be subject to Jurisdiction.</li>
              <li>If any Installment will be stopped by me then service provider will be the right to recover/ forfeited the product financed by him.</li>
              <li>Any dispute will be subject to the Jurisdiction under arbitration act.</li>
            </ol>
          </div>
        </div>

        {/* Hindi Section */}
        <div className="mt-16 border-t pt-10 space-y-6 clean-text" style={{ fontFamily: "'Noto Sans Hindi', sans-serif" }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl agreement-heading">ऋण (गिरवी) समझौता</h2>
          </div>

          <p>
            मैं <span className="underline-span"></span> दिनांक को एक (उत्पाद) <span className="underline-span"></span> खरीद रहा/रही हूँ।
          </p>

          <p>
            उत्पाद की कीमत रु <span className="underline-span"></span> है। मैंने <span className="underline-span"></span> राशि का अग्रिम भुगतान उत्पाद की लागत के <span className="underline-span"></span>% की दर से किया है। शेष राशि <span className="underline-span"></span> का भुगतान क्रेडिट सेवा प्रदाता के निर्देशों के अनुसार किया जाएगा, क्योंकि मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के निर्देशों (नियम और विनियमों) का पालन करने के लिए बाध्य हूँ। इस संदर्भ में, मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पक्ष में सुरक्षा उद्देश्य से अपने बैंक खाते का चेक दे रहा/रही हूँ।
          </p>

          <div className="grid grid-cols-2 gap-y-6 mt-6">
            <p>चेक विवरण: चेक संख्या <span className="underline-span"></span></p>
            <p>आहरित बैंक <span className="underline-span"></span></p>
            <p className="col-span-2 text-right md:pr-10">खाता संख्या <span className="underline-span"></span></p>
          </div>

          <div className="grid grid-cols-2 mt-4">
            <p>प्राप्तकर्ता का नाम <span className="underline-span">Anavran Livelihood services Pvt Ltd</span></p>
            <p>प्रेषक का नाम <span className="underline-span"></span></p>
          </div>

          <div className="mt-10">
            <p className="mb-4">सेवा प्रदाता के नियमों और विनियमों की परिभाषा, जो नीचे दी गई है, मैं स्वीकार करता/करती हूँ:</p>
            <ol className="list-decimal pl-8 space-y-2 text-sm italic">
              <li>खरीदी गई वस्तु को क्रेडिट सीमा पूरी होने तक किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं किया जाएगा।</li>
              <li>मैं भुगतान के उस तरीके से सहमत/सहमत हूँ जिस पर मैंने क्रेडिट एग्रीमेंट भरते समय हस्ताक्षर किए थे।</li>
              <li>मैं क्रेडिट अवधि के भीतर सभी किस्तें निर्धारित समय पर चुकाऊंगा/चुकाऊंगी।</li>
              <li>मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
              <li>उत्पाद की वारंटी और गारंटी उत्पाद की कंपनी के मानदंडों के अनुसार प्रदान की जाएगी।</li>
              <li>एक बार बेचे जाने के बाद उत्पाद को बदला नहीं जाएगा।</li>
              <li>उत्पाद निर्माण दोषों को निर्माता/कंपनी के मानदंडों के अनुसार ठीक किया जाएगा।</li>
              <li>मेरे द्वारा क्रेडिट डिफॉल्ट की स्थिति में, मामला संबंधित क्षेत्राधिकार के अधीन होगा।</li>
              <li>यदि मैं कोई किस्त रोक देता/देती हूँ, तो सेवा प्रदाता को मेरे द्वारा वित्तपोषित उत्पाद को वापस लेने/ज़ब्त करने का अधिकार होगा।</li>
              <li>कोई भी विवाद मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
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
