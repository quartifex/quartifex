// Synthetic data for the demo (/app?demo=1). Everything is invented: the school,
// the class and the children, whose surnames are sweets, fruit and weather so no
// one could mistake them for real pupils. It lives in its own database.
import maths from "../../public/templates/example-primary-maths-g3.json";
import writing from "../../public/templates/example-writing.json";
import type { BackupTables } from "./backup";
import type {
  Answer,
  Assessment,
  Choice,
  KeyItem,
  RubricItem,
  Sitting,
  Student,
  StudentNote,
} from "./model";
import { CHOICES, responseId, sittingId } from "./model";

const NAMES: Array<[string, string]> = [
  ["Anu Aamla", "अनु आंवला"],
  ["Bablu Badal", "बबलू बादल"],
  ["Bunty Barfi", "बंटी बर्फ़ी"],
  ["Chinki Chandni", "चिंकी चांदनी"],
  ["Chhotu Chakki", "छोटू चक्की"],
  ["Dabbu Dhoop", "डब्बू धूप"],
  ["Dolly Dholak", "डॉली ढोलक"],
  ["Eshu Elaichi", "ईशु इलायची"],
  ["Gappu Gajar", "गप्पू गाजर"],
  ["Golu Gubbara", "गोलू गुब्बारा"],
  ["Guddu Gulmohar", "गुड्डू गुलमोहर"],
  ["Heera Haldi", "हीरा हल्दी"],
  ["Happy Hawa", "हैप्पी हवा"],
  ["Ikku Imli", "इक्कू इमली"],
  ["Jugnu Jamun", "जुगनू जामुन"],
  ["Jhumki Jalebi", "झुमकी जलेबी"],
  ["Kiki Kesar", "किकी केसर"],
  ["Kittu Kanche", "किट्टू कंचे"],
  ["Lallu Laddoo", "लल्लू लड्डू"],
  ["Laali Lattu", "लाली लट्टू"],
  ["Minku Mausam", "मिंकू मौसम"],
  ["Monu Moti", "मोनू मोती"],
  ["Nanhi Neem", "नन्ही नीम"],
  ["Nikki Nimbu", "निक्की नींबू"],
  ["Pappu Patang", "पप्पू पतंग"],
  ["Pinky Pista", "पिंकी पिस्ता"],
  ["Pintu Pakoda", "पिंटू पकौड़ा"],
  ["Rani Rangoli", "रानी रंगोली"],
  ["Rinku Rasgulla", "रिंकू रसगुल्ला"],
  ["Sonu Saunf", "सोनू सौंफ़"],
  ["Sweety Sitara", "स्वीटी सितारा"],
  ["Tinku Tara", "टिंकू तारा"],
  ["Tuktuk Tamatar", "टुकटुक टमाटर"],
  ["Uma Udaan", "उमा उड़ान"],
  ["Veeru Varsha", "वीरू वर्षा"],
  ["Yashu Yatra", "यशु यात्रा"],
];

export const DEMO_SCHOOL = {
  en: "Imli Chowk Primary School (invented)",
  hi: "इमली चौक प्राथमिक विद्यालय (काल्पनिक)",
};

