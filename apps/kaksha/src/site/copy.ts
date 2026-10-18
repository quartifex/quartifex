// Words for the product page, in English and Hindi. The docs below the page are
// English for now; the Hindi page says so. Every claim here is about what the tool
// does, never about results it causes.
import { PRODUCT_NAME, PRODUCT_NAME_HI } from "../config";

export type SiteLocale = "en" | "hi";

const en = {
  label: "Free tool",
  skip: "Skip to content",
  nav: { demo: "Demo", why: "Why", install: "Install", docs: "Docs", schools: "For schools" },
  langOther: { href: "/hi", label: "हिन्दी", lang: "hi" },
  hero: {
    kicker: `${PRODUCT_NAME} · ${PRODUCT_NAME_HI}`,
    title: "Mark a whole class in minutes.",
    lines: ["Works offline.", "Your students' data never leaves your phone."],
    sub: "A free app for teachers: tap each child's answer, see where the class stands, print report cards. No account, no internet needed after the first visit.",
    open: "Open the app",
    demo: "Try the demo",
    facts: [
      ["Cost", "Free"],
      ["Account", "None"],
      ["Internet", "Only for the first visit"],
      ["Languages", "Hindi, English"],
    ] as Array<[string, string]>,
  },
  sheet: {
    title: "From the register to the grid to the chart",
    steps: [
      [
        "The paper sheet",
        "Ticks, crosses and circles, one row per child: how most of us mark today.",
      ],
      [
        "The grid",
        `The same marks, tapped into ${PRODUCT_NAME}. One tap per answer, saved as you go.`,
      ],
      ["The chart", "The grid adds itself up: which questions the class found hard, at a glance."],
    ] as Array<[string, string]>,
    caption: "Illustrative: an invented class of eight children and six questions.",
    paper: "Paper",
    grid: "Grid",
    chart: "Chart",
    q: "Q",
    skip: "Skip the animation",
  },
  demo: {
    title: "Try it with an invented class",
    body: "This is the real app, running in your browser on synthetic data: an invented school and 36 invented children. It uses its own storage, separate from anything you mark for real.",
    tasks: [
      {
        id: "mark",
        title: "Mark a test",
        body: "Open September's maths check and tap answers for a few children. Notice how it moves to the next child by itself, and try Undo.",
        hash: "/test/demo-maths-sep/mark",
      },
      {
        id: "class",
        title: "Read the class view",
        body: "See August's results: average, attendance, the questions the class found hard, quartile groups and who needs help by skill.",
        hash: "/test/demo-maths-aug",
      },
      {
        id: "report",
        title: "Print a report card",
        body: "Open one child's report card and print it, or save it as a PDF. It is made on the device; nothing is uploaded.",
        hash: "/student/demo-student-5/report",
      },
    ],
    open: "Open the demo full screen",
    frame: "The demo app",
    load: "Load the demo",
  },
  why: {
    title: "Why it is built this way",
    items: [
      {
        id: "offline",
        title: "Works with no internet",
        body: "After the first visit the whole app lives on the phone. Mark in a classroom with no signal; nothing waits for a network.",
        link: "#docs-getting-started",
        linkText: "How offline works",
      },
      {
        id: "device",
        title: "Data stays on the device",
        body: "Names and marks are stored only in the phone's browser. We run no server that receives them, so there is nothing of yours for us to lose or sell.",
        link: "#privacy",
        linkText: "Privacy, in plain words",
      },
      {
        id: "open",
        title: "Free and open",
        body: "Free for every teacher. The code is open (MIT licence), so a school or NGO can check every claim on this page for itself.",
        link: "#docs-faq",
        linkText: "Read the code",
      },
    ],
  },
  install: {
    title: "Put it on your phone",
    body: "It installs from the browser like an app, takes little space, and opens from your home screen. You only need the internet once.",
    tabs: [
      {
        id: "android",
        label: "Android",
        steps: [
          "Open kaksha.quartifex.com/app in Chrome.",
          "Tap the ⋮ menu, then “Install app” or “Add to Home screen”.",
          "Open it from your home screen. Your classes stay on this phone.",
        ],
      },
      {
        id: "iphone",
        label: "iPhone",
        steps: [
          "Open kaksha.quartifex.com/app in Safari.",
          "Tap Share, then “Add to Home Screen”.",
          "Open it from your home screen. It works without signal from then on.",
        ],
      },
      {
        id: "desktop",
        label: "Computer",
        steps: [
          "Open kaksha.quartifex.com/app in Chrome or Edge.",
          "Click the install icon at the right of the address bar.",
          "It opens in its own window. Keyboard: A to D, R and W, Z to undo.",
        ],
      },
    ],
    shots: "Screens from the real app, captured automatically from the demo.",
  },
  schools: {
    title: "For schools and NGOs",
    body: `${PRODUCT_NAME} is free for every teacher, and will stay free. For networks that want their own rubrics built in, a language pack, or help rolling it out across schools, write to us.`,
    note: "Please do not send any student information in this form.",
    fields: {
      name: "Your name",
      org: "Organisation",
      teachers: "Number of teachers",
      need: "What do you need?",
      message: "Message",
      send: "Send",
      sending: "Sending…",
    },
    needs: ["Custom rubrics or tests", "A language pack", "Help rolling it out", "Something else"],
    ok: "Thank you. We will reply by email.",
    fail: "That did not go through. Please try again in a while.",
    off: "The form is not switched on yet. Please try again soon.",
    email: "Email",
  },
  origin: {
    title: "Where it came from",
    body: [
      "Grew out of an assessment portal we designed for a classroom NGO in 2019.",
      "That portal let fellows enter each child's answer, question by question, and see class performance by subject, skill and question. It needed a login, a server and a good connection.",
      `${PRODUCT_NAME} keeps the part teachers used most, quick entry and a clear class view, and drops what got in the way: no account, no server, no signal needed.`,
    ],
    sign: "Quartifex",
    caseStudy: "Read the case study",
  },
  docs: {
    title: "How to use it",
    lead: "Everything in one place. Written for teachers first, with the technical parts at the end.",
    onThisPage: "Sections",
    hiNote: "",
  },
  footer: {
    made: "Made by Quartifex",
    licence: "Code: MIT licence",
    privacy: "Privacy",
    source: "Source code",
    fonts:
      "Type: Mukta (Ek Type), Tiro Devanagari Hindi (Tiro Typeworks), IBM Plex Mono (IBM), all under the SIL Open Font License.",
    note: "Demo data is invented. No photographs of children are used anywhere.",
  },
};

