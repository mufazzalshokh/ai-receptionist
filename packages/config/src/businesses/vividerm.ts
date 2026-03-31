import type { BusinessConfig, KnowledgeBase } from "@ai-receptionist/types";

export const vividermConfig: BusinessConfig = {
  id: "vividerm",
  name: "VIVIDERM",
  industry: "aesthetics_clinic",
  languages: ["en", "lv", "ru"],
  defaultLanguage: "lv",
  timezone: "Europe/Riga",
  contact: {
    phone: "+371 23 444 401",
    whatsapp: "+371 23 444 401",
    address: "Roberta Hirša iela 1",
    city: "Rīga",
    country: "Latvia",
    mapUrl: "https://maps.app.goo.gl/4LR1Y283V5JKt35M8",
  },
  hours: [
    { day: "monday", open: "09:00", close: "20:00", isOpen: true },
    { day: "tuesday", open: "09:00", close: "20:00", isOpen: true },
    { day: "wednesday", open: "09:00", close: "20:00", isOpen: true },
    { day: "thursday", open: "09:00", close: "20:00", isOpen: true },
    { day: "friday", open: "09:00", close: "20:00", isOpen: true },
    { day: "saturday", open: "10:00", close: "18:00", isOpen: true },
    { day: "sunday", open: "10:00", close: "18:00", isOpen: true },
  ],
  bookingSystem: {
    provider: "alteg",
    mode: "request",
    calendarId: "757934",
  },
  escalation: {
    methods: ["sms", "email"],
    contacts: [
      {
        name: "VIVIDERM Reception",
        role: "Front Desk",
        phone: "+371 23 444 401",
        onCall: true,
      },
    ],
    urgentKeywords: {
      en: [
        "emergency", "allergic reaction", "severe pain", "bleeding",
        "swelling", "infection", "burns", "can't breathe", "hospital",
      ],
      lv: [
        "neatliekams", "alerģiska reakcija", "stipras sāpes", "asiņošana",
        "pietūkums", "infekcija", "apdegums", "nevar elpot", "slimnīca",
      ],
      ru: [
        "срочно", "аллергическая реакция", "сильная боль", "кровотечение",
        "отёк", "инфекция", "ожог", "не могу дышать", "больница",
      ],
    },
  },
  aiPersona: {
    name: "VIVIDERM Assistant",
    tone: "professional_warm",
    greeting: {
      en: "Hello! Welcome to VIVIDERM Laser Dermatology Clinic. I'm your virtual assistant. How can I help you today?",
      lv: "Sveicināti! Laipni lūdzam VIVIDERM lāzerdermatoloģijas klīnikā. Es esmu jūsu virtuālais asistents. Kā varu jums palīdzēt?",
      ru: "Здравствуйте! Добро пожаловать в клинику лазерной дерматологии VIVIDERM. Я ваш виртуальный ассистент. Чем могу помочь?",
    },
    afterHoursGreeting: {
      en: "Hello! Thank you for reaching out to VIVIDERM. We're currently outside business hours (Mon-Fri 9:00-20:00, Sat-Sun 10:00-18:00). I can still help with information, or take your details so our team contacts you first thing. How can I assist?",
      lv: "Sveicināti! Paldies, ka sazinājāties ar VIVIDERM. Šobrīd esam ārpus darba laika (P-Pk 9:00-20:00, S-Sv 10:00-18:00). Es joprojām varu palīdzēt ar informāciju vai pieņemt jūsu datus, lai mūsu komanda ar jums sazinās. Kā varu palīdzēt?",
      ru: "Здравствуйте! Спасибо, что обратились в VIVIDERM. Сейчас мы работаем вне рабочего времени (Пн-Пт 9:00-20:00, Сб-Вс 10:00-18:00). Я могу помочь с информацией или записать ваши данные, чтобы наша команда связалась с вами. Чем могу помочь?",
    },
    closingMessage: {
      en: "Thank you for contacting VIVIDERM! If you have any other questions, don't hesitate to reach out. Have a wonderful day!",
      lv: "Paldies, ka sazinājāties ar VIVIDERM! Ja jums ir vēl kādi jautājumi, droši sazinieties. Jauku dienu!",
      ru: "Спасибо, что обратились в VIVIDERM! Если у вас есть ещё вопросы, обращайтесь. Хорошего дня!",
    },
    neverDo: [
      "Never provide medical diagnoses or treatment recommendations",
      "Never claim to be a doctor or medical professional",
      "Never share other patients' information",
      "Never guarantee specific results from any procedure",
      "Never discuss competitors",
      "Never negotiate prices beyond stated promotions",
      "Never make up information about services not in the knowledge base",
      "Never share internal business information",
    ],
    alwaysDo: [
      "Always recommend consulting with clinic specialists for medical questions",
      "Always confirm pricing by directing to current price list or suggesting a consultation",
      "Always be empathetic about skin concerns — people are often self-conscious",
      "Always mention current promotions when relevant (e.g., 30% off laser hair removal)",
      "Always offer to book a consultation for complex questions",
      "Always address the customer by name once known",
      "Always provide the clinic phone number when escalating",
    ],
  },
};

