export async function onRequest(context) {
  const { request, env, params } = context;
  
  const idParam = params.id;
  const parts = idParam.split('--');
  const boardId = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const supabaseKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

  let title = "Curated Board Collection";
  let description = "Browse this custom-curated folder collection of backup images on the PinGrid network.";
  let imageUrl = new URL('/favicon.svg', request.url).href;

  if (supabaseUrl && supabaseKey && boardId) {
    try {
      const res = await fetch(`${supabaseUrl}/rest/v1/boards?id=eq.${boardId}&select=name,description`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`
        }
      });
      const data = await res.json();
      if (data && data.length > 0) {
        const board = data[0];
        title = `Collection: ${board.name}`;
        description = board.description || `Browse the ${board.name} board backups, shared pins, and beautiful galleries on the PinGrid network.`;
      }
    } catch (err) {
      console.error("Failed to query board details in Cloudflare Page Function:", err);
    }
  }

  const staticHtmlUrl = new URL('/index.html', request.url);
  const staticRes = await fetch(staticHtmlUrl.toString());
  let html = await staticRes.text();

  const ogTags = `
    <title>${title} | PinGrid</title>
    <meta name="description" content="${description}" />
    <meta property="og:title" content="${title} | PinGrid" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${imageUrl}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${request.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} | PinGrid" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${imageUrl}" />
  `;

  html = html.replace('<head>', `<head>${ogTags}`);

  return new Response(html, {
    headers: {
      "Content-Type": "text/html;charset=UTF-8"
    }
  });
}
