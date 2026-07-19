/* JSON-LD for search engines: Organization + WebSite. Only grounded facts here,
   no ratings, review counts, or client names we cannot stand behind. "midsesh"
   is the domain and product name; "get an expert" is the public brand shown
   across the site, so both are declared. */

const SITE_URL = "https://midsesh.com";

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "get an expert",
      alternateName: "midsesh",
      url: SITE_URL,
      logo: `${SITE_URL}/assets/og.png`,
      description:
        "An MCP server for Claude Code, Codex, and Cursor. Real human experts join your session to review, deliver, and take work off your plate.",
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "get an expert",
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: "en",
    },
  ],
};

export default function StructuredData() {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe, structured data only, no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  );
}
