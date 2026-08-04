export async function onRequest(context) {
  const { request, env } = context;
  
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  // Complete XML character escape helper (fixes xmlParseEntityRef: no name error on & < > ' ")
  const escapeXml = (str) => {
    if (!str) return '';
    return String(str).replace(/[<>&'"]/g, (c) => {
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

  // Clean description text helper (strips internal system tags)
  const cleanDescriptionText = (desc) => {
    if (!desc) return '';
    return desc
      .replace(/\[link:\s*https?:\/\/[^\s\]]+\]/gi, '')
      .replace(/\[allow_link_access\]/gi, '')
      .replace(/\[unlisted\]/gi, '')
      .trim();
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

  let boards = [];
  let images = [];

  if (supabaseUrl && supabaseKey) {
    try {
      // 1. Fetch public boards
      const boardsRes = await fetch(`${supabaseUrl}/rest/v1/boards?is_public=eq.true&select=id,name&limit=5000`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (boardsRes.ok) {
        boards = await boardsRes.json();
      }

      // 2. Fetch public images (fetch up to 50,000 images for Google Bot indexing)
      const imagesRes = await fetch(`${supabaseUrl}/rest/v1/images?is_public=eq.true&select=id,title,description,drive_file_id,drive_view_link&limit=50000`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (imagesRes.ok) {
        images = await imagesRes.json();
      }
    } catch (err) {
      console.error("Failed to fetch database items for dynamic sitemap:", err);
    }
  }

  // Build the valid XML response
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;
  
  // Static Pages
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/about</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/privacy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
  xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/terms</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

  // Dynamic Public Board Collections
  for (const b of boards) {
    if (!b.name || !b.id) continue;
    const boardUrl = `${baseUrl}/board/${slugify(b.name)}--${b.id}`;
    xml += `  <url>\n    <loc>${escapeXml(boardUrl)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
  }

  // Dynamic Public Pin Pages with Google Image sitemap tags
  for (const img of images) {
    if (!img.id) continue;
    const pinUrl = `${baseUrl}/pin/${slugify(img.title)}--${img.id}`;
    const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
    const titleText = img.title || 'Discovery Image';
    const rawDesc = cleanDescriptionText(img.description);
    const descText = rawDesc || `PinGrid creative discovery item - ${titleText}`;

    xml += `  <url>\n`;
    xml += `    <loc>${escapeXml(pinUrl)}</loc>\n`;
    xml += `    <changefreq>monthly</changefreq>\n`;
    xml += `    <priority>0.6</priority>\n`;
    xml += `    <image:image>\n`;
    xml += `      <image:loc>${escapeXml(rawUrl)}</image:loc>\n`;
    xml += `      <image:title>${escapeXml(titleText)}</image:title>\n`;
    xml += `      <image:caption>${escapeXml(descText)}</image:caption>\n`;
    xml += `    </image:image>\n`;
    xml += `  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml;charset=UTF-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600"
    }
  });
}
