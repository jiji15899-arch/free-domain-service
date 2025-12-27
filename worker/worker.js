// Cloudflare Worker - 도메인 관리 API

// 환경 변수 설정 (Cloudflare Dashboard에서 설정)
// CF_API_TOKEN: Cloudflare API 토큰
// CF_ZONE_ID: Cloudflare Zone ID
// GITHUB_TOKEN: GitHub Personal Access Token
// GITHUB_REPO: username/repository-name
// ALLOWED_EXTENSIONS: .com,.co.kr,.org

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
  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/domain' && request.method === 'POST') {
      return await createDomain(request);
    } else if (path === '/domain' && request.method === 'PUT') {
      return await updateDomain(request);
    } else if (path === '/domain' && request.method === 'DELETE') {
      return await deleteDomain(request);
    } else if (path === '/domains' && request.method === 'GET') {
      return await getDomains(url.searchParams.get('email'));
    } else {
      return jsonResponse({ success: false, message: 'Not Found' }, 404);
    }
  } catch (error) {
    console.error('Error:', error);
    return jsonResponse({ 
      success: false, 
      message: 'Internal Server Error',
      error: error.message 
    }, 500);
  }
}

// 도메인 생성
async function createDomain(request) {
  const data = await request.json();
  const { domain, email, nameservers } = data;

  // 유효성 검사
  if (!domain || !email || !nameservers || nameservers.length !== 2) {
    return jsonResponse({ 
      success: false, 
      message: '필수 정보가 누락되었습니다.' 
    }, 400);
  }

  // 확장자 확인
  const allowedExtensions = ALLOWED_EXTENSIONS.split(',');
  const hasValidExtension = allowedExtensions.some(ext => domain.endsWith(ext));
  
  if (!hasValidExtension) {
    return jsonResponse({ 
      success: false, 
      message: '허용되지 않은 도메인 확장자입니다.' 
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
  const dnsCreated = await createCloudflareNS(domain, nameservers);
  
  if (!dnsCreated) {
    return jsonResponse({ 
      success: false, 
      message: 'DNS 레코드 생성에 실패했습니다.' 
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
  await saveDomainsToGitHub(existingDomains);

  return jsonResponse({ 
    success: true, 
    message: '도메인이 성공적으로 등록되었습니다.',
    domain: domainData
  });
}

// 도메인 업데이트
async function updateDomain(request) {
  const data = await request.json();
  const { domain, email, nameservers } = data;

  const domains = await getDomainsFromGitHub();
  const domainIndex = domains.findIndex(d => d.domain === domain && d.email === email);

  if (domainIndex === -1) {
    return jsonResponse({ 
      success: false, 
      message: '도메인을 찾을 수 없습니다.' 
    }, 404);
  }

  // Cloudflare DNS 업데이트
  await updateCloudflareNS(domain, nameservers);

  // GitHub 데이터 업데이트
  domains[domainIndex].nameservers = nameservers;
  domains[domainIndex].updated = new Date().toISOString();
  await saveDomainsToGitHub(domains);

  return jsonResponse({ 
    success: true, 
    message: '도메인이 성공적으로 업데이트되었습니다.' 
  });
}

// 도메인 삭제
async function deleteDomain(request) {
  const data = await request.json();
  const { domain, email } = data;

  const domains = await getDomainsFromGitHub();
  const domainIndex = domains.findIndex(d => d.domain === domain && d.email === email);

  if (domainIndex === -1) {
    return jsonResponse({ 
      success: false, 
      message: '도메인을 찾을 수 없습니다.' 
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
}

// 도메인 조회
async function getDomains(email) {
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
}

// Cloudflare DNS NS 레코드 생성
async function createCloudflareNS(domain, nameservers) {
  try {
    // NS 레코드 2개 생성
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
        return false;
      }
    }
    return true;
  } catch (error) {
    console.error('Error creating NS records:', error);
    return false;
  }
}

// Cloudflare DNS NS 레코드 업데이트
async function updateCloudflareNS(domain, nameservers) {
  // 기존 레코드 삭제 후 재생성
  await deleteCloudflareNS(domain);
  return await createCloudflareNS(domain, nameservers);
}

// Cloudflare DNS NS 레코드 삭제
async function deleteCloudflareNS(domain) {
  try {
    // 도메인의 모든 레코드 조회
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records?name=${domain}`,
      {
        headers: {
          'Authorization': `Bearer ${CF_API_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = await response.json();
    
    if (result.success && result.result.length > 0) {
      // 각 레코드 삭제
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

// GitHub에서 도메인 데이터 가져오기
async function getDomainsFromGitHub() {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains/domains.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (response.status === 404) {
      return [];
    }

    const data = await response.json();
    const content = atob(data.content);
    return JSON.parse(content);
  } catch (error) {
    console.error('Error fetching from GitHub:', error);
    return [];
  }
}

// GitHub에 도메인 데이터 저장
async function saveDomainsToGitHub(domains) {
  try {
    // 기존 파일 SHA 가져오기
    let sha = null;
    const getResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains/domains.json`,
      {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (getResponse.status === 200) {
      const data = await getResponse.json();
      sha = data.sha;
    }

    // 파일 업데이트 또는 생성
    const content = btoa(JSON.stringify(domains, null, 2));
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/contents/domains/domains.json`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: 'Update domains',
          content: content,
          sha: sha
        })
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error saving to GitHub:', error);
    return false;
  }
}

// JSON 응답 헬퍼
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: CORS_HEADERS
  });
    }
