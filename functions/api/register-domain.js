// functions/api/register-domain.js
// Cloudflare Pages Function - 도메인 등록 API

export async function onRequestPost(context) {
  try {
    const { subdomain, extension, ns1, ns2, email } = await context.request.json();
    
    const CLOUDFLARE_API_TOKEN = 'WVVIKvk-9Dz2CioeacS8O6CxBNTCkEzECgiWVu_p';
    const ZONE_ID = 'd5c67a7f0c791d39dbce41c3aa5d2221';
    
    // 입력 검증
    if (!subdomain || !ns1 || !ns2 || !email) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '모든 필드를 입력해주세요.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 도메인명 검증
    if (!subdomain.match(/^[a-z0-9-]+$/)) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '도메인은 영문 소문자, 숫자, 하이픈만 사용 가능합니다.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const fullDomain = subdomain + extension.replace(/^\./, '');
    
    // 기존 레코드 확인
    const checkResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=NS&name=${subdomain}`,
      {
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const checkData = await checkResponse.json();
    
    if (checkData.result && checkData.result.length > 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '이미 사용 중인 도메인입니다.' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // NS 레코드 1 생성
    const ns1Response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'NS',
          name: subdomain,
          content: ns1,
          ttl: 3600,
          comment: `Domain registered for ${email}`
        })
      }
    );
    
    const ns1Data = await ns1Response.json();
    
    if (!ns1Data.success) {
      throw new Error('NS1 레코드 생성 실패: ' + JSON.stringify(ns1Data.errors));
    }
    
    // NS 레코드 2 생성
    const ns2Response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'NS',
          name: subdomain,
          content: ns2,
          ttl: 3600,
          comment: `Domain registered for ${email}`
        })
      }
    );
    
    const ns2Data = await ns2Response.json();
    
    if (!ns2Data.success) {
      // NS1 롤백
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${ns1Data.result.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
          }
        }
      );
      
      throw new Error('NS2 레코드 생성 실패: ' + JSON.stringify(ns2Data.errors));
    }
    
    // KV Store에 도메인 정보 저장 (선택사항)
    if (context.env.DOMAINS_KV) {
      await context.env.DOMAINS_KV.put(fullDomain, JSON.stringify({
        subdomain,
        extension,
        ns1,
        ns2,
        email,
        createdAt: new Date().toISOString(),
        ns1RecordId: ns1Data.result.id,
        ns2RecordId: ns2Data.result.id
      }));
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      domain: fullDomain,
      message: '도메인이 성공적으로 등록되었습니다. DNS 전파까지 최대 24시간 소요될 수 있습니다.',
      ns1RecordId: ns1Data.result.id,
      ns2RecordId: ns2Data.result.id
    }), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    console.error('Domain registration error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || '도메인 등록 중 오류가 발생했습니다.' 
    }), {
      status: 500,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// OPTIONS 요청 처리 (CORS)
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
      }
