"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export default function HypothecatedPurchaseAgreementPage() {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: " ",
  });

  return (
    <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Header */}
      <div className="flex justify-between items-center no-print">
        <h1 className="text-2xl font-bold text-slate-800">
          Hypothecated Purchase Agreement
        </h1>
        <Button onClick={() => handlePrint()} className="flex gap-2 bg-blue-600 hover:bg-blue-700">
          <Printer className="w-4 h-4" /> Print Agreement
        </Button>
      </div>

      {/* PRINT AREA */}
      <div
        ref={componentRef}
        className="print-container bg-white text-black p-12 text-[13px] shadow-lg border rounded-lg"
        style={{ fontFamily: "'Times New Roman', serif", lineHeight: "1.4" }}
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
                background: white !important;
              }
              .print-container {
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                width: 100% !important;
              }
            }

            .print-container {
              background: white;
              color: black;
            }

            .section-title {
              font-weight: bold;
              text-decoration: underline;
              text-transform: uppercase;
              text-align: center;
              font-size: 20px;
              margin-bottom: 25px;
            }

            .sub-section-title {
              font-weight: bold;
              font-size: 15px;
              margin-top: 15px;
              margin-bottom: 8px;
            }

            .content-row {
              display: flex;
              margin-bottom: 8px;
            }

            .label {
              font-weight: bold;
              min-width: 140px;
            }

            .dots {
              flex-grow: 1;
              border-bottom: 1px dotted #000;
              margin-left: 5px;
            }

            .grid-table {
              width: 100%;
              margin: 15px 0;
            }

            .grid-table th, .grid-table td {
              text-align: left;
              padding: 5px 0;
            }

            .hindi-text {
              font-family: 'Noto Sans Hindi', sans-serif;
              line-height: 1.6;
              margin-top: 10px;
            }

            hr {
                border: 0;
                border-top: 1px solid #ccc;
                margin: 15px 0;
            }

            .page-break-margin {
                margin-top: 40px;
            }

            .final-page {
              font-size: 12px;
              line-height: 1.3;
            }

            .final-page p {
              margin: 4px 0;
            }

            .final-page .hindi-text {
              margin-top: 2px;
              line-height: 1.45;
            }

            .final-page hr {
              margin: 10px 0;
            }
          `,
          }}
        />

        {/* ================= ENGLISH PAGE 1 ================= */}
        <div className="page">
          <h2 className="section-title">HYPOTHECATED PURCHASE AGREEMENT</h2>

          <p className="font-bold mb-4">This Agreement is made on .............................. date between:</p>
          
          <div className="mb-4">
            <p className="font-bold">Anavran Livelihood Services Pvt Ltd</p>
            <p className="">(Hereinafter referred to as &quot;Company&quot;)</p>
          </div>

          <p className="font-bold my-2">AND</p>

          <div className="mb-6">
            <div className="flex items-end">
              <span className="font-bold">Customer Name:</span>
              <span className="grow border-b border-dotted border-black ml-2 h-5"></span>
            </div>
            <p className="">(Hereinafter referred to as &quot;Customer&quot;)</p>
          </div>

          <hr />

          <div className="sub-section-title">1. Product Details</div>
          <ul className="list-disc pl-8 space-y-1">
            <li className="flex items-end">Product: Electric Scooty</li>
            <li className="flex items-end">Model: <span className="grow border-b border-dotted border-black ml-2 h-4"></span></li>
            <li className="flex items-end">Chassis No: <span className="grow border-b border-dotted border-black ml-2 h-4"></span></li>
            <li className="flex items-end">Engine No: <span className="grow border-b border-dotted border-black ml-2 h-4"></span></li>
          </ul>

          <hr />

          <div className="sub-section-title">2. Financial Terms</div>
          <table className="w-full mt-2">
            <thead>
              <tr className="text-left font-bold">
                <th className="w-1/3">Particular</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr>
                <td>Product Price</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>Down Payment</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>Financed Amount</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>Tenure</td>
                <td><span className="inline-block w-16 border-b border-black"></span> Months</td>
              </tr>
              <tr>
                <td>EMI</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
            </tbody>
          </table>

          <hr />

          <div className="sub-section-title">3. Ownership Clause</div>
          <ul className="list-disc pl-8 space-y-2">
            <li className="font-bold">This hypothecation agreement does mean that the product ownership will be remain in position under service provider (&quot;Anavran Livelihood Services Pvt Ltd&quot;) until the total repayment will be pay by the customer.</li>
            <li>The ownership will be transferred after completion of full payment (EMIs).</li>
            <li>Ownership transfer charges will be bear by the customer once completed all payments (EMIs).</li>
          </ul>

          <div className="page-break-margin"></div>

          <div className="sub-section-title">4. Payment Terms</div>
          <ul className="list-disc pl-8 space-y-2">
            <li className="font-bold">I am comfortable for the said mode of repayment which is signed by me at the time of filling the CAF.</li>
            <li className="font-bold">I will pay all the Installment on stipulated time with in the credit tenure.</li>
            <li className="font-bold">In the condition of any delay payment, I am liable for the late payment fee of Rs 450/- or 5% of the Principle outstanding (Which may higher) for every delay payment.</li>
            <li className="font-bold">I will liable to pay all the taxes i.e. service tax, GST etc. Also for penalties for late payments.</li>
          </ul>

          <div className="sub-section-title">5. Hypothecation Clause</div>
          <ul className="list-disc pl-8 space-y-1">
            <li>Product will be hypothecated in the favor of company “Anavran Livelihood Services Pvt Ltd”.</li>
            <li>In RC Company name will be mentioned</li>
          </ul>

          <div className="sub-section-title">6. Default Clause</div>
          <ul className="list-disc pl-8">
            <li className="font-bold">If Installment will be stopped by me then service provider will be the right to recover/ forfeited the product financed by him.</li>
          </ul>

          <div className="sub-section-title">7. Repossession Clause</div>
          <ul className="list-disc pl-8 space-y-1">
            <li>In case of default the product (ES) will be repospession by the company without permission of the court.</li>
            <li>In this context Customer has no rights for any objection for the above concern.</li>
          </ul>

          <div className="sub-section-title">8. Insurance</div>
          <ul className="list-disc pl-8 space-y-1">
            <li>Insurance is mandatory</li>
            <li>Company as hypothecator</li>
          </ul>

          <div className="sub-section-title">9. Jurisdiction</div>
          <ul className="list-disc pl-8">
            <li className="font-bold">Any dispute will be subject to the Jurisdiction under arbitration act.</li>
          </ul>

          <div className="sub-section-title">10. Product Warranty</div>
          <ul className="list-disc pl-8">
            <li className="font-bold">Product warranty and Guarantee will be provided as per the product’s company norms.</li>
          </ul>
        </div>

        {/* ================= PAGE BREAK ================= */}
        <div className="page-break"></div>

        {/* ================= HINDI PAGE ================= */}
        <div className="page" style={{ fontFamily: "'Noto Sans Hindi', sans-serif" }}>
          <h2 className="section-title">गिरवी खरीद समझौता</h2>

          <p className="mb-4 hindi-text">यह समझौता दिनांक .............................. को निम्नलिखित के बीच किया गया है:</p>
          
          <div className="mb-4">
            <p className="font-bold">अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड</p>
            <p className="">(इसके बाद &quot;कंपनी&quot; कहा जाएगा)</p>
          </div>

          <p className="font-bold my-2">और</p>

          <div className="mb-6">
            <div className="flex items-end">
              <span className="font-bold">ग्राहक का नाम:</span>
              <span className="grow border-b border-dotted border-black ml-2 h-5"></span>
            </div>
            <p className="">(इसके बाद &quot;ग्राहक&quot; कहा जाएगा)</p>
          </div>

          <hr />

          <div className="sub-section-title text-blue-700 italic">1. उत्पाद विवरण</div>
          <ul className="list-disc pl-8 space-y-1 hindi-text">
            <li>उत्पाद: इलेक्ट्रिक स्कूटी</li>
            <li>मॉडल: ..............................</li>
            <li>चेसिस संख्या: ..............................</li>
            <li>इंजन संख्या: ..............................</li>
          </ul>

          <hr />

          <div className="sub-section-title text-blue-700 italic">2. वित्तीय शर्तें</div>
          <table className="w-full mt-2 hindi-text">
            <thead>
              <tr className="text-left font-bold border-b border-black">
                <th className="pb-1">विवरण</th>
                <th className="pb-1">राशि</th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              <tr>
                <td>उत्पाद मूल्य</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>डाउन पेमेंट</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>वित्तपोषीत राशि</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
              <tr>
                <td>अवधि</td>
                <td><span className="inline-block w-16 border-b border-black"></span> महीने</td>
              </tr>
              <tr>
                <td>ईएमआई</td>
                <td>₹ <span className="inline-block w-24 border-b border-black"></span></td>
              </tr>
            </tbody>
          </table>

          <hr />

          <div className="sub-section-title text-blue-700 italic">3. स्वामित्व खंड</div>
          <ul className="list-disc pl-8 space-y-2 hindi-text">
            <li className="font-bold">इस बंधक समझौते का अर्थ यह है कि उत्पाद का स्वामित्व सेवा प्रदाता (अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड) के पास तब तक रहेगा जब तक ग्राहक द्वारा कुल भुगतान नहीं कर दिया जाता।</li>
            <li>पूर्ण भुगतान (ईएमआई) पूरा होने के बाद स्वामित्व स्थानांतरित कर दिया जाएगा।</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">4. भुगतान शर्तें</div>
          <ul className="list-disc pl-8 space-y-2 hindi-text">
            <li>मैं भुगतान के उस तरीके से सहमत हूँ जिस पर मैंने सीएएफ भरते समय हस्ताक्षर किए थे।</li>
            <li>मैं क्रेडिट अवधि के भीतर निर्धारित समय पर सभी किस्तें चुकाऊँगा।</li>
            <li>भुगतान में किसी भी प्रकार की देरी होने पर, मुझे प्रत्येक विलंबित भुगतान पर ₹450/- या बकाया मूलधन का 5% (जो भी अधिक हो) विलंब शुल्क देना होगा।</li>
            <li>मुझे सभी करों, जैसे सेवा कर, जीएसटी आदि, और विलंबित भुगतान के लिए जुर्माने का भुगतान करना होगा।</li>
          </ul>

          <hr />

          <div className="sub-section-title text-blue-700 italic">5. बंधक खंड</div>
          <ul className="list-disc pl-8 space-y-1 hindi-text">
            <li>उत्पाद &quot;अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड&quot; कंपनी के पक्ष में बंधक रखा जाएगा।</li>
            <li>अनुबंध पत्र में कंपनी का नाम उल्लिखित होगा।</li>
            <li>सभी भुगतान (ईएमआई) पूरे हो जाने के बाद स्वामित्व हस्तांतरण शुल्क ग्राहक द्वारा वहन किया जाएगा।</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">6. चूक खंड</div>
          <ul className="list-disc pl-8 hindi-text">
            <li>यदि मैं किस्त का भुगतान रोक देता हूँ, तो सेवा प्रदाता को अपने द्वारा वित्तपोषित उत्पाद को वापस लेने/जब्त करने का अधिकार होगा।</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">7. पुन: प्राप्ति खंड</div>
          <ul className="list-disc pl-8 space-y-1 hindi-text">
            <li>चूक की स्थिति में, कंपनी न्यायालय की अनुमति के बिना उत्पाद (ES) को वापस ले लेगी।</li>
            <li>इस संदर्भ में, ग्राहक को उपरोक्त प्रावधान पर आपत्ति करने का कोई अधिकार नहीं है।</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">8. बीमा</div>
          <ul className="list-disc pl-8 space-y-1 hindi-text">
            <li>बीमा अनिवार्य है</li>
            <li>कंपनी बंधककर्ता के रूप में</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">9. क्षेत्राधिकार</div>
          <ul className="list-disc pl-8 hindi-text">
            <li>कोई भी विवाद मध्यस्थता अधिनियम के अंतर्गत क्षेत्राधिकार के अधीन होगा।</li>
          </ul>

          <div className="sub-section-title text-blue-700 italic">10. उत्पाद वारंटी</div>
          <ul className="list-disc pl-8 hindi-text">
            <li>उत्पाद वारंटी और गारंटी उत्पाद की कंपनी के मानदंडों के अनुसार प्रदान की जाएगी।</li>
          </ul>
        </div>

        {/* ================= FINAL SIGNATURE PAGE ================= */}
        <div className="page-break"></div>
        <div className="page p-8 final-page">
          <div className="mt-2">
                <p>I ............................................................................................ Obliged with adherence of all above mentioned terms with my own consent.</p>
                
            <p className="hindi-text mt-3 font-bold">मैं ............................................................................................ अपनी सहमति से सभी शर्तों का पालन करने के लिए बाध्य हूँ।</p>
            </div>

          <div className="flex gap-10 mt-6">
                <div className="border border-black w-24 h-24 flex items-center justify-center text-xs text-center p-2">
                    Revenue<br/>Stamp
                </div>
            <div className="grow pt-6">
                    <p className="font-bold">Affix Signature/ Thumb impression crossed upon the revenue stamp <span className="hindi-text">(राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं)</span></p>
                </div>
            </div>

          <hr className="my-5 border-slate-400" />

          <h3 className="text-center text-lg underline font-bold mb-4">Vernacular declaration along with thumb impression consent</h3>

          <div className="space-y-2">
                <div className="flex gap-4">
                    <span>Customer ID ........................................</span>
                    <span>Credit ID ........................................</span>
                </div>

                <p className="text-justify">
                    I ................................................................... agree that all the financial application documents provided by the service provider Anavran Livelihood services Pvt Ltd in which all the mentioned criteria for teaching and explaining and understood in my regional language by the authorized person/employee to me is fully satisfactory. I am giving my consent for this process with my will and good heart.
                </p>

                <p className="text-justify">
                    I am giving my consent for acceptance, support and adherence towards terms and conditions and giving my consent by putting my signature/ thumb impression for the conclusion arise from all the mentioned explanations of all the documents.
                </p>

                <h4 className="text-center font-bold underline mt-3">स्थानीय भाषा में घोषणा और अंगूठे के निशान के साथ सहमति</h4>
                
                <div className="flex gap-4 hindi-text">
                    <span>ग्राहक आईडी ........................................</span>
                    <span>क्रेडिट आईडी ........................................</span>
                </div>

                <p className="hindi-text text-justify">
                    मै ................................................................... सहमत हूँ कि सेवा प्रदाता अनावरण लाइवलीहुड सर्विसेज प्राइवेट लिमिटेड द्वारा प्रदान किए गए सभी वित्तीय आवेदन दस्तावेज़, जिनमें उल्लिखित सभी मानदंड क्षेत्रीय भाषा में अधिकृत व्यक्ति/कर्मचारी द्वारा मुझे समझाए और बताए गए हैं, पूरी तरह से संतोषजनक हैं। मैं अपनी इच्छा और सद्भावना से इस प्रक्रिया के लिए अपनी सहमति दे रहा हूँ।
                </p>

                <p className="hindi-text text-justify">
                    मैं नियमों और शर्तों को स्वीकार करने, उनका समर्थन करने और उनका पालन करने के लिए अपनी सहमति दे रहा हूँ और सभी दस्तावेज़ो में उल्लिखित सभी स्पष्टीकरणो से निकले निष्कर्ष पर अपने हस्ताक्षर/ अंगूठे का निशान लगाकर अपनी सहमति दे रहा हूँ।
                </p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6">
                <div>Date (दिनांक) .............................</div>
                <div className="flex items-center gap-4">
                    <span>राजस्व स्टांप पर हस्ताक्षर/अंगूठे का निशान लगाएं</span>
                    <div className="border border-black w-20 h-20 flex items-center justify-center text-[10px] text-center p-1">
                        Revenue<br/>Stamp
                    </div>
                </div>
                <div>Place (स्थान) .............................</div>
              <div className="pt-6 border-t border-black text-center">Authorised person/ employee signature</div>
              <div className="pt-6 border-t border-black text-center">Witness (गवाह) .............................</div>
            </div>
        </div>
      </div>
    </div>
  );
}