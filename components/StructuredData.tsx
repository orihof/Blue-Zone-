export default function StructuredData() {
  const softwareApp = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Blue Zone",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    description:
      "AI-powered longevity platform delivering a Biological Age Score across 8 health domains. Built with an advisory council of 18 world-class longevity researchers.",
    url: "https://bluezone.health",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free founding athlete access",
    },
    featureList: [
      "Biological Age Score",
      "8-domain health analysis",
      "Morning Readiness Score",
      "Wearable device integration",
      "AI-powered protocol recommendations",
      "VO2max tracking",
      "HRV analysis",
    ],
    audience: {
      "@type": "Audience",
      audienceType:
        "Competitive endurance athletes, triathletes, biohackers, longevity-focused individuals",
    },
  };

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Blue Zone",
    url: "https://bluezone.health",
    description:
      "AI longevity and performance platform built with an advisory council of 18 world-class scientists in longevity, exercise physiology, sleep science, and metabolic health.",
    foundingDate: "2025",
    knowsAbout: [
      "Biological age measurement",
      "Longevity science",
      "Endurance performance optimization",
      "HRV analysis",
      "Sleep optimization",
    ],
  };

  const faqPage = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is a Biological Age Score?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Your Biological Age Score is the age your body functions at, independent of your chronological age. Blue Zone calculates it by analyzing 8 health domains using biomarkers from your wearables and lab data.",
        },
      },
      {
        "@type": "Question",
        name: "What devices does Blue Zone connect to?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Blue Zone integrates with Whoop, Oura Ring, Garmin, and Apple Health. Wearable data feeds the AI analysis pipeline automatically each morning.",
        },
      },
      {
        "@type": "Question",
        name: "How is Blue Zone different from InsideTracker or Function Health?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Blue Zone combines continuous wearable data with an AI analysis layer built with 18 longevity scientists. Where other platforms report biomarkers, Blue Zone interprets them across all 8 domains and outputs a single Biological Age Score with a specific improvement protocol.",
        },
      },
      {
        "@type": "Question",
        name: "Who built Blue Zone?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Blue Zone was built with an advisory council of 18 world-class scientists specializing in longevity, exercise physiology, sleep science, metabolic health, and biological age measurement.",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
      />
    </>
  );
}