// Full VividDerm Knowledge Base
export const vividermKnowledgeBase: KnowledgeBase = {
  businessId: "vividerm",
  services: [
    {
      id: "laser-hair-removal",
      name: { en: "Laser Hair Removal", lv: "Lāzerepilācija", ru: "Лазерная эпиляция" },
      services: [
        {
          id: "diode-basic",
          name: { en: "Diode Laser — Basic Set", lv: "Diodes lāzers — Basic komplekts", ru: "Диодный лазер — Базовый набор" },
          description: { en: "Full bikini + underarms", lv: "Pilna bikini + paduses zona", ru: "Полное бикини + подмышки" },
          priceFrom: 69, priceTo: 69, currency: "EUR", duration: 45, category: "laser-hair-removal",
        },
        {
          id: "diode-pro",
          name: { en: "Diode Laser — PRO Set", lv: "Diodes lāzers — PRO komplekts", ru: "Диодный лазер — PRO набор" },
          description: { en: "Bikini + lower legs + knees + underarms", lv: "Bikini + apakšstilbi + ceļi + paduses", ru: "Бикини + голени + колени + подмышки" },
          priceFrom: 104, priceTo: 104, currency: "EUR", duration: 60, category: "laser-hair-removal",
        },
        {
          id: "diode-super",
          name: { en: "Diode Laser — Super Set", lv: "Diodes lāzers — Super komplekts", ru: "Диодный лазер — Супер набор" },
          description: { en: "Bikini + full legs + underarms", lv: "Bikini + pilnas kājas + paduses", ru: "Бикини + ноги полностью + подмышки" },
          priceFrom: 109, priceTo: 109, currency: "EUR", duration: 75, category: "laser-hair-removal",
        },
        {
          id: "alexandrite-basic",
          name: { en: "Alexandrite Laser — Basic Set", lv: "Aleksandrīta lāzers — Basic komplekts", ru: "Александритовый лазер — Базовый набор" },
          description: { en: "Full bikini + underarms (DEKA Motus AX Moveo)", lv: "Pilna bikini + paduses (DEKA Motus AX Moveo)", ru: "Полное бикини + подмышки (DEKA Motus AX Moveo)" },
          priceFrom: 79, priceTo: 79, currency: "EUR", duration: 45, category: "laser-hair-removal",
        },
      ],
    },
    {
      id: "dermatology",
      name: { en: "Dermatology", lv: "Dermatoloģija", ru: "Дерматология" },
      services: [
        {
          id: "botox",
          name: { en: "Botulinum Toxin Injections", lv: "Botulīna toksīna injekcijas", ru: "Инъекции ботулотоксина" },
          description: { en: "Wrinkle reduction, hyperhidrosis treatment", lv: "Grumbu mazināšana, hiperhidrozes ārstēšana", ru: "Уменьшение морщин, лечение гипергидроза" },
          priceFrom: 70, priceTo: 599, currency: "EUR", duration: 30, category: "dermatology",
        },
        {
          id: "fillers",
          name: { en: "Hyaluronic Acid Fillers", lv: "Hialuronskābes filleri", ru: "Филлеры гиалуроновой кислоты" },
          description: { en: "Lip augmentation, facial contouring, volume restoration", lv: "Lūpu palielināšana, sejas kontūrplastika", ru: "Увеличение губ, контурная пластика лица" },
          priceFrom: 199, priceTo: 399, currency: "EUR", duration: 45, category: "dermatology",
        },
        {
          id: "biorevitalization",
          name: { en: "Biorevitalization & Mesotherapy", lv: "Biorevitalizācija un mezoterapija", ru: "Биоревитализация и мезотерапия" },
          description: { en: "Deep skin hydration and rejuvenation", lv: "Dziļa ādas mitrināšana un atjaunošana", ru: "Глубокое увлажнение и омоложение кожи" },
          priceFrom: 95, priceTo: 299, currency: "EUR", duration: 40, category: "dermatology",
        },
        {
          id: "co2-removal",
          name: { en: "CO2 Laser Mole/Lesion Removal", lv: "CO2 lāzera dzimumzīmju noņemšana", ru: "Удаление родинок CO2 лазером" },
          description: { en: "Safe removal of moles, warts, and benign skin lesions", lv: "Droša dzimumzīmju, kārpu un labdabīgu ādas veidojumu noņemšana", ru: "Безопасное удаление родинок, бородавок и доброкачественных образований" },
          priceFrom: 25, priceTo: 250, currency: "EUR", duration: 30, category: "dermatology",
        },
        {
          id: "prp",
          name: { en: "PRP Therapy (Plasmolifting)", lv: "PRP terapija (Plasmolifting)", ru: "PRP-терапия (Плазмолифтинг)" },
          description: { en: "Platelet-rich plasma for skin rejuvenation and hair restoration", lv: "Trombocītiem bagāta plazma ādas atjaunošanai", ru: "Обогащённая тромбоцитами плазма для омоложения кожи" },
          priceFrom: 189, priceTo: 299, currency: "EUR", duration: 60, category: "dermatology",
        },
        {
          id: "morpheus8-face",
          name: { en: "Morpheus 8 Fractional RF Lifting", lv: "Morpheus 8 frakcionālais RF liftings", ru: "Morpheus 8 Фракционный RF лифтинг" },
          description: { en: "Fractional radiofrequency for skin tightening and rejuvenation", lv: "Frakcionālais radiofrekvences liftings ādas nostieprēšanai", ru: "Фракционная радиочастотная подтяжка кожи" },
          priceFrom: 369, priceTo: 469, currency: "EUR", duration: 60, category: "dermatology",
        },
        {
          id: "collagen",
          name: { en: "Collagen Stimulation", lv: "Kolagēna stimulācija", ru: "Стимуляция коллагена" },
          description: { en: "Stimulates natural collagen production for youthful skin", lv: "Stimulē dabīgu kolagēna ražošanu jaunākai ādai", ru: "Стимуляция естественной выработки коллагена" },
          priceFrom: 165, priceTo: 700, currency: "EUR", category: "dermatology",
        },
        {
          id: "iv-vitamins",
          name: { en: "Intravenous Vitamin Cocktails", lv: "Intravenozās vitamīnu kokteilis", ru: "Внутривенные витаминные коктейли" },
          description: { en: "IV vitamin infusions for energy, skin health, and immunity", lv: "IV vitamīnu infūzijas enerģijai un ādas veselībai", ru: "Витаминные капельницы для энергии и здоровья кожи" },
          priceFrom: 80, priceTo: 99, currency: "EUR", duration: 45, category: "dermatology",
        },
      ],
    },
    {
      id: "body-care",
      name: { en: "Body Care", lv: "Ķermeņa kopšana", ru: "Уход за телом" },
      services: [
        {
          id: "endospheres",
          name: { en: "Endospheres Therapy", lv: "Endospheres terapija", ru: "Эндосферная терапия" },
          description: { en: "Cellulite reduction and body contouring", lv: "Celulīta mazināšana un ķermeņa kontūrplastika", ru: "Уменьшение целлюлита и моделирование тела" },
          priceFrom: 39, priceTo: 480, currency: "EUR", duration: 50, category: "body-care",
        },
        {
          id: "onda-coolwaves",
          name: { en: "Onda Plus Coolwaves", lv: "Onda Plus Coolwaves", ru: "Onda Plus Coolwaves" },
          description: { en: "Microwave body contouring technology", lv: "Mikroviļņu ķermeņa kontūrplastika", ru: "Микроволновое моделирование тела" },
          priceFrom: 59, priceTo: 169, currency: "EUR", duration: 40, category: "body-care",
        },
        {
          id: "morpheus8-body",
          name: { en: "Morpheus 8 Body", lv: "Morpheus 8 ķermenim", ru: "Morpheus 8 для тела" },
          description: { en: "Radiofrequency skin tightening for body", lv: "Radiofrekvences ādas nostieprēšana ķermenim", ru: "Радиочастотная подтяжка кожи тела" },
          priceFrom: 349, priceTo: 349, currency: "EUR", duration: 60, category: "body-care",
        },
      ],
    },
    {
      id: "cosmetology",
      name: { en: "Cosmetology", lv: "Kosmetoloģija", ru: "Косметология" },
      services: [
        {
          id: "facial-cleansing",
          name: { en: "Facial Cleansing", lv: "Sejas tīrīšana", ru: "Чистка лица" },
          description: { en: "Professional deep facial cleansing", lv: "Profesionāla dziļā sejas tīrīšana", ru: "Профессиональная глубокая чистка лица" },
          priceFrom: 70, priceTo: 110, currency: "EUR", duration: 60, category: "cosmetology",
        },
        {
          id: "rf-lifting",
          name: { en: "RF Lifting", lv: "RF liftings", ru: "RF лифтинг" },
          description: { en: "Non-invasive radiofrequency skin tightening", lv: "Neinvazīva radiofrekvences ādas nostieprēšana", ru: "Неинвазивная радиочастотная подтяжка кожи" },
          priceFrom: 69, priceTo: 289, currency: "EUR", duration: 45, category: "cosmetology",
        },
        {
          id: "ipl",
          name: { en: "IPL Phototherapy", lv: "IPL fototerapija", ru: "IPL фототерапия" },
          description: { en: "Photorejuvenation, pigmentation and vascular treatment", lv: "Fotoatjaunošana, pigmentācijas un vaskulārā ārstēšana", ru: "Фотоомоложение, лечение пигментации и сосудов" },
          priceFrom: 20, priceTo: 396, currency: "EUR", duration: 30, category: "cosmetology",
        },
      ],
    },
    {
      id: "gynecology",
      name: { en: "Gynecology", lv: "Ginekoloģija", ru: "Гинекология" },
      services: [
        {
          id: "gyn-consultation",
          name: { en: "Gynecologist Consultation", lv: "Ginekologa konsultācija", ru: "Консультация гинеколога" },
          description: { en: "Professional gynecological consultation", lv: "Profesionāla ginekoloģiskā konsultācija", ru: "Профессиональная гинекологическая консультация" },
          priceFrom: 60, priceTo: 70, currency: "EUR", duration: 30, category: "gynecology",
        },
      ],
    },
    {
      id: "nutrition",
      name: { en: "Nutrition", lv: "Uztura konsultācijas", ru: "Питание" },
      services: [
        {
          id: "nutritionist",
          name: { en: "Nutritionist Consultation", lv: "Uztura speciālista konsultācija", ru: "Консультация диетолога" },
          description: { en: "Personalized nutrition plan and body composition analysis", lv: "Individuāls uztura plāns un ķermeņa kompozīcijas analīze", ru: "Индивидуальный план питания и анализ состава тела" },
          priceFrom: 70, priceTo: 120, currency: "EUR", duration: 45, category: "nutrition",
        },
      ],
    },
  ],
  faqs: [
    {
      id: "faq-first-visit",
      question: {
        en: "What should I expect on my first visit?",
        lv: "Ko sagaidīt pirmajā vizītē?",
        ru: "Чего ожидать при первом визите?",
      },
      answer: {
        en: "Your first visit includes a consultation with one of our specialists who will assess your skin, discuss your goals, and create a personalized treatment plan. Please plan for about 30-60 minutes. No special preparation is usually needed.",
        lv: "Pirmajā vizītē iekļauta konsultācija ar mūsu speciālistu, kurš novērtēs jūsu ādu, apspriedīs jūsu mērķus un izveidos personalizētu ārstēšanas plānu. Lūdzu, ieplānojiet apmēram 30-60 minūtes.",
        ru: "Первый визит включает консультацию с нашим специалистом, который оценит вашу кожу, обсудит ваши цели и составит индивидуальный план лечения. Запланируйте около 30-60 минут.",
      },
      category: "general",
      keywords: ["first", "visit", "expect", "new", "patient"],
    },
    {
      id: "faq-location",
      question: {
        en: "Where is VIVIDERM located?",
        lv: "Kur atrodas VIVIDERM?",
        ru: "Где находится VIVIDERM?",
      },
      answer: {
        en: "VIVIDERM is located at Roberta Hirša iela 1, Riga, Latvia. You can find us on Google Maps: https://maps.app.goo.gl/4LR1Y283V5JKt35M8",
        lv: "VIVIDERM atrodas Roberta Hirša ielā 1, Rīgā, Latvijā. Mūs varat atrast Google Maps: https://maps.app.goo.gl/4LR1Y283V5JKt35M8",
        ru: "VIVIDERM расположен по адресу: ул. Роберта Хирша 1, Рига, Латвия. Нас можно найти на Google Maps: https://maps.app.goo.gl/4LR1Y283V5JKt35M8",
      },
      category: "general",
      keywords: ["where", "location", "address", "find", "directions", "map"],
    },
    {
      id: "faq-hours",
      question: {
        en: "What are your working hours?",
        lv: "Kāds ir jūsu darba laiks?",
        ru: "Какое у вас время работы?",
      },
      answer: {
        en: "We're open Monday to Friday 9:00-20:00, and Saturday-Sunday 10:00-18:00.",
        lv: "Mēs strādājam no pirmdienas līdz piektdienai 9:00-20:00, sestdienās un svētdienās 10:00-18:00.",
        ru: "Мы работаем с понедельника по пятницу с 9:00 до 20:00, в субботу и воскресенье с 10:00 до 18:00.",
      },
      category: "general",
      keywords: ["hours", "open", "schedule", "time", "working"],
    },
    {
      id: "faq-laser-promo",
      question: {
        en: "Are there any current promotions?",
        lv: "Vai ir kādas aktuālas akcijas?",
        ru: "Есть ли сейчас акции?",
      },
      answer: {
        en: "Yes! We currently have a 30% discount on all laser hair removal services. We also have a 35% introductory discount on PRX-T33 therapy. Contact us for details or to book at the promotional price.",
        lv: "Jā! Pašlaik piedāvājam 30% atlaidi visiem lāzerepilācijas pakalpojumiem. Mums ir arī 35% ievadatlaide PRX-T33 terapijai. Sazinieties ar mums, lai uzzinātu vairāk.",
        ru: "Да! Сейчас действует скидка 30% на все услуги лазерной эпиляции. Также 35% скидка на PRX-T33 терапию. Свяжитесь с нами для подробностей.",
      },
      category: "promotions",
      keywords: ["promotion", "discount", "sale", "offer", "deal", "special"],
    },
    {
      id: "faq-laser-safe",
      question: {
        en: "Is laser hair removal safe?",
        lv: "Vai lāzerepilācija ir droša?",
        ru: "Безопасна ли лазерная эпиляция?",
      },
      answer: {
        en: "Yes, laser hair removal at VIVIDERM is very safe. We use certified European-standard devices including the MeDioStar Monolith and DEKA Motus AX Moveo. Our specialists will assess your skin type during consultation and select the optimal laser and settings for you.",
        lv: "Jā, lāzerepilācija VIVIDERM ir ļoti droša. Mēs izmantojam sertificētas Eiropas standarta ierīces, tostarp MeDioStar Monolith un DEKA Motus AX Moveo. Mūsu speciālisti novērtēs jūsu ādas tipu konsultācijā.",
        ru: "Да, лазерная эпиляция в VIVIDERM очень безопасна. Мы используем сертифицированные европейские аппараты, включая MeDioStar Monolith и DEKA Motus AX Moveo. Наши специалисты оценят ваш тип кожи на консультации.",
      },
      category: "laser",
      keywords: ["safe", "safety", "laser", "pain", "hurt", "risk"],
    },
    {
      id: "faq-sessions",
      question: {
        en: "How many sessions do I need for laser hair removal?",
        lv: "Cik seansu nepieciešams lāzerepilācijai?",
        ru: "Сколько сеансов нужно для лазерной эпиляции?",
      },
      answer: {
        en: "Most clients see significant results after 4-8 sessions, spaced 4-6 weeks apart. The exact number depends on your hair type, skin type, and treatment area. We offer packages of 4 and 8 sessions at discounted rates.",
        lv: "Lielākā daļa klientu pamana ievērojamus rezultātus pēc 4-8 seansiem, ar 4-6 nedēļu intervālu. Precīzs skaits atkarīgs no jūsu matu un ādas tipa. Piedāvājam 4 un 8 seansu paketes ar atlaidi.",
        ru: "Большинство клиентов видят значительные результаты после 4-8 сеансов с интервалом 4-6 недель. Точное количество зависит от вашего типа кожи и волос. Мы предлагаем пакеты из 4 и 8 сеансов со скидкой.",
      },
      category: "laser",
      keywords: ["sessions", "how many", "results", "course", "package"],
    },
    {
      id: "faq-booking",
      question: {
        en: "How can I book an appointment?",
        lv: "Kā es varu pierakstīties?",
        ru: "Как записаться на приём?",
      },
      answer: {
        en: "You can book directly through our online booking system, call us at +371 23 444 401, send a WhatsApp message, or I can help you book right here! What service are you interested in?",
        lv: "Jūs varat pierakstīties caur mūsu tiešsaistes sistēmu, zvanot +371 23 444 401, nosūtīt WhatsApp ziņu, vai es varu palīdzēt jums pierakstīties tieši šeit! Kāds pakalpojums jūs interesē?",
        ru: "Вы можете записаться через нашу онлайн-систему, позвонить по номеру +371 23 444 401, написать в WhatsApp, или я могу помочь записаться прямо сейчас! Какая услуга вас интересует?",
      },
      category: "booking",
      keywords: ["book", "appointment", "schedule", "sign up", "register"],
    },
    {
      id: "faq-equipment",
      question: {
        en: "What equipment do you use?",
        lv: "Kādu aprīkojumu jūs izmantojat?",
        ru: "Какое оборудование вы используете?",
      },
      answer: {
        en: "VIVIDERM uses 10+ original, top-class devices certified to European standards, including MeDioStar Monolith (diode laser), DEKA Motus AX Moveo (alexandrite laser), DEKA Again Pro (ND:YAG laser), Morpheus 8 devices, Onda Plus Coolwaves, and Endospheres equipment.",
        lv: "VIVIDERM izmanto 10+ oriģinālas, augstākās klases ierīces, kas sertificētas pēc Eiropas standartiem, tostarp MeDioStar Monolith, DEKA Motus AX Moveo, Morpheus 8 un citas.",
        ru: "VIVIDERM использует 10+ оригинальных аппаратов высшего класса, сертифицированных по европейским стандартам, включая MeDioStar Monolith, DEKA Motus AX Moveo, Morpheus 8 и другие.",
      },
      category: "general",
      keywords: ["equipment", "device", "machine", "technology", "laser"],
    },
    {
      id: "faq-payment",
      question: {
        en: "What payment methods do you accept?",
        lv: "Kādus maksājuma veidus jūs pieņemat?",
        ru: "Какие способы оплаты вы принимаете?",
      },
      answer: {
        en: "We accept cash, debit and credit cards. Package deals are available for laser hair removal and many other services — these can save you significantly per session.",
        lv: "Mēs pieņemam skaidru naudu, debetkartes un kredītkartes. Pakešu piedāvājumi ir pieejami lāzerepilācijai un daudziem citiem pakalpojumiem.",
        ru: "Мы принимаем наличные, дебетовые и кредитные карты. Доступны пакетные предложения для лазерной эпиляции и многих других услуг.",
      },
      category: "general",
      keywords: ["payment", "pay", "card", "cash", "credit"],
    },
    {
      id: "faq-cancel",
      question: {
        en: "What is your cancellation policy?",
        lv: "Kāda ir jūsu atcelšanas politika?",
        ru: "Какова ваша политика отмены?",
      },
      answer: {
        en: "We kindly ask that you notify us at least 24 hours before your scheduled appointment if you need to cancel or reschedule. Please call +371 23 444 401 or send a WhatsApp message.",
        lv: "Lūdzam paziņot vismaz 24 stundas pirms plānotās vizītes, ja jums nepieciešams atcelt vai pārcelt apmeklējumu. Zvaniet +371 23 444 401 vai sūtiet WhatsApp ziņu.",
        ru: "Просим уведомить нас не менее чем за 24 часа до запланированного визита, если вам нужно отменить или перенести запись. Позвоните +371 23 444 401 или напишите в WhatsApp.",
      },
      category: "booking",
      keywords: ["cancel", "cancellation", "reschedule", "change", "policy"],
    },
  ],
  policies: {
    cancellation: {
      en: "24-hour notice required for cancellation or rescheduling",
      lv: "Nepieciešams paziņot 24 stundas iepriekš par atcelšanu vai pārcelšanu",
      ru: "Необходимо уведомить за 24 часа об отмене или переносе",
    },
    medical_disclaimer: {
      en: "All procedures are performed by certified specialists. Individual results may vary. A consultation is required before any treatment.",
      lv: "Visas procedūras veic sertificēti speciālisti. Individuālie rezultāti var atšķirties. Pirms jebkuras ārstēšanas nepieciešama konsultācija.",
      ru: "Все процедуры выполняются сертифицированными специалистами. Индивидуальные результаты могут отличаться. Перед любой процедурой необходима консультация.",
    },
  },
};
