import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fftkjikbkewirsfoqwen.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGtqaWtia2V3aXJzZm9xd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjI4OTAsImV4cCI6MjEwMDk5ODg5MH0.JYKtKniX5bZm9Q279ep_NXpS8cs2MGPVbC0B5n4GNoA';
const baseUrl = 'https://gallery.aktechstudio.com';

const cleanText = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/<[^>]*>/g, '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\[link:\s*https?:\/\/[^\s\]]+\]/gi, '')
    .replace(/\[allow_link_access\]/gi, '')
    .replace(/\[unlisted\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const escapeXml = (str) => {
  if (!str) return '';
  const text = cleanText(str);
  return text.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

const slugify = (text) => {
  if (!text) return 'untitled';
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

async function generateSitemap() {
  console.log("Generating static public/sitemap.xml for production...");
  let boards = [];
  let images = [];

  try {
    const boardsRes = await fetch(`${supabaseUrl}/rest/v1/boards?is_public=eq.true&select=id,name&limit=5000`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (boardsRes.ok) boards = await boardsRes.json();

    const imagesRes = await fetch(`${supabaseUrl}/rest/v1/images?is_public=eq.true&select=id,title,description,drive_file_id,drive_view_link,created_at&limit=50000&order=created_at.desc`, {
      headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
    });
    if (imagesRes.ok) images = await imagesRes.json();
  } catch (err) {
    console.error("Error fetching data for static sitemap build:", err);
  }

  const today = new Date().toISOString().split('T')[0];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Static Pages
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/about</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/privacy</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/terms</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

  // Public Board Collections (6-character short IDs)
  for (const b of boards) {
    if (!b.name || !b.id) continue;
    const boardShortId = b.id.substring(0, 6);
    const boardUrl = `${baseUrl}/board/${slugify(b.name)}--${boardShortId}`;
    xml += `  <url>\n    <loc>${escapeXml(boardUrl)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  // Public Pin Items (8-character short IDs)
  for (const img of images) {
    if (!img.id) continue;
    const pinShortId = img.id.substring(0, 8);
    const pinUrl = `${baseUrl}/pin/${slugify(img.title)}--${pinShortId}`;
    const dateStr = img.created_at ? new Date(img.created_at).toISOString().split('T')[0] : today;

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(pinUrl)}</loc>\n`;
    xml += `    <lastmod>${dateStr}</lastmod>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  const targetPath = path.join(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(targetPath, xml, 'utf8');
  console.log(`Successfully generated public/sitemap.xml (${images.length} pins, ${boards.length} boards)`);
}

generateSitemap();
