// functions/api/delete-domain.js
// 도메인 삭제 API (선택사항 - 관리자 기능)

export async function onRequestPost(context) {
  try {
    const { subdomain, recordIds } = await context.request.json();
    
    const CLOUDFLARE_API_TOKEN = 'WVVIKvk-9Dz2CioeacS8O6CxBNTCkEzECgiWVu_p';
    const ZONE_ID = 'd5c67a7f0c791d39dbce41c3aa5d2221';
    
    if (!subdomain && !recordIds) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: '서브도메인 또는 레코드 ID를 제공해주세요.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    let recordsToDelete = [];
    
    // 레코드 ID가 제공된 경우
    if (recordIds && Array.isArray(recordIds)) {
      recordsToDelete = recordIds;
    } 
    // 서브도메인으로 검색
    else if (subdomain) {
      const searchResponse = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records?type=NS&name=${subdomain}`,
        {
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const searchData = await searchResponse.json();
      
      if (!searchData.success || !searchData.result || searchData.result.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: '해당 도메인을 찾을 수 없습니다.' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      recordsToDelete = searchData.result.map(r => r.id);
    }
    
    // 모든 레코드 삭제
    const deletePromises = recordsToDelete.map(recordId =>
      fetch(
        `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      )
    );
    
    const results = await Promise.all(deletePromises);
    
    // 모든 삭제 성공 확인
    const allSuccessful = await Promise.all(
      results.map(async r => {
        const data = await r.json();
        return data.success;
      })
    );
    
    if (allSuccessful.every(s => s)) {
      // KV Store에서도 삭제 (있다면)
      if (context.env.DOMAINS_KV && subdomain) {
        await context.env.DOMAINS_KV.delete(subdomain);
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: '도메인이 성공적으로 삭제되었습니다.',
        deletedCount: recordsToDelete.length
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      throw new Error('일부 레코드 삭제에 실패했습니다.');
    }
    
  } catch (error) {
    console.error('Delete domain error:', error);
    
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
