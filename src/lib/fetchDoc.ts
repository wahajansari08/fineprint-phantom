// Server-side document fetching for the URL input: fetch the page, strip it
// to readable text, and cap the length. The cap and the stripping both matter
// — the analysis chunks whatever survives, and a truncation notice is shown
// to the user when the cap bites.

export const MAX_DOC_CHARS = 60_000;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
}

export async function fetchDocumentText(rawUrl: string): Promise<{ text: string; truncated: boolean }> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('That URL does not parse. Check it and try again.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Only http(s) URLs can be summoned.');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'FinePrintPhantom/0.1 (+https://dev.to) reading a policy page at the user\'s request',
        Accept: 'text/html, text/plain;q=0.9, */*;q=0.5',
      },
      redirect: 'follow',
    });
  } catch {
    throw new Error('That page could not be fetched. Try pasting the text instead.');
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`The page answered HTTP ${res.status}. Try pasting the text instead.`);

  const contentType = res.headers.get('content-type') ?? '';
  const body = await res.text();
  const text = contentType.includes('html') || body.includes('<') ? htmlToText(body) : body.trim();
  if (text.length < 200) {
    throw new Error('Almost no readable text was found at that URL. Try pasting the policy text instead.');
  }
  return { text: text.slice(0, MAX_DOC_CHARS), truncated: text.length > MAX_DOC_CHARS };
}
