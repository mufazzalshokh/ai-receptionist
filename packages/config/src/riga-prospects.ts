/**
 * Riga Market — Target Business Prospects
 *
 * Prioritized list of businesses to approach after VividDerm.
 * Strategy: Perfect the product for one → demo → adapt → next.
 *
 * Priority tiers:
 *   Tier 1 — Same vertical as VividDerm (aesthetics), easiest adaptation
 *   Tier 2 — High appointment volume, high ticket, proven AI receptionist ROI
 *   Tier 3 — Good fit but requires more customization
 */

export const rigaProspects = {
  // =============================================
  // TIER 1 — Aesthetics / Med Spa (adapt VividDerm config directly)
  // =============================================
  aesthetics: {
    priority: 1,
    pitchAngle: "We already power VIVIDERM — here's what it did for them in the first month.",
    prospects: [
      {
        name: "Era Esthetic",
        website: "https://eraesthetic.lv/en/",
        phone: "+371 25711117",
        location: "Riga + Jurmala",
        why: "Biggest direct competitor to VividDerm. 10+ years, laser dermatology, multiple locations. Same service profile = near-zero customization.",
      },
      {
        name: "Aesthetica Beauty Clinic",
        website: "https://aesthetica.lv/en/",
        location: "Riga",
        why: "Leading aesthetics & plastic surgery. Science-based approach — will appreciate data-driven AI. High-ticket services.",
      },
      {
        name: "LIPEX Clinic",
        website: "https://lipex.lv/en/",
        location: "Riga",
        why: "Aesthetics and cosmetology clinic. Active online presence, appointment-based.",
      },
      {
        name: "Estetik Spa",
        website: "https://www.tripadvisor.com/Attraction_Review-g274967-d12534473-Reviews-Estetik_Spa-Riga_Riga_Region.html",
        location: "Riga",
        why: "Medical spa with facial/body treatments. Good TripAdvisor reviews, tourist clientele = multilingual need.",
      },
    ],
  },

  // =============================================
  // TIER 2 — Dental (high appointment volume, proven category)
  // =============================================
  dental: {
    priority: 2,
    pitchAngle: "Every missed call is a lost patient worth €200-500. Your AI receptionist answers in 3 languages, 24/7.",
    prospects: [
      {
        name: "DENTARIUM",
        website: "https://dentarium.lv/",
        location: "Riga",
        why: "Premium dental, 25+ years experience. Owner-operated, likely misses calls during procedures.",
      },
      {
        name: "SIROWA Clinic",
        website: "https://www.sirowaclinic.com/en/",
        location: "Riga",
        why: "30 years experience, award-winning. Family dentistry = high volume inquiries, scheduling complexity.",
      },
      {
        name: "SKY DREAM CLINIC",
        website: "https://skydream.lv/en/",
        location: "Riga",
        why: "Modern facilities, 3D imaging. Already invested in tech — open to AI solutions.",
      },
      {
        name: "Baltic Dental",
        website: "https://www.baltic-dental.com/",
        location: "Riga center",
        why: "Targets international patients explicitly — multi-language is a must. Price-competitive positioning.",
      },
    ],
  },

  // =============================================
  // TIER 2 — Private Medical Clinics
  // =============================================
  medical: {
    priority: 2,
    pitchAngle: "200+ specialists, thousands of calls/month. Let AI handle the first 80% so your staff can focus on patient care.",
    prospects: [
      {
        name: "Medical Centre ARS",
        website: "https://healthtravellatvia.lv/en/clinic/medical-centre-ars/",
        location: "Riga",
        why: "First private clinic in Latvia (1988), 200+ doctors. Scale = massive call volume. Multi-specialty = complex routing AI excels at.",
      },
      {
        name: "Republikas laukuma klīnika",
        website: "https://republikaslaukumaklinika.lv/en/",
        location: "Riga center",
        why: "English-speaking doctors, multiple specialists. Already targeting international market — multilingual AI is a natural fit.",
      },
      {
        name: "Premium Medical",
        website: "https://premiummedical.lv/en/",
        location: "Riga (Skanste)",
        why: "Premium positioning, advanced diagnostics. Name literally says 'premium' — will pay for premium AI solution.",
      },
      {
        name: "Capital Clinic Riga",
        website: "https://healthtravellatvia.lv/en/clinic/capital-clinic-riga/",
        location: "Riga",
        why: "Health tourism focus — diagnostics, rehab, health check-ups. International patients = highest multilingual need.",
      },
      {
        name: "AIWA Clinic",
        website: "https://healthtravellatvia.lv/en/clinic/aiwa-clinic/",
        location: "Riga",
        why: "Private hospital with surgery + diagnostics. Complex scheduling, high-value services.",
      },
    ],
  },

  // =============================================
  // TIER 2 — Beauty Salons & Spas
  // =============================================
  salons: {
    priority: 2,
    pitchAngle: "Your stylists are busy with clients — who's answering the phone? AI handles booking while you focus on service.",
    prospects: [
      {
        name: "KOLONNA",
        website: "https://kolonna.com/en",
        location: "Multiple locations, Riga",
        why: "Chain of beauty & SPA salons — multi-location is a strong upsell. High volume, repeated bookings.",
      },
      {
        name: "ESPA Riga",
        website: "https://www.espariga.com/en/",
        location: "Riga center",
        why: "5-star day spa, TripAdvisor excellence winner. Premium clientele expects premium service. Tourists = multilingual.",
      },
      {
        name: "SIBI beauty salon",
        website: "https://www.tripadvisor.com/Attraction_Review-g274967-d25368369-Reviews-SIBI_salons-Riga_Riga_Region.html",
        location: "Riga center",
        why: "Highly rated on TripAdvisor. Professional service focus — AI receptionist aligns with their quality standard.",
      },
      {
        name: "Ma-Beauty Salon",
        website: "https://www.tripadvisor.com/Attraction_Review-g274967-d13155666-Reviews-Ma_Beauty_Salon-Riga_Riga_Region.html",
        location: "Old Riga",
        why: "Old Town location, democratic prices, diverse services. Tourist traffic = constant multilingual inquiries.",
      },
    ],
  },

  // =============================================
  // TIER 2 — Veterinary Clinics
  // =============================================
  veterinary: {
    priority: 2,
    pitchAngle: "Pet emergencies don't wait for business hours. Your AI answers at 2AM, triages urgency, and books non-emergency visits.",
    prospects: [
      {
        name: "Mazo Brāļu hospitālis (Little Brothers Hospital)",
        website: "https://mbh.lv/en",
        location: "Riga",
        why: "Most recognized vet clinic in Latvia & Baltics. 25 years. High volume, emergencies need instant triage.",
      },
      {
        name: "KAVET",
        website: "https://kavet.org/en/",
        location: "Riga",
        why: "20+ years, regenerative medicine focus. International recognition — multilingual clientele.",
      },
      {
        name: "BIOVET",
        website: "https://biovet.lv/en/",
        location: "Riga",
        why: "Modern equipment, multiple specialties. On-site diagnostics = complex scheduling needs.",
      },
      {
        name: "IKAROSS",
        website: "https://vet-in-riga.zl.lv/",
        location: "Riga (Ilguciems, Bolderaja)",
        why: "Multiple locations, exotic animals. Dermatology focus = interesting cross-sell with VividDerm case study.",
      },
    ],
  },

  // =============================================
  // TIER 3 — Real Estate
  // =============================================
  realEstate: {
    priority: 3,
    pitchAngle: "Leads expire in minutes. Your AI qualifies buyers at midnight while competitors send them to voicemail.",
    prospects: [
      {
        name: "LATIO",
        website: "https://latio.lv/en",
        location: "Latvia-wide",
        why: "Since 1991, full-cycle real estate. All property types. Biggest player = biggest deal if you close them.",
      },
      {
        name: "ARCO Real Estate",
        website: "https://realting.com/latvia/agencies",
        location: "Riga",
        why: "20+ years, international company. Property inquiries = time-sensitive, multilingual foreign buyers.",
      },
      {
        name: "RELIVE.LV",
        website: "https://relive.lv/en",
        location: "Riga",
        why: "Explicitly targets international clients — multi-language AI is their exact need.",
      },
      {
        name: "Mercury Group",
        website: "https://www.estatelatvia.com/en/",
        location: "Riga",
        why: "Luxury real estate, 25+ years. High-value leads justify premium AI receptionist pricing.",
      },
    ],
  },

  // =============================================
  // TIER 3 — Fitness Studios & Gyms
  // =============================================
  fitness: {
    priority: 3,
    pitchAngle: "Turn inquiries into trial sessions. AI handles membership questions, class schedules, and books first visits automatically.",
    prospects: [
      {
        name: "MyFitness",
        website: "https://www.myfitness.lv/en/",
        location: "Multiple Riga locations",
        why: "Major chain, multiple locations. Membership inquiries, class booking, trial scheduling — high AI value.",
      },
      {
        name: "LEMON GYM",
        website: "https://www.lemongym.lv/en/",
        location: "8 locations in Latvia",
        why: "24/7 access model = 24/7 AI makes perfect sense. Chain deal potential.",
      },
      {
        name: "ONLY Private Fitness Club",
        website: "https://www.lifefitness.com/en-us/customer-support/education-hub/success-stories/health-club/only-private-fitness-club",
        location: "Riga",
        why: "Premium private club — exclusive clientele expects immediate, personalized response.",
      },
      {
        name: "People Fitness Club",
        website: "https://peoplefitness.eu/en/",
        location: "Riga",
        why: "Budget-friendly but high volume. €14.95/mo = lots of members = lots of inquiries.",
      },
    ],
  },

  // =============================================
  // TIER 3 — Restaurants (upscale / catering)
  // =============================================
  restaurants: {
    priority: 3,
    pitchAngle: "Reservations, private events, catering inquiries — your AI handles them all so your staff focuses on the guest experience.",
    prospects: [
      {
        name: "3 Pavāru Restorāns (3 Chefs Restaurant)",
        website: "https://www.liveriga.com/en/4-eat-drink",
        location: "Old Town, Riga",
        why: "Tasting menu €99/person, wine pairings. High-ticket = reservations matter. Tourist-heavy = multilingual.",
      },
      {
        name: "Fabrikas Restorāns",
        website: "https://wanderlog.com/list/geoCategory/40340/nice-restaurants-and-fine-dining-in-riga",
        location: "Daugava shore, Riga",
        why: "Upscale, stunning views. Private events, romantic dinners — reservation management is critical.",
      },
      {
        name: "Riviera",
        website: "https://www.liveriga.com/en/4-eat-drink",
        location: "Embassy district, Riga",
        why: "1,000+ wine selections, Mediterranean fine dining. Clientele expects instant, polished communication.",
      },
    ],
  },

  // =============================================
  // TIER 3 — Law Firms
  // =============================================
  law: {
    priority: 3,
    pitchAngle: "Every inquiry could be a €5,000+ case. AI qualifies leads, captures case details, and books intake calls 24/7.",
    prospects: [
      {
        name: "NJORD Latvia",
        website: "https://www.njordlaw.com/lawyers-latvia",
        location: "Riga",
        why: "International law firm. Multilingual practice — EN/LV/RU AI is perfect for cross-border client intake.",
      },
      {
        name: "Belyaev & Belyaev",
        website: "https://www.belyaev.lv",
        location: "Riga",
        why: "Name suggests Russian-speaking market — tri-lingual AI is extremely valuable for their client base.",
      },
      {
        name: "Dzanuškans & Partneri",
        website: "https://www.hg.org/lawfirms/latvia/riga",
        location: "Riga",
        why: "Broad practice: criminal, commercial, immigration, civil. Immigration clients = multilingual need.",
      },
      {
        name: "INLAT PLUS",
        website: "https://www.hg.org/lawfirms/latvia",
        location: "Riga",
        why: "Since 1996, well-known firm. General practice = diverse inquiry types AI can route efficiently.",
      },
    ],
  },

  // =============================================
  // TIER 3 — Home Services / Contractors
  // =============================================
  homeServices: {
    priority: 3,
    pitchAngle: "When a pipe bursts at midnight, your AI answers, triages urgency, and dispatches your team — no missed emergency calls.",
    prospects: [
      {
        name: "Palīgs24",
        website: "https://www.paligs24.lv/en/plumbing-services/",
        location: "Latvia-wide",
        why: "Certified plumber services, Latvia-wide. 24/7 emergency = highest AI value. Name literally means 'Helper 24'.",
      },
      {
        name: "Aquadoka",
        website: "https://aquadoka.lv/",
        location: "Riga region",
        why: "24/7 emergency plumbing, €50 call-outs. AI can triage urgency, collect details, dispatch team.",
      },
      {
        name: "YS Technology",
        website: "https://ystechnology.lv/en/",
        location: "Riga",
        why: "HVAC specialist — commercial + residential. Emergency assistance outside working hours = AI sweet spot.",
      },
      {
        name: "JŪSU MĀJA",
        website: "https://www.jusumaja.lv/en/",
        location: "Riga",
        why: "Construction & renovation of private houses. Long sales cycle = lead qualification is critical.",
      },
    ],
  },
} as const;

/**
 * Recommended approach order:
 *
 * 1. VividDerm (DONE — product built for them)
 * 2. Era Esthetic → same vertical, near-zero adaptation
 * 3. Aesthetica / LIPEX → same vertical, minor tweaks
 * 4. DENTARIUM / SIROWA → dental template, different but similar
 * 5. Mazo Brāļu hospitālis → vet template (emotional urgency sells)
 * 6. Medical Centre ARS → biggest deal size, needs GDPR compliance story
 * 7. KOLONNA / ESPA Riga → salon chain = multi-location pricing
 * 8. LATIO / Mercury Group → real estate, high-value leads
 * 9. MyFitness / LEMON GYM → chain deals, volume play
 * 10. NJORD / Belyaev → law firms, highest per-lead value
 */
