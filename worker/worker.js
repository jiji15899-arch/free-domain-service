// ==========================================
// 무료 도메인 제공 플랫폼 - Cloudflare Worker
// ==========================================
// 필수 환경 변수:
// - CF_API_TOKEN (Secret)
// - CF_ZONE_ID (Text)
// - GITHUB_TOKEN (Secret)
// - GITHUB_REPO (Text) 예: jiji15899/free-domain-platform
// - ALLOWED_EXTENSIONS (Text) 예: .yourdomain.com,.yourdomain.net
// ==========================================

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // CORS preflight 처리
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    // 헬스체크 엔드포인트
    if (path === '/health' || path === '/') {
      return jsonResponse({
        status: 'ok',
        message: 'Worker is running',
        timestamp: new Date().toISOString(),
        env_check: {
          CF_API_TOKEN: typeof CF_API_TOKEN !== 'undefined' ? 'set' : 'missing',
          CF_ZONE_ID: typeof CF_ZONE_ID !== 'undefined' ? 'set' : 'missing',
          GITHUB_TOKEN: typeof GITHUB_TOKEN !== 'undefined' ? 'set' : 'missing',
          GITHUB_REPO: typeof GITHUB_REPO !== 'undefined' ? 'set' : 'missing',
          ALLOWED_EXTENSIONS: typeof ALLOWED_EXTENSIONS !== 'undefined' ? 'set' : 'missing'
        }
      });
    }

    // 환경 변수 필수 체크
    if (typeof CF_API_TOKEN === 'undefined' || typeof CF_ZONE_ID === 'undefined' || 
        typeof GITHUB_TOKEN === 'undefined' || typeof GITHUB_REPO === 'undefined' || 
        typeof ALLOWED_EXTENSIONS === 'undefined') {
      return jsonResponse({
        success: false,
        message: '환경 변수가 설정되지 않았습니다. Worker Settings > Variables에서 설정하세요.',
        missing: {
          CF_API_TOKEN: typeof CF_API_TOKEN === 'undefined',
          CF_ZONE_ID: typeof CF_ZONE_ID === 'undefined',
          GITHUB_TOKEN: typeof GITHUB_TOKEN === 'undefined',
          GITHUB_REPO: typeof GITHUB_REPO === 'undefined',
          ALLOWED_EXTENSIONS: typeof ALLOWED_EXTENSIONS === 'undefined'
        }
      }, 500);
    }

    // API 라우팅
    if (path === '/domain' && request.method === 'POST') {
      return await createDomain(request);
    } else if (path === '/domain' && request.method === 'PUT') {
      return await updateDomain(request);
    } else if (path === '/domain' && request.method === 'DELETE') {
      return await deleteDomain(request);
    } else if (path === '/domains' && request.method === 'GET') {
      return await getDomains(url.searchParams.get('email'));
    } else {
      return jsonResponse({ 
        success: false, 
        message: 'Not Found',
        available_endpoints: {
          'GET /': 'Health check',
          'GET /health': 'Health check with env vars',
          'GET /domains?email=xxx': 'Get domains by email',
          'POST /domain': 'Create new domain',
          'PUT /domain': 'Update domain',
          'DELETE /domain': 'Delete domain'
        }
      }, 404);
    }
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message,
      stack: error.stack
    }, 500);
  }
}

