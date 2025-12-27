// 간단한 테스트용 Worker
addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };
  
  // OPTIONS 요청 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }
  
  // 기본 응답
  const response = {
    status: 'ok',
    message: 'Worker is running!',
    timestamp: new Date().toISOString(),
    path: url.pathname
  };
  
  return new Response(JSON.stringify(response, null, 2), {
    headers: headers
  });
}
