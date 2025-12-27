// functions/api/list-domains.js
// 등록된 도메인 목록 조회 API (선택사항)

export async function onRequestGet(context) {
  try {
    const CLOUDFLARE_API_TOKEN = 'WVVIKvk-9Dz2CioeacS8O6CxBNTCkEzECgiWVu_p';
    const ZONE_ID = 'd5c67a7f0c791d39dbce41c3aa5d2221';
    
    // Cloudflare DNS 레코드 조회
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=NS&per_page=100`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('DNS 레코드 조회 실패');
    }
    
    // NS 레코드를 도메인별로 그룹화
    const domainMap = {};
    
    data.result.forEach(record => {
      if (!domainMap[record.name]) {
        domainMap[record.name] = {
          domain: record.name,
          nameservers: [],
          createdAt: record.created_on,
          modifiedAt: record.modified_on
        };
      }
      domainMap[record.name].nameservers.push({
        server: record.content,
        recordId: record.id
      });
    });
    
    const domains = Object.values(domainMap);
    
    return new Response(JSON.stringify({ 
      success: true, 
      count: domains.length,
      domains: domains
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('List domains error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// CORS 처리
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
