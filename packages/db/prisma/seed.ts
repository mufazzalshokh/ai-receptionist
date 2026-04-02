import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create VividDerm business
  const vividerm = await prisma.business.upsert({
    where: { slug: "vividerm" },
    update: {},
    create: {
      name: "VIVIDERM Laser Dermatology Clinic",
      slug: "vividerm",
      industry: "aesthetics_clinic",
      timezone: "Europe/Riga",
      isActive: true,
    },
  });

  console.log(`Business: ${vividerm.name} (${vividerm.id})`);

  // Create services
  const services = [
    { category: "laser", nameEn: "Laser Hair Removal", priceFrom: 30, priceTo: 300, duration: 30 },
    { category: "laser", nameEn: "Laser Skin Rejuvenation", priceFrom: 80, priceTo: 250, duration: 45 },
    { category: "laser", nameEn: "Laser Vascular Treatment", priceFrom: 50, priceTo: 200, duration: 30 },
    { category: "laser", nameEn: "Laser Pigmentation Removal", priceFrom: 40, priceTo: 180, duration: 30 },
    { category: "dermatology", nameEn: "Dermatologist Consultation", priceFrom: 60, priceTo: 60, duration: 30 },
    { category: "cosmetology", nameEn: "Chemical Peel", priceFrom: 50, priceTo: 120, duration: 30 },
    { category: "cosmetology", nameEn: "Mesotherapy", priceFrom: 80, priceTo: 200, duration: 45 },
    { category: "cosmetology", nameEn: "Biorevitalization", priceFrom: 100, priceTo: 250, duration: 45 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: {
        id: `svc-${vividerm.id}-${svc.nameEn.toLowerCase().replace(/\s+/g, "-")}`,
      },
      update: {},
      create: {
        id: `svc-${vividerm.id}-${svc.nameEn.toLowerCase().replace(/\s+/g, "-")}`,
        businessId: vividerm.id,
        ...svc,
        currency: "EUR",
        isActive: true,
      },
    });
  }

  console.log(`Services: ${services.length} seeded`);

  // Create FAQ entries
  const faqs = [
    { category: "general", questionEn: "Where is the clinic located?", answerEn: "VIVIDERM is located at Brivibas iela 39, Riga, Latvia. We are easily accessible by public transport." },
    { category: "general", questionEn: "What are your working hours?", answerEn: "We are open Monday to Friday 9:00-19:00 and Saturday 10:00-16:00. We are closed on Sundays." },
    { category: "pricing", questionEn: "How much does laser hair removal cost?", answerEn: "Prices depend on the treatment area, starting from 30 EUR for small areas. We offer package discounts for multiple sessions." },
    { category: "procedure", questionEn: "Is laser treatment painful?", answerEn: "Most patients describe a slight tingling sensation. We use cooling systems to minimize discomfort." },
    { category: "booking", questionEn: "How do I book an appointment?", answerEn: "You can book online through our website, call +371 23 444 401, or simply ask me to help you book right now!" },
  ];

  for (const faq of faqs) {
    await prisma.fAQ.upsert({
      where: {
        id: `faq-${vividerm.id}-${faq.category}-${faqs.indexOf(faq)}`,
      },
      update: {},
      create: {
        id: `faq-${vividerm.id}-${faq.category}-${faqs.indexOf(faq)}`,
        businessId: vividerm.id,
        ...faq,
        keywords: [],
        isActive: true,
      },
    });
  }

  console.log(`FAQs: ${faqs.length} seeded`);
  console.log("Seed complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error("Seed error:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
