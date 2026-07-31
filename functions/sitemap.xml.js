export async function onRequest(context) {
  const { request, env } = context;
  
  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

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
      const boardsRes = await fetch(`${supabaseUrl}/rest/v1/boards?select=id,name`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      if (boardsRes.ok) {
        boards = await boardsRes.json();
      }

      // 2. Fetch public images
      const imagesRes = await fetch(`${supabaseUrl}/rest/v1/images?select=id,title,description,drive_file_id,drive_view_link`, {
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

  // Build the XML response
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
`;

  // Add Dynamic Board URLs
  for (const b of boards) {
    xml += `  <url>
    <loc>${baseUrl}/board/${slugify(b.name)}--${b.id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
  }

  // Add Dynamic Pin URLs with Image metadata details
  for (const img of images) {
    const rawUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
    const cleanTitle = img.title ? img.title.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    }) : 'Discovery Image';
    const cleanDesc = img.description ? img.description.replace(/[<>&'"]/g, c => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    }) : `PinGrid creative discovery item - ${cleanTitle}`;

    xml += `  <url>
    <loc>${baseUrl}/pin/${slugify(img.title)}--${img.id}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
    <image:image>
      <image:loc>${rawUrl}</image:loc>
      <image:title>${cleanTitle}</image:title>
      <image:caption>${cleanDesc}</image:caption>
    </image:image>
  </url>\n`;
  }

  xml += `</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml;charset=UTF-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600" // Cache on CDN Edge nodes for 1 hour to prevent spam request loading
    }
  });
}