export type Copy = typeof en;

const hi: Copy = {
  label: "मुफ़्त टूल",
  skip: "सामग्री पर जाएँ",
  nav: { demo: "डेमो", why: "क्यों", install: "इंस्टॉल", docs: "मदद", schools: "स्कूलों के लिए" },
  langOther: { href: "/", label: "English", lang: "en" },
  hero: {
    kicker: `${PRODUCT_NAME_HI} · ${PRODUCT_NAME}`,
    title: "पूरी कक्षा की जाँच, कुछ ही मिनटों में।",
    lines: ["बिना इंटरनेट के चलता है।", "विद्यार्थियों का डेटा आपके फ़ोन से बाहर नहीं जाता।"],
    sub: "शिक्षकों के लिए मुफ़्त ऐप: हर बच्चे का उत्तर टैप करें, देखें कक्षा कहाँ खड़ी है, रिपोर्ट कार्ड प्रिंट करें। न खाता, न पहली बार के बाद इंटरनेट।",
    open: "ऐप खोलें",
    demo: "डेमो आज़माएँ",
    facts: [
      ["क़ीमत", "मुफ़्त"],
      ["खाता", "कोई नहीं"],
      ["इंटरनेट", "सिर्फ़ पहली बार"],
      ["भाषाएँ", "हिंदी, अंग्रेज़ी"],
    ],
  },
  sheet: {
    title: "रजिस्टर से ग्रिड, ग्रिड से चार्ट",
    steps: [
      ["काग़ज़ की शीट", "सही, ग़लत और गोले, हर बच्चे की एक पंक्ति: ज़्यादातर हम आज ऐसे ही जाँचते हैं।"],
      ["ग्रिड", `वही अंक, ${PRODUCT_NAME_HI} में टैप किए हुए। हर उत्तर पर एक टैप, साथ-साथ सहेजा हुआ।`],
      ["चार्ट", "ग्रिड अपने आप जुड़ जाता है: कक्षा को कौन-से प्रश्न कठिन लगे, एक नज़र में।"],
    ],
    caption: "उदाहरण: आठ काल्पनिक बच्चों और छह प्रश्नों की कक्षा।",
    paper: "काग़ज़",
    grid: "ग्रिड",
    chart: "चार्ट",
    q: "प्र",
    skip: "एनिमेशन छोड़ें",
  },
  demo: {
    title: "एक काल्पनिक कक्षा के साथ आज़माएँ",
    body: "यह असली ऐप है, आपके ब्राउज़र में काल्पनिक डेटा पर चलता हुआ: एक काल्पनिक स्कूल और 36 काल्पनिक बच्चे। इसका स्टोरेज अलग है, आपके असली काम से बिलकुल अलग।",
    tasks: [
      {
        id: "mark",
        title: "एक टेस्ट जाँचें",
        body: "सितंबर की गणित जाँच खोलें और कुछ बच्चों के उत्तर टैप करें। देखें कि यह अपने आप अगले बच्चे पर जाता है, और ‘वापस लें’ आज़माएँ।",
        hash: "/test/demo-maths-sep/mark",
      },
      {
        id: "class",
        title: "कक्षा का हाल देखें",
        body: "अगस्त के परिणाम देखें: औसत, उपस्थिति, कक्षा को कठिन लगे प्रश्न, चतुर्थक समूह और कौशल के अनुसार किसे सहायता चाहिए।",
        hash: "/test/demo-maths-aug",
      },
      {
        id: "report",
        title: "रिपोर्ट कार्ड प्रिंट करें",
        body: "किसी एक बच्चे का रिपोर्ट कार्ड खोलें और प्रिंट करें, या PDF बनाएँ। यह फ़ोन पर ही बनता है; कुछ भी अपलोड नहीं होता।",
        hash: "/student/demo-student-5/report",
      },
    ],
    open: "डेमो पूरी स्क्रीन पर खोलें",
    frame: "डेमो ऐप",
    load: "डेमो चलाएँ",
  },
  why: {
    title: "यह ऐसा क्यों बना है",
    items: [
      {
        id: "offline",
        title: "बिना इंटरनेट के चलता है",
        body: "पहली बार खोलने के बाद पूरा ऐप फ़ोन पर ही रहता है। बिना सिग्नल वाली कक्षा में भी जाँचें; किसी नेटवर्क का इंतज़ार नहीं।",
        link: "#docs-getting-started",
        linkText: "ऑफ़लाइन कैसे चलता है",
      },
      {
        id: "device",
        title: "डेटा फ़ोन पर ही रहता है",
        body: "नाम और अंक सिर्फ़ फ़ोन के ब्राउज़र में रखे जाते हैं। हमारा कोई सर्वर इन्हें नहीं पाता, इसलिए आपका कुछ भी हमारे पास खोने या बेचने को है ही नहीं।",
        link: "#privacy",
        linkText: "निजता, सीधे शब्दों में",
      },
      {
        id: "open",
        title: "मुफ़्त और खुला",
        body: "हर शिक्षक के लिए मुफ़्त। कोड खुला है (MIT लाइसेंस), ताकि कोई भी स्कूल या संस्था इस पेज की हर बात ख़ुद जाँच सके।",
        link: "#docs-faq",
        linkText: "कोड पढ़ें",
      },
    ],
  },
  install: {
    title: "इसे अपने फ़ोन पर लगाएँ",
    body: "यह ब्राउज़र से ऐप की तरह इंस्टॉल होता है, कम जगह लेता है, और होम स्क्रीन से खुलता है। इंटरनेट सिर्फ़ एक बार चाहिए।",
    tabs: [
      {
        id: "android",
        label: "Android",
        steps: [
          "Chrome में kaksha.quartifex.com/app खोलें।",
          "⋮ मेन्यू पर टैप करें, फिर “ऐप इंस्टॉल करें” या “होम स्क्रीन पर जोड़ें”।",
          "होम स्क्रीन से खोलें। आपकी कक्षाएँ इसी फ़ोन पर रहती हैं।",
        ],
      },
      {
        id: "iphone",
        label: "iPhone",
        steps: [
          "Safari में kaksha.quartifex.com/app खोलें।",
          "Share पर टैप करें, फिर “Add to Home Screen”।",
          "होम स्क्रीन से खोलें। इसके बाद यह बिना सिग्नल के भी चलता है।",
        ],
      },
      {
        id: "desktop",
        label: "कंप्यूटर",
        steps: [
          "Chrome या Edge में kaksha.quartifex.com/app खोलें।",
          "एड्रेस बार के दाईं ओर इंस्टॉल वाले चिह्न पर क्लिक करें।",
          "यह अपनी अलग विंडो में खुलता है। कीबोर्ड: A से D, R और W, वापस लेने के लिए Z।",
        ],
      },
    ],
    shots: "असली ऐप की स्क्रीनें, डेमो से अपने आप ली गईं।",
  },
  schools: {
    title: "स्कूलों और संस्थाओं के लिए",
    body: `${PRODUCT_NAME_HI} हर शिक्षक के लिए मुफ़्त है, और मुफ़्त रहेगा। जो नेटवर्क अपने रूब्रिक, अपनी भाषा, या कई स्कूलों में इसे शुरू करने में मदद चाहते हैं, हमें लिखें।`,
    note: "कृपया इस फ़ॉर्म में किसी विद्यार्थी की जानकारी न भेजें।",
    fields: {
      name: "आपका नाम",
      org: "संस्था",
      teachers: "शिक्षकों की संख्या",
      need: "आपको क्या चाहिए?",
      message: "संदेश",
      send: "भेजें",
      sending: "भेजा जा रहा है…",
    },
    needs: ["अपने रूब्रिक या टेस्ट", "भाषा पैक", "शुरू करने में मदद", "कुछ और"],
    ok: "धन्यवाद। हम ईमेल से जवाब देंगे।",
    fail: "यह नहीं जा सका। कृपया थोड़ी देर बाद फिर कोशिश करें।",
    off: "यह फ़ॉर्म अभी चालू नहीं है। कृपया जल्द फिर कोशिश करें।",
    email: "ईमेल",
  },
  origin: {
    title: "यह कहाँ से आया",
    body: [
      "यह 2019 में एक कक्षा-आधारित संस्था के लिए हमारे बनाए मूल्यांकन पोर्टल से निकला है।",
      "उस पोर्टल में हर बच्चे का उत्तर, एक-एक प्रश्न करके, भरा जाता था और विषय, कौशल और प्रश्न के अनुसार कक्षा का प्रदर्शन दिखता था। उसके लिए लॉगिन, सर्वर और अच्छा कनेक्शन चाहिए था।",
      `${PRODUCT_NAME_HI} वह हिस्सा रखता है जो शिक्षक सबसे ज़्यादा इस्तेमाल करते थे, यानी तेज़ एंट्री और साफ़ कक्षा-दृश्य, और रुकावटें हटा देता है: न खाता, न सर्वर, न सिग्नल की ज़रूरत।`,
    ],
    sign: "Quartifex",
    caseStudy: "केस स्टडी पढ़ें",
  },
  docs: {
    title: "उपयोग कैसे करें",
    lead: "सारी जानकारी एक जगह। पहले शिक्षकों के लिए, तकनीकी हिस्से आख़िर में।",
    onThisPage: "हिस्से",
    hiNote: "मदद के पन्ने अभी अंग्रेज़ी में हैं। हिंदी संस्करण किसी हिंदी भाषी शिक्षक की जाँच के बाद आएगा।",
  },
  footer: {
    made: "Quartifex द्वारा बनाया गया",
    licence: "कोड: MIT लाइसेंस",
    privacy: "निजता",
    source: "सोर्स कोड",
    fonts:
      "टाइप: Mukta (Ek Type), Tiro Devanagari Hindi (Tiro Typeworks), IBM Plex Mono (IBM), सभी SIL Open Font License के तहत।",
    note: "डेमो का डेटा काल्पनिक है। कहीं भी बच्चों की तस्वीरें इस्तेमाल नहीं की गई हैं।",
  },
};

export const COPY: Record<SiteLocale, Copy> = { en, hi };
