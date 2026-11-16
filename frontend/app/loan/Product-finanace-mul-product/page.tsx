"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function ProductAgreementPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold">
          Product Finance Agreement
        </h1>
        <Button onClick={() => handlePrint()} className="flex gap-2">
          <Printer className="w-4 h-4" /> Print
        </Button>
      </div>

      {/* PRINT AREA */}
      <div
        ref={componentRef}
        className="print-container bg-white text-black p-12 text-sm shadow-lg border rounded-lg"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
            @media print {
              .no-print { display: none !important; }
              .page-break { page-break-before: always; }
              @page { 
                margin: 1.5cm; 
                size: auto;
              }
              body {
                -webkit-print-color-adjust: exact;
              }
              .print-container {
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
              }
            }

            .print-container {
              background: white;
              color: black;
              line-height: 1.25;
              font-size: 12px;
            }

            .page {
              padding-bottom: 0px;
            }

            p {
              margin: 4px 0;
            }

            ol {
              margin: 4px 0;
              padding-left: 0;
              list-style-type: none;
            }

            li {
              margin-bottom: 2px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin: 6px 0;
            }

            th, td {
              border: 1px solid black;
              padding: 4px;
            }

            .heading {
              text-align: center;
              font-weight: bold;
              text-decoration: underline;
              font-size: 18px;
              margin-bottom: 10px;
            }

            /* Hindi spacing fix */
            .hindi {
              line-height: 1.5;
              font-size: 12px;
            }
          `,
          }}
        />

        {/* ================= PAGE 1 ================= */}
        <div className="page">
          <h2 className="heading">
            Product finance cum (Hypothecation) Agreement
          </h2>

          <p>
            I ................................................ am purchasing below mentioned multiple products as on (Date) .............................
          </p>

          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Product type (Description)</th>
                <th>Product Value (Price)</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="h-8"></td>
                  <td className="h-8"></td>
                  <td className="h-8"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <p>
            The total Price of the product is Rs ............................ in which, I paid a sum of amount ............................ As a down payment (........% of the cost of the product. Rest of the amount ............................ will be pay as per the credit service provider’s instructions as I obliged to obey the instructions (Rule and regulation) of the service provider (Anavran Livelihood services Pvt Ltd). In this context, I am giving my cheque of my Bank account as a security purpose in favor of the service provider (Anavran Livelihood services Pvt Ltd).
          </p>

          <p>
            Cheque details : Cheque Number ............................ Drawee Bank ............................ A/c Number ............................
          </p>

          <p>
            Name of the payee ............................ Name of the remitter ............................
          </p>

          <p>
            The definition of the Rule and regulation of the Service provider are accepted by me which is described below :
          </p>

          <ol>
            <li>1. Purchased products will not be shared with any member or group or with any relatives/Friends till the completion of credit limit.</li>
            <li>2. I am comfortable for the said mode of repayment which is agreed by me at the time of filling the CAF.</li>
            <li>3. I will pay all the Installment on stipulated time with in the credit tenure.</li>
            <li>4. I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
            <li>5. Product warranty and Guarantee will be provided as per the product’s company norms.</li>
            <li>6. Product will not be changed once sold.</li>
            <li>7. Product manufacturing defects will be entertained as per the norms of manufacturer/ company.</li>
            <li>8. If credit default by me, will be subject to Jurisdiction.</li>
            <li>9. This hypothecation agreement does mean that the product ownership will be remain in position under service provider (“Anavran Livelihood Services Pvt Ltd”) until the total repayment will be pay from my side.</li>
            <li>10. If Installment will be stopped by me then service provider will be the right to recover/ forfeited the products financed by him.</li>
            <li>11. In the condition of any delay payment, I am liable for the late payment fee of Rs 450/- or 5% of the Principle outstanding (Which may higher) for every delay payment.</li>
            <li>12. In case of death circumstances, if purchaser is not insured then other family members of the purchaser will be liable to pay all the debts (Pending EMIs).</li>
            <li>13. Any dispute will be subject to the Jurisdiction under arbitration act.</li>
          </ol>
        </div>

        {/* ================= PAGE BREAK ================= */}
        <div className="page-break"></div>

        {/* ================= PAGE 2 ================= */}
        <div className="page" style={{ fontFamily: "Noto Sans Hindi, sans-serif" }}>
          <h2 className="heading text-center font-bold underline text-lg mb-4">
            उत्पाद वित्तपोषण सह (गिरवी) समझौता
          </h2>

          <p className="hindi">
            मैं ................................................ दिनांक (तारीख) को नीचे हस्ताक्&zwj;षरित कई उत्पाद खरीद रहा/रही हूँ।
          </p>

          <table>
            <thead>
              <tr>
                <th>उत्पाद का नाम</th>
                <th>उत्पाद का प्रकार (विवरण)</th>
                <th>उत्पाद का मूल्य (कीमत)</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td className="h-8"></td>
                  <td className="h-8"></td>
                  <td className="h-8"></td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="hindi">
            उत्पाद की कुल मूल्य रु. .................. रुपये है, जिसमें मैंने .................. राशि का अग्रिम भुगतान (उत्पाद की लागत का ..........%) किया है। शेष राशि .................. ऋण की किस्तों के अनुसार देय होगी, क्योंकि मैं सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के निर्देशों (नियम और विनियम) का पालन करने के लिए बाध्य हूँ। इस संदर्भ में, मैं अपने बैंक खाते का चेक सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पक्ष में सुरक्षा के रूप में दे रहा/रही हूँ।
          </p>

          <p className="hindi">
            चेक विवरण: चेक संख्या .................. आहरित बैंक .................. खाता संख्या ..................
          </p>

          <p className="hindi">
            प्राप्तकर्ता का नाम .................. प्रेषक का नाम ..................
          </p>

          <p className="hindi font-bold">
            सेवा प्रदाता के नियमों और विनियमों को परिभाषा, जो नीचे दी गई है, मैं स्वीकार करता/करती हूँ:
          </p>

          <ol className="hindi">
            <li>1. खरीदे गए उत्पाद क्रेडिट सीमा पूरी होने तक किसी भी सदस्य, समूह या रिश्तेदार/मित्र के साथ साझा नहीं किए जाएंगे।</li>
            <li>2. मैं भुगतान के तरीके से सहमत हूँ जिस पर मैंने क्रेडिट आवेदन भरते समय सहमति दी थी।</li>
            <li>3. मैं क्रेडिट अवधि के भीतर सभी किस्तों को निर्धारित समय पर चुकाऊंगा/चुकाऊंगी।</li>
            <li>4. मैं सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करने के लिए उत्तरदायी हूँ।</li>
            <li>5. उत्पाद की वारंटी और गारंटी कंपनी के मानकों के अनुसार प्रदान की जाएगी।</li>
            <li>6. एक बार बेचने के बाद उत्पाद को बदला नहीं जाएगा।</li>
            <li>7. उत्पाद निर्माण दोषों को निर्माता/कंपनी के मानकों के अनुसार ठीक किया जाएगा।</li>
            <li>8. यदि मैं क्रेडिट डिफॉल्ट करता/करती हूँ, तो मामला संबंधित क्षेत्राधिकार के अधीन होगा।</li>
            <li>9. इस बंधक समझौते का अर्थ यह है कि उत्पाद का स्वामित्व सेवा प्रदाता ("अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड") के पास तब तक बना रहेगा जब तक मेरी ओर से कुल भुगतान नहीं हो जाता।</li>
            <li>10. यदि मैं कोई किस्त भुगतान रोक देता/देती हूँ, तो सेवा प्रदाता को वित्तपोषित उत्पादों को वापस लेने/जब्त करने का अधिकार होगा।</li>
            <li>11. भुगतान में किसी भी प्रकार की देरी होने पर, प्रत्येक विलंबित भुगतान के लिए मुझे ₹450/- रुपये या बकाया मूलधन का 5% (जो भी अधिक हो) का भुगतान करना होगा।</li>
            <li>12. मृत्यु की स्थिति में, यदि खरीदार का बीमा नहीं है तो खरीदार के अन्य परिवार के सदस्य सभी ऋणों (बकाया ईएमआई) का भुगतान करने के लिए उत्तरदायी होंगे।</li>
            <li>13. किसी भी विवाद का निपटान मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
          </ol>

          <p>
            I ................................................ Obliged with adherence of all above mentioned terms with my own consent.
          </p>

          <p className="hindi font-bold">
            मैं ................................................ अपनी सहमति से उपरोक्त सभी शर्तों का पालन करने के लिए बाध्य हूँ।
          </p>

          <div className="flex justify-between items-end mt-2">
            <div className="border w-24 h-24 flex items-center justify-center text-xs text-center p-2">
              Revenue Stamp
            </div>
            <div className="text-right">
              <p>................................................</p>
              <p className="text-xs">Signature/ Thumb impression</p>
            </div>
          </div>

          <p className="text-[10px] mt-1 italic">
            Affix Signature/ Thumb impression crossed upon the revenue stamp (राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)
          </p>
        </div>
      </div>
    </div>
  );
}