/** Hindi for the example templates' English labels, so the Hindi demo reads as Hindi. */
const HI: Record<string, string> = {
  "Number sense": "संख्या ज्ञान",
  "Addition and subtraction": "जोड़ और घटाव",
  Multiplication: "गुणा",
  Shapes: "आकृतियाँ",
  Measurement: "माप",
  Ideas: "विचार",
  Organisation: "क्रम",
  "Word choice": "शब्द चयन",
  Sentences: "वाक्य",
  "Spelling and punctuation": "वर्तनी और विराम चिह्न",
  Content: "विषय-वस्तु",
  Structure: "संरचना",
  Language: "भाषा",
  Conventions: "लेखन के नियम",
  Beginning: "शुरुआती",
  Developing: "बढ़ रहा",
  Secure: "पक्का",
  Strong: "मज़बूत",
  "Few ideas; hard to follow.": "कम विचार; समझना कठिन।",
  "Some ideas, not developed.": "कुछ विचार, पर विस्तार नहीं।",
  "Clear ideas with some detail.": "स्पष्ट विचार, कुछ विवरण के साथ।",
  "Clear, interesting ideas with good detail.": "स्पष्ट, रोचक विचार, अच्छे विवरण के साथ।",
  "No clear beginning or end.": "न साफ़ शुरुआत, न अंत।",
  "Some order, with gaps.": "कुछ क्रम है, बीच में कमी है।",
  "Clear beginning, middle and end.": "साफ़ शुरुआत, बीच और अंत।",
  "Well ordered; ideas link smoothly.": "अच्छा क्रम; विचार आपस में जुड़ते हैं।",
  "Very few words, often repeated.": "बहुत कम शब्द, बार-बार दोहराए गए।",
  "Simple words, some repeated.": "सरल शब्द, कुछ दोहराए गए।",
  "Varied words that fit the topic.": "विषय के अनुसार अलग-अलग शब्द।",
  "Precise, vivid words chosen with care.": "सोच-समझकर चुने गए सटीक, जीवंत शब्द।",
  "Mostly incomplete sentences.": "ज़्यादातर अधूरे वाक्य।",
  "Simple sentences, some complete.": "सरल वाक्य, कुछ पूरे।",
  "Complete sentences with some variety.": "पूरे वाक्य, कुछ विविधता के साथ।",
  "Varied sentences that read well aloud.": "विविध वाक्य जो पढ़ने में अच्छे लगते हैं।",
  "Many errors make it hard to read.": "बहुत ग़लतियाँ, पढ़ना कठिन।",
  "Errors in common words.": "आम शब्दों में ग़लतियाँ।",
  "Few errors; common words correct.": "कम ग़लतियाँ; आम शब्द सही।",
  "Almost no errors; punctuation helps meaning.": "लगभग कोई ग़लती नहीं; विराम चिह्न अर्थ स्पष्ट करते हैं।",
};

