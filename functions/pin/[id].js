export async function onRequest(context) {
  const { request, env, params } = context;
  
  // Extract UUID from the dynamic parameter 'id' (which is some-slug--UUID)
  const idParam = params.id;
  const parts = idParam.split('--');
  const imageId = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  let title = "Discover Backup Images & Art";
  let description = "Explore beautiful backups, shared pins, and custom image galleries on PinGrid.";
  let imageUrl = new URL('/favicon.svg', request.url).href;

  // Fetch image metadata from Supabase REST endpoint
  if (supabaseUrl && supabaseKey && imageId) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/images?id=eq.${imageId}&select=title,description,drive_view_link,drive_file_id`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const img = data[0];
        title = img.title || title;
        description = img.description || "View this premium backing and wallpaper storage upload on the PinGrid network.";
        imageUrl = img.drive_view_link || `https://lh3.googleusercontent.com/d/${img.drive_file_id}`;
      }
    } catch (err) {
      console.error("Failed to query image details in Cloudflare Page Function:", err);
    }
  }

  // Fetch the static index.html from the pages deploy assets
  const staticHtmlUrl = new URL('/index.html', request.url);
  const staticRes = await fetch(staticHtmlUrl.toString());
  let html = await staticRes.text();

  // Inject Open Graph tags inside <head>
  const ogTags = `
    <title>${title} | PinGrid</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title} | PinGrid" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${request.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} | PinGrid" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  // Insert at the top of <head>
  html = html.replace('<head>', `<head>${ogTags}`);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8"
    }
  });
}
