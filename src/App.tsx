/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, ShieldCheck, Landmark } from "lucide-react";
import { AudioProcessor } from './services/audioService';
import { VoiceVisualizer } from './components/VoiceVisualizer';

// Mock Data as Constants for the System Instruction
const MOCK_DATA = {
  customer: {
    name: "أحمد سالم العتيبي",
    id: "1029384756",
    bank: "بنك الأمان الوطني",
    account: "402198765432",
    iban: "SA4420000001234567890123",
    balance: 18640,
    availableBalance: 17900,
    mobile: "05XXXXXX84"
  },
  beneficiaries: [
    { name: "خالد فهد القحطاني", account: "5544332211", bank: "بنك الرياض" },
    { name: "نورة عبدالله الحربي", account: "8899001122", bank: "مصرف الراجحي" },
    { name: "مؤسسة الهدى للمقاولات", account: "7700112233", bank: "البنك الأهلي السعودي" },
    { name: "محمد راشد الدوسري", account: "6611447788", bank: "بنك الإنماء" }
  ],
  bills: [
    { company: "شركة الكهرباء السعودية", amount: 415 },
    { company: "شركة المياه الوطنية", amount: 132 },
    { company: "شركة الاتصالات السعودية STC", amount: 298 },
    { company: "تمارا", amount: 850 },
    { company: "إيجار شهري عبر منصة إيجار", amount: 2500 }
  ],
  lastTransactions: [
    "تحويل 1,200 ريال إلى محمد راشد الدوسري",
    "سداد فاتورة كهرباء 390 ريال",
    "استلام 5,000 ريال من مؤسسة الهدى",
    "عملية شراء عبر مدى 175 ريال"
  ]
};

const SYSTEM_INSTRUCTION = `
أنت "مُجيب"، مساعد بنكي صوتي ذكي من "بنك الأمان الوطني".
مهمتك هي خدمة المكفوفين وضعاف البصر في المملكة العربية السعودية.

شخصيتك:
- موظف خدمة عملاء رسمي، مهذب جداً، مطمئن، واحترافي.
- استخدم عبارات مثل: "يسعدني خدمتك"، "بكل سرور"، "للتأكيد فقط"، "أشكرك على ثقتك بنا".

قواعد التفاعل (حاسمة):
1. التفاعل صوتي بالكامل. لا تستخدم أي تعليمات بصرية.
2. اقرأ الأرقام ككلمات ببطء ووضوح. مثال: قل "ألفان وخمسمائة ريال سعودي" بدلاً من "2500".
3. استخدم اللغة العربية الفصحى السهلة.
6. لا تستخدم اختصارات مثل OTP، قل "رمز التحقق".

بيانات الحساب:
- العميل: ${MOCK_DATA.customer.name}
- الرصيد الحالي: ثمانية عشر ألفاً وستمائة وأربعون ريالاً سعودياً.
- الرصيد المتاح للتحويل: سبعة عشر ألفاً وتسعمائة ريال سعودي.

المستفيدون:
${MOCK_DATA.beneficiaries.map((b, i) => `${i + 1}) ${b.name} - ${b.bank}`).join('\n')}

الفواتير:
${MOCK_DATA.bills.map(b => `- ${b.company}: ${b.amount} ريال`).join('\n')}

آلية العمليات الحساسة (تحويل أو سداد):
1. التأكيد الصوتي: "للتأكيد فقط، ترغب في [العملية] بمبلغ [المبلغ] إلى [الجهة]. هل هذا صحيح؟"
2. إذا وافق المستخدم: "تم إرسال رمز تحقق إلى جوالك المسجل. الرجاء إدخال الرمز لإتمام العملية."
3. أي رمز ينطقه المستخدم مقبول.
4. النجاح: "تم التحقق من الرمز بنجاح. تم تنفيذ العملية بنجاح. رصيدك المتبقي هو [احسب الرصيد الجديد] ريال سعودي. هل يمكنني خدمتك بشيء آخر؟"

ابدأ دائماً بالترحيب الحار بالعميل أحمد سالم العتيبي.
`;

export default function App() {
  const [isActive, setIsActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState<string | null>(null);

  const audioProcessor = useRef<AudioProcessor>(new AudioProcessor());
  const sessionRef = useRef<any>(null);

  const startConversation = async () => {
    try {
      setError(null);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const session = await ai.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-09-2025",
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsActive(true);
            audioProcessor.current.startRecording((base64Data) => {
              session.sendRealtimeInput({
                media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
              });
            });
          },
          onmessage: async (message) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              setIsSpeaking(true);
              audioProcessor.current.playAudioChunk(base64Audio);
              // Simple timeout to reset speaking state if no more chunks arrive
              // In a real app, we'd use the audio ended event
            }

            // Handle transcription for UI display (large text for visually impaired)
            const text = message.serverContent?.modelTurn?.parts[0]?.text || 
                         message.serverContent?.modelTurn?.parts.find(p => p.text)?.text;
            if (text) {
              setResponse(text);
            }

            // Handle interruption
            if (message.serverContent?.interrupted) {
              audioProcessor.current.stopPlayback();
              setIsSpeaking(false);
            }
          },
          onclose: () => {
            stopConversation();
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.");
            stopConversation();
          }
        }
      });

      sessionRef.current = session;
    } catch (err) {
      console.error("Failed to start conversation:", err);
      setError("تعذر بدء المحادثة. تأكد من إعدادات الميكروفون.");
    }
  };

  const stopConversation = () => {
    setIsActive(false);
    setIsSpeaking(false);
    audioProcessor.current.stopRecording();
    audioProcessor.current.stopPlayback();
    if (sessionRef.current) {
      // sessionRef.current.close(); // Not always available on the promise object
      sessionRef.current = null;
    }
  };

  const toggleMic = () => {
    if (isActive) {
      stopConversation();
    } else {
      startConversation();
    }
  };

  // Reset speaking state after a delay if no audio chunks
  useEffect(() => {
    if (isSpeaking) {
      const timer = setTimeout(() => setIsSpeaking(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking]);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col items-center justify-between p-8 font-sans overflow-hidden">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mt-12"
      >
        <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-200 to-blue-500 bg-clip-text text-transparent">
          تحدث مع مُجيب
        </h2>
      </motion.div>

      {/* Center Visualizer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
        <div className="pointer-events-auto">
          <VoiceVisualizer isActive={isActive} isSpeaking={isSpeaking} />
        </div>
      </div>

      {/* Spacer to maintain layout flow if needed, or just let absolute handle it */}
      <div className="flex-1" />

      {/* Response Display (Hidden as per user request for voice-only) */}
      <div className="w-full max-w-3xl px-6 mb-8 min-h-[100px] flex items-center justify-center">
        {error && (
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-center mt-4 text-lg"
          >
            {error}
          </motion.p>
        )}
      </div>

      {/* Footer Controls */}
      <div className="mb-16 flex flex-col items-center gap-6">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMic}
          className={`
            relative group flex items-center justify-center p-5 rounded-full transition-all duration-500
            ${isActive 
              ? 'bg-red-500/10 border-2 border-red-500/50 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.3)]' 
              : 'bg-blue-600 border-2 border-blue-400 text-white shadow-[0_0_40px_rgba(37,99,235,0.5)] hover:bg-blue-500'
            }
          `}
        >
          <div className="relative">
            {isActive ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isActive && (
              <motion.div
                animate={{ scale: [1, 1.8, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-0 bg-red-400 rounded-full -z-10"
              />
            )}
          </div>
        </motion.button>
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .dir-rtl { direction: rtl; }
      `}} />
    </div>
  );
}