/** Small deterministic generator so the demo looks the same for everyone. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoTables(locale: "en" | "hi", now = Date.now()): BackupTables {
  const tr = (text: string) => (locale === "hi" ? (HI[text] ?? text) : text);
  const rand = rng(2019);
  const schoolId = "demo-school";
  const classId = "demo-class-4b";
  const students: Student[] = NAMES.map(([en, hi], i) => ({
    id: `demo-student-${i + 1}`,
    classId,
    roll: String(i + 1),
    name: locale === "hi" ? hi : en,
    active: true,
  }));
  // Each child gets a steady ability and a stronger or weaker domain.
  const ability = students.map(() => 0.35 + rand() * 0.55);
  const domains = [
    "Number sense",
    "Addition and subtraction",
    "Multiplication",
    "Shapes",
    "Measurement",
  ];
  const tilt = students.map(() => domains.map(() => (rand() - 0.5) * 0.35));

  const keyItems = (offset: number): KeyItem[] =>
    maths.items.map((item, i) => ({
      id: `q${i + 1}`,
      label: item.label,
      domain: tr(item.domain),
      type: "choice",
      key: CHOICES[(CHOICES.indexOf(item.key as Choice) + offset) % 4] ?? "A",
      marks: 1,
    }));

  const tests: Array<{
    id: string;
    title: { en: string; hi: string };
    date: string;
    offset: number;
    growth: number;
    /** How many children are marked: all, or the first n (marking still going on). */
    fill: number | "all";
  }> = [
    {
      id: "demo-maths-jul",
      title: { en: "Maths check, July", hi: "गणित जाँच, जुलाई" },
      date: "2026-07-14",
      offset: 0,
      growth: 0,
      fill: "all",
    },
    {
      id: "demo-maths-aug",
      title: { en: "Maths check, August", hi: "गणित जाँच, अगस्त" },
      date: "2026-08-18",
      offset: 1,
      growth: 0.05,
      fill: "all",
    },
    {
      id: "demo-maths-sep",
      title: { en: "Maths check, September", hi: "गणित जाँच, सितंबर" },
      date: "2026-09-22",
      offset: 2,
      growth: 0.08,
      fill: 12,
    },
  ];

  const assessments: Assessment[] = [];
  const responses: Answer[] = [];
  const sittings: Sitting[] = [];
  let created = now - 1_000_000;

  for (const t of tests) {
    const items = keyItems(t.offset);
    assessments.push({
      id: t.id,
      classId,
      title: t.title[locale],
      subject: locale === "hi" ? "गणित" : "Maths",
      date: t.date,
      templateId: maths.id,
      createdAt: created++,
      kind: "key",
      items,
    });
    students.forEach((s, si) => {
      if (t.fill !== "all" && si >= t.fill) return;
      if (rand() < 0.06) {
        sittings.push({
          id: sittingId(t.id, s.id),
          assessmentId: t.id,
          studentId: s.id,
          absent: true,
          note: "",
        });
        return;
      }
      for (const item of items) {
        const di = domains.map(tr).indexOf(item.domain);
        const p = Math.min(0.97, (ability[si] ?? 0.5) + (tilt[si]?.[di] ?? 0) + t.growth);
        let value: string;
        if (rand() < p) value = item.key ?? "A";
        else if (rand() < 0.08) value = "-";
        else value = CHOICES.filter((c) => c !== item.key)[Math.floor(rand() * 3)] ?? "B";
        responses.push({
          id: responseId(t.id, s.id, item.id),
          assessmentId: t.id,
          studentId: s.id,
          itemId: item.id,
          value,
          at: created,
        });
      }
    });
  }

  // A writing rubric, fully marked.
  const rubricItems: RubricItem[] = writing.items.map((c, i) => ({
    id: `c${i + 1}`,
    label: tr(c.label),
    domain: tr(c.domain),
    levels: c.levels.map((l) => ({
      score: l.score,
      label: tr(l.label),
      descriptor: tr(l.descriptor),
    })),
  }));
  const rubricId = "demo-writing-aug";
  assessments.push({
    id: rubricId,
    classId,
    title: locale === "hi" ? "लेखन, अगस्त" : "Writing, August",
    subject: locale === "hi" ? "भाषा" : "Language",
    date: "2026-08-28",
    templateId: writing.id,
    createdAt: created++,
    kind: "rubric",
    items: rubricItems,
  });
  students.forEach((s, si) => {
    for (const c of rubricItems) {
      const level = Math.max(
        1,
        Math.min(4, Math.round(1 + (ability[si] ?? 0.5) * 3 + (rand() - 0.5) * 1.2)),
      );
      responses.push({
        id: responseId(rubricId, s.id, c.id),
        assessmentId: rubricId,
        studentId: s.id,
        itemId: c.id,
        value: String(level),
        at: created,
      });
    }
  });

  // A second class, 5 A, with one marked test, so Classes and Insights have more than one.
  const class5 = "demo-class-5a";
  const students5: Student[] = NAMES.slice(6, 30).map(([en, hi], i) => ({
    id: `demo-5a-student-${i + 1}`,
    classId: class5,
    roll: String(i + 1),
    name: locale === "hi" ? hi : en,
    active: true,
  }));
  const test5 = "demo-5a-maths-aug";
  const items5 = keyItems(3);
  assessments.push({
    id: test5,
    classId: class5,
    title: locale === "hi" ? "गणित जाँच, अगस्त" : "Maths check, August",
    subject: locale === "hi" ? "गणित" : "Maths",
    date: "2026-08-20",
    templateId: maths.id,
    createdAt: created++,
    kind: "key",
    items: items5,
  });
  students5.forEach((s) => {
    const a = 0.45 + rand() * 0.5;
    for (const item of items5) {
      responses.push({
        id: responseId(test5, s.id, item.id),
        assessmentId: test5,
        studentId: s.id,
        itemId: item.id,
        value:
          rand() < a
            ? (item.key ?? "A")
            : (CHOICES.filter((c) => c !== item.key)[Math.floor(rand() * 3)] ?? "B"),
        at: created,
      });
    }
  });

  const noteText =
    locale === "hi"
      ? [
          ["2026-09-22", "जल्दी पूरा किया, गोलू की हासिल में मदद की।", true],
          ["2026-08-18", "सेमी और मीटर में उलझता है। घर पर रूलर से अभ्यास करे।", false],
        ]
      : [
          ["2026-09-22", "Finished early, helped Golu with carrying.", true],
          ["2026-08-18", "Mixes up cm and m. Practise with a ruler at home.", false],
        ];
  const notes: StudentNote[] = noteText.map(([date, text, onCard], i) => ({
    id: `demo-note-${i + 1}`,
    studentId: "demo-student-5",
    date: String(date),
    text: String(text),
    onCard: Boolean(onCard),
    at: now - i * 1000,
  }));

  const subj = locale === "hi" ? ["गणित", "भाषा", "अंग्रेज़ी"] : ["Maths", "Language", "English"];
  return {
    schools: [{ id: schoolId, name: DEMO_SCHOOL[locale] }],
    classes: [
      { id: classId, schoolId, grade: "4", section: "B", year: "2026-27", subjects: subj },
      {
        id: class5,
        schoolId,
        grade: "5",
        section: "A",
        year: "2026-27",
        subjects: [subj[0] ?? ""],
      },
    ],
    students: [...students, ...students5],
    assessments,
    responses,
    sittings,
    notes,
  };
}
