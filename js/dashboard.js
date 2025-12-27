// ⚠️ 여기를 본인의 Worker URL로 변경하세요!
const API_ENDPOINT = 'https://free-domain-services.jiji15899.workers.dev';

let currentEmail = '';

// 도메인 조회
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('searchEmail').value.trim();
    currentEmail = email;
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '조회 중...';
    
    try {
        const response = await fetch(`${API_ENDPOINT}/domains?email=${encodeURIComponent(email)}`);
        const responseText = await response.text();
        
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error('JSON Parse Error:', jsonError);
            console.error('Response:', responseText);
            alert('서버 응답 형식이 올바르지 않습니다. Worker를 확인해주세요.');
            return;
        }
        
        if (response.ok && data.success && data.domains.length > 0) {
            displayDomains(data.domains);
        } else {
            showNoDomains();
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`서버 연결에 실패했습니다.\n\n${error.message}\n\nWorker URL을 확인해주세요: ${API_ENDPOINT}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '조회하기';
    }
});

// 도메인 목록 표시
function displayDomains(domains) {
    const domainList = document.getElementById('domainList');
    const domainsDiv = document.getElementById('domains');
    
    domainsDiv.innerHTML = domains.map(domain => `
        <div class="domain-item">
            <h3>${domain.domain}</h3>
            <p><strong>등록일:</strong> ${new Date(domain.created).toLocaleDateString('ko-KR')}</p>
            <p><strong>네임서버 1:</strong> ${domain.nameservers[0]}</p>
            <p><strong>네임서버 2:</strong> ${domain.nameservers[1]}</p>
            <span class="status ${domain.status}">${getStatusText(domain.status)}</span>
            <br>
            <button onclick="editDomain('${domain.domain}', '${domain.nameservers[0]}', '${domain.nameservers[1]}')">
                수정
            </button>
            <button onclick="deleteDomain('${domain.domain}')" style="background: #dc3545;">
                삭제
            </button>
        </div>
    `).join('');
    
    domainList.classList.remove('hidden');
}

// 상태 텍스트 반환
function getStatusText(status) {
    const statusMap = {
        'active': '활성',
        'pending': '대기 중',
        'expired': '만료됨'
    };
    return statusMap[status] || status;
}

// 도메인 없을 때
function showNoDomains() {
    const domainList = document.getElementById('domainList');
    const domainsDiv = document.getElementById('domains');
    
    domainsDiv.innerHTML = `
        <div class="domain-item">
            <p>등록된 도메인이 없습니다.</p>
        </div>
    `;
    
    domainList.classList.remove('hidden');
}

// 도메인 수정
function editDomain(domain, ns1, ns2) {
    document.getElementById('editDomain').value = domain;
    document.getElementById('editNs1').value = ns1;
    document.getElementById('editNs2').value = ns2;
    
    document.getElementById('editCard').classList.remove('hidden');
    document.getElementById('editCard').scrollIntoView({ behavior: 'smooth' });
}

// 수정 취소
function cancelEdit() {
    document.getElementById('editCard').classList.add('hidden');
    document.getElementById('editForm').reset();
}

// 도메인 업데이트
document.getElementById('editForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const domain = document.getElementById('editDomain').value;
    const ns1 = document.getElementById('editNs1').value.trim();
    const ns2 = document.getElementById('editNs2').value.trim();
    
    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = '업데이트 중...';
    
    try {
        const response = await fetch(`${API_ENDPOINT}/domain`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: domain,
                email: currentEmail,
                nameservers: [ns1, ns2]
            })
        });
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        if (response.ok && data.success) {
            alert('도메인이 성공적으로 업데이트되었습니다.');
            cancelEdit();
            
            // 목록 새로고침
            document.getElementById('searchForm').dispatchEvent(new Event('submit'));
        } else {
            alert(data.message || '업데이트에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`서버 연결에 실패했습니다.\n\n${error.message}`);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '업데이트';
    }
});

// 도메인 삭제
async function deleteDomain(domain) {
    if (!confirm(`정말로 "${domain}"을(를) 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_ENDPOINT}/domain`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                domain: domain,
                email: currentEmail
            })
        });
        
        const responseText = await response.text();
        const data = JSON.parse(responseText);
        
        if (response.ok && data.success) {
            alert('도메인이 성공적으로 삭제되었습니다.');
            
            // 목록 새로고침
            document.getElementById('searchForm').dispatchEvent(new Event('submit'));
        } else {
            alert(data.message || '삭제에 실패했습니다.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert(`서버 연결에 실패했습니다.\n\n${error.message}`);
    }
    }
