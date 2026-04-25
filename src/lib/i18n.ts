export type Lang = "en" | "hi";

export const STRINGS = {
  appName: { en: "SwasthAI", hi: "स्वस्थAI" },
  tagline: {
    en: "Your Pocket Public Health Companion",
    hi: "आपका जेब का स्वास्थ्य साथी",
  },
  startCheck: { en: "Start Health Check", hi: "स्वास्थ्य जाँच शुरू करें" },
  symptomChecker: { en: "Symptom Checker", hi: "लक्षण जाँच" },
  nearby: { en: "Nearby Care", hi: "आस-पास देखभाल" },
  prescription: { en: "Prescription Scan", hi: "नुस्खा स्कैन" },
  alerts: { en: "Health Alerts", hi: "स्वास्थ्य अलर्ट" },
  history: { en: "My History", hi: "मेरा इतिहास" },
  signIn: { en: "Sign In", hi: "साइन इन" },
  signUp: { en: "Create Account", hi: "खाता बनाएँ" },
  signOut: { en: "Sign Out", hi: "साइन आउट" },
  email: { en: "Email", hi: "ईमेल" },
  password: { en: "Password", hi: "पासवर्ड" },
  describe: {
    en: "Describe your symptoms…",
    hi: "अपने लक्षण बताएँ…",
  },
  send: { en: "Send", hi: "भेजें" },
  speak: { en: "Speak", hi: "बोलें" },
  listening: { en: "Listening…", hi: "सुन रहा हूँ…" },
  emergency: { en: "Emergency", hi: "आपात स्थिति" },
  moderate: { en: "Moderate", hi: "मध्यम" },
  mild: { en: "Mild", hi: "हल्का" },
  emergencyAdvice: {
    en: "Go to the nearest hospital immediately or call emergency services.",
    hi: "तुरंत निकटतम अस्पताल जाएँ या आपातकालीन सेवा को कॉल करें।",
  },
  moderateAdvice: {
    en: "Visit a doctor within 24 hours.",
    hi: "24 घंटे के भीतर डॉक्टर से मिलें।",
  },
  mildAdvice: {
    en: "Home care should be enough. Rest, fluids, and monitor.",
    hi: "घर पर देखभाल पर्याप्त होगी। आराम करें, तरल पदार्थ लें।",
  },
  disclaimer: {
    en: "This is not a replacement for a doctor. Always consult a qualified medical professional.",
    hi: "यह डॉक्टर का विकल्प नहीं है। हमेशा योग्य चिकित्सक से परामर्श करें।",
  },
  newCheck: { en: "New Check", hi: "नई जाँच" },
  saveReport: { en: "Save Report", hi: "रिपोर्ट सहेजें" },
  uploadImage: { en: "Upload Prescription", hi: "नुस्खा अपलोड करें" },
  scanning: { en: "Reading prescription…", hi: "नुस्खा पढ़ रहा हूँ…" },
  language: { en: "Language", hi: "भाषा" },
  back: { en: "Back", hi: "वापस" },
  search: { en: "Search location…", hi: "स्थान खोजें…" },
  call: { en: "Call", hi: "कॉल" },
  directions: { en: "Directions", hi: "दिशा-निर्देश" },
  noReports: { en: "No saved reports yet.", hi: "अभी कोई रिपोर्ट नहीं।" },
} as const;

export function t(key: keyof typeof STRINGS, lang: Lang) {
  return STRINGS[key][lang] ?? STRINGS[key].en;
}
