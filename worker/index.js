const GITHUB_API    = 'https://api.github.com';
const ALLOWED_ORIGIN = 'https://vm100900.github.io';
const REPO_PREFIX    = '/repos/vm100900/vote-student/';

export default {
  async fetch(request, env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    if (!url.pathname.startsWith(REPO_PREFIX)) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders });
    }

    const body = (request.method !== 'GET' && request.method !== 'HEAD')
      ? await request.arrayBuffer()
      : undefined;

    const upstream = await fetch(GITHUB_API + url.pathname + url.search, {
      method: request.method,
      headers: {
        'Authorization':        `Bearer ${env.GITHUB_TOKEN}`,
        'Accept':               'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type':         'application/json',
        'User-Agent':           'vote-student-worker',
      },
      body,
    });

    const headers = new Headers(upstream.headers);
    Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));
    return new Response(upstream.body, { status: upstream.status, headers });
  },
};