// ==========================================
// 도메인 생성
// ==========================================
async function createDomain(request) {
  try {
    const data = await request.json();
    const { domain, email, nameservers } = data;

    // 유효성 검사
    if (!domain || !email || !nameservers || nameservers.length !== 2) {
      return jsonResponse({ 
        success: false, 
        message: '필수 정보가 누락되었습니다. domain, email, nameservers(2개)가 필요합니다.' 
      }, 400);
    }

    // 도메인 형식 검사
    if (!/^[a-z0-9-]+\.[a-z0-9.-]+$/i.test(domain)) {
      return jsonResponse({ 
        success: false, 
        message: '올바른 도메인 형식이 아닙니다.' 
      }, 400);
    }

    // 이메일 형식 검사
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ 
        success: false, 
        message: '올바른 이메일 형식이 아닙니다.' 
      }, 400);
    }

    // 확장자 확인
    const allowedExtensions = ALLOWED_EXTENSIONS.split(',').map(e => e.trim());
    const hasValidExtension = allowedExtensions.some(ext => domain.endsWith(ext));
    
    if (!hasValidExtension) {
      return jsonResponse({ 
        success: false, 
        message: '허용되지 않은 도메인 확장자입니다.',
        allowed_extensions: allowedExtensions
      }, 400);
    }

    // GitHub에서 기존 도메인 확인
    const existingDomains = await getDomainsFromGitHub();
    if (existingDomains.some(d => d.domain === domain)) {
      return jsonResponse({ 
        success: false, 
        message: '이미 등록된 도메인입니다.' 
      }, 400);
    }

    // Cloudflare DNS 레코드 생성
    const dnsResult = await createCloudflareNS(domain, nameservers);
    
    if (!dnsResult.success) {
      return jsonResponse({ 
        success: false, 
        message: 'DNS 레코드 생성에 실패했습니다.',
        error: dnsResult.error
      }, 500);
    }

    // GitHub에 도메인 정보 저장
    const domainData = {
      domain,
      email,
      nameservers,
      status: 'active',
      created: new Date().toISOString()
    };

    existingDomains.push(domainData);
    const saved = await saveDomainsToGitHub(existingDomains);

    if (!saved) {
      // DNS는 생성되었지만 GitHub 저장 실패
      return jsonResponse({ 
        success: false, 
        message: 'DNS는 생성되었으나 데이터 저장에 실패했습니다. GitHub 설정을 확인하세요.' 
      }, 500);
    }

    return jsonResponse({ 
      success: true, 
      message: '도메인이 성공적으로 등록되었습니다.',
      domain: domainData
    });
  } catch (error) {
    console.error('Create domain error:', error);
    return jsonResponse({
      success: false,
      message: '도메인 생성 중 오류가 발생했습니다.',
      error: error.message
    }, 500);
  }
}

// ==========================================
// 도메인 업데이트
// ==========================================
async function updateDomain(request) {
  try {
    const data = await request.json();
    const { domain, email, nameservers } = data;

    if (!domain || !email || !nameservers || nameservers.length !== 2) {
      return jsonResponse({ 
        success: false, 
        message: '필수 정보가 누락되었습니다.' 
      }, 400);
    }

    const domains = await getDomainsFromGitHub();
    const domainIndex = domains.findIndex(d => d.domain === domain && d.email === email);

    if (domainIndex === -1) {
      return jsonResponse({ 
        success: false, 
        message: '도메인을 찾을 수 없거나 권한이 없습니다.' 
      }, 404);
    }

    // Cloudflare DNS 업데이트 (기존 삭제 후 재생성)
    await deleteCloudflareNS(domain);
    const dnsResult = await createCloudflareNS(domain, nameservers);

    if (!dnsResult.success) {
      return jsonResponse({ 
        success: false, 
        message: 'DNS 업데이트에 실패했습니다.',
        error: dnsResult.error
      }, 500);
    }

    // GitHub 데이터 업데이트
    domains[domainIndex].nameservers = nameservers;
    domains[domainIndex].updated = new Date().toISOString();
    await saveDomainsToGitHub(domains);

    return jsonResponse({ 
      success: true, 
      message: '도메인이 성공적으로 업데이트되었습니다.' 
    });
  } catch (error) {
    console.error('Update domain error:', error);
    return jsonResponse({
      success: false,
      message: '도메인 업데이트 중 오류가 발생했습니다.',
      error: error.message
    }, 500);
  }
}

