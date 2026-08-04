export async function onRequest(context) {
  const { request, env } = context;
  
  // Safe fallbacks guarantee Cloudflare Functions never crash with 500 Invalid URL
  const supabaseUrl = env?.VITE_SUPABASE_URL || env?.SUPABASE_URL || 'https://fftkjikbkewirsfoqwen.supabase.co';
  const supabaseKey = env?.VITE_SUPABASE_ANON_KEY || env?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmdGtqaWtia2V3aXJzZm9xd2VuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjI4OTAsImV4cCI6MjEwMDk5ODg5MH0.JYKtKniX5bZm9Q279ep_NXpS8cs2MGPVbC0B5n4GNoA';

  const url = new URL(request.url);
  // Ensure canonical production HTTPS domain for Googlebot
  const baseUrl = (url.host.includes('localhost') || url.host.includes('127.0.0.1'))
    ? `${url.protocol}//${url.host}`
    : 'https://gallery.aktechstudio.com';

  const pageParam = url.searchParams.get('page');
  const typeParam = url.searchParams.get('type'); // 'main' | 'images'

  const headers = {
    "Content-Type": "application/xml; charset=utf-8",
    "Cache-Control": "public, max-age=3600, s-maxage=3600",
    "Access-Control-Allow-Origin": "*"
  };

  // Handle HEAD requests gracefully for Googlebot pre-fetch check
  if (request.method === 'HEAD') {
    return new Response(null, { status: 200, headers });
  }

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

  const PAGE_SIZE = 50000; // Max allowed per Google Sitemap spec
  let totalImages = 0;

  try {
    if (supabaseUrl && supabaseKey) {
      const countRes = await fetch(`${supabaseUrl}/rest/v1/images?is_public=eq.true&select=id`, {
        method: 'HEAD',
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Prefer: 'count=exact'
        }
      });
      const countHeader = countRes.headers.get('content-range');
      if (countHeader) {
        const parts = countHeader.split('/');
        if (parts.length > 1) {
          totalImages = parseInt(parts[1], 10) || 0;
        }
      }
    }
  } catch (err) {
    console.error("Count query error in sitemap:", err);
  }

  // -------------------------------------------------------------
  // MODE 1: Master Sitemap Index File (When > 50,000 images)
  // -------------------------------------------------------------
  if (totalImages > PAGE_SIZE && !pageParam && typeParam !== 'main') {
    const totalChunks = Math.ceil(totalImages / PAGE_SIZE);
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <sitemap>\n    <loc>${escapeXml(baseUrl)}/sitemap.xml?type=main</loc>\n  </sitemap>\n`;
    
    for (let p = 1; p <= totalChunks; p++) {
      xml += `  <sitemap>\n    <loc>${escapeXml(baseUrl)}/sitemap.xml?type=images&amp;page=${p}</loc>\n  </sitemap>\n`;
    }
    
    xml += `</sitemapindex>`;

    return new Response(xml, { status: 200, headers });
  }

  // -------------------------------------------------------------
  // MODE 2: Main Sitemap (Static Pages + Public Boards)
  // -------------------------------------------------------------
  if (typeParam === 'main') {
    let boards = [];
    try {
      if (supabaseUrl && supabaseKey) {
        const boardsRes = await fetch(`${supabaseUrl}/rest/v1/boards?is_public=eq.true&select=id,name&limit=5000`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (boardsRes.ok) boards = await boardsRes.json();
      }
    } catch (err) {
      console.error("Fetch boards error in sitemap:", err);
    }

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/about</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/privacy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/terms</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

    for (const b of boards) {
      if (!b.name || !b.id) continue;
      const boardUrl = `${baseUrl}/board/${slugify(b.name)}--${b.id}`;
      xml += `  <url>\n    <loc>${escapeXml(boardUrl)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
    xml += `</urlset>`;

    return new Response(xml, { status: 200, headers });
  }

  // -------------------------------------------------------------
  // MODE 3: Single Sitemap OR Chunked Image Sitemap Page
  // -------------------------------------------------------------
  let boards = [];
  let images = [];
  const pageNum = parseInt(pageParam, 10) || 1;
  const from = (pageNum - 1) * PAGE_SIZE;
  const to = pageNum * PAGE_SIZE - 1;

  try {
    if (supabaseUrl && supabaseKey) {
      if (pageNum === 1 && !typeParam) {
        const boardsRes = await fetch(`${supabaseUrl}/rest/v1/boards?is_public=eq.true&select=id,name&limit=5000`, {
          headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
        });
        if (boardsRes.ok) boards = await boardsRes.json();
      }

      const imagesRes = await fetch(`${supabaseUrl}/rest/v1/images?is_public=eq.true&select=id,title,description,drive_file_id,drive_view_link&order=created_at.desc`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Range: `${from}-${to}`
        }
      });
      if (imagesRes.ok) images = await imagesRes.json();
    }
  } catch (err) {
    console.error("Fetch images error in sitemap:", err);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
  xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n`;

  if (pageNum === 1 && !typeParam) {
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/about</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/privacy</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${escapeXml(baseUrl)}/terms</loc>\n    <changefreq>yearly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

    for (const b of boards) {
      if (!b.name || !b.id) continue;
      const boardUrl = `${baseUrl}/board/${slugify(b.name)}--${b.id}`;
      xml += `  <url>\n    <loc>${escapeXml(boardUrl)}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    }
  }

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

  return new Response(xml, { status: 200, headers });
}