// ==========================================
// 도메인 삭제
// ==========================================
async function deleteDomain(request) {
  try {
    const data = await request.json();
    const { domain, email } = data;

    if (!domain || !email) {
      return jsonResponse({ 
        success: false, 
        message: '도메인과 이메일이 필요합니다.' 
      }, 400);
    }

    const domains = await getDomainsFromGitHub();
    const domainIndex = domains.findIndex(d => d.domain === domain && d.email === email);

    if (domainIndex === -1) {
      return jsonResponse({ 
        success: false, 
        message: '도메인을 찾을 수 없거나 권한이 없습니다.' 
      }, 404);
    }

    // Cloudflare DNS 삭제
    await deleteCloudflareNS(domain);

    // GitHub에서 삭제
    domains.splice(domainIndex, 1);
    await saveDomainsToGitHub(domains);

    return jsonResponse({ 
      success: true, 
      message: '도메인이 성공적으로 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('Delete domain error:', error);
    return jsonResponse({
      success: false,
      message: '도메인 삭제 중 오류가 발생했습니다.',
      error: error.message
    }, 500);
  }
}

// ==========================================
// 도메인 조회
// ==========================================
async function getDomains(email) {
  try {
    if (!email) {
      return jsonResponse({ 
        success: false, 
        message: '이메일을 입력해주세요.' 
      }, 400);
    }

    const domains = await getDomainsFromGitHub();
    const userDomains = domains.filter(d => d.email === email);

    return jsonResponse({ 
      success: true, 
      domains: userDomains 
    });
  } catch (error) {
    console.error('Get domains error:', error);
    return jsonResponse({
      success: false,
      message: '도메인 조회 중 오류가 발생했습니다.',
      error: error.message
    }, 500);
  }
}

// ==========================================
// Cloudflare DNS: NS 레코드 생성
// ==========================================
async function createCloudflareNS(domain, nameservers) {
  try {
    for (const ns of nameservers) {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CF_API_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'NS',
            name: domain,
            content: ns,
            ttl: 3600
          })
        }
      );

      const result = await response.json();
      
      if (!result.success) {
        console.error('Cloudflare API Error:', result.errors);
        return {
          success: false,
          error: result.errors ? result.errors[0].message : 'Unknown error'
        };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error creating NS records:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// ==========================================
// Cloudflare DNS: NS 레코드 삭제
// ==========================================
async function deleteCloudflareNS(domain) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${encodeURIComponent(domain)}`,
      {
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();
    
    if (result.success && result.result.length > 0) {
      for (const record of result.result) {
        await fetch(
          `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records/${record.id}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${CF_API_TOKEN}`,
              'Content-Type': 'application/json'
            }
          }
        );
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting NS records:', error);
    return false;
  }
}

// ==========================================
// GitHub: 도메인 데이터 가져오기
// ==========================================
async function getDomainsFromGitHub() {
  try {
    // [수정 2] domains/domains.json -> domains.json (경로 수정)
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Cloudflare-Worker'
        }
      }
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      console.error('GitHub API error:', response.status);
      return [];
    }

    const data = await response.json();
    // [수정 3] 한글 깨짐 방지를 위한 디코딩
    const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
    return JSON.parse(content);
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    return [];
  }
}

// ==========================================
// GitHub: 도메인 데이터 저장
// ==========================================
async function saveDomainsToGitHub(domains) {
  try {
    let sha = null;
    
    // [수정 2] 경로 수정
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Cloudflare-Worker'
        }
      }
    );

    if (getResponse.status === 200) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    // [수정 3] 한글 깨짐 방지를 위한 인코딩
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(domains, null, 2))));
    
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Cloudflare-Worker'
        },
        body: JSON.stringify({
          message: `Update domains - ${new Date().toISOString()}`,
          content: content,
          sha: sha
        })
      }
    );

    if (!response.ok) {
      console.error('GitHub save error:', await response.text());
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving to GitHub:', error);
    return false;
  }
}

// ==========================================
// JSON 응답 헬퍼
// ==========================================
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status: status,
    headers: CORS_HEADERS
  });
}
// [수정 1] 여기에 있던 불필요한 '}' 삭제됨
